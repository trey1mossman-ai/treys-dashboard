/**
 * Mock WebSocket Server - For Testing
 * Run with: node mock-websocket-server.js
 */

const WebSocket = require('ws');

const PORT = 3001;
const wss = new WebSocket.Server({ port: PORT });

console.log(`🚀 Mock WebSocket Server running on ws://localhost:${PORT}`);

// Store connected clients
const clients = new Set();

// Simulated data store
const dataStore = {
  todos: [],
  agenda: [],
  notes: [],
};

wss.on('connection', (ws) => {
  console.log('✅ Client connected');
  clients.add(ws);

  // Send connection confirmation
  ws.send(JSON.stringify({
    id: generateId(),
    type: 'connect',
    payload: { message: 'Connected to mock server' },
    timestamp: Date.now(),
  }));

  // Handle messages
  ws.on('message', (data) => {
    try {
      const message = JSON.parse(data);
      console.log('📨 Received:', message.type, message.payload);

      // Handle different message types
      switch (message.type) {
        case 'data:create':
          handleDataCreate(message, ws);
          break;
        case 'data:update':
          handleDataUpdate(message, ws);
          break;
        case 'data:delete':
          handleDataDelete(message, ws);
          break;
        case 'ping':
          ws.send(JSON.stringify({
            id: generateId(),
            type: 'pong',
            payload: {},
            timestamp: Date.now(),
          }));
          break;
        default:
          // Echo the message back to all clients
          broadcast(message);
      }
    } catch (error) {
      console.error('❌ Error handling message:', error);
    }
  });

  ws.on('close', () => {
    console.log('👋 Client disconnected');
    clients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('❌ WebSocket error:', error);
  });
});

function handleDataCreate(message, sender) {
  const { type, data } = message.payload;
  const id = generateId();
  
  const newItem = {
    id,
    ...data,
    createdAt: Date.now(),
  };

  // Store the data
  if (dataStore[type]) {
    dataStore[type].push(newItem);
  }

  // Broadcast to all clients
  broadcast({
    id: generateId(),
    type: 'data:create',
    payload: {
      type,
      data: newItem,
    },
    timestamp: Date.now(),
  });

  console.log(`✅ Created ${type}:`, newItem);
}

function handleDataUpdate(message, sender) {
  const { type, id, data } = message.payload;
  
  // Update the data
  if (dataStore[type]) {
    const index = dataStore[type].findIndex(item => item.id === id);
    if (index !== -1) {
      dataStore[type][index] = {
        ...dataStore[type][index],
        ...data,
        updatedAt: Date.now(),
      };
    }
  }

  // Broadcast to all clients
  broadcast({
    id: generateId(),
    type: 'data:update',
    payload: {
      type,
      id,
      data,
    },
    timestamp: Date.now(),
  });

  console.log(`✅ Updated ${type} ${id}:`, data);
}

function handleDataDelete(message, sender) {
  const { type, id } = message.payload;
  
  // Delete the data
  if (dataStore[type]) {
    dataStore[type] = dataStore[type].filter(item => item.id !== id);
  }

  // Broadcast to all clients
  broadcast({
    id: generateId(),
    type: 'data:delete',
    payload: {
      type,
      id,
    },
    timestamp: Date.now(),
  });

  console.log(`✅ Deleted ${type} ${id}`);
}

function broadcast(message) {
  const messageStr = JSON.stringify(message);
  clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(messageStr);
    }
  });
}

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
}

// Simulate some activity
setInterval(() => {
  if (clients.size > 0) {
    // Randomly create a todo
    if (Math.random() > 0.7) {
      const todo = {
        id: generateId(),
        text: `Random todo ${Math.floor(Math.random() * 100)}`,
        completed: false,
        createdAt: Date.now(),
      };
      
      dataStore.todos.push(todo);
      
      broadcast({
        id: generateId(),
        type: 'data:create',
        payload: {
          type: 'todos',
          data: todo,
        },
        timestamp: Date.now(),
      });
      
      console.log('🎲 Simulated todo creation');
    }
  }
}, 10000); // Every 10 seconds

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down mock server...');
  wss.close(() => {
    process.exit(0);
  });
});

console.log('📝 Mock server ready for testing!');
console.log('Supports: data:create, data:update, data:delete');
console.log('Auto-broadcasts to all connected clients');
console.log('Simulates random todo creation every 10s');
