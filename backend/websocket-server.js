/**
 * Production WebSocket Server
 * Complete implementation with auth, queuing, and rooms
 */

const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const http = require('http');

// Configuration
const PORT = process.env.WS_PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-in-production';
const HEARTBEAT_INTERVAL = 30000; // 30 seconds
const HEARTBEAT_TIMEOUT = 60000;  // 60 seconds
const MESSAGE_TTL = 300000;       // 5 minutes
const MAX_QUEUE_SIZE = 100;

// In-memory stores (use Redis in production)
const connections = new Map();     // userId -> ws
const messageQueues = new Map();   // userId -> messages[]
const rooms = new Map();          // roomId -> Set<userId>
const userRooms = new Map();      // userId -> Set<roomId>
const presenceData = new Map();   // userId -> presenceInfo

// Create HTTP server
const server = http.createServer();

// Create WebSocket server
const wss = new WebSocket.Server({ 
  server,
  verifyClient: (info, cb) => {
    // Extract token from query string or headers
    const token = extractToken(info.req);
    
    if (!token) {
      cb(false, 401, 'Unauthorized');
      return;
    }
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      info.req.userId = decoded.userId;
      cb(true);
    } catch (error) {
      cb(false, 401, 'Invalid token');
    }
  }
});

/**
 * Extract JWT token from request
 */
function extractToken(req) {
  // Try Authorization header
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  
  // Try query parameter
  const url = new URL(req.url, `http://${req.headers.host}`);
  return url.searchParams.get('token');
}

/**
 * Connection handler
 */
wss.on('connection', (ws, req) => {
  const userId = req.userId;
  console.log(`[${new Date().toISOString()}] User ${userId} connected`);
  
  // Store connection
  connections.set(userId, ws);
  ws.userId = userId;
  ws.isAlive = true;
  ws.rooms = new Set();
  
  // Send connection confirmation
  sendMessage(ws, {
    type: 'connect',
    payload: {
      status: 'connected',
      userId,
      timestamp: Date.now()
    }
  });
  
  // Flush queued messages
  flushQueue(userId, ws);
  
  // Join default room
  joinRoom(userId, 'global');
  
  // Update presence
  updatePresence(userId, {
    status: 'online',
    connectedAt: Date.now()
  });
  
  // Broadcast presence to others
  broadcastToRoom('global', {
    type: 'presence:join',
    payload: {
      userId,
      timestamp: Date.now()
    }
  }, userId);
  
  // Set up heartbeat
  const heartbeatInterval = setInterval(() => {
    if (!ws.isAlive) {
      console.log(`[${new Date().toISOString()}] User ${userId} failed heartbeat`);
      clearInterval(heartbeatInterval);
      ws.terminate();
      return;
    }
    
    ws.isAlive = false;
    ws.ping();
  }, HEARTBEAT_INTERVAL);
  
  // Handle pong
  ws.on('pong', () => {
    ws.isAlive = true;
    
    // Send latency info back
    sendMessage(ws, {
      type: 'pong',
      payload: {
        timestamp: Date.now()
      }
    });
  });
  
  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      handleMessage(userId, message);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Invalid message from ${userId}:`, error);
      sendMessage(ws, {
        type: 'error',
        payload: {
          message: 'Invalid message format',
          timestamp: Date.now()
        }
      });
    }
  });
  
  // Handle close
  ws.on('close', () => {
    console.log(`[${new Date().toISOString()}] User ${userId} disconnected`);
    clearInterval(heartbeatInterval);
    connections.delete(userId);
    
    // Update presence
    updatePresence(userId, {
      status: 'offline',
      disconnectedAt: Date.now()
    });
    
    // Leave all rooms
    const rooms = userRooms.get(userId) || new Set();
    rooms.forEach(roomId => {
      leaveRoom(userId, roomId);
      
      // Broadcast leave event
      broadcastToRoom(roomId, {
        type: 'presence:leave',
        payload: {
          userId,
          timestamp: Date.now()
        }
      }, userId);
    });
  });
  
  // Handle errors
  ws.on('error', (error) => {
    console.error(`[${new Date().toISOString()}] WebSocket error for ${userId}:`, error);
  });
});

/**
 * Handle incoming messages
 */
function handleMessage(userId, message) {
  const { id, type, payload } = message;
  
  console.log(`[${new Date().toISOString()}] Message from ${userId}: ${type}`);
  
  // Add metadata
  const enrichedMessage = {
    ...message,
    userId,
    timestamp: Date.now(),
    id: id || generateId()
  };
  
  // Route based on message type
  switch (type) {
    case 'data:create':
    case 'data:update':
    case 'data:delete':
      handleDataMessage(enrichedMessage);
      break;
      
    case 'room:join':
      joinRoom(userId, payload.roomId);
      break;
      
    case 'room:leave':
      leaveRoom(userId, payload.roomId);
      break;
      
    case 'room:message':
      broadcastToRoom(payload.roomId, enrichedMessage, userId);
      break;
      
    case 'presence:update':
      updatePresence(userId, payload);
      broadcastPresenceUpdate(userId);
      break;
      
    case 'ping':
      // Respond with pong
      const ws = connections.get(userId);
      if (ws) {
        sendMessage(ws, {
          type: 'pong',
          payload: {
            timestamp: Date.now(),
            originalTimestamp: payload.timestamp
          }
        });
      }
      break;
      
    default:
      // Broadcast to all by default
      broadcastToAll(enrichedMessage, userId);
  }
}

/**
 * Handle data messages (CRUD operations)
 */
function handleDataMessage(message) {
  const { userId, type, payload } = message;
  
  // Validate payload
  if (!payload.type || !payload.data) {
    const ws = connections.get(userId);
    if (ws) {
      sendMessage(ws, {
        type: 'error',
        payload: {
          message: 'Invalid data message format',
          originalMessage: message
        }
      });
    }
    return;
  }
  
  // Broadcast to all connected clients
  broadcastToAll(message, userId);
  
  // Queue for offline users in same room
  const userRoom = Array.from(userRooms.get(userId) || [])[0] || 'global';
  const roomUsers = rooms.get(userRoom) || new Set();
  
  roomUsers.forEach(targetUserId => {
    if (targetUserId !== userId && !connections.has(targetUserId)) {
      queueMessage(targetUserId, message);
    }
  });
}

/**
 * Send message to specific client
 */
function sendMessage(ws, message) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({
      ...message,
      id: message.id || generateId(),
      timestamp: message.timestamp || Date.now()
    }));
  }
}

/**
 * Broadcast to all connected clients
 */
function broadcastToAll(message, excludeUserId = null) {
  connections.forEach((ws, userId) => {
    if (userId !== excludeUserId) {
      sendMessage(ws, message);
    }
  });
}

/**
 * Broadcast to specific room
 */
function broadcastToRoom(roomId, message, excludeUserId = null) {
  const roomUsers = rooms.get(roomId) || new Set();
  
  roomUsers.forEach(userId => {
    if (userId !== excludeUserId) {
      const ws = connections.get(userId);
      if (ws) {
        sendMessage(ws, message);
      } else {
        // Queue for offline users
        queueMessage(userId, message);
      }
    }
  });
}

/**
 * Queue message for offline user
 */
function queueMessage(userId, message) {
  if (!messageQueues.has(userId)) {
    messageQueues.set(userId, []);
  }
  
  const queue = messageQueues.get(userId);
  
  // Add message with TTL
  queue.push({
    ...message,
    queuedAt: Date.now(),
    ttl: Date.now() + MESSAGE_TTL
  });
  
  // Limit queue size
  if (queue.length > MAX_QUEUE_SIZE) {
    queue.shift();
  }
  
  console.log(`[${new Date().toISOString()}] Queued message for ${userId}, queue size: ${queue.length}`);
}

/**
 * Flush queued messages to reconnected user
 */
function flushQueue(userId, ws) {
  const queue = messageQueues.get(userId);
  
  if (!queue || queue.length === 0) {
    return;
  }
  
  console.log(`[${new Date().toISOString()}] Flushing ${queue.length} queued messages to ${userId}`);
  
  // Filter out expired messages
  const now = Date.now();
  const validMessages = queue.filter(msg => msg.ttl > now);
  
  // Send all valid messages
  validMessages.forEach(msg => {
    sendMessage(ws, msg);
  });
  
  // Clear queue
  messageQueues.delete(userId);
}

/**
 * Join room
 */
function joinRoom(userId, roomId) {
  // Add user to room
  if (!rooms.has(roomId)) {
    rooms.set(roomId, new Set());
  }
  rooms.get(roomId).add(userId);
  
  // Track user's rooms
  if (!userRooms.has(userId)) {
    userRooms.set(userId, new Set());
  }
  userRooms.get(userId).add(roomId);
  
  const ws = connections.get(userId);
  if (ws) {
    ws.rooms.add(roomId);
    
    // Confirm join
    sendMessage(ws, {
      type: 'room:joined',
      payload: {
        roomId,
        members: Array.from(rooms.get(roomId))
      }
    });
  }
  
  console.log(`[${new Date().toISOString()}] User ${userId} joined room ${roomId}`);
}

/**
 * Leave room
 */
function leaveRoom(userId, roomId) {
  const room = rooms.get(roomId);
  if (room) {
    room.delete(userId);
    if (room.size === 0) {
      rooms.delete(roomId);
    }
  }
  
  const userRoom = userRooms.get(userId);
  if (userRoom) {
    userRoom.delete(roomId);
    if (userRoom.size === 0) {
      userRooms.delete(userId);
    }
  }
  
  const ws = connections.get(userId);
  if (ws) {
    ws.rooms.delete(roomId);
    
    // Confirm leave
    sendMessage(ws, {
      type: 'room:left',
      payload: { roomId }
    });
  }
  
  console.log(`[${new Date().toISOString()}] User ${userId} left room ${roomId}`);
}

/**
 * Update presence information
 */
function updatePresence(userId, data) {
  presenceData.set(userId, {
    ...presenceData.get(userId),
    ...data,
    userId,
    lastUpdate: Date.now()
  });
}

/**
 * Broadcast presence update
 */
function broadcastPresenceUpdate(userId) {
  const presence = presenceData.get(userId);
  
  if (!presence) return;
  
  const userRoom = Array.from(userRooms.get(userId) || [])[0] || 'global';
  
  broadcastToRoom(userRoom, {
    type: 'presence:update',
    payload: presence
  }, userId);
}

/**
 * Generate unique ID
 */
function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Clean up expired messages periodically
 */
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  messageQueues.forEach((queue, userId) => {
    const originalLength = queue.length;
    const filtered = queue.filter(msg => msg.ttl > now);
    
    if (filtered.length < originalLength) {
      if (filtered.length === 0) {
        messageQueues.delete(userId);
      } else {
        messageQueues.set(userId, filtered);
      }
      cleanedCount += originalLength - filtered.length;
    }
  });
  
  if (cleanedCount > 0) {
    console.log(`[${new Date().toISOString()}] Cleaned ${cleanedCount} expired messages`);
  }
}, 60000); // Every minute

// Start server
server.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║     WebSocket Server Started           ║
║                                        ║
║     Port: ${PORT}                        ║
║     Time: ${new Date().toISOString()}         ║
║                                        ║
║     Features:                          ║
║     ✓ JWT Authentication              ║
║     ✓ Message Queuing                 ║
║     ✓ Room Support                    ║
║     ✓ Presence Tracking               ║
║     ✓ Heartbeat Monitoring            ║
╚════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[${new Date().toISOString()}] Shutting down gracefully...');
  
  // Notify all clients
  broadcastToAll({
    type: 'server:shutdown',
    payload: {
      message: 'Server is shutting down',
      timestamp: Date.now()
    }
  });
  
  // Close all connections
  connections.forEach(ws => ws.close());
  
  // Close server
  wss.close(() => {
    server.close(() => {
      console.log('[${new Date().toISOString()}] Server shut down complete');
      process.exit(0);
    });
  });
  
  // Force exit after 10 seconds
  setTimeout(() => {
    console.error('[${new Date().toISOString()}] Forced shutdown');
    process.exit(1);
  }, 10000);
});

module.exports = { wss, connections, rooms };
