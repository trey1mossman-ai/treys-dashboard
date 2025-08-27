// Unified API client for all frontend requests
// Handles retries, error handling, consistent request formatting, and SSE connections

const SSE_URL = '/events';

export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  reason?: string;
  field?: string;
  requestId?: string;
  replayed?: boolean;
}

interface SSEOptions {
  onMessage?: (event: MessageEvent) => void;
  onError?: (error: Event) => void;
  onOpen?: () => void;
  reconnectDelay?: number;
}

export interface RetryConfig {
  maxRetries: number;
  delays: number[]; // in milliseconds
  retryOn5xx: boolean;
  retryOn4xx: boolean;
}

class APIClient {
  private baseUrl: string;
  private sseConnection: EventSource | null = null;
  private sseReconnectTimer: NodeJS.Timeout | null = null;
  private defaultRetryConfig: RetryConfig = {
    maxRetries: 3,
    delays: [1000, 3000, 9000], // 1s, 3s, 9s with jitter
    retryOn5xx: true,
    retryOn4xx: false
  };

  // Map UI routes to machine routes via proxy
  private routeMap: Record<string, string> = {
    // Ingest routes (proxy to machine endpoints)
    '/agenda/ingest': '/api/ingest/calendar',
    '/workout/ingest': '/api/ingest/workout',
    '/inventory/ingest': '/api/ingest/inventory',
    '/notifications/ingest': '/api/ingest/notifications',
    
    // Command routes (proxy to machine endpoints)
    '/agenda/create': '/api/command/mark_complete',
    '/agenda/reorder': '/api/command/queue_reorder',
    '/agent/trigger': '/api/command/trigger_baby_agent',
  };

  constructor(baseUrl = '') {
    this.baseUrl = baseUrl;
  }

  // Connect to SSE stream for live updates
  connectSSE(options: SSEOptions = {}) {
    const {
      onMessage = () => {},
      onError = () => {},
      onOpen = () => {},
      reconnectDelay = 5000
    } = options;
    
    // Close existing connection
    this.disconnectSSE();
    
    try {
      this.sseConnection = new EventSource(SSE_URL);
      
      this.sseConnection.onopen = () => {
        console.log('[SSE] Connected to live updates');
        onOpen();
      };
      
      this.sseConnection.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('[SSE] Received:', data.type);
          onMessage(event);
        } catch (error) {
          console.error('[SSE] Parse error:', error);
        }
      };
      
      this.sseConnection.onerror = (error) => {
        console.error('[SSE] Connection error:', error);
        onError(error);
        
        // Reconnect after delay
        this.sseReconnectTimer = setTimeout(() => {
          console.log('[SSE] Attempting reconnection...');
          this.connectSSE(options);
        }, reconnectDelay);
      };
      
    } catch (error) {
      console.error('[SSE] Failed to connect:', error);
    }
  }
  
  disconnectSSE() {
    if (this.sseConnection) {
      this.sseConnection.close();
      this.sseConnection = null;
    }
    if (this.sseReconnectTimer) {
      clearTimeout(this.sseReconnectTimer);
      this.sseReconnectTimer = null;
    }
  }

  private async delay(ms: number): Promise<void> {
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 0.1 * ms;
    await new Promise(resolve => setTimeout(resolve, ms + jitter));
  }

  private shouldRetry(status: number, config: RetryConfig): boolean {
    if (status >= 500 && config.retryOn5xx) return true;
    if (status >= 400 && status < 500 && config.retryOn4xx) return true;
    return false;
  }

  private async makeRequest<T>(
    path: string,
    options: RequestInit = {},
    retryConfig: Partial<RetryConfig> = {}
  ): Promise<ApiResponse<T>> {
    const config = { ...this.defaultRetryConfig, ...retryConfig };
    
    // Map route if needed (for machine endpoints via proxy)
    const mappedPath = this.routeMap[path] || path;
    const url = `${this.baseUrl}${mappedPath}`;
    
    let lastError: Error | null = null;
    
    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        // Add delay for retries
        if (attempt > 0) {
          const delayIndex = Math.min(attempt - 1, config.delays.length - 1);
          await this.delay(config.delays[delayIndex]);
        }

        const response = await fetch(url, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options.headers
          }
        });

        // Parse response
        let responseData: any;
        const contentType = response.headers.get('content-type');
        
        if (contentType?.includes('application/json')) {
          responseData = await response.json();
        } else {
          const text = await response.text();
          responseData = { message: text };
        }

        // Handle successful responses
        if (response.ok) {
          // Check for replayed idempotency
          if (responseData.replayed) {
            console.log('[API] Request was replayed (idempotency)');
          }
          return { data: responseData };
        }

        // Handle error responses
        const apiError: ApiResponse<T> = {
          error: responseData.error || 'api_error',
          reason: responseData.reason || `HTTP ${response.status}`,
          field: responseData.field,
          requestId: responseData.requestId,
          replayed: responseData.replayed
        };

        // Decide whether to retry
        if (this.shouldRetry(response.status, config) && attempt < config.maxRetries) {
          lastError = new Error(`HTTP ${response.status}: ${apiError.reason}`);
          continue;
        }

        return apiError;

      } catch (error) {
        lastError = error instanceof Error ? error : new Error('Network error');
        
        // Retry network errors (but not on last attempt)
        if (attempt < config.maxRetries) {
          continue;
        }
      }
    }

    // All retries exhausted
    return {
      error: 'network_error',
      reason: lastError?.message || 'Request failed after retries'
    };
  }

  // GET requests
  async get<T = any>(path: string, retryConfig?: Partial<RetryConfig>): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(path, { method: 'GET' }, retryConfig);
  }

  // POST requests
  async post<T = any>(
    path: string, 
    data: any, 
    retryConfig?: Partial<RetryConfig>
  ): Promise<ApiResponse<T>> {
    return this.makeRequest<T>(path, {
      method: 'POST',
      body: JSON.stringify(data)
    }, retryConfig);
  }

  // Command methods (no retries on 4xx for commands)
  async command<T = any>(path: string, data: any): Promise<ApiResponse<T>> {
    return this.post<T>(`/api/command${path}`, data, {
      retryOn4xx: false // Don't retry invalid commands
    });
  }

  // Data retrieval methods
  async getData<T = any>(path: string): Promise<ApiResponse<T>> {
    return this.get<T>(`/api/data${path}`);
  }
}

// Create singleton instance
export const apiClient = new APIClient();

// Specific API methods following your specification
export class DashboardAPI {
  // Command endpoints
  static async markComplete(id: string, source: string): Promise<ApiResponse> {
    return apiClient.command('/mark_complete', { id, source, status: 'done' });
  }

  static async queueReorder(id: string): Promise<ApiResponse> {
    return apiClient.command('/queue_reorder', { id });
  }

  static async triggerBabyAgent(intent: string, parameters: object = {}): Promise<ApiResponse> {
    return apiClient.command('/trigger_baby_agent', { intent, parameters });
  }

  // Data retrieval endpoints
  static async getAgenda(date?: string, source?: string): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (date) params.append('date', date);
    if (source) params.append('source', source);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.getData(`/agenda${query}`);
  }

  static async getStatus(): Promise<ApiResponse> {
    return apiClient.getData('/status');
  }

  static async getInventory(lowOnly = false, category?: string): Promise<ApiResponse> {
    const params = new URLSearchParams();
    if (lowOnly) params.append('low_only', 'true');
    if (category) params.append('category', category);
    
    const query = params.toString() ? `?${params.toString()}` : '';
    return apiClient.getData(`/inventory${query}`);
  }

  // Utility methods
  static async getHealth(): Promise<ApiResponse> {
    return apiClient.get('/api/health');
  }

  static async getVersion(): Promise<ApiResponse> {
    return apiClient.get('/api/version');
  }
}

// SSE client for live updates
export class EventStreamClient {
  private eventSource: EventSource | null = null;
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 5000; // 5 seconds

  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    try {
      this.eventSource = new EventSource('/events');
      
      this.eventSource.addEventListener('open', () => {
        console.log('SSE connected');
        this.reconnectAttempts = 0;
      });

      this.eventSource.addEventListener('message', (event) => {
        try {
          const data = JSON.parse(event.data);
          this.emit(data.type, data);
        } catch (error) {
          console.error('Failed to parse SSE message:', error);
        }
      });

      this.eventSource.addEventListener('error', (error) => {
        console.error('SSE error:', error);
        this.handleReconnect();
      });

    } catch (error) {
      console.error('Failed to connect to SSE:', error);
      this.handleReconnect();
    }
  }

  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  on(eventType: string, callback: (data: any) => void): void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
  }

  off(eventType: string, callback: (data: any) => void): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.delete(callback);
    }
  }

  private emit(eventType: string, data: any): void {
    const eventListeners = this.listeners.get(eventType);
    if (eventListeners) {
      eventListeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in SSE event callback for ${eventType}:`, error);
        }
      });
    }
  }

  private handleReconnect(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      console.log(`SSE reconnect attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}`);
      
      setTimeout(() => {
        this.connect();
      }, this.reconnectDelay * this.reconnectAttempts);
    } else {
      console.error('Max SSE reconnect attempts reached');
    }
  }
}

// Export singleton event stream client
export const eventStream = new EventStreamClient();

// Polling fallback when SSE is not available
export class PollingClient {
  private intervalId: number | null = null;
  private lastUpdate: string = new Date().toISOString();
  private listeners: Set<(data: any) => void> = new Set();

  start(intervalMs = 30000): void { // Default 30 seconds
    this.stop();
    
    this.intervalId = window.setInterval(async () => {
      try {
        const response = await apiClient.get(`/api/updates?since=${this.lastUpdate}`);
        
        if (response.data) {
          this.lastUpdate = new Date().toISOString();
          this.listeners.forEach(callback => {
            try {
              callback(response.data);
            } catch (error) {
              console.error('Error in polling callback:', error);
            }
          });
        }
      } catch (error) {
        console.error('Polling error:', error);
      }
    }, intervalMs);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  addListener(callback: (data: any) => void): void {
    this.listeners.add(callback);
  }

  removeListener(callback: (data: any) => void): void {
    this.listeners.delete(callback);
  }
}

// Export singleton polling client
export const pollingClient = new PollingClient();

// Auto-detect and use appropriate update mechanism
export function startLiveUpdates(): void {
  // Try SSE first
  if (typeof EventSource !== 'undefined') {
    eventStream.connect();
    
    // Fallback to polling if SSE fails
    setTimeout(() => {
      if (!eventStream || (eventStream as any).eventSource?.readyState !== EventSource.OPEN) {
        console.log('SSE unavailable, falling back to polling');
        pollingClient.start();
      }
    }, 10000); // Wait 10 seconds before fallback
  } else {
    // Browser doesn't support SSE, use polling
    pollingClient.start();
  }
}

export function stopLiveUpdates(): void {
  eventStream.disconnect();
  pollingClient.stop();
}