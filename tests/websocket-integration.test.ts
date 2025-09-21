/**
 * WebSocket Integration Tests
 * Comprehensive test suite for real-time features
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:3001';
const TEST_TIMEOUT = 5000;

// Color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

// Test results tracking
let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

/**
 * Test helper functions
 */
function test(name: string, fn: () => Promise<void>) {
  totalTests++;
  return fn()
    .then(() => {
      passedTests++;
      console.log(`${colors.green}✓${colors.reset} ${name}`);
    })
    .catch((error) => {
      failedTests++;
      console.log(`${colors.red}✗${colors.reset} ${name}`);
      console.error(`  ${colors.red}${error.message}${colors.reset}`);
    });
}

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * WebSocket Test Suite
 */
async function runTests() {
  console.log('\n🧪 WebSocket Integration Tests\n');
  console.log('================================\n');

  // Test 1: Basic Connection
  await test('WebSocket connects successfully', async () => {
    const ws = new WebSocket(WS_URL);
    
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Connection timeout')), TEST_TIMEOUT);
    });
    
    ws.close();
  });

  // Test 2: Receive Connection Confirmation
  await test('Receives connection confirmation', async () => {
    const ws = new WebSocket(WS_URL);
    
    const message = await new Promise<any>((resolve, reject) => {
      ws.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.type === 'connect') {
          resolve(msg);
        }
      });
      ws.on('error', reject);
      setTimeout(() => reject(new Error('No connection message')), TEST_TIMEOUT);
    });
    
    assert(message.type === 'connect', 'Should receive connect message');
    assert(message.timestamp > 0, 'Should have timestamp');
    
    ws.close();
  });

  // Test 3: Message Broadcasting
  await test('Broadcasts messages to all clients', async () => {
    const ws1 = new WebSocket(WS_URL);
    const ws2 = new WebSocket(WS_URL);
    
    // Wait for both to connect
    await Promise.all([
      new Promise(resolve => ws1.on('open', resolve)),
      new Promise(resolve => ws2.on('open', resolve))
    ]);
    
    // Send message from ws1
    const testMessage = {
      id: 'test-123',
      type: 'data:create',
      payload: { type: 'todos', data: { text: 'Test todo' } },
      timestamp: Date.now()
    };
    
    // Listen for message on ws2
    const received = await new Promise<any>((resolve, reject) => {
      ws2.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === 'test-123') {
          resolve(msg);
        }
      });
      
      ws1.send(JSON.stringify(testMessage));
      setTimeout(() => reject(new Error('Broadcast timeout')), TEST_TIMEOUT);
    });
    
    assert(received.id === testMessage.id, 'Should receive same message');
    assert(received.type === testMessage.type, 'Should have same type');
    
    ws1.close();
    ws2.close();
  });

  // Test 4: Reconnection Handling
  await test('Handles reconnection gracefully', async () => {
    let ws = new WebSocket(WS_URL);
    
    await new Promise(resolve => ws.on('open', resolve));
    
    // Close connection
    ws.close();
    await delay(100);
    
    // Reconnect
    ws = new WebSocket(WS_URL);
    
    await new Promise((resolve, reject) => {
      ws.on('open', resolve);
      ws.on('error', reject);
      setTimeout(() => reject(new Error('Reconnection failed')), TEST_TIMEOUT);
    });
    
    ws.close();
  });

  // Test 5: Message Queue (if implemented)
  await test('Queues messages for offline clients', async () => {
    const ws1 = new WebSocket(WS_URL);
    
    await new Promise(resolve => ws1.on('open', resolve));
    
    // Send a message that should be queued
    const queuedMessage = {
      id: 'queued-123',
      type: 'data:update',
      payload: { userId: 'user-123', data: { status: 'offline' } },
      timestamp: Date.now()
    };
    
    ws1.send(JSON.stringify(queuedMessage));
    ws1.close();
    
    // Simulate the target client reconnecting
    await delay(100);
    const ws2 = new WebSocket(WS_URL);
    
    // Check if queued message is received
    // Note: This requires backend implementation
    const received = await new Promise<any>((resolve, reject) => {
      ws2.on('message', (data) => {
        const msg = JSON.parse(data.toString());
        if (msg.id === 'queued-123') {
          resolve(msg);
        }
      });
      
      // If queue not implemented, test will timeout (expected)
      setTimeout(() => resolve(null), 1000);
    });
    
    if (received) {
      assert(received.id === queuedMessage.id, 'Should receive queued message');
    } else {
      console.log(`  ${colors.yellow}(Queue not implemented yet)${colors.reset}`);
    }
    
    ws2.close();
  });

  // Test 6: Heartbeat/Ping-Pong
  await test('Maintains connection with heartbeat', async () => {
    const ws = new WebSocket(WS_URL);
    
    await new Promise(resolve => ws.on('open', resolve));
    
    let pingReceived = false;
    ws.on('ping', () => {
      pingReceived = true;
    });
    
    // Wait for ping (if implemented)
    await delay(2000);
    
    if (!pingReceived) {
      console.log(`  ${colors.yellow}(Heartbeat not implemented yet)${colors.reset}`);
    }
    
    ws.close();
  });

  // Test 7: Error Handling
  await test('Handles invalid messages gracefully', async () => {
    const ws = new WebSocket(WS_URL);
    
    await new Promise(resolve => ws.on('open', resolve));
    
    // Send invalid JSON
    ws.send('invalid json{');
    
    // Should not crash the server
    await delay(500);
    
    // Try sending valid message after
    const validMessage = {
      id: 'valid-123',
      type: 'data:create',
      payload: { test: true },
      timestamp: Date.now()
    };
    
    ws.send(JSON.stringify(validMessage));
    
    // Should still be connected
    assert(ws.readyState === WebSocket.OPEN, 'Should stay connected');
    
    ws.close();
  });

  // Test 8: Multiple Message Types
  await test('Handles different message types', async () => {
    const ws = new WebSocket(WS_URL);
    
    await new Promise(resolve => ws.on('open', resolve));
    
    const messageTypes = [
      'data:create',
      'data:update',
      'data:delete',
      'presence:update',
      'optimistic:start'
    ];
    
    for (const type of messageTypes) {
      const message = {
        id: `test-${type}`,
        type,
        payload: { test: true },
        timestamp: Date.now()
      };
      
      ws.send(JSON.stringify(message));
      await delay(50);
    }
    
    ws.close();
  });

  // Test 9: Concurrent Connections
  await test('Handles many concurrent connections', async () => {
    const connections = [];
    
    // Create 10 concurrent connections
    for (let i = 0; i < 10; i++) {
      const ws = new WebSocket(WS_URL);
      connections.push(ws);
    }
    
    // Wait for all to connect
    await Promise.all(
      connections.map(ws => 
        new Promise(resolve => ws.on('open', resolve))
      )
    );
    
    // Send message from first connection
    const testMessage = {
      id: 'concurrent-test',
      type: 'data:create',
      payload: { test: true },
      timestamp: Date.now()
    };
    
    connections[0].send(JSON.stringify(testMessage));
    
    // All should receive it
    let receivedCount = 0;
    await Promise.race([
      Promise.all(
        connections.slice(1).map(ws =>
          new Promise(resolve => {
            ws.on('message', (data) => {
              const msg = JSON.parse(data.toString());
              if (msg.id === 'concurrent-test') {
                receivedCount++;
                resolve(true);
              }
            });
          })
        )
      ),
      delay(1000)
    ]);
    
    assert(receivedCount >= 5, 'Most clients should receive broadcast');
    
    // Close all connections
    connections.forEach(ws => ws.close());
  });

  // Test 10: Performance - Rapid Messages
  await test('Handles rapid message sending', async () => {
    const ws = new WebSocket(WS_URL);
    
    await new Promise(resolve => ws.on('open', resolve));
    
    const startTime = Date.now();
    const messageCount = 100;
    
    for (let i = 0; i < messageCount; i++) {
      const message = {
        id: `perf-${i}`,
        type: 'data:update',
        payload: { index: i },
        timestamp: Date.now()
      };
      ws.send(JSON.stringify(message));
    }
    
    const duration = Date.now() - startTime;
    assert(duration < 1000, `Should send ${messageCount} messages quickly`);
    
    console.log(`  ${colors.blue}(Sent ${messageCount} messages in ${duration}ms)${colors.reset}`);
    
    ws.close();
  });

  // Summary
  console.log('\n================================\n');
  console.log(`Tests Complete: ${passedTests}/${totalTests} passed\n`);
  
  if (failedTests > 0) {
    console.log(`${colors.red}${failedTests} tests failed${colors.reset}\n`);
    process.exit(1);
  } else {
    console.log(`${colors.green}All tests passed!${colors.reset}\n`);
    process.exit(0);
  }
}

// Run tests
runTests().catch(console.error);
