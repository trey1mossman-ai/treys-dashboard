# TEAM INSTRUCTIONS - URGENT FIX NEEDED

## FOR CLAUDE CODE:

### PROBLEM:
The webhooks are completely broken. The app is trying to use ailifeassistanttm.com which has CORS errors. We need to use the actual n8n webhooks.

### YOUR TASKS:
1. Update ALL webhook calls to use these URLs directly:
   - Email: https://flow.voxemarketing.com/webhook/c14a535e-80bf-4bd9-9b3d-1001e6917d85
   - Calendar: https://flow.voxemarketing.com/webhook/f4fd2f67-df3b-4ee2-b426-944e51d01f28
   - AI Agent: https://flow.voxemarketing.com/webhook/c0552eb4-8ed7-4a46-b141-492ba7fefd04/chat

2. Remove ALL references to ailifeassistanttm.com
3. Fix the data format handling - n8n returns different structure than expected
4. Test the webhooks actually work

### FILES TO FIX:
- src/services/webhookService.ts (already partially fixed but may need more)
- src/pages/SimpleDashboard.tsx (already partially fixed but check it)
- Any other files using webhooks

---

## FOR CODEX:

### YOUR TASKS:
1. After Claude Code fixes the webhooks, test everything:
   - Run: node test-n8n-webhooks.mjs
   - Check if data actually comes back
   - Verify the format matches what the UI expects

2. Deploy to production:
   - git add .
   - git commit -m "Fix webhooks to use actual n8n endpoints"
   - git push origin main

3. Monitor the Vercel deployment and test production

---

## CURRENT STATUS:

### What's Broken:
- SimpleDashboard email refresh - CORS error
- SimpleDashboard calendar refresh - CORS error  
- AI Agent connection - not working
- Data not populating when refresh is clicked

### What We Have:
- n8n webhooks at flow.voxemarketing.com (confirmed working)
- Supabase configured but schema not run yet
- Vercel auto-deploy from GitHub

### Test These Webhooks:
```bash
# Email
curl https://flow.voxemarketing.com/webhook/c14a535e-80bf-4bd9-9b3d-1001e6917d85

# Calendar  
curl https://flow.voxemarketing.com/webhook/f4fd2f67-df3b-4ee2-b426-944e51d01f28

# Agent (POST)
curl -X POST https://flow.voxemarketing.com/webhook/c0552eb4-8ed7-4a46-b141-492ba7fefd04/chat \
  -H "Content-Type: application/json" \
  -d '{"sessionId":"test","action":"sendMessage","chatInput":"test"}'
```

## WRITE YOUR UPDATES HERE:

### Claude Code Updates:
(Write what you fixed here)

### Codex Updates:
(Write test results here)