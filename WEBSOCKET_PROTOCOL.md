# WebSocket Protocol Agreement - Day 2
## 10:00 AM Team Sync Decision

### **Protocol Decision: Native WebSocket**
Lighter bundle, more control, no Socket.io overhead

### **Message Format: JSON with Schema Validation**

```typescript
// Core message structure
interface WSMessage {
  id: string;           // UUID v4 for tracking
  type: WSEventType;    // Event type enum
  payload: any;         // Type-safe payload per event
  timestamp: number;    // Unix timestamp
  userId?: string;      // User ID for presence
  version?: number;     // For conflict resolution
}

// Event types enum
enum WSEventType {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  RECONNECT = 'reconnect',
  ERROR = 'error',
  
  // Data sync
  DATA_CREATE = 'data:create',
  DATA_UPDATE = 'data:update',
  DATA_DELETE = 'data:delete',
  DATA_SYNC = 'data:sync',
  
  // Presence
  PRESENCE_JOIN = 'presence:join',
  PRESENCE_LEAVE = 'presence:leave',
  PRESENCE_UPDATE = 'presence:update',
  PRESENCE_CURSOR = 'presence:cursor',
  
  // Optimistic updates
  OPTIMISTIC_START = 'optimistic:start',
  OPTIMISTIC_COMPLETE = 'optimistic:complete',
  OPTIMISTIC_ROLLBACK = 'optimistic:rollback',
  
  // Collaboration
  CURSOR_MOVE = 'cursor:move',
  SELECTION_CHANGE = 'selection:change',
  TYPING_START = 'typing:start',
  TYPING_STOP = 'typing:stop',
}
```

### **Event Payload Definitions**

```typescript
// Data events
interface DataCreatePayload {
  type: 'todo' | 'agenda' | 'note';
  data: any;
  optimisticId?: string;
}

interface DataUpdatePayload {
  type: 'todo' | 'agenda' | 'note';
  id: string;
  data: Partial<any>;
  optimisticId?: string;
}

interface DataDeletePayload {
  type: 'todo' | 'agenda' | 'note';
  id: string;
  optimisticId?: string;
}

// Presence events
interface PresenceJoinPayload {
  userId: string;
  userName: string;
  userColor: string;
  cursor?: Position;
}

interface PresenceUpdatePayload {
  userId: string;
  status: 'active' | 'idle' | 'away';
  lastActivity: number;
}

interface CursorPosition {
  x: number;
  y: number;
  elementId?: string;
}

// Optimistic update events
interface OptimisticStartPayload {
  id: string;
  action: string;
  previousState: any;
}

interface OptimisticCompletePayload {
  id: string;
  finalState: any;
}

interface OptimisticRollbackPayload {
  id: string;
  reason: string;
  previousState: any;
}
```

### **Conflict Resolution: Last-Write-Wins + Operational Transform**

```typescript
interface ConflictResolution {
  strategy: 'last-write-wins' | 'operational-transform' | 'manual';
  
  // For LWW
  timestamp: number;
  userId: string;
  
  // For OT (text fields)
  operations?: TextOperation[];
  
  // For manual resolution
  conflictId?: string;
  options?: ConflictOption[];
}

interface TextOperation {
  type: 'insert' | 'delete' | 'retain';
  position: number;
  text?: string;
  length?: number;
}
```

### **WebSocket Service Interface**

```typescript
// Codex implements this
class WebSocketService {
  // Connection management
  connect(url: string, options?: WSOptions): Promise<void>;
  disconnect(): void;
  reconnect(): Promise<void>;
  
  // Message handling
  send(message: WSMessage): void;
  on(event: WSEventType, handler: (payload: any) => void): void;
  off(event: WSEventType, handler: Function): void;
  
  // State
  isConnected(): boolean;
  getConnectionState(): 'connecting' | 'connected' | 'disconnecting' | 'disconnected';
  getPing(): number;
  
  // Presence
  getPresence(): Map<string, PresenceInfo>;
  updatePresence(status: PresenceStatus): void;
  
  // Optimistic updates
  startOptimistic(action: any): string;
  completeOptimistic(id: string): void;
  rollbackOptimistic(id: string, reason: string): void;
}
```

### **React Hook Interface**

```typescript
// Claude Code uses this
function useWebSocket() {
  const ws = useContext(WebSocketContext);
  
  return {
    // Connection
    isConnected: ws.isConnected(),
    connectionState: ws.getConnectionState(),
    ping: ws.getPing(),
    
    // Messaging
    send: ws.send.bind(ws),
    subscribe: ws.on.bind(ws),
    unsubscribe: ws.off.bind(ws),
    
    // Presence
    presence: ws.getPresence(),
    updatePresence: ws.updatePresence.bind(ws),
    
    // Optimistic updates
    optimistic: {
      start: ws.startOptimistic.bind(ws),
      complete: ws.completeOptimistic.bind(ws),
      rollback: ws.rollbackOptimistic.bind(ws),
    }
  };
}
```

### **Implementation Timeline**

| Time | Codex | Claude Code | Claude |
|------|-------|-------------|---------|
| 10:00-10:30 | Fix build issues | Continue features | Support as needed |
| 10:30-11:00 | WebSocket core | Prepare integration | Test deployment |
| 11:00-11:30 | Message queue | Hook implementation | Animation integration |
| 11:30-12:00 | Reconnection logic | Test with mock | Performance validation |
| 12:00 PM | **Integration checkpoint** | | |

### **Connection Configuration**

```typescript
const WS_CONFIG = {
  // URLs
  development: 'ws://localhost:3001',
  staging: 'wss://staging-ws.dashboard.com',
  production: 'wss://ws.dashboard.com',
  
  // Reconnection
  reconnect: true,
  reconnectDelay: 1000,
  reconnectDelayMax: 5000,
  reconnectAttempts: 5,
  
  // Heartbeat
  heartbeatInterval: 30000,
  heartbeatTimeout: 60000,
  
  // Message queue
  queueSize: 100,
  queueStrategy: 'sliding', // or 'dropping'
  
  // Performance
  binaryType: 'arraybuffer',
  compression: true,
};
```

### **Testing Strategy**

```typescript
// Mock WebSocket for development
class MockWebSocketService extends WebSocketService {
  constructor() {
    super();
    this.simulateLatency = 50; // ms
    this.simulatePacketLoss = 0.01; // 1%
  }
  
  // Auto-echo messages for testing
  send(message: WSMessage) {
    setTimeout(() => {
      if (Math.random() > this.simulatePacketLoss) {
        this.emit(message.type, message.payload);
      }
    }, this.simulateLatency);
  }
}
```

### **Security Considerations**

1. **Authentication**: JWT token in connection params
2. **Rate limiting**: Max 100 messages per minute
3. **Message size limit**: 64KB per message
4. **Validation**: Schema validation on all messages
5. **Encryption**: WSS in production

### **Performance Targets**

| Metric | Target | Critical |
|--------|---------|----------|
| Connection time | < 500ms | < 1000ms |
| Message latency | < 100ms | < 200ms |
| Reconnection | < 2s | < 5s |
| Memory usage | < 10MB | < 20MB |
| CPU usage | < 5% | < 10% |

### **Error Handling**

```typescript
enum WSError {
  CONNECTION_FAILED = 'CONNECTION_FAILED',
  AUTHENTICATION_FAILED = 'AUTHENTICATION_FAILED',
  MESSAGE_TOO_LARGE = 'MESSAGE_TOO_LARGE',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  INVALID_MESSAGE_FORMAT = 'INVALID_MESSAGE_FORMAT',
  RECONNECTION_FAILED = 'RECONNECTION_FAILED',
}

interface WSErrorPayload {
  code: WSError;
  message: string;
  timestamp: number;
  retryable: boolean;
  retryAfter?: number;
}
```

---

## **Agreement Status**

- [x] **Codex**: Will implement WebSocketService class
- [x] **Claude Code**: Will create React hooks and UI integration  
- [x] **Claude**: Will provide animation hooks for real-time updates

**Decided at**: 10:00 AM, Day 2
**Next sync**: 12:00 PM for integration test
