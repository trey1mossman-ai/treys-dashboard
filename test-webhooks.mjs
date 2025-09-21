#!/usr/bin/env node

// Quick webhook test script
console.log('🔧 Testing Webhook Connections...\n');

const API_URL = 'https://ailifeassistanttm.com';
const AGENT_URL = 'https://n8n.treys.cc/webhook/agent-chat';

async function testWebhook(name, url, options = {}) {
  console.log(`Testing ${name}...`);
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache',
        ...options.headers
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log(`✅ ${name}: Connected (Status: ${response.status})`);
      if (name === 'Email Webhook') {
        console.log(`   📧 Emails found: ${data.emails?.length || 0}`);
      } else if (name === 'Calendar Webhook') {
        console.log(`   📅 Events found: ${data.events?.length || 0}`);
      }
      return true;
    } else {
      console.log(`❌ ${name}: Failed (Status: ${response.status})`);
      return false;
    }
  } catch (error) {
    console.log(`❌ ${name}: Network Error - ${error.message}`);
    return false;
  }
}

async function runTests() {
  console.log('API Gateway:', API_URL);
  console.log('Agent URL:', AGENT_URL);
  console.log('-----------------------------------\n');
  
  // Test email webhook
  console.log('1. Email Integration');
  await testWebhook('Email Trigger', `${API_URL}/api/trigger/emails`);
  await new Promise(resolve => setTimeout(resolve, 6000)); // Wait for workflow
  await testWebhook('Email Webhook', `${API_URL}/api/webhook/emails?t=${Date.now()}`);
  
  console.log('\n2. Calendar Integration');
  await testWebhook('Calendar Trigger', `${API_URL}/api/trigger/calendar`);
  await new Promise(resolve => setTimeout(resolve, 6000)); // Wait for workflow
  await testWebhook('Calendar Webhook', `${API_URL}/api/webhook/calendar?t=${Date.now()}`);
  
  console.log('\n3. AI Agent Integration');
  await testWebhook('Agent Webhook', AGENT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      sessionId: 'test-' + Date.now(),
      action: 'sendMessage',
      chatInput: 'Test connection from Life OS'
    })
  });
  
  console.log('\n-----------------------------------');
  console.log('🎯 Webhook Test Complete!\n');
  console.log('Next Steps:');
  console.log('1. If any webhook failed, check n8n.treys.cc');
  console.log('2. Run "npm run dev" to test the full app');
  console.log('3. Visit http://localhost:5173/lifeos');
  console.log('4. Click "Refresh All" to test live connections');
}

runTests();
