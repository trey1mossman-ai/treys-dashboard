# Agent Control API Documentation

## Overview

The Agent Control API provides a secure, single-endpoint interface for AI models (OpenAI, Anthropic Claude) to manage your entire application. It implements strict authentication, HMAC signing, idempotency, rate limiting, and comprehensive audit logging.

## Security Architecture

### Authentication Flow
1. **Service Token**: Bearer token authentication
2. **HMAC Signature**: SHA-256 HMAC of request body
3. **Timestamp Validation**: Prevents replay attacks (5-minute window)
4. **Idempotency Keys**: Prevents duplicate operations
5. **Rate Limiting**: 100 requests per minute per token
6. **IP Allowlisting**: Optional restriction by IP address

### Required Headers
```
Authorization: Bearer ${AGENT_SERVICE_TOKEN}
X-Signature: sha256=${HMAC_SHA256(body, AGENT_HMAC_SECRET)}
X-TS: ${unix_timestamp}
X-Idempotency-Key: ${uuid} (optional but recommended)
Content-Type: application/json
```

## Environment Variables

Add to Cloudflare Pages Settings → Environment Variables:

```bash
AGENT_SERVICE_TOKEN=<strong-random-string>      # Only share with LLM runtime
AGENT_HMAC_SECRET=<random-32-bytes>            # For request signing
AGENT_ALLOWED_TOOLS=agenda.create,tasks.create # Optional: comma-separated allowlist
AGENT_ALLOWED_IPS=192.168.1.1,10.0.0.1        # Optional: IP allowlist
```

## API Endpoint

### POST /api/agent/command

**Request Body:**
```json
{
  "tool": "string",     // Tool name (e.g., "agenda.create")
  "args": {},          // Tool-specific arguments
  "dryRun": false      // Optional: validate without executing
}
```

**Response:**
```json
{
  "ok": true,
  "tool": "agenda.create",
  "result": {
    "id": "uuid",
    "cal_sync_status": "pending"
  },
  "warning": "optional warning message"
}
```

**Error Response:**
```json
{
  "ok": false,
  "error": {
    "code": "VALIDATION_ERROR|FORBIDDEN|NOT_FOUND|CONFLICT|RETRY|INTERNAL",
    "message": "Human-readable error message"
  }
}
```

## Available Tools

### Agenda Management

#### agenda.create
Create a new agenda item with calendar sync.
```json
{
  "tool": "agenda.create",
  "args": {
    "date": "2025-08-13",        // YYYY-MM-DD format
    "title": "Deep Work",         // Required
    "start_ts": 1723568700,       // Unix timestamp
    "end_ts": 1723574100,         // Must be > start_ts
    "tag": "work",                // Optional
    "notes": "Focus session"      // Optional
  }
}
```

#### agenda.update
Update an existing agenda item.
```json
{
  "tool": "agenda.update",
  "args": {
    "id": "uuid",
    "patch": {
      "title": "Updated Title",
      "start_ts": 1723568700
    }
  }
}
```

#### agenda.delete
Soft delete an agenda item.
```json
{
  "tool": "agenda.delete",
  "args": {
    "id": "uuid"
  }
}
```

#### agenda.listByDate
Get all agenda items for a specific date.
```json
{
  "tool": "agenda.listByDate",
  "args": {
    "date": "2025-08-13"
  }
}
```

### Quick Actions

#### actions.create
Create a new automation action.
```json
{
  "tool": "actions.create",
  "args": {
    "name": "Send Notification",
    "webhook_url": "https://hooks.slack.com/...",
    "method": "POST",              // Optional: GET|POST|PUT|DELETE
    "headers": {},                 // Optional
    "default_payload": {}          // Optional
  }
}
```

#### actions.exec
Execute an automation action.
```json
{
  "tool": "actions.exec",
  "args": {
    "id": "uuid",
    "payload": {}                  // Optional: override default
  }
}
```

### Notes

#### notes.create
Create a new note.
```json
{
  "tool": "notes.create",
  "args": {
    "body": "Note content",
    "tag": "ideas"                 // Optional
  }
}
```

#### notes.archive
Archive a note.
```json
{
  "tool": "notes.archive",
  "args": {
    "id": "uuid"
  }
}
```

#### notes.position
Update note position on canvas.
```json
{
  "tool": "notes.position",
  "args": {
    "id": "uuid",
    "x": 100,
    "y": 200,
    "w": 300,
    "h": 200
  }
}
```

### Tasks

#### tasks.create
Create a new task.
```json
{
  "tool": "tasks.create",
  "args": {
    "title": "Review PRs",
    "due_ts": 1723654800,          // Optional: Unix timestamp
    "source": "agent"               // Optional
  }
}
```

#### tasks.toggle
Change task status.
```json
{
  "tool": "tasks.toggle",
  "args": {
    "id": "uuid",
    "status": "completed"           // pending|completed|archived
  }
}
```

#### tasks.reorder
Reorder tasks by position.
```json
{
  "tool": "tasks.reorder",
  "args": {
    "ids": ["uuid1", "uuid2", "uuid3"]
  }
}
```

### Training & Fitness

#### trainer.upload
Upload a training session.
```json
{
  "tool": "trainer.upload",
  "args": {
    "date": "2025-08-13",
    "title": "Leg Day",            // Optional
    "blocks": [
      {
        "type": "exercise",
        "content": {}
      }
    ]
  }
}
```

#### trainer.log
Log training entries.
```json
{
  "tool": "trainer.log",
  "args": {
    "entries": [
      {
        "date": "2025-08-13",
        "exercise": "Squat",
        "set_number": 1,
        "reps": 5,
        "load": 100,                // Optional: weight in kg
        "rpe": 7,                    // Optional: 1-10
        "notes": "Felt good"        // Optional
      }
    ]
  }
}
```

### Communications

#### comms.recent
Get recent communications.
```json
{
  "tool": "comms.recent",
  "args": {
    "channel": "email",             // email|sms|whatsapp
    "limit": 10                     // Optional: max 100
  }
}
```

### Metrics

#### metrics.update
Update daily metrics.
```json
{
  "tool": "metrics.update",
  "args": {
    "date": "2025-08-13",
    "work_actual": 8.5,             // Optional: hours
    "gym_actual": 1.5,              // Optional: hours
    "nutrition_actual": 2200        // Optional: calories
  }
}
```

### Calendar

#### calendar.sync
Sync agenda item with calendar.
```json
{
  "tool": "calendar.sync",
  "args": {
    "agenda_id": "uuid",
    "action": "create"              // create|update|delete
  }
}
```

## Error Handling

### Error Codes
- `VALIDATION_ERROR`: Invalid arguments or schema violation
- `FORBIDDEN`: Authentication/authorization failure
- `NOT_FOUND`: Resource not found
- `CONFLICT`: Resource conflict (e.g., overlapping time slots)
- `RETRY`: Transient error, safe to retry with backoff
- `INTERNAL`: Unexpected server error

### Retry Strategy
- Only retry on `RETRY` errors or network failures
- Use exponential backoff: 1s, 2s, 4s
- Maximum 3 retries
- Never retry `VALIDATION_ERROR`, `FORBIDDEN`, `NOT_FOUND`, or `CONFLICT`

## Client Examples

### Node.js
```javascript
import { AgentCommandClient } from './agent-client/node-client.js';

const client = new AgentCommandClient({
  baseUrl: 'https://your-app.pages.dev',
  serviceToken: process.env.AGENT_SERVICE_TOKEN,
  hmacSecret: process.env.AGENT_HMAC_SECRET
});

// Create agenda item
const result = await client.createAgendaItem(
  '2025-08-13',
  'Deep Work',
  startTimestamp,
  endTimestamp,
  { tag: 'work' }
);
```

### Python
```python
from agent_client import AgentCommandClient

client = AgentCommandClient(
    base_url='https://your-app.pages.dev',
    service_token=os.getenv('AGENT_SERVICE_TOKEN'),
    hmac_secret=os.getenv('AGENT_HMAC_SECRET')
)

# Create task
result = client.create_task(
    title="Review pull requests",
    due_ts=int(tomorrow.timestamp())
)
```

### cURL
```bash
# Generate signature
BODY='{"tool":"agenda.create","args":{"date":"2025-08-13","title":"Meeting","start_ts":1723568700,"end_ts":1723574100}}'
SIGNATURE=$(echo -n "$BODY" | openssl dgst -sha256 -hmac "$AGENT_HMAC_SECRET" -binary | xxd -p -c256)

# Make request
curl -X POST https://your-app.pages.dev/api/agent/command \
  -H "Authorization: Bearer $AGENT_SERVICE_TOKEN" \
  -H "Content-Type: application/json" \
  -H "X-TS: $(date +%s)" \
  -H "X-Idempotency-Key: $(uuidgen)" \
  -H "X-Signature: sha256=$SIGNATURE" \
  -d "$BODY"
```

## OpenAI Integration

Add to your OpenAI assistant configuration:
```javascript
const tools = require('./agent-tools/openai-tools.json');
// Use tools.tools array in your OpenAI configuration
```

## Anthropic Claude Integration

Add to your Claude configuration:
```javascript
const tools = require('./agent-tools/anthropic-tools.json');
// Use tools.tools array in your Claude configuration
```

## Audit & Monitoring

### Database Tables
- `agent_audit`: Complete log of all agent commands
- `idempotency_keys`: Prevents duplicate operations
- `replay_protection`: Prevents request replay
- `rate_limits`: Tracks rate limit counters

### Query Recent Activity
```sql
SELECT 
  datetime(created_at) as time,
  tool,
  status,
  duration_ms,
  error_message
FROM agent_audit
WHERE ts > unixepoch('now', '-1 hour')
ORDER BY ts DESC
LIMIT 100;
```

## Security Best Practices

1. **Never expose tokens in client-side code**
2. **Rotate tokens regularly** (monthly recommended)
3. **Use IP allowlisting** for production
4. **Monitor audit logs** for suspicious activity
5. **Set up alerts** for repeated failures
6. **Use idempotency keys** for all mutations
7. **Implement rate limiting** appropriate for your use case

## Testing

Run the test suite:
```bash
cd agent-client
chmod +x test-suite.sh
./test-suite.sh
```

## Deployment Checklist

- [ ] Set `AGENT_SERVICE_TOKEN` in Cloudflare Pages settings
- [ ] Set `AGENT_HMAC_SECRET` in Cloudflare Pages settings
- [ ] Run database migrations for audit tables
- [ ] Configure IP allowlist if needed
- [ ] Test authentication with invalid token (should fail)
- [ ] Test HMAC validation with wrong secret (should fail)
- [ ] Test idempotency with duplicate requests
- [ ] Set up monitoring for audit logs
- [ ] Document token in secure password manager
- [ ] Share integration details with LLM team only