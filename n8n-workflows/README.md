# n8n Webhook Templates for Agenda Dashboard

## How to Import These Workflows

1. Open n8n at http://localhost:5678
2. Click the menu (≡) → "Import from File"
3. Select the JSON file for the webhook you want
4. Click "Save" and then "Activate"

## Available Templates

### 1. Email Digest (`email-digest-webhook.json`)
Returns a list of recent emails for the dashboard.

### 2. Send Email (`send-email-webhook.json`)
Sends an email through your configured email service.

### 3. Send SMS (`send-sms-webhook.json`)
Sends SMS through Twilio or other provider.

### 4. AI Agent (`ai-agent-webhook.json`)
Processes AI requests through OpenAI or Claude.

## Creating Your Own Webhooks

### Basic Structure:
1. **Webhook Node** - Receives the request
2. **Your Logic** - Process the data (Gmail, Slack, etc.)
3. **Respond to Webhook** - Send response back to app

### Webhook Path Convention:
All webhooks should use the path pattern: `n8n/[endpoint-name]`

Examples:
- `n8n/email-digest`
- `n8n/send-email`
- `n8n/calendar-summary`

### Testing Webhooks

After creating and activating a webhook, test it:

```bash
curl -X POST http://localhost:5678/webhook/n8n/your-endpoint \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## Connecting Real Services

### Gmail Integration:
1. Add Gmail node after Webhook
2. Configure OAuth2 authentication
3. Use webhook data for email parameters

### Twilio Integration:
1. Add Twilio node
2. Add your Account SID and Auth Token
3. Map phone numbers from webhook data

### OpenAI Integration:
1. Add OpenAI node
2. Add your API key
3. Pass messages from webhook to OpenAI

## Example: Complete Email Send Workflow

```
[Webhook] → [Gmail Send] → [Respond to Webhook]
```

Webhook receives:
```json
{
  "to": "recipient@example.com",
  "subject": "Test Email",
  "body": "Hello from n8n!"
}
```

Gmail node uses:
- To: `{{$json.to}}`
- Subject: `{{$json.subject}}`
- Body: `{{$json.body}}`

Response sends:
```json
{
  "success": true,
  "messageId": "{{$node['Gmail'].json.id}}"
}
```