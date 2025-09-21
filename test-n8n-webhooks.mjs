#!/usr/bin/env node
// Test n8n Webhooks Directly

const WEBHOOKS = {
  email: 'https://flow.voxemarketing.com/webhook/c14a535e-80bf-4bd9-9b3d-1001e6917d85',
  calendar: 'https://flow.voxemarketing.com/webhook/f4fd2f67-df3b-4ee2-b426-944e51d01f28',
  agent: 'https://flow.voxemarketing.com/webhook/c0552eb4-8ed7-4a46-b141-492ba7fefd04/chat',
};

async function testWebhook(name, url, options = {}) {
  console.log(`\n🧪 Testing ${name}...`);
  console.log(`URL: ${url}`);
  
  try {
    const response = await fetch(url, {
      method: options.method || 'GET',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        ...options.headers
      },
      body: options.body
    });
    
    console.log(`Status: ${response.status} ${response.statusText}`);
    
    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
      console.log(`✅ Response:`, JSON.stringify(data, null, 2).substring(0, 500));
    } catch {
      console.log(`📝 Response (text):`, text.substring(0, 500));
      data = text;
    }
    
    // Check if we got actual data
    if (response.ok) {
      if (Array.isArray(data) && data.length > 0) {
        console.log(`✅ SUCCESS: Got ${data.length} items`);
      } else if (data && typeof data === 'object' && Object.keys(data).length > 0) {
        console.log(`✅ SUCCESS: Got data object`);
      } else {
        console.log(`⚠️  WARNING: Response OK but no data`);
      }
    } else {
      console.log(`❌ FAILED: HTTP ${response.status}`);
    }
    
    return data;
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('=====================================');
  console.log('🚀 TESTING N8N WEBHOOKS DIRECTLY');
  console.log('=====================================');
  
  // Test Email Webhook
  const emailData = await testWebhook('Email Webhook', WEBHOOKS.email);
  
  // Test Calendar Webhook
  const calendarData = await testWebhook('Calendar Webhook', WEBHOOKS.calendar);
  
  // Test AI Agent Webhook
  const agentData = await testWebhook('AI Agent Webhook', WEBHOOKS.agent, {
    method: 'POST',
    body: JSON.stringify({
      sessionId: `test-${Date.now()}`,
      action: 'sendMessage',
      chatInput: 'Hello, this is a test connection from Life OS'
    })
  });
  
  // Summary
  console.log('\n=====================================');
  console.log('📊 TEST SUMMARY');
  console.log('=====================================');
  console.log(`Email Webhook: ${emailData ? '✅ Working' : '❌ Failed'}`);
  console.log(`Calendar Webhook: ${calendarData ? '✅ Working' : '❌ Failed'}`);
  console.log(`AI Agent Webhook: ${agentData ? '✅ Working' : '❌ Failed'}`);
  
  if (emailData && calendarData && agentData) {
    console.log('\n🎉 ALL WEBHOOKS WORKING!');
    console.log('Your Life OS can now:');
    console.log('- Fetch emails from Gmail');
    console.log('- Fetch calendar events from Google Calendar');
    console.log('- Communicate with AI Agent');
    console.log('\nNext step: Deploy to production!');
  } else {
    console.log('\n⚠️  Some webhooks need attention');
    console.log('Check n8n workflows at https://flow.voxemarketing.com');
  }
}

runTests();