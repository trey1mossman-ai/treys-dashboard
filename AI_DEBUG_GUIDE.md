# AI Integration Debug Guide - "Three Dots" Triage

## 🚨 Quick Fix Checklist

If your AI chat shows "..." forever, check these in order:

### 1. ✅ API Keys Configured?
```bash
# Check health endpoint
curl https://your-app.pages.dev/api/ai/health

# Add missing keys
wrangler secret put OPENAI_API_KEY
# Enter your key: sk-...
```

### 2. ✅ Correct Model Names?
```toml
# wrangler.toml - use valid models
OPENAI_MODEL = "gpt-4o"  # NOT "gpt-4o-mini" or "gpt-5"
ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022"  # Check current model
```

### 3. ✅ Run Diagnostic Tests
```bash
# Run the test script
./test-ai-integration.sh

# Or test manually
curl -X POST https://your-app.pages.dev/api/ai/respond \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "stream": false,
    "enable_tools": false,
    "messages": [{"role":"user","content":"Say HELLO"}]
  }'
```

## 🔍 Common "Three Dots" Causes & Fixes

### Cause 1: Missing API Keys
**Symptom**: Health check shows `"configured": false`
```json
{
  "services": {
    "openai": {
      "configured": false,
      "keyPrefix": "missing"
    }
  }
}
```

**Fix**:
```bash
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY
```

### Cause 2: Tool Execution Loop Hangs
**Symptom**: Request with tools enabled never completes

**Debug**:
```bash
# Test without tools
curl -X POST https://your-app.pages.dev/api/ai/respond \
  -d '{"enable_tools": false, "messages": [{"role":"user","content":"Hi"}]}'

# If this works but enable_tools:true hangs, it's the tool loop
```

**Fix**: Check `/functions/cloudflare/api/ai/respond.ts`:
```typescript
// Make sure tool results are sent back to model
if (message.tool_calls) {
  const toolResults = await executeTools(message.tool_calls);
  
  // CRITICAL: Must continue the conversation with tool results
  const finalResponse = await continueWithToolResults(toolResults);
  return finalResponse; // Don't forget to return!
}
```

### Cause 3: Streaming Not Working
**Symptom**: Non-streaming works, streaming hangs

**Debug**:
```bash
# Check SSE headers
curl -I -X POST https://your-app.pages.dev/api/ai/respond \
  -H "Content-Type: application/json" \
  -d '{"stream": true, "messages": [{"role":"user","content":"Hi"}]}'

# Should see:
# Content-Type: text/event-stream
# Cache-Control: no-cache
```

**Fix**: Ensure SSE format:
```typescript
// Each chunk must be:
controller.enqueue(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
// End with:
controller.enqueue(encoder.encode('data: [DONE]\n\n'));
```

### Cause 4: Anthropic Missing Headers
**Symptom**: Anthropic requests fail silently

**Fix**: Always include required headers:
```typescript
headers: {
  'x-api-key': env.ANTHROPIC_API_KEY,
  'anthropic-version': '2023-06-01',  // REQUIRED!
  'content-type': 'application/json'
}
```

### Cause 5: CORS Blocking Requests
**Symptom**: Browser console shows CORS errors, UI spins

**Debug**:
```bash
# Test preflight
curl -X OPTIONS https://your-app.pages.dev/api/ai/respond \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST"
```

**Fix**: Ensure OPTIONS handler returns proper headers

## 📊 Live Debugging Commands

### Watch Logs in Real-Time
```bash
# Tail Cloudflare logs
wrangler pages tail --project-name=agenda-dashboard

# Filter for errors
wrangler pages tail --project-name=agenda-dashboard | grep ERROR
```

### Test Each Component
```bash
# 1. Test OpenAI directly (baseline)
curl https://api.openai.com/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"gpt-4o","messages":[{"role":"user","content":"Hi"}]}'

# 2. Test your proxy (should match above)
curl https://your-app.pages.dev/api/ai/respond \
  -H "Content-Type: application/json" \
  -d '{"provider":"openai","stream":false,"messages":[{"role":"user","content":"Hi"}]}'

# 3. Test tools
curl https://your-app.pages.dev/api/ai/tools/router \
  -H "Content-Type: application/json" \
  -d '{"tool":"create_task","args":{"title":"Test"}}'

# 4. Test RAG
curl https://your-app.pages.dev/api/rag/search \
  -H "Content-Type: application/json" \
  -d '{"query":"test","top_k":3}'
```

## 🔧 Frontend Debug Tips

### Check Browser Console
```javascript
// In browser console, test the service directly
const response = await fetch('/api/ai/respond', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    provider: 'openai',
    stream: false,
    enable_tools: false,
    messages: [{role: 'user', content: 'Test'}]
  })
});
console.log(await response.json());
```

### Monitor Network Tab
1. Open DevTools → Network
2. Send a message in chat
3. Look for `/api/ai/respond` request
4. Check:
   - Status code (should be 200)
   - Response headers (for streaming: `text/event-stream`)
   - Preview/Response tab (should show data)
   - Timing (requests over 30s likely timeout)

### Add Debug Logging
```typescript
// In ChatInterface.tsx
console.log('Sending message:', userMessage);
console.log('Stream event:', event);
console.log('Tool call:', tool);
```

## 🚀 Performance Optimization

### Reduce Cold Starts
```toml
# wrangler.toml
[placement]
mode = "smart"  # Keeps functions warm
```

### Add Timeout Handling
```typescript
// Add timeout to fetch
const controller = new AbortController();
const timeout = setTimeout(() => controller.abort(), 30000);

fetch('/api/ai/respond', {
  signal: controller.signal,
  // ...
}).finally(() => clearTimeout(timeout));
```

### Implement Retry Logic
```typescript
async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      return await fetch(url, options);
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * Math.pow(2, i)));
    }
  }
}
```

## 📝 Configuration Checklist

### Required Secrets
```bash
# Core AI
wrangler secret put OPENAI_API_KEY
wrangler secret put ANTHROPIC_API_KEY

# Communication (for tools)
wrangler secret put SENDGRID_API_KEY
wrangler secret put TWILIO_ACCOUNT_SID
wrangler secret put TWILIO_AUTH_TOKEN
wrangler secret put TWILIO_PHONE_NUMBER
wrangler secret put DEFAULT_FROM_EMAIL

# Optional
wrangler secret put N8N_BASE_URL
wrangler secret put N8N_API_KEY
```

### Environment Variables (wrangler.toml)
```toml
[vars]
PROVIDER = "openai"  # Default provider
OPENAI_BASE_URL = "https://api.openai.com/v1"
OPENAI_MODEL = "gpt-4o"
ANTHROPIC_BASE_URL = "https://api.anthropic.com/v1"
ANTHROPIC_MODEL = "claude-3-5-sonnet-20241022"
RAG_STORE = "kv"
ENABLE_REALTIME = "false"
```

## 🆘 Still Stuck?

1. **Check the health endpoint**: `curl https://your-app.pages.dev/api/ai/health`
2. **Run the test script**: `./test-ai-integration.sh`
3. **Check logs**: `wrangler pages tail --project-name=agenda-dashboard`
4. **Test locally**: `wrangler pages dev dist`
5. **Verify KV bindings**: Check Cloudflare dashboard → Workers → KV
6. **Review error messages**: Most issues have clear error messages in logs

## 📚 Quick Reference

### Model Names (as of 2024)
- OpenAI: `gpt-4o`, `gpt-4-turbo`, `gpt-3.5-turbo`
- Anthropic: `claude-3-5-sonnet-20241022`, `claude-3-opus-20240229`

### API Endpoints
- Health: `GET /api/ai/health`
- Chat: `POST /api/ai/respond`
- Tools: `POST /api/ai/tools/router`
- Search: `POST /api/rag/search`
- Ingest: `POST /api/rag/ingest`

### Required Headers
- OpenAI: `Authorization: Bearer <key>`
- Anthropic: `x-api-key: <key>`, `anthropic-version: 2023-06-01`