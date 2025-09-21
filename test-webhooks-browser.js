// Webhook Testing Script - Run in browser console or as test file
console.log('🔍 TESTING ALL WEBHOOKS...\n');

const WEBHOOK_TESTS = [
  {
    name: 'Email Webhook',
    url: 'https://ailifeassistanttm.com/api/webhook/emails',
    method: 'GET',
    expectedKeys: ['emails', 'count', 'lastSync']
  },
  {
    name: 'Calendar Webhook',
    url: 'https://ailifeassistanttm.com/api/webhook/calendar',
    method: 'GET',
    expectedKeys: ['events', 'count', 'timeRange']
  },
  {
    name: 'AI Agent',
    url: 'https://n8n.treys.cc/webhook/agent-chat',
    method: 'POST',
    body: {
      sessionId: 'test-' + Date.now(),
      action: 'sendMessage',
      chatInput: 'Test connection'
    },
    expectedKeys: ['response', 'status']
  }
];

async function testWebhooks() {
  const results = {
    working: [],
    broken: [],
    issues: []
  };

  for (const test of WEBHOOK_TESTS) {
    console.log(`Testing ${test.name}...`);
    
    try {
      const options = {
        method: test.method,
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache'
        }
      };
      
      if (test.body) {
        options.body = JSON.stringify(test.body);
      }
      
      const response = await fetch(test.url, options);
      const data = await response.json();
      
      console.log(`Response status: ${response.status}`);
      console.log('Data received:', data);
      
      // Check if expected keys exist
      const hasExpectedKeys = test.expectedKeys.every(key => 
        data.hasOwnProperty(key) || 
        (data.data && data.data.hasOwnProperty(key))
      );
      
      if (response.ok && hasExpectedKeys) {
        results.working.push({
          name: test.name,
          url: test.url,
          dataStructure: Object.keys(data)
        });
        console.log(`✅ ${test.name} - WORKING\n`);
      } else {
        results.broken.push({
          name: test.name,
          url: test.url,
          issue: !response.ok ? `HTTP ${response.status}` : 'Missing expected data'
        });
        console.log(`❌ ${test.name} - ISSUES FOUND\n`);
      }
      
    } catch (error) {
      results.broken.push({
        name: test.name,
        url: test.url,
        error: error.message
      });
      console.error(`❌ ${test.name} - ERROR:`, error.message, '\n');
    }
  }
  
  // Generate report
  console.log('========== WEBHOOK TEST REPORT ==========');
  console.log(`✅ Working: ${results.working.length}`);
  console.log(`❌ Broken: ${results.broken.length}`);
  console.log('\nDetails:', results);
  
  return results;
}

// Run the tests
testWebhooks().then(results => {
  // Save results to window for inspection
  window.webhookTestResults = results;
  console.log('\nResults saved to window.webhookTestResults');
});
