# n8n Integration Configuration for Agenda Dashboard

## Current Setup
- n8n is running on: `http://localhost:5678`
- App expects API at: `/api` (or from VITE_API_BASE_URL)
- n8n webhooks need to be created for the app to work

## Quick Test Setup

### 1. Create .env.local file for the app:
```bash
VITE_API_BASE_URL=http://localhost:5678/webhook
```

### 2. Required n8n Webhooks
The app expects these webhook endpoints in n8n:
- `/webhook/n8n/email-digest`
- `/webhook/n8n/calendar-summary`
- `/webhook/n8n/status-draft`
- `/webhook/n8n/create-lead`
- `/webhook/n8n/push-agenda`
- `/webhook/n8n/followup`

## Setting Up n8n Webhooks

1. Open n8n at http://localhost:5678
2. Create a new workflow for each endpoint
3. Add a Webhook node with path matching the endpoint
4. Connect your automation logic
5. Activate the workflow

## Test the Connection

Run the test script:
```bash
./test-n8n-connection.sh
```

Or test manually:
```bash
# Test if n8n is accessible
curl http://localhost:5678

# Test a webhook (if created)
curl -X POST http://localhost:5678/webhook/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## For Development

1. Create `.env.local` in the app directory:
```
VITE_API_BASE_URL=http://localhost:5678/webhook
```

2. Start the app:
```bash
cd "/Volumes/Trey's Macbook TB/Agenda for the day"
npm install
npm run dev
```

3. The app will now try to connect to n8n webhooks

## For Production with Cloudflare

When deploying to Cloudflare, you'll update the functions to proxy to your n8n instance using the tunnel URL.