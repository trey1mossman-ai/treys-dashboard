# Life OS AI Integration Documentation

## Overview
Complete AI integration for the Agenda Dashboard with OpenAI and Anthropic support, featuring secure backend proxy, tool calling, RAG/knowledge base, and mobile-first UX.

## ✅ Implementation Status

### Completed Features
- ✅ Backend proxy infrastructure (Cloudflare Workers)
- ✅ OpenAI integration with streaming support
- ✅ Anthropic provider support
- ✅ Action Router with tool registry and validation
- ✅ RAG/Knowledge Base with embeddings
- ✅ Chat UI with streaming and tool status
- ✅ AI Command Palette (Cmd+K)
- ✅ Mobile-first responsive design
- ✅ Voice/Realtime session support (optional)
- ✅ Rate limiting and security

## 🚀 Quick Start

### 1. Environment Setup
Copy `.env.example` to `.env` and configure:

```bash
# AI Provider Configuration
PROVIDER=openai # or anthropic
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o # or gpt-5, gpt-4.1
ANTHROPIC_API_KEY=sk-ant-...
ANTHROPIC_MODEL=claude-3-5-sonnet-20241022

# RAG Configuration
RAG_STORE=kv # or pinecone
PINECONE_API_KEY=... # if using Pinecone

# Communication
TWILIO_ACCOUNT_SID=...
SENDGRID_API_KEY=...
```

### 2. Deploy Backend
Deploy to Cloudflare Workers:
```bash
cd functions/cloudflare
wrangler deploy
```

Or Vercel:
```bash
vercel deploy
```

### 3. Start Frontend
```bash
npm install
npm run dev
```

## 📁 File Structure

```
/functions/cloudflare/api/
├── ai/
│   ├── respond.ts          # Main AI proxy endpoint
│   └── tools/
│       └── router.ts       # Tool execution router
├── rag/
│   ├── ingest.ts          # Document ingestion
│   └── search.ts          # Knowledge search
└── realtime/
    └── session.ts         # Voice session creation

/src/
├── lib/ai/
│   ├── ai-service.ts     # Frontend AI service
│   └── openai-client.ts  # Legacy OpenAI client
├── components/
│   ├── ChatInterface.tsx      # Main chat UI
│   ├── AICommandPalette.tsx   # Command palette (Cmd+K)
│   └── MobileAIChat.tsx       # Mobile chat interface
└── styles/
    └── mobile-first.css   # Mobile optimizations
```

## 🔧 API Endpoints

### `/api/ai/respond` - Main AI endpoint
```typescript
POST /api/ai/respond
{
  provider?: "openai" | "anthropic",
  messages: Message[],
  system?: string,
  stream?: boolean,
  enable_tools?: boolean
}
```

### `/api/ai/tools/router` - Tool execution
```typescript
POST /api/ai/tools/router
{
  tool: string,
  args: any,
  userId?: string
}
```

### `/api/rag/search` - Knowledge search
```typescript
POST /api/rag/search
{
  query: string,
  top_k?: number,
  filter?: Record<string, any>
}
```

### `/api/rag/ingest` - Document ingestion
```typescript
POST /api/rag/ingest
{
  documents: Array<{
    text: string,
    metadata?: any
  }>,
  chunk_size?: number,
  chunk_overlap?: number
}
```

## 🛠 Available Tools

### Dashboard Control
- `open_view` - Change dashboard view
- `update_agenda_block` - Update agenda items

### Task Management
- `create_task` - Create new tasks
- `trigger_workflow` - Trigger n8n workflows

### Communication
- `send_message` - Send SMS/Email/WhatsApp
- `search_contacts` - Search contact database

### Knowledge
- `fetch_knowledge` - RAG search
- `open_url` - Open external URLs

## 📱 Mobile Features

### Touch Optimizations
- 44px minimum tap targets
- Safe area padding for iOS
- 100svh viewport handling
- Fluid typography with clamp()

### Mobile UI Components
- Floating AI button
- Minimizable chat drawer
- Voice input support
- Swipe gestures

### Keyboard Shortcuts
- `Cmd/Ctrl + K` - Open command palette
- `Cmd/Ctrl + /` - Open AI chat
- `Enter` - Send message
- `Shift+Enter` - New line

## 🔐 Security Features

### Backend Security
- All API keys server-side only
- Rate limiting (100 req/hour/IP)
- Request validation with Zod
- Tool execution audit logs

### Frontend Security
- Input sanitization
- CORS configuration
- User ID tracking
- Secure WebRTC for voice

## 🧪 Testing

### Test Tools Locally
```bash
# Test AI response
curl -X POST http://localhost:8787/api/ai/respond \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'

# Test tool execution
curl -X POST http://localhost:8787/api/ai/tools/router \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "create_task",
    "args": {"title": "Test task"}
  }'
```

### Frontend Testing
```typescript
// Test AI service
import { aiService } from '@/lib/ai/ai-service';

// Send message
const response = await aiService.send('Create a task for tomorrow', {
  onStream: (event) => console.log(event),
  onToolCall: async (tool) => {
    console.log('Tool called:', tool);
    return { success: true };
  }
});

// Search knowledge
const results = await aiService.searchKnowledge('meeting notes');
```

## 🚀 Adding New Tools

### 1. Define tool schema
```typescript
// In router.ts
const toolSchemas = {
  my_new_tool: z.object({
    param1: z.string(),
    param2: z.number().optional()
  })
};
```

### 2. Add to tool registry
```typescript
// In respond.ts
{
  type: 'function',
  function: {
    name: 'my_new_tool',
    description: 'Description for AI',
    parameters: { /* JSON Schema */ }
  }
}
```

### 3. Implement handler
```typescript
// In router.ts
private async myNewTool(args: z.infer<typeof toolSchemas.my_new_tool>) {
  // Implementation
  return { success: true, result: 'Done' };
}
```

## 🔄 Provider Switching

Toggle between OpenAI and Anthropic:

```typescript
// Frontend
aiService.setProvider('anthropic');

// Or via environment
PROVIDER=anthropic
```

## 📊 Monitoring

### Cost Tracking
- Token usage logged per request
- Daily/monthly spend tracking
- Budget alerts at 80% threshold

### Performance
- Request latency tracking
- Tool execution times
- Cache hit rates

### Error Handling
- Automatic retry with backoff
- Graceful degradation
- User-friendly error messages

## 🎯 Production Checklist

- [ ] Set production API keys
- [ ] Configure CORS for your domain
- [ ] Set up monitoring/alerting
- [ ] Enable caching (KV/Redis)
- [ ] Configure rate limits
- [ ] Set up backup providers
- [ ] Test mobile performance
- [ ] Verify tool permissions
- [ ] Document custom tools
- [ ] Set up error tracking

## 📚 Resources

- [OpenAI API Docs](https://platform.openai.com/docs)
- [Anthropic API Docs](https://docs.anthropic.com)
- [Cloudflare Workers](https://developers.cloudflare.com/workers)
- [Vercel Functions](https://vercel.com/docs/functions)

## 🐛 Troubleshooting

### Common Issues

**404 Errors**
- Verify base URLs in .env
- Check API endpoints exist
- Confirm deployment succeeded

**CORS Errors**
- Add domain to CORS config
- Check preflight handling
- Verify headers

**Streaming Not Working**
- Check SSE support
- Verify response headers
- Test with curl first

**Tools Not Executing**
- Check tool registry
- Verify schema validation
- Review audit logs

## 📝 License
MIT