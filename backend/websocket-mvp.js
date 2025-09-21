// MVP WebSocket Server - Get up and running in 2 minutes!
const WebSocket = require('ws');

// Create server on port 3001 (frontend expects this)
const wss = new WebSocket.Server({
  port: 3001,
  cors: {
    origin: "http://localhost:5173",
    credentials: true
  }
});

// Connection tracking
const connections = new Map();
let connectionIdCounter = 0;

// Simple message queue for offline users
const messageQueue = new Map();

console.log('🚀 WebSocket MVP Server started on ws://localhost:3001');
console.log('📡 Frontend will auto-connect when you visit http://localhost:5173');

wss.on('connection', (ws, req) => {
  const connectionId = ++connectionIdCounter;
  const userId = `user_${connectionId}`; // Simple user ID for MVP

  console.log(`✅ Client connected: ${userId}`);
  connections.set(userId, ws);

  // Send connection confirmation
  ws.send(JSON.stringify({
    id: `${Date.now()}-${Math.random()}`,
    type: 'system:connected',
    payload: {
      status: 'connected',
      userId,
      serverTime: new Date().toISOString()
    },
    timestamp: Date.now()
  }));

  // Flush any queued messages
  if (messageQueue.has(userId)) {
    const messages = messageQueue.get(userId);
    console.log(`📬 Flushing ${messages.length} queued messages for ${userId}`);
    messages.forEach(msg => ws.send(JSON.stringify(msg)));
    messageQueue.delete(userId);
  }

  // Simple heartbeat
  let isAlive = true;
  ws.on('pong', () => { isAlive = true; });

  const heartbeat = setInterval(() => {
    if (!isAlive) {
      console.log(`💔 Heartbeat failed for ${userId}, disconnecting`);
      ws.terminate();
      return;
    }
    isAlive = false;
    ws.ping();
  }, 30000);

  // Handle incoming messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data.toString());
      console.log(`📨 Message from ${userId}:`, message.type);

      // Add server metadata
      message.serverId = `${Date.now()}-${Math.random()}`;
      message.serverTime = Date.now();
      message.fromUser = userId;

      // Broadcast to all OTHER connected clients
      let broadcastCount = 0;
      wss.clients.forEach((client) => {
        if (client !== ws && client.readyState === WebSocket.OPEN) {
          client.send(JSON.stringify(message));
          broadcastCount++;
        }
      });

      console.log(`📡 Broadcasted to ${broadcastCount} clients`);

      // Send acknowledgment back to sender
      ws.send(JSON.stringify({
        id: message.serverId,
        type: 'system:ack',
        payload: {
          originalId: message.id,
          originalType: message.type,
          broadcastCount
        },
        timestamp: Date.now()
      }));

    } catch (error) {
      console.error('❌ Message error:', error);
      ws.send(JSON.stringify({
        type: 'system:error',
        payload: { error: error.message },
        timestamp: Date.now()
      }));
    }
  });

  // Handle disconnect
  ws.on('close', () => {
    console.log(`👋 Client disconnected: ${userId}`);
    clearInterval(heartbeat);
    connections.delete(userId);

    // Notify other clients
    broadcast({
      type: 'presence:leave',
      payload: { userId },
      timestamp: Date.now()
    });
  });

  ws.on('error', (error) => {
    console.error(`❌ WebSocket error for ${userId}:`, error);
  });
});

// Broadcast helper
function broadcast(message, excludeUserId = null) {
  let count = 0;
  connections.forEach((ws, userId) => {
    if (userId !== excludeUserId && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(message));
      count++;
    }
  });
  return count;
}

// Queue message for offline user
function queueMessageForUser(userId, message) {
  if (!messageQueue.has(userId)) {
    messageQueue.set(userId, []);
  }

  const queue = messageQueue.get(userId);
  queue.push(message);

  // Keep only last 50 messages
  if (queue.length > 50) {
    queue.shift();
  }

  console.log(`📦 Queued message for offline user ${userId}`);
}

// Clean up old messages every 5 minutes
setInterval(() => {
  const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;

  messageQueue.forEach((messages, userId) => {
    const fresh = messages.filter(msg => msg.timestamp > fiveMinutesAgo);
    if (fresh.length < messages.length) {
      console.log(`🧹 Cleaned ${messages.length - fresh.length} old messages for ${userId}`);
      messageQueue.set(userId, fresh);
    }
  });
}, 5 * 60 * 1000);

// Server status endpoint (optional)
console.log('\n📊 Server Status:');
setInterval(() => {
  console.log(`   Active connections: ${connections.size}`);
  console.log(`   Queued users: ${messageQueue.size}`);
}, 60000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  wss.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});