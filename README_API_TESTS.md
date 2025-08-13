# API Test Documentation

## Quick Actions API Endpoints

### 1. List Quick Actions
```bash
curl -X GET http://localhost:8788/api/quick_actions/list
```

### 2. Create Quick Action
```bash
curl -X POST http://localhost:8788/api/quick_actions/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Send Daily Report",
    "method": "POST",
    "webhook_url": "https://n8n.example.com/webhook/daily-report",
    "headers": {
      "Authorization": "Bearer token123",
      "X-Custom-Header": "value"
    },
    "default_payload": {
      "report_type": "daily",
      "include_metrics": true
    }
  }'
```

### 3. Update Quick Action
```bash
curl -X PUT http://localhost:8788/api/quick_actions/update \
  -H "Content-Type: application/json" \
  -d '{
    "id": "action-id-here",
    "name": "Updated Action Name",
    "method": "POST",
    "webhook_url": "https://n8n.example.com/webhook/updated",
    "headers": {
      "Authorization": "Bearer new-token"
    },
    "default_payload": {
      "updated": true
    }
  }'
```

### 4. Delete Quick Action
```bash
curl -X DELETE http://localhost:8788/api/quick_actions/delete \
  -H "Content-Type: application/json" \
  -d '{
    "id": "action-id-here"
  }'
```

### 5. Execute Quick Action
```bash
# Execute with default payload
curl -X POST http://localhost:8788/api/quick_actions/exec/action-id-here

# Execute with custom payload
curl -X POST http://localhost:8788/api/quick_actions/exec/action-id-here \
  -H "Content-Type: application/json" \
  -d '{
    "payload": {
      "custom_field": "custom_value",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  }'
```

## Notes API Endpoints

### 1. List Notes
```bash
# List active notes (default)
curl -X GET http://localhost:8788/api/notes/list

# List archived notes
curl -X GET "http://localhost:8788/api/notes/list?status=archived"
```

### 2. Create Note
```bash
curl -X POST http://localhost:8788/api/notes/create \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Remember to review the pull requests",
    "tag": "reminder"
  }'
```

### 3. Archive Note
```bash
curl -X PUT http://localhost:8788/api/notes/archive \
  -H "Content-Type: application/json" \
  -d '{
    "id": "note-id-here"
  }'
```

### 4. Delete Note
```bash
curl -X DELETE http://localhost:8788/api/notes/delete \
  -H "Content-Type: application/json" \
  -d '{
    "id": "note-id-here"
  }'
```

## Database Migration

Before using the APIs, run the database migration:

```bash
# Apply migration using Wrangler D1
wrangler d1 execute agenda-db --local --file=./migrations/0002_quick_actions_and_notes.sql

# For production
wrangler d1 execute agenda-db --file=./migrations/0002_quick_actions_and_notes.sql
```

## Testing Workflow

### Complete Quick Actions Test
```bash
# 1. Create a new action
ACTION_RESPONSE=$(curl -s -X POST http://localhost:8788/api/quick_actions/create \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Webhook",
    "method": "POST",
    "webhook_url": "https://webhook.site/unique-url",
    "headers": {"X-Test": "true"},
    "default_payload": {"test": true}
  }')

# 2. Extract action ID
ACTION_ID=$(echo $ACTION_RESPONSE | jq -r '.id')

# 3. List all actions
curl -X GET http://localhost:8788/api/quick_actions/list

# 4. Execute the action
curl -X POST http://localhost:8788/api/quick_actions/exec/$ACTION_ID \
  -H "Content-Type: application/json" \
  -d '{"payload": {"custom": "data"}}'

# 5. Update the action
curl -X PUT http://localhost:8788/api/quick_actions/update \
  -H "Content-Type: application/json" \
  -d "{
    \"id\": \"$ACTION_ID\",
    \"name\": \"Updated Test\",
    \"method\": \"GET\",
    \"webhook_url\": \"https://webhook.site/another-url\"
  }"

# 6. Delete the action
curl -X DELETE http://localhost:8788/api/quick_actions/delete \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$ACTION_ID\"}"
```

### Complete Notes Test
```bash
# 1. Create a note
NOTE_RESPONSE=$(curl -s -X POST http://localhost:8788/api/notes/create \
  -H "Content-Type: application/json" \
  -d '{
    "body": "Test note content",
    "tag": "urgent"
  }')

# 2. Extract note ID
NOTE_ID=$(echo $NOTE_RESPONSE | jq -r '.note.id')

# 3. List active notes
curl -X GET http://localhost:8788/api/notes/list

# 4. Archive the note
curl -X PUT http://localhost:8788/api/notes/archive \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$NOTE_ID\"}"

# 5. List archived notes
curl -X GET "http://localhost:8788/api/notes/list?status=archived"

# 6. Delete the note
curl -X DELETE http://localhost:8788/api/notes/delete \
  -H "Content-Type: application/json" \
  -d "{\"id\": \"$NOTE_ID\"}"
```

## Expected Responses

### Successful Quick Action Creation
```json
{
  "ok": true,
  "id": "abc123...",
  "action": {
    "id": "abc123...",
    "name": "Send Daily Report",
    "method": "POST",
    "webhook_url": "https://n8n.example.com/webhook/daily-report",
    "headers": {...},
    "default_payload": {...},
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Successful Note Creation
```json
{
  "ok": true,
  "id": "def456...",
  "note": {
    "id": "def456...",
    "body": "Test note content",
    "tag": "urgent",
    "status": "active",
    "created_at": "2024-01-01T00:00:00.000Z"
  }
}
```

### Error Response
```json
{
  "ok": false,
  "error": "Error message here"
}
```

## Acceptance Criteria Checklist

✅ Database migration creates tables with proper indexes
✅ Quick Actions API endpoints (list, create, update, delete, exec)
✅ Notes API endpoints (list, create, archive, delete)
✅ Frontend Quick Actions Grid with create/edit/delete/run functionality
✅ Frontend Notes Panel with create/archive/delete functionality
✅ Dashboard shows all sections (Agenda, Quick Actions, Recent Comms, Notes)
✅ Glow aesthetic applied consistently across UI
✅ TypeScript strict mode compatibility
✅ Error handling with clean JSON responses
✅ CORS headers properly configured
✅ Webhook proxy through Cloudflare Functions
✅ Responsive layout (two columns at ≥1100px)