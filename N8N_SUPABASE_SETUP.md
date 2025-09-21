# 🔧 n8n to Supabase Integration Setup

## ❌ Current Error
```
HTTP 500: Authorization failed - please check your credentials
No API key found in request
```

## ✅ Fix Instructions

### Step 1: Add Supabase Credentials to n8n

1. **Open your n8n workflow** at https://flow.voxemarketing.com
2. **Add a Supabase node** or HTTP Request node
3. **Configure the credentials:**

```javascript
// For HTTP Request Node
URL: https://ceubhminnsfgrsiootoq.supabase.co/rest/v1/calendar_events

Headers:
- apikey: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldWJobWlubnNmZ3JzaW9vdG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTY5OTQsImV4cCI6MjA3Mzk5Mjk5NH0.a01TpLtDl8VTFL5RuqMkeyRHzO-iBfIxY-YQibWjvsY
- Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldWJobWlubnNmZ3JzaW9vdG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTY5OTQsImV4cCI6MjA3Mzk5Mjk5NH0.a01TpLtDl8VTFL5RuqMkeyRHzO-iBfIxY-YQibWjvsY
- Content-Type: application/json
- Prefer: return=representation
```

### Step 2: Update Your Calendar Webhook Workflow

Your calendar webhook (f4fd2f67-df3b-4ee2-b426-944e51d01f28) should:

1. **Receive webhook data**
2. **Process/transform the data**
3. **Send to Supabase** using one of these methods:

#### Method A: Direct HTTP Request to Supabase
```javascript
// POST to create new event
POST https://ceubhminnsfgrsiootoq.supabase.co/rest/v1/calendar_events

// Body example:
{
  "summary": "Team Meeting",
  "description": "Weekly sync",
  "start": "2025-01-21T14:00:00Z",
  "end": "2025-01-21T15:00:00Z",
  "location": "Conference Room A"
}
```

#### Method B: Using Supabase Node
- Add Supabase node
- Operation: Insert
- Table: calendar_events
- Data: Map from webhook input

### Step 3: Example n8n Workflow Structure

```
[Webhook Trigger] 
    ↓
[Data Transform] (optional - format dates, clean data)
    ↓
[HTTP Request to Supabase] or [Supabase Node]
    ↓
[Respond to Webhook] (return success/error)
```

### Step 4: Test Commands

Once configured, test with curl:

```bash
# Test creating an event via n8n
curl -X POST https://flow.voxemarketing.com/webhook/f4fd2f67-df3b-4ee2-b426-944e51d01f28 \
  -H "Content-Type: application/json" \
  -d '{
    "action": "create",
    "event": {
      "summary": "Test Event from curl",
      "start": "2025-01-21T16:00:00Z",
      "end": "2025-01-21T17:00:00Z"
    }
  }'

# Test fetching events
curl -X POST https://flow.voxemarketing.com/webhook/f4fd2f67-df3b-4ee2-b426-944e51d01f28 \
  -H "Content-Type: application/json" \
  -d '{"action": "fetch", "days": 7}'
```

## 📝 Supabase API Reference

### Base URL
```
https://ceubhminnsfgrsiootoq.supabase.co/rest/v1
```

### Required Headers
```
apikey: [YOUR_ANON_KEY]
Authorization: Bearer [YOUR_ANON_KEY]
Content-Type: application/json
```

### Common Operations

**Insert Event:**
```
POST /calendar_events
```

**Get Events:**
```
GET /calendar_events?start=gte.2025-01-21T00:00:00Z&start=lte.2025-01-28T00:00:00Z&order=start.asc
```

**Update Event:**
```
PATCH /calendar_events?id=eq.[EVENT_ID]
```

**Delete Event:**
```
DELETE /calendar_events?id=eq.[EVENT_ID]
```

## 🔑 Your Credentials

```
Supabase URL: https://ceubhminnsfgrsiootoq.supabase.co
Supabase Anon Key: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldWJobWlubnNmZ3JzaW9vdG9xIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg0MTY5OTQsImV4cCI6MjA3Mzk5Mjk5NH0.a01TpLtDl8VTFL5RuqMkeyRHzO-iBfIxY-YQibWjvsY
```

## 💡 Quick Debug Tips

1. **Check n8n execution logs** for detailed error messages
2. **Verify headers** are being sent correctly
3. **Test direct Supabase API** first to ensure it works
4. **Use n8n's expression editor** to properly format dates
5. **Enable debug mode** in n8n nodes for more info

## 🚀 Once Fixed

Your calendar sync flow will be:
1. Google Calendar → n8n (via trigger/polling)
2. n8n processes and transforms data
3. n8n → Supabase (stores events)
4. Mobile app → Supabase (fetches events)

---

**Need help?** The test page at `test-calendar-sync.html` can verify both n8n and Supabase connections independently to help isolate issues.