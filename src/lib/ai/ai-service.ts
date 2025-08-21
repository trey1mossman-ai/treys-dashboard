
// AI Service configuration
interface AIConfig {
  apiUrl: string;
  provider?: 'openai' | 'anthropic';
  enableTools?: boolean;
  stream?: boolean;
}

// Message types
export interface Message {
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
}

export interface ToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Tool execution result
export interface ToolResult {
  tool_call_id: string;
  result: any;
  success: boolean;
}

// Stream event types
export interface StreamEvent {
  type: 'content' | 'tool_call' | 'tool_use' | 'done' | 'error';
  content?: string;
  tool_calls?: ToolCall[];
  tool?: {
    id: string;
    name: string;
    input: any;
  };
  error?: string;
}

// Main AI Service class
export class AIService {
  private config: AIConfig;
  private messages: Message[] = [];
  private abortController?: AbortController;

  constructor(config: Partial<AIConfig> = {}) {
    this.config = {
      apiUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8787',
      provider: 'openai',
      enableTools: true,
      stream: true,
      ...config
    };
  }

  // Send a message and get response
  async send(
    content: string, 
    options: {
      system?: string;
      stream?: boolean;
      onStream?: (event: StreamEvent) => void;
      onToolCall?: (tool: ToolCall) => Promise<any>;
    } = {}
  ): Promise<string> {
    // Add user message to history
    this.messages.push({ role: 'user', content });

    // Prepare request
    const requestBody = {
      provider: this.config.provider,
      messages: this.messages,
      system: options.system,
      stream: options.stream ?? this.config.stream,
      enable_tools: this.config.enableTools,
      user_id: this.getUserId()
    };

    try {
      if (options.stream && options.onStream) {
        return await this.streamResponse(requestBody, options.onStream, options.onToolCall);
      } else {
        return await this.getResponse(requestBody, options.onToolCall);
      }
    } catch (error) {
      console.error('AI Service error:', error);
      throw error;
    }
  }

  // Stream response handling
  private async streamResponse(
    body: any,
    onStream: (event: StreamEvent) => void,
    onToolCall?: (tool: ToolCall) => Promise<any>
  ): Promise<string> {
    this.abortController = new AbortController();
    
    const response = await fetch(`${this.config.apiUrl}/api/ai/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: this.abortController.signal
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let fullContent = '';
    const toolCalls: ToolCall[] = [];

    if (!reader) {
      throw new Error('No response body');
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            
            if (data === '[DONE]') {
              onStream({ type: 'done' });
              break;
            }

            try {
              const event = JSON.parse(data) as StreamEvent;
              
              // Handle content
              if (event.type === 'content' && event.content) {
                fullContent += event.content;
                onStream(event);
              }
              
              // Handle tool calls
              if (event.type === 'tool_call' && event.tool_calls) {
                toolCalls.push(...event.tool_calls);
                onStream(event);
              }
              
              // Handle Anthropic tool use
              if (event.type === 'tool_use' && event.tool) {
                const toolCall: ToolCall = {
                  id: event.tool.id,
                  type: 'function',
                  function: {
                    name: event.tool.name,
                    arguments: JSON.stringify(event.tool.input)
                  }
                };
                toolCalls.push(toolCall);
                onStream({ type: 'tool_call', tool_calls: [toolCall] });
              }
            } catch (e) {
              console.error('Failed to parse stream event:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    // Handle tool calls if any
    if (toolCalls.length > 0 && onToolCall) {
      const toolResults = await this.executeTools(toolCalls, onToolCall);
      
      // Get final response with tool results
      this.messages.push({
        role: 'assistant',
        content: fullContent || '',
        tool_calls: toolCalls
      });
      
      for (const result of toolResults) {
        this.messages.push({
          role: 'tool',
          content: JSON.stringify(result.result),
          tool_call_id: result.tool_call_id
        });
      }
      
      // Get final response after tool execution
      const finalResponse = await this.send('', { 
        stream: false,
        onToolCall 
      });
      
      return finalResponse;
    }

    // Add assistant message to history
    this.messages.push({
      role: 'assistant',
      content: fullContent
    });

    return fullContent;
  }

  // Non-streaming response
  private async getResponse(
    body: any,
    onToolCall?: (tool: ToolCall) => Promise<any>
  ): Promise<string> {
    const response = await fetch(`${this.config.apiUrl}/api/ai/respond`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.statusText}`);
    }

    const data = await response.json();
    
    // Handle OpenAI response
    if (this.config.provider === 'openai') {
      const message = data.choices?.[0]?.message;
      
      if (message?.tool_calls && onToolCall) {
        const toolResults = await this.executeTools(message.tool_calls, onToolCall);
        
        // Add messages to history
        this.messages.push(message);
        for (const result of toolResults) {
          this.messages.push({
            role: 'tool',
            content: JSON.stringify(result.result),
            tool_call_id: result.tool_call_id
          });
        }
        
        // Get final response
        return await this.send('', { stream: false, onToolCall });
      }
      
      this.messages.push({
        role: 'assistant',
        content: message?.content || ''
      });
      
      return message?.content || '';
    }
    
    // Handle Anthropic response
    if (this.config.provider === 'anthropic') {
      const content = data.content;
      let textContent = '';
      const toolCalls: ToolCall[] = [];
      
      for (const block of content) {
        if (block.type === 'text') {
          textContent += block.text;
        } else if (block.type === 'tool_use') {
          toolCalls.push({
            id: block.id,
            type: 'function',
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input)
            }
          });
        }
      }
      
      if (toolCalls.length > 0 && onToolCall) {
        const toolResults = await this.executeTools(toolCalls, onToolCall);
        
        // Add messages for Anthropic format
        this.messages.push({
          role: 'assistant',
          content: textContent,
          tool_calls: toolCalls
        });
        
        for (const result of toolResults) {
          this.messages.push({
            role: 'tool',
            content: JSON.stringify(result.result),
            tool_call_id: result.tool_call_id
          });
        }
        
        // Get final response
        return await this.send('', { stream: false, onToolCall });
      }
      
      this.messages.push({
        role: 'assistant',
        content: textContent
      });
      
      return textContent;
    }
    
    throw new Error('Unknown provider response format');
  }

  // Execute tools
  private async executeTools(
    toolCalls: ToolCall[],
    onToolCall: (tool: ToolCall) => Promise<any>
  ): Promise<ToolResult[]> {
    const results: ToolResult[] = [];
    
    for (const toolCall of toolCalls) {
      try {
        const result = await onToolCall(toolCall);
        results.push({
          tool_call_id: toolCall.id,
          result,
          success: true
        });
      } catch (error) {
        console.error(`Tool execution error for ${toolCall.function.name}:`, error);
        results.push({
          tool_call_id: toolCall.id,
          result: { error: String(error) },
          success: false
        });
      }
    }
    
    return results;
  }

  // Execute tool on server
  async executeServerTool(toolName: string, args: any): Promise<any> {
    const response = await fetch(`${this.config.apiUrl}/api/ai/tools/router`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        tool: toolName,
        args,
        userId: this.getUserId()
      })
    });

    if (!response.ok) {
      throw new Error(`Tool execution error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.result;
  }

  // Search knowledge base
  async searchKnowledge(query: string, topK: number = 5): Promise<any> {
    const response = await fetch(`${this.config.apiUrl}/api/rag/search`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query,
        top_k: topK
      })
    });

    if (!response.ok) {
      throw new Error(`Knowledge search error: ${response.statusText}`);
    }

    return await response.json();
  }

  // Ingest documents into knowledge base
  async ingestDocuments(documents: Array<{
    text: string;
    metadata?: Record<string, any>;
  }>): Promise<any> {
    const response = await fetch(`${this.config.apiUrl}/api/rag/ingest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        documents
      })
    });

    if (!response.ok) {
      throw new Error(`Document ingest error: ${response.statusText}`);
    }

    return await response.json();
  }

  // Get realtime session for voice
  async getRealtimeSession(): Promise<any> {
    const response = await fetch(`${this.config.apiUrl}/api/realtime/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      }
    });

    if (!response.ok) {
      throw new Error(`Realtime session error: ${response.statusText}`);
    }

    return await response.json();
  }

  // Clear conversation history
  clearHistory() {
    this.messages = [];
  }

  // Get conversation history
  getHistory(): Message[] {
    return [...this.messages];
  }

  // Set provider
  setProvider(provider: 'openai' | 'anthropic') {
    this.config.provider = provider;
  }

  // Cancel streaming
  cancelStream() {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = undefined;
    }
  }

  // Get or create user ID
  private getUserId(): string {
    let userId = localStorage.getItem('ai_user_id');
    if (!userId) {
      userId = crypto.randomUUID();
      localStorage.setItem('ai_user_id', userId);
    }
    return userId;
  }
}

// Export singleton instance
export const aiService = new AIService();