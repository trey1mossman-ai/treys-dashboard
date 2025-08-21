# 🚀 AI Integration Setup Instructions

## Current Status
✅ **Deployed**: https://8d9010d8.agenda-dashboard.pages.dev  
✅ **Health Check**: https://8d9010d8.agenda-dashboard.pages.dev/api/ai/health  
⚠️ **API Key Status**: OpenAI quota exceeded - needs valid API key

## Quick Setup (3 Steps)

### 1. Get API Keys
- **OpenAI**: https://platform.openai.com/api-keys
  - Create new key with usage limits
  - Ensure billing is configured
  - Model access: gpt-4o or gpt-4-turbo

- **Anthropic** (optional): https://console.anthropic.com/
  - Create API key
  - Model: claude-3-5-sonnet

### 2. Configure Secrets
Run the setup script:
```bash
./setup-secrets.sh
```

Or manually:
```bash
# Required
wrangler secret put OPENAI_API_KEY --name agenda-dashboard
# Enter: sk-proj-...

# Optional
wrangler secret put ANTHROPIC_API_KEY --name agenda-dashboard
wrangler secret put SENDGRID_API_KEY --name agenda-dashboard
wrangler secret put TWILIO_ACCOUNT_SID --name agenda-dashboard
wrangler secret put TWILIO_AUTH_TOKEN --name agenda-dashboard
```

### 3. Verify Setup
```bash
# Test the integration
./test-ai-integration.sh https://8d9010d8.agenda-dashboard.pages.dev

# Or check health
curl https://8d9010d8.agenda-dashboard.pages.dev/api/ai/health
```

## Using the AI Features

### In Browser
1. **Command Palette**: Press `Cmd+K` (Mac) or `Ctrl+K` (Windows)
2. **AI Chat**: Press `Cmd+/` (Mac) or `Ctrl+/` (Windows)
3. **Mobile**: Tap the floating blue AI button

### Test Commands
Try these in the chat:
- "Create a task called Review code"
- "What's on my agenda?"
- "Send an email to test@example.com"
- "Search for meeting notes"

## Debugging

### Check Logs
```bash
wrangler pages tail --project-name=agenda-dashboard
```

### Common Issues

**"Three dots" hang**
- Usually means API key issue or tool execution loop
- Check: `curl https://8d9010d8.agenda-dashboard.pages.dev/api/ai/health`

**CORS errors**
- Frontend must call your backend, not OpenAI directly
- Check browser console for errors

**Tool execution fails**
- Verify communication secrets (Twilio, SendGrid) are configured
- Tools won't work without these

## File Structure
```
/functions/          # Cloudflare Workers (backend)
├── api/
│   ├── ai/
│   │   ├── respond.ts     # Main AI endpoint
│   │   ├── health.ts      # Health check
│   │   └── tools/
│   │       └── router.ts  # Tool execution
│   └── rag/
│       ├── search.ts      # Knowledge search
│       └── ingest.ts      # Document ingestion

/src/                # React app (frontend)
├── components/
│   ├── ChatInterface.tsx      # Chat UI
│   ├── AICommandPalette.tsx   # Cmd+K palette
│   └── MobileAIChat.tsx       # Mobile interface
└── lib/ai/
    └── ai-service.ts          # Frontend AI service
```

## Advanced Configuration

### Switch AI Provider
```javascript
// In browser console
localStorage.setItem('ai_provider', 'anthropic');
// Refresh page
```

### Enable Debug Mode
```javascript
// In browser console
localStorage.setItem('ai_debug', 'true');
// Opens console logs for AI events
```

### Custom Tools
Edit `/functions/api/ai/tools/router.ts` to add new tools.

## Support

- **Debug Guide**: [AI_DEBUG_GUIDE.md](AI_DEBUG_GUIDE.md)
- **Full Documentation**: [AI_INTEGRATION_README.md](AI_INTEGRATION_README.md)
- **Test Collection**: [ai-tests.bruno.json](ai-tests.bruno.json)

## Next Steps

1. ✅ Add your OpenAI API key
2. ✅ Run `./test-ai-integration.sh` to verify
3. ✅ Start using AI features with Cmd+K or Cmd+/
4. 🎯 Optional: Configure Anthropic, Twilio, SendGrid for full features