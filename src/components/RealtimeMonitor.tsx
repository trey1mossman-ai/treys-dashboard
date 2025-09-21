/**
 * Real-time Dashboard Monitor
 * Shows WebSocket status, message flow, and performance metrics
 */

import React, { useState, useEffect, useRef } from 'react';
import { useWebSocket, WSEventType } from '@/services/websocket';
import { PerformanceMonitor } from '@/features/monitoring/PerformanceMonitor';

interface MessageLog {
  id: string;
  type: string;
  direction: 'sent' | 'received';
  timestamp: Date;
  payload: any;
}

interface ConnectionMetrics {
  connectedAt?: Date;
  disconnectedAt?: Date;
  reconnectAttempts: number;
  messagesSent: number;
  messagesReceived: number;
  latency: number;
  queueSize: number;
}

export const RealtimeMonitor: React.FC = () => {
  const { isConnected, connectionState, send, on, off } = useWebSocket();
  
  // State
  const [messages, setMessages] = useState<MessageLog[]>([]);
  const [metrics, setMetrics] = useState<ConnectionMetrics>({
    reconnectAttempts: 0,
    messagesSent: 0,
    messagesReceived: 0,
    latency: 0,
    queueSize: 0
  });
  const [showRawMessages, setShowRawMessages] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const [filter, setFilter] = useState<string>('');
  
  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pingIntervalRef = useRef<NodeJS.Timeout>();
  const latencyStartRef = useRef<number>(0);
  
  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, autoScroll]);
  
  // Track connection metrics
  useEffect(() => {
    if (isConnected) {
      setMetrics(prev => ({
        ...prev,
        connectedAt: new Date(),
        disconnectedAt: undefined
      }));
      
      // Start latency monitoring
      pingIntervalRef.current = setInterval(() => {
        latencyStartRef.current = Date.now();
        send({
          type: 'ping' as WSEventType,
          payload: { timestamp: Date.now() }
        });
      }, 5000);
    } else {
      setMetrics(prev => ({
        ...prev,
        disconnectedAt: new Date(),
        reconnectAttempts: prev.reconnectAttempts + 1
      }));
      
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    }
    
    return () => {
      if (pingIntervalRef.current) {
        clearInterval(pingIntervalRef.current);
      }
    };
  }, [isConnected, send]);
  
  // Listen to all WebSocket events
  useEffect(() => {
    const logMessage = (type: string, direction: 'sent' | 'received') => (payload: any) => {
      const message: MessageLog = {
        id: `${Date.now()}-${Math.random()}`,
        type,
        direction,
        timestamp: new Date(),
        payload
      };
      
      setMessages(prev => [...prev.slice(-99), message]); // Keep last 100
      
      if (direction === 'received') {
        setMetrics(prev => ({
          ...prev,
          messagesReceived: prev.messagesReceived + 1
        }));
        
        // Calculate latency for pong messages
        if (type === 'pong' && latencyStartRef.current) {
          const latency = Date.now() - latencyStartRef.current;
          setMetrics(prev => ({
            ...prev,
            latency
          }));
        }
      } else {
        setMetrics(prev => ({
          ...prev,
          messagesSent: prev.messagesSent + 1
        }));
      }
    };
    
    // Listen to all event types
    const eventTypes = Object.values(WSEventType);
    const handlers = new Map<string, Function>();
    
    eventTypes.forEach(type => {
      const handler = logMessage(type, 'received');
      handlers.set(type, handler);
      on(type, handler);
    });
    
    return () => {
      handlers.forEach((handler, type) => {
        off(type as WSEventType, handler);
      });
    };
  }, [on, off]);
  
  // Test message sending
  const sendTestMessage = (type: WSEventType) => {
    const message = {
      type,
      payload: {
        test: true,
        timestamp: Date.now(),
        message: `Test ${type} message`
      }
    };
    
    send(message);
    
    // Log sent message
    setMessages(prev => [...prev.slice(-99), {
      id: `${Date.now()}-${Math.random()}`,
      type,
      direction: 'sent',
      timestamp: new Date(),
      payload: message.payload
    }]);
  };
  
  // Clear message log
  const clearMessages = () => {
    setMessages([]);
    setMetrics(prev => ({
      ...prev,
      messagesSent: 0,
      messagesReceived: 0
    }));
  };
  
  // Filter messages
  const filteredMessages = filter
    ? messages.filter(m => 
        m.type.includes(filter) || 
        JSON.stringify(m.payload).includes(filter)
      )
    : messages;
  
  // Format uptime
  const getUptime = () => {
    if (!metrics.connectedAt) return 'N/A';
    const seconds = Math.floor((Date.now() - metrics.connectedAt.getTime()) / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  };
  
  return (
    <div className="realtime-monitor fixed bottom-4 right-4 w-96 bg-background border border-border rounded-lg shadow-2xl z-50">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold">Real-time Monitor</h3>
          <div className="flex items-center gap-2">
            <div 
              className={`w-3 h-3 rounded-full ${
                isConnected ? 'bg-green-500' : 'bg-red-500'
              } ${isConnected ? 'animate-pulse' : ''}`}
            />
            <span className="text-sm text-muted-foreground">
              {connectionState}
            </span>
          </div>
        </div>
        
        {/* Metrics */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div>
            <span className="text-muted-foreground">Uptime:</span>
            <span className="ml-1 font-mono">{getUptime()}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Latency:</span>
            <span className="ml-1 font-mono">{metrics.latency}ms</span>
          </div>
          <div>
            <span className="text-muted-foreground">Messages:</span>
            <span className="ml-1 font-mono">
              ↑{metrics.messagesSent} ↓{metrics.messagesReceived}
            </span>
          </div>
        </div>
      </div>
      
      {/* Controls */}
      <div className="p-2 border-b border-border">
        <div className="flex items-center gap-2 mb-2">
          <input
            type="text"
            placeholder="Filter messages..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="flex-1 px-2 py-1 text-xs bg-card border border-border rounded"
          />
          <button
            onClick={() => setAutoScroll(!autoScroll)}
            className={`px-2 py-1 text-xs rounded ${
              autoScroll ? 'bg-primary text-primary-foreground' : 'bg-card'
            }`}
          >
            Auto
          </button>
          <button
            onClick={() => setShowRawMessages(!showRawMessages)}
            className={`px-2 py-1 text-xs rounded ${
              showRawMessages ? 'bg-primary text-primary-foreground' : 'bg-card'
            }`}
          >
            Raw
          </button>
          <button
            onClick={clearMessages}
            className="px-2 py-1 text-xs bg-card rounded hover:bg-destructive hover:text-white"
          >
            Clear
          </button>
        </div>
        
        {/* Test Buttons */}
        <div className="grid grid-cols-4 gap-1">
          <button
            onClick={() => sendTestMessage(WSEventType.DATA_CREATE)}
            className="px-1 py-1 text-xs bg-card rounded hover:bg-primary hover:text-primary-foreground"
          >
            Create
          </button>
          <button
            onClick={() => sendTestMessage(WSEventType.DATA_UPDATE)}
            className="px-1 py-1 text-xs bg-card rounded hover:bg-primary hover:text-primary-foreground"
          >
            Update
          </button>
          <button
            onClick={() => sendTestMessage(WSEventType.DATA_DELETE)}
            className="px-1 py-1 text-xs bg-card rounded hover:bg-primary hover:text-primary-foreground"
          >
            Delete
          </button>
          <button
            onClick={() => sendTestMessage('ping' as WSEventType)}
            className="px-1 py-1 text-xs bg-card rounded hover:bg-primary hover:text-primary-foreground"
          >
            Ping
          </button>
        </div>
      </div>
      
      {/* Message Log */}
      <div className="h-64 overflow-y-auto p-2 space-y-1">
        {filteredMessages.length === 0 ? (
          <div className="text-center text-muted-foreground text-sm py-8">
            No messages yet...
          </div>
        ) : (
          filteredMessages.map(msg => (
            <div
              key={msg.id}
              className={`p-2 rounded text-xs font-mono ${
                msg.direction === 'sent' 
                  ? 'bg-blue-500/10 border-l-2 border-blue-500' 
                  : 'bg-green-500/10 border-l-2 border-green-500'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold">
                  {msg.direction === 'sent' ? '↑' : '↓'} {msg.type}
                </span>
                <span className="text-muted-foreground">
                  {msg.timestamp.toLocaleTimeString()}
                </span>
              </div>
              {showRawMessages && (
                <pre className="text-xs overflow-x-auto">
                  {JSON.stringify(msg.payload, null, 2)}
                </pre>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-border text-xs text-muted-foreground">
        <div className="flex items-center justify-between">
          <span>Queue: {metrics.queueSize}</span>
          <span>Reconnects: {metrics.reconnectAttempts}</span>
          <span>
            {metrics.disconnectedAt && !isConnected && (
              <>Disconnected {new Date(metrics.disconnectedAt).toLocaleTimeString()}</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
};

/**
 * Minimizable wrapper for the monitor
 */
export const RealtimeMonitorWrapper: React.FC = () => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  
  // Keyboard shortcut to toggle
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.metaKey && e.shiftKey && e.key === 'M') {
        setIsVisible(!isVisible);
      }
    };
    
    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isVisible]);
  
  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 px-3 py-2 text-xs bg-primary text-primary-foreground rounded-lg shadow-lg z-50"
      >
        Show Monitor (⌘⇧M)
      </button>
    );
  }
  
  if (isMinimized) {
    return (
      <div className="fixed bottom-4 right-4 bg-background border border-border rounded-lg shadow-lg p-3 z-50">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm">WebSocket Active</span>
          <button
            onClick={() => setIsMinimized(false)}
            className="ml-4 text-xs text-muted-foreground hover:text-foreground"
          >
            Expand
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="relative">
      <RealtimeMonitor />
      <button
        onClick={() => setIsMinimized(true)}
        className="fixed bottom-4 right-4 text-xs text-muted-foreground hover:text-foreground z-50"
        style={{ bottom: '320px' }}
      >
        Minimize
      </button>
    </div>
  );
};

export default RealtimeMonitorWrapper;
