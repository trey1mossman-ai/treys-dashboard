const WebSocket = require('ws');
const jwt = require('jsonwebtoken');

// WebSocket server on port 3001
const wss = new WebSocket.Server({
  port: 3001,
  verifyClient: (info, cb) => {
    // Extract token from query params or headers
    const token = new URL(info.req.url, 'http://localhost').searchParams.get('token');

    if (!token) {
      cb(false, 401, 'Unauthorized');
      return;
    }

    try {
      // Verify JWT token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret');
      info.req.userId = decoded.userId;
      cb(true);
    } catch (err) {
      cb(false, 401, 'Invalid token');
    }
  }
});

// Data structures
const connections = new Map();     // userId -> ws
const messageQueue = new Map();    // userId -> messages[]
const rooms = new Map();          // roomId -> Set<userId>
const presence = new Map();       // userId -> { status, lastSeen }

// Message validation schema
const WSMessageSchema = {
  type: ['AGENDA_UPDATE', 'TASK_UPDATE', 'NOTE_UPDATE', 'PRESENCE_UPDATE',
         'TYPING_START', 'TYPING_STOP', 'SYNC_REQUEST', 'SYNC_RESPONSE'],
  payload: 'object',
  timestamp: 'string',
  userId: 'string'
};

function validateMessage(message) {
  return message.type && WSMessageSchema.type.includes(message.type) &&
         message.payload && typeof message.payload === 'object';
}

// Connection handler
wss.on('connection', (ws, req) => {
  const userId = req.userId;
  console.log(`[WS] User ${userId} connected`);

  // Store connection
  connections.set(userId, ws);

  // Update presence
  presence.set(userId, {
    status: 'online',
    lastSeen: new Date().toISOString()
  });

  // Send connection confirmation
  ws.send(JSON.stringify({
    type: 'CONNECTION_ACK',
    payload: { userId, status: 'connected' },
    timestamp: new Date().toISOString()
  }));

  // Flush queued messages
  if (messageQueue.has(userId)) {
    const messages = messageQueue.get(userId);
    messages.forEach(msg => ws.send(JSON.stringify(msg)));
    messageQueue.delete(userId);
    console.log(`[WS] Flushed ${messages.length} queued messages for ${userId}`);
  }

  // Broadcast presence update
  broadcast({
    type: 'PRESENCE_UPDATE',
    payload: {
      userId,
      status: 'online',
      timestamp: new Date().toISOString()
    }
  }, userId);

  // Setup heartbeat
  let isAlive = true;
  ws.isAlive = true;

  ws.on('pong', () => {
    ws.isAlive = true;
  });

  const heartbeat = setInterval(() => {
    if (ws.readyState === WebSocket.OPEN) {
      if (!ws.isAlive) {
        console.log(`[WS] User ${userId} failed heartbeat, disconnecting`);
        ws.terminate();
        return;
      }
      ws.isAlive = false;
      ws.ping();
    }
  }, 30000);

  // Message handler
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);

      if (!validateMessage(message)) {
        ws.send(JSON.stringify({
          type: 'ERROR',
          payload: { error: 'Invalid message format' }
        }));
        return;
      }

      // Add metadata
      message.userId = userId;
      message.timestamp = new Date().toISOString();

      console.log(`[WS] Message from ${userId}:`, message.type);

      // Handle different message types
      switch (message.type) {
        case 'JOIN_ROOM':
          joinRoom(userId, message.payload.roomId);
          break;

        case 'LEAVE_ROOM':
          leaveRoom(userId, message.payload.roomId);
          break;

        case 'TYPING_START':
        case 'TYPING_STOP':
          broadcastToRoom(message.payload.roomId, message);
          break;

        case 'SYNC_REQUEST':
          handleSyncRequest(userId, message.payload);
          break;

        default:
          // Broadcast to all relevant users
          broadcast(message, userId);
      }

    } catch (error) {
      console.error('[WS] Message error:', error);
      ws.send(JSON.stringify({
        type: 'ERROR',
        payload: { error: 'Failed to process message' }
      }));
    }
  });

  // Disconnect handler
  ws.on('close', () => {
    console.log(`[WS] User ${userId} disconnected`);
    clearInterval(heartbeat);
    connections.delete(userId);

    // Update presence
    presence.set(userId, {
      status: 'offline',
      lastSeen: new Date().toISOString()
    });

    // Broadcast presence update
    broadcast({
      type: 'PRESENCE_LEAVE',
      payload: {
        userId,
        timestamp: new Date().toISOString()
      }
    }, userId);

    // Leave all rooms
    rooms.forEach((users, roomId) => {
      if (users.has(userId)) {
        users.delete(userId);
      }
    });
  });

  ws.on('error', (error) => {
    console.error(`[WS] Error for user ${userId}:`, error);
  });
});

// Room management
function joinRoom(userId, roomId) {
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(userId);
  console.log(`[WS] User ${userId} joined room ${roomId}`);
}

function leaveRoom(userId, roomId) {
  if (rooms.has(roomId)) {
    rooms.get(roomId).delete(userId);
    if (rooms.get(roomId).size === 0) {
      rooms.delete(roomId);
    }
  }
  console.log(`[WS] User ${userId} left room ${roomId}`);
}

// Broadcast functions
function broadcast(message, excludeUserId = null) {
  connections.forEach((ws, userId) => {
    if (userId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
    }
  });
}

function broadcastToRoom(roomId, message, excludeUserId = null) {
  if (!rooms.has(roomId)) return;

  rooms.get(roomId).forEach(userId => {
    if (userId !== excludeUserId) {
      const ws = connections.get(userId);
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
      } else if (!ws) {
        // Queue message for offline user
        queueMessage(userId, message);
      }
    }
  });
}

// Message queuing for offline users
function queueMessage(userId, message) {
  if (!messageQueue.has(userId)) {
    messageQueue.set(userId, []);
  }

  const queue = messageQueue.get(userId);
  queue.push(message);

  // Limit queue size
  if (queue.length > 100) {
    queue.shift(); // Remove oldest
  }

  console.log(`[WS] Queued message for offline user ${userId}`);
}

// Sync handler
async function handleSyncRequest(userId, payload) {
  const ws = connections.get(userId);
  if (!ws) return;

  try {
    // Fetch latest data from database
    // This is a placeholder - implement your actual data fetching
    const syncData = {
      agenda: [], // Fetch from DB
      tasks: [],  // Fetch from DB
      notes: []   // Fetch from DB
    };

    ws.send(JSON.stringify({
      type: 'SYNC_RESPONSE',
      payload: syncData,
      timestamp: new Date().toISOString()
    }));

  } catch (error) {
    console.error('[WS] Sync error:', error);
    ws.send(JSON.stringify({
      type: 'ERROR',
      payload: { error: 'Sync failed' }
    }));
  }
}

// Cleanup interval for old queued messages
setInterval(() => {
  const oneHourAgo = Date.now() - 60 * 60 * 1000;

  messageQueue.forEach((messages, userId) => {
    const filtered = messages.filter(msg =>
      new Date(msg.timestamp).getTime() > oneHourAgo
    );

    if (filtered.length !== messages.length) {
      console.log(`[WS] Cleaned ${messages.length - filtered.length} old messages for ${userId}`);
      messageQueue.set(userId, filtered);
    }

    if (filtered.length === 0) {
      messageQueue.delete(userId);
    }
  });
}, 5 * 60 * 1000); // Every 5 minutes

// Server info
console.log('WebSocket server running on port 3001');
console.log('Waiting for connections...');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, closing WebSocket server');
  wss.close(() => {
    console.log('WebSocket server closed');
    process.exit(0);
  });
});