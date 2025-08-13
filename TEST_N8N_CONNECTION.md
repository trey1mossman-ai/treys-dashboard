# ✅ Testing Agenda Dashboard → n8n Connection

## Current Status
- ✅ n8n is running on `localhost:5678`
- 📱 Agenda Dashboard app ready to connect
- 🔗 Need to create webhooks in n8n

## Quick Test

### 1. Run the Setup Script:
```bash
cd "/Volumes/Trey's Macbook TB/Agenda for the day"
chmod +x *.sh
./setup-n8n-integration.sh
```

This will:
- Check if n8n is running
- Create `.env.local` to point app to n8n
- Install dependencies
- Show you how to create webhooks

### 2. Import Webhook Templates into n8n:

1. Open n8n: http://localhost:5678
2. Click menu (≡) → "Import from File"
3. Import these templates:
   - `n8n-workflows/email-digest-webhook.json`
   - `n8n-workflows/send-email-webhook.json`
4. Save and Activate each workflow

### 3. Start the Agenda App:
```bash
cd "/Volumes/Trey's Macbook TB/Agenda for the day"
npm run dev
```

Open: http://localhost:5173

### 4. Test the Connection:

In the app, try to:
- Load email digest
- Send a test email
- Check the workflow section

## What's Happening:

```
Agenda App (localhost:5173)
    ↓
Makes API calls to
    ↓
n8n Webhooks (localhost:5678/webhook/n8n/*)
    ↓
n8n processes with your workflows
    ↓
Returns data to app
```

## If Webhooks Don't Work:

1. **Check n8n workflows are Active** (green toggle)
2. **Verify webhook paths** match exactly:
   - App expects: `/webhook/n8n/email-digest`
   - n8n webhook path should be: `n8n/email-digest`
3. **Test manually**:
   ```bash
   curl -X POST http://localhost:5678/webhook/n8n/email-digest \
     -H "Content-Type: application/json" \
     -d '{"limit": 5}'
   ```

## For Production (Later):

When you deploy to Cloudflare:
1. Start n8n with Cloudflare tunnel
2. Get the public URL (like `https://abc.trycloudflare.com`)
3. Update Cloudflare Workers environment:
   ```
   N8N_BASE_URL=https://abc.trycloudflare.com
   ```
4. Deploy app to Cloudflare
5. App → Cloudflare Workers → n8n (via tunnel)

## Ready to Test!

The app should now be able to connect to your local n8n instance. Create the webhooks in n8n and the app features will start working!