/**
 * WebSocket Service - Quick Implementation for Codex
 * Minimal viable WebSocket with reconnection
 * Start here after build is fixed
 */

import { useEffect, useState } from 'react'
import {
  RealtimeEventType,
  type RealtimeMessage,
  type RealtimeConnectionState
} from '@/types/realtime.types'

export { RealtimeEventType as WSEventType }
export type { RealtimeMessage as WSMessage }

export class WebSocketService {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private messageQueue: RealtimeMessage[] = []
  private eventHandlers = new Map<RealtimeEventType, Set<Function>>()
  private isConnecting = false;

  constructor(url: string = 'ws://localhost:3001') {
    this.url = url;
  }

  /**
   * Connect to WebSocket server
   */
  async connect(): Promise<void> {
    if (this.ws?.readyState === WebSocket.OPEN) {
      console.log('Already connected');
      return;
    }

    if (this.isConnecting) {
      console.log('Connection in progress');
      return;
    }

    this.isConnecting = true;

    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.url);

        this.ws.onopen = () => {
          console.log('WebSocket connected');
          this.isConnecting = false;
          this.reconnectAttempts = 0;
          this.flushQueue();
          this.emit(RealtimeEventType.CONNECT, {});
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message: WSMessage = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Failed to parse message:', error);
          }
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          this.isConnecting = false;
          this.emit(RealtimeEventType.ERROR, { error });
        };

        this.ws.onclose = () => {
          console.log('WebSocket disconnected');
          this.isConnecting = false;
          this.emit(RealtimeEventType.DISCONNECT, {});
          this.attemptReconnect();
        };

      } catch (error) {
        this.isConnecting = false;
        reject(error);
      }
    });
  }

  /**
   * Disconnect from WebSocket
   */
  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  /**
   * Send message
   */
  send(message: Omit<RealtimeMessage, 'id' | 'timestamp'>): void {
    const fullMessage: RealtimeMessage = {
      ...message,
      id: this.generateId(),
      timestamp: Date.now(),
    };

    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(fullMessage));
    } else {
      // Queue message if not connected
      this.messageQueue.push(fullMessage);
      if (this.messageQueue.length > 100) {
        this.messageQueue.shift(); // Remove oldest
      }
    }
  }

  /**
   * Subscribe to events
   */
  on(event: RealtimeEventType, handler: (payload: any) => void): void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }
    this.eventHandlers.get(event)!.add(handler);
  }

  /**
   * Unsubscribe from events
   */
  off(event: RealtimeEventType, handler: Function): void {
    this.eventHandlers.get(event)?.delete(handler);
  }

  /**
   * Check connection status
   */
  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Get connection state
   */
  getConnectionState(): RealtimeConnectionState {
    if (this.isConnecting) return 'connecting';
    if (this.ws?.readyState === WebSocket.OPEN) return 'connected';
    return 'disconnected';
  }

  // Private methods

  private handleMessage(message: RealtimeMessage): void {
    this.emit(message.type, message.payload);
  }

  private emit(event: RealtimeEventType, payload: any): void {
    this.eventHandlers.get(event)?.forEach(handler => {
      try {
        handler(payload);
      } catch (error) {
        console.error(`Error in event handler for ${event}:`, error);
      }
    });
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(console.error);
    }, delay);
  }

  private flushQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      this.ws!.send(JSON.stringify(message));
    }
  }

  private generateId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}

// Singleton instance
export const wsService = new WebSocketService();

// React hook for easy usage
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(wsService.isConnected());
  const [connectionState, setConnectionState] = useState(wsService.getConnectionState());

  useEffect(() => {
    const handleConnect = () => {
      setIsConnected(true);
      setConnectionState('connected');
    };

    const handleDisconnect = () => {
      setIsConnected(false);
      setConnectionState('disconnected');
    };

    wsService.on(RealtimeEventType.CONNECT, handleConnect);
    wsService.on(RealtimeEventType.DISCONNECT, handleDisconnect);

    // Auto-connect
    if (!wsService.isConnected()) {
      wsService.connect().catch(console.error);
    }

    return () => {
      wsService.off(RealtimeEventType.CONNECT, handleConnect);
      wsService.off(RealtimeEventType.DISCONNECT, handleDisconnect);
    };
  }, []);

  return {
    isConnected,
    connectionState,
    send: wsService.send.bind(wsService),
    on: wsService.on.bind(wsService),
    off: wsService.off.bind(wsService),
    connect: wsService.connect.bind(wsService),
    disconnect: wsService.disconnect.bind(wsService),
  };
}

/**
 * Usage example:
 * 
 * import { useWebSocket, WSEventType } from '@/services/websocket';
 * 
 * function MyComponent() {
 *   const { isConnected, send, on, off } = useWebSocket();
 * 
 *   useEffect(() => {
 *     const handleUpdate = (payload) => {
 *       console.log('Data updated:', payload);
 *     };
 * 
 *     on(WSEventType.DATA_UPDATE, handleUpdate);
 *     return () => off(WSEventType.DATA_UPDATE, handleUpdate);
 *   }, []);
 * 
 *   const createTodo = () => {
 *     send({
 *       type: WSEventType.DATA_CREATE,
 *       payload: { type: 'todo', data: { text: 'New todo' } }
 *     });
 *   };
 * 
 *   return (
 *     <div>
 *       Status: {isConnected ? 'Connected' : 'Disconnected'}
 *       <button onClick={createTodo}>Create Todo</button>
 *     </div>
 *   );
 * }
 */
