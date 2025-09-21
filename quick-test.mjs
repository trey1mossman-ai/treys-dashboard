#!/usr/bin/env node
// Quick test of n8n webhooks

console.log('🧪 TESTING N8N WEBHOOKS...\n');

const webhooks = {
  email: 'https://flow.voxemarketing.com/webhook/c14a535e-80bf-4bd9-9b3d-1001e6917d85',
  calendar: 'https://flow.voxemarketing.com/webhook/f4fd2f67-df3b-4ee2-b426-944e51d01f28',
  agent: 'https://flow.voxemarketing.com/webhook/c0552eb4-8ed7-4a46-b141-492ba7fefd04/chat'
};

async function test() {
  // Test Email
  console.log('📧 Testing Email Webhook...');
  try {
    const emailRes = await fetch(webhooks.email);
    const emailData = await emailRes.json();
    console.log('✅ Email:', Array.isArray(emailData) ? `${emailData.length} emails` : 'Got response');
  } catch (e) {
    console.log('❌ Email failed:', e.message);
  }
  
  // Test Calendar
  console.log('\n📅 Testing Calendar Webhook...');
  try {
    const calRes = await fetch(webhooks.calendar);
    const calData = await calRes.json();
    console.log('✅ Calendar:', Array.isArray(calData) ? `${calData.length} events` : 'Got response');
  } catch (e) {
    console.log('❌ Calendar failed:', e.message);
  }
  
  // Test Agent
  console.log('\n🤖 Testing AI Agent...');
  try {
    const agentRes = await fetch(webhooks.agent, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionId: 'test-' + Date.now(),
        action: 'sendMessage',
        chatInput: 'Test from Life OS'
      })
    });
    const agentData = await agentRes.json();
    console.log('✅ Agent:', agentData.output ? 'Responded' : 'Got response');
  } catch (e) {
    console.log('❌ Agent failed:', e.message);
  }
  
  console.log('\n✨ All webhooks tested!');
}

test();