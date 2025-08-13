# Cloudflare Pages Functions Setup & Testing

## Directory Structure
```
/functions/cloudflare/
├── _utils/
│   └── cors.ts           # CORS utility functions
└── api/
    ├── email/
    │   └── send.ts       # POST /api/email/send
    ├── sms/
    │   └── send.ts       # POST /api/sms/send
    ├── whatsapp/
    │   └── send.ts       # POST /api/whatsapp/send
    └── agent/
        └── relay.ts      # POST /api/agent/relay
```

## Deployment Configuration

### Cloudflare Pages Settings
1. Go to your Cloudflare Pages project
2. Navigate to Settings → Functions
3. Set functions directory to: `functions/cloudflare`
4. Build settings:
   - Build command: `npm install && npm run build`
   - Build output directory: `dist`

### Environment Variables
Add these in Cloudflare Pages → Settings → Environment Variables:

```bash
# Frontend (public)
VITE_API_BASE_URL=https://your-project.pages.dev

# Email Provider (choose one)
EMAIL_PROVIDER=sendgrid  # or 'resend'
SENDGRID_API_KEY=your_sendgrid_key
RESEND_API_KEY=your_resend_key
DEFAULT_FROM_EMAIL=noreply@yourdomain.com

# SMS/WhatsApp (Twilio)
TWILIO_ACCOUNT_SID=your_account_sid
TWILIO_AUTH_TOKEN=your_auth_token
TWILIO_FROM=+15551234567
TWILIO_WHATSAPP_FROM=whatsapp:+15551234567

# AI Agent
MODEL_PROVIDER=openai  # or 'anthropic'
MODEL_NAME=gpt-4  # or 'claude-3-opus-20240229'
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key
```

## Local Development

### Using Wrangler Pages Dev
```bash
# Install wrangler globally
npm install -g wrangler

# Run pages dev server (from project root)
npx wrangler pages dev dist --compatibility-date=2024-01-01 --binding KEY=value

# Or with .dev.vars file for local env vars
echo "SENDGRID_API_KEY=test_key" > .dev.vars
npx wrangler pages dev dist
```

### Test with cURL

Once deployed to Cloudflare Pages (or running locally with wrangler):

#### Test Email Endpoint
```bash
curl -i -X POST https://your-project.pages.dev/api/email/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "subject": "Test Email",
    "text": "Hello from Cloudflare Functions!",
    "from": "sender@example.com"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "Email sent successfully (stub)"
}
```

#### Test SMS Endpoint
```bash
curl -i -X POST https://your-project.pages.dev/api/sms/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15551234567",
    "body": "Test SMS message",
    "from": "+15559876543"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "SMS sent successfully (stub)"
}
```

#### Test WhatsApp Endpoint
```bash
curl -i -X POST https://your-project.pages.dev/api/whatsapp/send \
  -H "Content-Type: application/json" \
  -d '{
    "to": "+15551234567",
    "body": "Test WhatsApp message",
    "from": "whatsapp:+15559876543"
  }'
```

Expected response:
```json
{
  "success": true,
  "message": "WhatsApp message sent successfully (stub)"
}
```

#### Test Agent Relay Endpoint
```bash
curl -i -X POST https://your-project.pages.dev/api/agent/relay \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [
      {"role": "user", "content": "Hello, AI!"}
    ]
  }'
```

Expected response:
```json
{
  "content": "This is a stub response from the AI agent relay. Configure your LLM provider to enable actual responses.",
  "role": "assistant"
}
```

#### Test CORS Preflight
```bash
curl -i -X OPTIONS https://your-project.pages.dev/api/email/send \
  -H "Origin: http://localhost:5173" \
  -H "Access-Control-Request-Method: POST" \
  -H "Access-Control-Request-Headers: Content-Type"
```

Expected headers in response:
```
HTTP/2 204
access-control-allow-origin: http://localhost:5173
access-control-allow-methods: POST, OPTIONS
access-control-allow-headers: Content-Type, Authorization
access-control-max-age: 86400
```

## Verification in Browser Console

From your frontend app (http://localhost:5173):

```javascript
// Test email endpoint
fetch('/api/email/send', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    to: 'test@example.com',
    subject: 'Test',
    text: 'Hello'
  })
}).then(r => r.json()).then(console.log)

// Test agent endpoint
fetch('/api/agent/relay', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    messages: [{ role: 'user', content: 'ping' }]
  })
}).then(r => r.json()).then(console.log)
```

## Monitoring

View function logs in Cloudflare Dashboard:
1. Go to your Pages project
2. Click on "Functions" tab
3. View real-time logs and metrics

Each function logs the incoming payload with a prefix:
- `[email-send] payload`
- `[sms-send] payload`
- `[whatsapp-send] payload`
- `[agent-relay] payload`

## Activating Real Providers

To enable actual email/SMS/AI functionality:

1. Uncomment the provider-specific code in each function
2. Add your API keys to Cloudflare Pages environment variables
3. Redeploy the functions

The stub responses will be replaced with actual provider responses.