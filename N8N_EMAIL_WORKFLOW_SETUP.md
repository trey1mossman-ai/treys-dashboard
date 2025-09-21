# 📧 n8n Email Workflow Configuration

## Quick Setup for Codex

### Email Webhook URL
```
https://flow.voxemarketing.com/webhook/c14a535e-80bf-4bd9-9b3d-1001e6917d85
```

### Required Workflow Structure

```
[Webhook Trigger]
    ↓
[Gmail Node] → Fetch emails
    ↓
[Transform Data] → Format for Supabase
    ↓
[HTTP Request to Supabase]
    ↓
[Respond to Webhook]
```

### Supabase Email Write Configuration

**Endpoint:**
```
POST https://ceubhminnsfgrsiootoq.supabase.co/rest/v1/emails
```

**Headers:**
```json
{
  "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldWJobWlubnNmZ3JzaW9vdG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTY5OTQsImV4cCI6MjA3Mzk5Mjk5NH0.a01TpLtDl8VTFL5RuqMkeyRHzO-iBfIxY-YQibWjvsY",
  "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldWJobWlubnNmZ3JzaW9vdG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTY5OTQsImV4cCI6MjA3Mzk5Mjk5NH0.a01TpLtDl8VTFL5RuqMkeyRHzO-iBfIxY-YQibWjvsY",
  "Content-Type": "application/json",
  "Prefer": "return=representation"
}
```

**Body Format:**
```json
{
  "from_email": "sender@example.com",
  "from_name": "Sender Name",
  "subject": "Email Subject",
  "body_plain": "Plain text body",
  "body": "HTML body (optional)",
  "snippet": "First 100 chars of email",
  "timestamp": "2025-01-21T10:00:00Z",
  "is_read": false,
  "labels": ["inbox", "important"]
}
```

### AI Chat Webhook Fix

**Current Webhook:**
```
https://flow.voxemarketing.com/webhook/c0552eb4-8ed7-4a46-b141-492ba7fefd04/chat
```

**Expected Input:**
```json
{
  "sessionId": "email-123-timestamp",
  "action": "sendMessage",
  "chatInput": "Summarize this email",
  "context": {
    "emailId": "123",
    "emailContent": "..."
  }
}
```

**Required Output Format:**
```json
{
  "success": true,
  "response": "AI generated response text here",
  "metadata": {
    "model": "gpt-4",
    "tokens": 150
  }
}
```

### Testing Commands

**Test Email Write:**
```bash
curl -X POST https://ceubhminnsfgrsiootoq.supabase.co/rest/v1/emails \
  -H "apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldWJobWlubnNmZ3JzaW9vdG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTY5OTQsImV4cCI6MjA3Mzk5Mjk5NH0.a01TpLtDl8VTFL5RuqMkeyRHzO-iBfIxY-YQibWjvsY" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldWJobWlubnNmZ3JzaW9vdG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTY5OTQsImV4cCI6MjA3Mzk5Mjk5NH0.a01TpLtDl8VTFL5RuqMkeyRHzO-iBfIxY-YQibWjvsY" \
  -H "Content-Type: application/json" \
  -d '{
    "from_email": "test@example.com",
    "from_name": "Test User",
    "subject": "Test Email",
    "body_plain": "This is a test",
    "snippet": "This is a test"
  }'
```

**Test Email Webhook:**
```bash
curl -X POST https://flow.voxemarketing.com/webhook/c14a535e-80bf-4bd9-9b3d-1001e6917d85 \
  -H "Content-Type: application/json" \
  -d '{"action": "refresh", "limit": 10}'
```

## Priority Order

1. ✅ Calendar webhook (already working)
2. 🔧 Email webhook (configure now)
3. 🔧 AI chat response format
4. ⏳ Task extraction workflow (3-hour cycle)

---

**Remember:** All workflows must write to Supabase, NOT Cloudflare KV!