/**
 * AI Dashboard Bridge Service - Connects AI services with dashboard controller
 * This service acts as the main interface between AI commands and dashboard operations
 */

import { dashboardController } from '@/lib/ai/dashboard-controller';
import { allDashboardTools, type AITool } from '@/lib/ai/dashboard-tools';
import { aiService, type AIResponse } from './aiService';
import { toast } from 'sonner';

/**
 * Enhanced AI command interface for dashboard operations
 */
export interface DashboardCommand {
  command: string;
  context?: {
    currentSection?: string;
    currentItems?: any[];
    userPreferences?: Record<string, any>;
    timeContext?: {
      date: string;
      time: string;
      timezone: string;
    };
  };
  metadata?: {
    source: 'voice' | 'text' | 'ui' | 'automation';
    sessionId?: string;
    userId?: string;
  };
}

/**
 * Enhanced response interface with detailed execution results
 */
export interface DashboardResponse {
  success: boolean;
  message: string;
  executedActions?: Array<{
    tool: string;
    parameters: any;
    result: any;
    timestamp: string;
  }>;
  suggestions?: string[];
  nextActions?: string[];
  data?: any;
  errors?: Array<{
    tool: string;
    error: string;
    timestamp: string;
  }>;
}

/**
 * Configuration for AI dashboard behavior
 */
export interface DashboardAIConfig {
  enableAutoSuggestions: boolean;
  enableContextAwareness: boolean;
  enableBulkOperations: boolean;
  defaultResponseFormat: 'simple' | 'detailed' | 'structured';
  maxActionsPerCommand: number;
  enableCommandHistory: boolean;
}

/**
 * Main AI Dashboard Bridge Service
 */
class AIDashboardBridge {
  private static instance: AIDashboardBridge;
  private config: DashboardAIConfig;
  private commandHistory: DashboardCommand[] = [];
  private isInitialized = false;

  private constructor() {
    this.config = this.loadConfig();
    this.setupEventListeners();
  }

  public static getInstance(): AIDashboardBridge {
    if (!AIDashboardBridge.instance) {
      AIDashboardBridge.instance = new AIDashboardBridge();
    }
    return AIDashboardBridge.instance;
  }

  /**
   * Initialize the bridge service
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Ensure AI service is configured
      if (!aiService.isConfigured()) {
        console.warn('AI service not configured - dashboard AI features will be limited');
        return;
      }

      // Load command history
      this.loadCommandHistory();

      // Set up periodic cleanup
      this.setupCleanupTasks();

      this.isInitialized = true;
      console.log('AI Dashboard Bridge initialized successfully');
    } catch (error) {
      console.error('Failed to initialize AI Dashboard Bridge:', error);
      throw error;
    }
  }

  /**
   * Process a natural language command and execute dashboard actions
   */
  public async processCommand(commandInput: string | DashboardCommand): Promise<DashboardResponse> {
    try {
      const command: DashboardCommand = typeof commandInput === 'string' 
        ? { command: commandInput }
        : commandInput;

      // Add context if not provided
      if (!command.context) {
        command.context = await this.gatherContext();
      }

      // Add metadata if not provided
      if (!command.metadata) {
        command.metadata = {
          source: 'text',
          sessionId: this.generateSessionId()
        };
      }

      // Store command in history
      if (this.config.enableCommandHistory) {
        this.addToHistory(command);
      }

      // Process with AI service to understand intent and extract actions
      const aiResponse = await this.processWithAI(command);

      if (!aiResponse.success) {
        return {
          success: false,
          message: aiResponse.message || 'Failed to understand command'
        };
      }

      // Execute the actions
      const executionResults = await this.executeActions(aiResponse);

      // Generate response
      const response = await this.generateResponse(command, aiResponse, executionResults);

      // Add suggestions if enabled
      if (this.config.enableAutoSuggestions) {
        response.suggestions = await this.generateSuggestions(command, response);
      }

      return response;

    } catch (error: any) {
      console.error('Error processing dashboard command:', error);
      return {
        success: false,
        message: `Failed to process command: ${error.message || error}`,
        errors: [{
          tool: 'bridge',
          error: error.message || error.toString(),
          timestamp: new Date().toISOString()
        }]
      };
    }
  }

  /**
   * Get available dashboard tools for AI context
   */
  public getAvailableTools(): AITool[] {
    return allDashboardTools;
  }

  /**
   * Get current dashboard state for AI context
   */
  public async getDashboardState(): Promise<any> {
    return {
      todos: dashboardController.getTodos(),
      supplements: dashboardController.getSupplements(),
      currentTime: new Date().toISOString(),
      // Add more state as needed
    };
  }

  /**
   * Execute a specific tool directly
   */
  public async executeTool(toolName: string, parameters: any): Promise<any> {
    return await dashboardController.executeCommand(toolName, parameters);
  }

  /**
   * Update bridge configuration
   */
  public updateConfig(newConfig: Partial<DashboardAIConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.saveConfig();
  }

  /**
   * Get command history
   */
  public getCommandHistory(): DashboardCommand[] {
    return [...this.commandHistory];
  }

  /**
   * Clear command history
   */
  public clearHistory(): void {
    this.commandHistory = [];
    this.saveCommandHistory();
  }

  // =============================================
  // PRIVATE METHODS
  // =============================================

  /**
   * Process command with AI service to understand intent
   */
  private async processWithAI(command: DashboardCommand): Promise<AIResponse> {
    const systemPrompt = this.buildSystemPrompt(command);
    const userPrompt = this.buildUserPrompt(command);

    // Use the existing AI service to process the command
    return await aiService.processCommand(`${systemPrompt}\n\nUser Command: ${userPrompt}`);
  }

  /**
   * Build system prompt with tool context and current state
   */
  private buildSystemPrompt(command: DashboardCommand): string {
    const tools = this.getAvailableTools();
    const toolDescriptions = tools.map(tool => 
      `- ${tool.name}: ${tool.description}`
    ).join('\n');

    const contextInfo = command.context ? JSON.stringify(command.context, null, 2) : 'No context provided';

    return `You are an AI assistant managing a personal dashboard application. You can control:

AVAILABLE TOOLS:
${toolDescriptions}

CURRENT CONTEXT:
${contextInfo}

RESPONSE FORMAT:
Respond with a JSON object containing:
{
  "success": true/false,
  "message": "description of what you're doing",
  "actions": [
    {
      "tool": "tool_name",
      "parameters": { ... }
    }
  ]
}

GUIDELINES:
- Be specific and actionable
- Use appropriate tools for the requested operation
- Consider the current context when making decisions
- Provide helpful messages about what you're doing
- Limit to ${this.config.maxActionsPerCommand} actions per command
- For time-based items, use current time context if dates/times aren't specified`;
  }

  /**
   * Build user prompt with command and additional context
   */
  private buildUserPrompt(command: DashboardCommand): string {
    let prompt = command.command;

    // Add recent command context if available
    if (this.commandHistory.length > 0 && this.config.enableContextAwareness) {
      const recentCommands = this.commandHistory.slice(-3).map(cmd => cmd.command);
      prompt += `\n\nRecent commands for context: ${recentCommands.join(', ')}`;
    }

    return prompt;
  }

  /**
   * Execute the actions returned by AI
   */
  private async executeActions(aiResponse: AIResponse): Promise<any[]> {
    const results: any[] = [];

    if (!aiResponse.actions || !Array.isArray(aiResponse.actions)) {
      return results;
    }

    for (const action of aiResponse.actions) {
      try {
        const result = await dashboardController.executeCommand(action.tool || action.action, action.parameters || action.data);
        results.push({
          tool: action.tool || action.action,
          parameters: action.parameters || action.data,
          result,
          timestamp: new Date().toISOString()
        });
      } catch (error: any) {
        results.push({
          tool: action.tool || action.action,
          parameters: action.parameters || action.data,
          error: error.message || error,
          timestamp: new Date().toISOString()
        });
      }
    }

    return results;
  }

  /**
   * Generate comprehensive response from execution results
   */
  private async generateResponse(
    command: DashboardCommand, 
    aiResponse: AIResponse, 
    executionResults: any[]
  ): Promise<DashboardResponse> {
    const successful = executionResults.filter(r => !r.error);
    const failed = executionResults.filter(r => r.error);

    const response: DashboardResponse = {
      success: failed.length === 0,
      message: aiResponse.message || `Executed ${successful.length} actions successfully`,
      executedActions: successful,
      errors: failed.map(f => ({
        tool: f.tool,
        error: f.error,
        timestamp: f.timestamp
      }))
    };

    // Add any data from successful executions
    if (successful.length > 0) {
      const dataResults = successful.filter(r => r.result?.data);
      if (dataResults.length > 0) {
        response.data = dataResults.length === 1 
          ? dataResults[0].result.data 
          : dataResults.map(r => r.result.data);
      }
    }

    return response;
  }

  /**
   * Generate helpful suggestions for next actions
   */
  private async generateSuggestions(command: DashboardCommand, response: DashboardResponse): Promise<string[]> {
    const suggestions: string[] = [];

    // Basic suggestion logic based on executed actions
    if (response.executedActions) {
      for (const action of response.executedActions) {
        switch (action.tool) {
          case 'create_agenda_item':
            suggestions.push('Set a reminder for this event');
            break;
          case 'create_todo':
            suggestions.push('Set priority or deadline for this task');
            break;
          case 'log_food_item':
            suggestions.push('Check daily nutrition goals');
            break;
          // Add more suggestion logic
        }
      }
    }

    return suggestions.slice(0, 3); // Limit to 3 suggestions
  }

  /**
   * Gather current context from dashboard state
   */
  private async gatherContext(): Promise<any> {
    const now = new Date();
    return {
      currentSection: this.getCurrentSection(),
      timeContext: {
        date: now.toISOString().split('T')[0],
        time: now.toTimeString().split(' ')[0],
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },
      dashboardState: await this.getDashboardState()
    };
  }

  /**
   * Get current dashboard section
   */
  private getCurrentSection(): string {
    const path = window.location.pathname;
    if (path.includes('agenda')) return 'agenda';
    if (path.includes('todos')) return 'todos';
    if (path.includes('food')) return 'food';
    if (path.includes('supplements')) return 'supplements';
    if (path.includes('settings')) return 'settings';
    return 'dashboard';
  }

  /**
   * Generate unique session ID
   */
  private generateSessionId(): string {
    return `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Load configuration from storage
   */
  private loadConfig(): DashboardAIConfig {
    try {
      const stored = localStorage.getItem('ai_dashboard_config');
      if (stored) {
        return { ...this.getDefaultConfig(), ...JSON.parse(stored) };
      }
    } catch (error) {
      console.error('Failed to load AI dashboard config:', error);
    }
    return this.getDefaultConfig();
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): DashboardAIConfig {
    return {
      enableAutoSuggestions: true,
      enableContextAwareness: true,
      enableBulkOperations: true,
      defaultResponseFormat: 'detailed',
      maxActionsPerCommand: 5,
      enableCommandHistory: true
    };
  }

  /**
   * Save configuration to storage
   */
  private saveConfig(): void {
    try {
      localStorage.setItem('ai_dashboard_config', JSON.stringify(this.config));
    } catch (error) {
      console.error('Failed to save AI dashboard config:', error);
    }
  }

  /**
   * Load command history from storage
   */
  private loadCommandHistory(): void {
    try {
      const stored = localStorage.getItem('ai_command_history');
      if (stored) {
        this.commandHistory = JSON.parse(stored).slice(-100); // Keep last 100 commands
      }
    } catch (error) {
      console.error('Failed to load command history:', error);
    }
  }

  /**
   * Save command history to storage
   */
  private saveCommandHistory(): void {
    try {
      localStorage.setItem('ai_command_history', JSON.stringify(this.commandHistory));
    } catch (error) {
      console.error('Failed to save command history:', error);
    }
  }

  /**
   * Add command to history
   */
  private addToHistory(command: DashboardCommand): void {
    this.commandHistory.push({
      ...command,
      metadata: {
        ...command.metadata,
        timestamp: new Date().toISOString()
      }
    });

    // Keep only last 100 commands
    if (this.commandHistory.length > 100) {
      this.commandHistory = this.commandHistory.slice(-100);
    }

    this.saveCommandHistory();
  }

  /**
   * Setup event listeners for dashboard integration
   */
  private setupEventListeners(): void {
    // Listen for direct AI commands
    window.addEventListener('ai-dashboard-command', (event: CustomEvent) => {
      this.processCommand(event.detail).then(response => {
        if (response.success) {
          toast.success(response.message);
        } else {
          toast.error(response.message);
        }
      });
    });

    // Listen for tool execution requests
    window.addEventListener('ai-execute-tool', (event: CustomEvent) => {
      const { tool, parameters } = event.detail;
      this.executeTool(tool, parameters).then(result => {
        window.dispatchEvent(new CustomEvent('ai-tool-executed', { 
          detail: { tool, parameters, result } 
        }));
      });
    });
  }

  /**
   * Setup cleanup tasks
   */
  private setupCleanupTasks(): void {
    // Clean up old command history periodically
    setInterval(() => {
      if (this.commandHistory.length > 100) {
        this.commandHistory = this.commandHistory.slice(-100);
        this.saveCommandHistory();
      }
    }, 60000 * 60); // Every hour
  }
}

// Export singleton instance
export const aiDashboardBridge = AIDashboardBridge.getInstance();

// Export types for external use
export type { DashboardCommand, DashboardResponse, DashboardAIConfig };

// Auto-initialize when imported
aiDashboardBridge.initialize().catch(console.error);