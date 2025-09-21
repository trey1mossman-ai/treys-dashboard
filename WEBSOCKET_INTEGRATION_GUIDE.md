# WebSocket Integration Guide

## Complete Real-time System Documentation

### Table of Contents
1. [Quick Start](#quick-start)
2. [Architecture](#architecture)
3. [Frontend Integration](#frontend-integration)
4. [Backend Implementation](#backend-implementation)
5. [Testing](#testing)
6. [Monitoring](#monitoring)
7. [Production Deployment](#production-deployment)

---

## Quick Start

### 1. Start Backend Server

```bash
# Option 1: Mock server (for testing)
node mock-websocket-server.js

# Option 2: Production server
cd backend
npm install ws jsonwebtoken
node websocket-server.js
```

### 2. Start Frontend

```bash
npm run dev
```

### 3. Test Connection

Visit http://localhost:5173 and look for the green connection indicator.

---

## Architecture

### Message Flow

```
Frontend (React) ←→ WebSocket Service ←→ Backend Server ←→ Other Clients
     ↓                    ↓                    ↓              ↓
  UI Updates         Message Queue        Database      Broadcast
```

### Message Format

```typescript
interface WSMessage {
  id: string;           // Unique message ID
  type: WSEventType;    // Event type
  payload: any;         // Event data
  timestamp: number;    // Unix timestamp
  userId?: string;      // User who sent
}
```

### Event Types

```typescript
enum WSEventType {
  // Connection
  CONNECT = 'connect',
  DISCONNECT = 'disconnect',
  ERROR = 'error',
  
  // Data operations
  DATA_CREATE = 'data:create',
  DATA_UPDATE = 'data:update',
  DATA_DELETE = 'data:delete',
  
  // Presence
  PRESENCE_UPDATE = 'presence:update',
  PRESENCE_LEAVE = 'presence:leave',
  
  // Optimistic updates
  OPTIMISTIC_START = 'optimistic:start',
  OPTIMISTIC_COMPLETE = 'optimistic:complete',
  OPTIMISTIC_ROLLBACK = 'optimistic:rollback',
}
```

---

## Frontend Integration

### Basic Usage

```typescript
import { useWebSocket, WSEventType } from '@/services/websocket';

function MyComponent() {
  const { isConnected, send, on, off } = useWebSocket();
  
  useEffect(() => {
    const handleUpdate = (payload) => {
      console.log('Data updated:', payload);
    };
    
    on(WSEventType.DATA_UPDATE, handleUpdate);
    return () => off(WSEventType.DATA_UPDATE, handleUpdate);
  }, []);
  
  const sendMessage = () => {
    send({
      type: WSEventType.DATA_CREATE,
      payload: { type: 'todo', data: { text: 'New item' } }
    });
  };
  
  return (
    <div>
      Status: {isConnected ? '🟢' : '🔴'}
      <button onClick={sendMessage}>Send</button>
    </div>
  );
}
```

### With Animations

```typescript
import { useRealtimeAnimation } from '@/hooks/useRealtimeAnimation';

function AnimatedList() {
  useRealtimeAnimation(); // Auto-animates all updates
  
  return <div id="todo-list">{/* Items auto-animate */}</div>;
}
```

### With Optimistic Updates

```typescript
import { useOptimisticAnimation } from '@/hooks/useRealtimeAnimation';

function OptimisticTodo() {
  const { startOptimistic, completeOptimistic, rollbackOptimistic } = useOptimisticAnimation();
  
  const createTodo = async (text) => {
    const tempId = `temp-${Date.now()}`;
    
    // Start optimistic update
    startOptimistic(tempId, 'create');
    
    try {
      // Send to server
      await api.createTodo(text);
      completeOptimistic(tempId);
    } catch (error) {
      rollbackOptimistic(tempId);
    }
  };
}
```

---

## Backend Implementation

### Minimal Server

```javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 3001 });

wss.on('connection', (ws) => {
  console.log('Client connected');
  
  ws.on('message', (data) => {
    // Broadcast to all clients
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(data);
      }
    });
  });
});
```

### Production Server Features

The production server (`backend/websocket-server.js`) includes:

- ✅ JWT Authentication
- ✅ Message Queuing for offline users
- ✅ Room/Channel support
- ✅ Presence tracking
- ✅ Heartbeat monitoring
- ✅ Graceful shutdown
- ✅ TTL for queued messages
- ✅ Rate limiting ready

### Authentication

```javascript
// Frontend: Send token in connection
const ws = new WebSocket('ws://localhost:3001?token=' + jwtToken);

// Or in Authorization header
const ws = new WebSocket('ws://localhost:3001', {
  headers: {
    'Authorization': 'Bearer ' + jwtToken
  }
});
```

### Room Management

```javascript
// Join room
send({
  type: 'room:join',
  payload: { roomId: 'project-123' }
});

// Send to room
send({
  type: 'room:message',
  payload: {
    roomId: 'project-123',
    message: 'Hello room!'
  }
});

// Leave room
send({
  type: 'room:leave',
  payload: { roomId: 'project-123' }
});
```

---

## Testing

### Run Integration Tests

```bash
# Install test dependencies
npm install -D ws

# Run tests
npx ts-node tests/websocket-integration.test.ts
```

### Manual Testing with Monitor

1. Add the monitor to your app:

```tsx
import RealtimeMonitor from '@/components/RealtimeMonitor';

function App() {
  return (
    <>
      {/* Your app */}
      <RealtimeMonitor />
    </>
  );
}
```

2. Use keyboard shortcut `Cmd+Shift+M` to toggle visibility

### Test Scenarios

1. **Connection Test**
   - Start server
   - Load app
   - Check green indicator

2. **Broadcast Test**
   - Open 2+ tabs
   - Send message from one
   - Verify all receive

3. **Reconnection Test**
   - Connect client
   - Stop server
   - Start server
   - Verify auto-reconnect

4. **Queue Test**
   - Connect client A
   - Send message to client B (offline)
   - Connect client B
   - Verify B receives queued message

5. **Performance Test**
   - Connect 10+ clients
   - Send rapid messages
   - Monitor latency < 100ms

---

## Monitoring

### Real-time Monitor Component

The monitor shows:
- Connection status
- Message flow (sent/received)
- Latency measurements
- Uptime tracking
- Message filtering
- Raw message inspection

### Performance Metrics

```typescript
// Track in your app
const metrics = {
  connectionTime: Date.now() - startTime,
  messagesSent: 0,
  messagesReceived: 0,
  averageLatency: 0,
  reconnectCount: 0
};
```

### Server Monitoring

```javascript
// Log all events
wss.on('connection', (ws) => {
  console.log(`[${new Date().toISOString()}] New connection`);
});

// Track metrics
const serverMetrics = {
  connectionsTotal: 0,
  messagesTotal: 0,
  errorsTotal: 0,
  averageQueueSize: 0
};
```

---

## Production Deployment

### Environment Variables

```bash
# .env.production
WS_PORT=3001
JWT_SECRET=your-secret-key
WS_URL=wss://your-domain.com
REDIS_URL=redis://localhost:6379
```

### Nginx Configuration

```nginx
location /ws {
    proxy_pass http://localhost:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    
    # Timeouts
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
}
```

### Docker Deployment

```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3001
CMD ["node", "websocket-server.js"]
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  websocket:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - JWT_SECRET=${JWT_SECRET}
      - REDIS_URL=redis://redis:6379
    depends_on:
      - redis
      
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
```

### Scaling Considerations

1. **Horizontal Scaling**: Use Redis Pub/Sub for multi-server setup
2. **Load Balancing**: Use sticky sessions (IP hash)
3. **Message Persistence**: Store critical messages in database
4. **Rate Limiting**: Implement per-user message limits
5. **Monitoring**: Use Prometheus + Grafana

### Security Checklist

- [ ] JWT authentication implemented
- [ ] Rate limiting enabled
- [ ] Message validation
- [ ] XSS prevention
- [ ] CORS configured
- [ ] SSL/TLS for production
- [ ] Input sanitization
- [ ] Error message sanitization

---

## Troubleshooting

### Common Issues

**Connection fails immediately**
- Check server is running on port 3001
- Verify no firewall blocking
- Check browser console for errors

**Messages not broadcasting**
- Verify server broadcast logic
- Check client subscription
- Monitor network tab

**High latency**
- Check network conditions
- Verify server performance
- Consider geographic distribution

**Memory leaks**
- Monitor connection cleanup
- Check message queue size
- Verify event listener cleanup

### Debug Mode

Enable debug logging:

```javascript
// Frontend
localStorage.setItem('DEBUG_WS', 'true');

// Backend
DEBUG=ws:* node websocket-server.js
```

---

## API Reference

### Frontend API

```typescript
// Hook
const {
  isConnected: boolean,
  connectionState: 'connecting' | 'connected' | 'disconnected',
  send: (message) => void,
  on: (event, handler) => void,
  off: (event, handler) => void,
  connect: () => Promise<void>,
  disconnect: () => void
} = useWebSocket();
```

### Backend Events

```javascript
// Server events
wss.on('connection', (ws, req) => {});
wss.on('error', (error) => {});
wss.on('close', () => {});

// Client events
ws.on('message', (data) => {});
ws.on('ping', () => {});
ws.on('pong', () => {});
ws.on('close', () => {});
ws.on('error', (error) => {});
```

---

## Next Steps

1. **Implement CRDT** for conflict-free replicated data types
2. **Add E2E encryption** for sensitive messages
3. **Implement presence cursors** for collaborative editing
4. **Add voice/video** channels using WebRTC
5. **Build admin dashboard** for monitoring

---

## Support

For issues or questions:
1. Check the troubleshooting section
2. Review test files for examples
3. Check server logs
4. Use the real-time monitor for debugging

**Happy real-time coding!** 🚀
