# LIFE OS PROJECT - COMPLETE HANDOFF DOCUMENTATION

## Project Overview
**Project Name:** Trey's Dashboard → Life OS Transformation  
**Location:** `/Volumes/Trey's Macbook TB/Trey's Dashboard/`  
**Current URL:** https://melodic-rolypoly-17d5cf.netlify.app/lifeos  
**Password:** My-Drop-Site  
**Date:** Current Sprint - Day 7 → Week 1 of Life OS Build

## What You're Inheriting

### Original State (What Existed Before)
- A working productivity dashboard with agenda, notes, and AI assistant
- Connected to n8n webhooks for email, calendar, and AI chat
- 95/100 Lighthouse score, 127KB bundle, PWA capabilities
- Deployed and functional at the root route `/`

### What We Tried to Build Today
Transform the simple dashboard into a comprehensive "Life Operating System" with 13+ modules:
- Project Management (partially complete)
- Task Timeline (partially complete)
- Fitness, Finance, Knowledge, Relationships (planned, not built)
- Email task extraction (mock only, not connected)
- Cloud sync via Supabase (prepared but not connected)

## Current State - THE TRUTH

### What Works ✅
```javascript
// At /lifeos route:
- Project creation and display (local IndexedDB only)
- Task timeline view (local only)
- Basic UI with tab navigation
- Event bus system for component communication
- Database schema (8 tables defined)
```

### What's Broken ❌
```javascript
// Critical Issues:
1. Email webhook - DISCONNECTED from n8n
2. Calendar webhook - DISCONNECTED from n8n  
3. AI Agent chat - CANNOT communicate with n8n
4. Date field validation - BREAKS task creation (invalid date error)
5. No actual email scanning (only mock data)
6. No Supabase connection (no cloud sync)
7. Original dashboard features NOT integrated into Life OS
```

## Technical Architecture

### Tech Stack
```javascript
{
  frontend: "React + TypeScript + Vite",
  styling: "Tailwind CSS",
  database: "IndexedDB (Dexie) - LOCAL ONLY",
  deployment: "Netlify",
  plannedButNotWorking: {
    backend: "Supabase (not connected)",
    email: "Gmail API (not implemented)",
    automation: "n8n webhooks (broken)"
  }
}
```

### File Structure - Key Files You Need
```
/src/
├── services/
│   ├── lifeOS-db.ts         # New database schema (working)
│   ├── eventBus.ts          # Event system (working)
│   ├── db.ts                # OLD database (SimpleDashboard uses this)
│   └── supabase.ts          # Supabase client (NOT CONNECTED)
├── modules/
│   ├── projects/
│   │   ├── services/projectService.ts  # Has DATE BUG
│   │   └── components/ProjectList.tsx  # UI works
│   └── timeline/
│       ├── services/timelineService.ts # Works locally
│       └── components/TimelineView.tsx # UI works
├── pages/
│   ├── SimpleDashboard.tsx  # OLD WORKING dashboard with webhooks
│   └── LifeOS.tsx           # NEW system missing webhook integration
```

## The Core Problem

We built Life OS as a SEPARATE system instead of INTEGRATING with the existing dashboard. This means:
- Old route `/` has working webhooks but old UI
- New route `/lifeos` has new UI but broken integrations
- The two systems don't talk to each other

## How to Fix This - Priority Order

### 1. URGENT: Fix Date Validation (5 min)
```typescript
// In src/modules/projects/services/projectService.ts
// Around line 85-95, fix the date parsing:

const dueAt = taskData.dueAt ? 
  (typeof taskData.dueAt === 'string' ? 
    Date.parse(taskData.dueAt) : 
    new Date(taskData.dueAt).getTime()
  ) : undefined;

// Make sure to check for NaN:
if (dueAt && isNaN(dueAt)) {
  console.error('Invalid date:', taskData.dueAt);
  // Set to undefined or default to today
}
```

### 2. CRITICAL: Restore Webhook Connections (30 min)
```typescript
// In src/pages/LifeOS.tsx, add:
import { useWebhookData } from '@/hooks/useWebhookData';

// Copy the webhook logic from SimpleDashboard.tsx
// The working webhooks are:
const WEBHOOKS = {
  emails: '/api/webhook/emails',
  calendar: '/api/webhook/calendar', 
  agent: 'https://n8n.treys.cc/webhook/agent-chat'
};
```

### 3. IMPORTANT: Merge Systems (2 hours)
Don't maintain two separate systems. Either:
- **Option A:** Port all SimpleDashboard features into Life OS
- **Option B:** Add Life OS features back into SimpleDashboard
- **Option C:** Create a unified route that uses both

## Environment Variables Needed
```env
# In .env.local - Currently incomplete:
VITE_OPENAI_API_KEY=sk-...  # If you have one
VITE_SUPABASE_URL=          # NOT SET - needs Supabase project
VITE_SUPABASE_ANON_KEY=     # NOT SET - needs Supabase project
```

## Webhook Endpoints (From n8n)
```javascript
// These MUST work for the app to function:
GET  /api/webhook/emails     → Returns email list
GET  /api/webhook/calendar   → Returns calendar events  
POST https://n8n.treys.cc/webhook/agent-chat → AI chat
```

## Testing Checklist
```bash
# 1. Test locally first
npm run dev
# Visit http://localhost:5173/lifeos

# 2. Can you create a project? (Should work)
# 3. Can you add a task with a date? (Currently broken)
# 4. Can you refresh emails? (Currently broken)
# 5. Can you chat with AI? (Currently broken)

# 6. After fixes, build and deploy:
npm run build
npm run deploy  # Or manual Netlify upload
```

## What Was Planned But Not Built
The original vision was 13 modules over 6 months. We built 2 modules in 3 hours:
- ✅ Project Management (local only, date bug)
- ✅ Timeline (local only)
- ❌ Fitness tracking
- ❌ Finance management
- ❌ Knowledge hub
- ❌ Relationship CRM
- ❌ Travel planning
- ❌ Content pipeline
- ❌ Weekly reviews
- ❌ Automation control
- ❌ Future You panel

## Your Decision Points

### Immediate (Fix broken production):
1. Fix date validation bug
2. Restore webhook connections
3. Test and deploy fixes

### Short term (This week):
- Decide: Continue Life OS or revert to SimpleDashboard?
- If continuing: Set up Supabase yourself
- If reverting: Move best features back to SimpleDashboard

### Long term (This month):
- Full vision needs 3-6 months of work
- Consider: Is the Life OS approach right?
- Alternative: Enhance SimpleDashboard incrementally

## Commands You Need
```bash
# Start development
cd "/Volumes/Trey's Macbook TB/Trey's Dashboard"
npm run dev

# Check TypeScript errors
npm run typecheck

# Build for production
npm run build

# Test build locally
npm run preview

# Deploy (if you have access)
npm run deploy
```

## Contact & Context
- n8n webhooks: Trey controls these at n8n.treys.cc
- Deployment: Netlify account needed
- Supabase: No account created yet
- Original features: SimpleDashboard.tsx has working code

## The Bottom Line
You have a partially working Life OS that broke the original dashboard features. The webhooks that made email, calendar, and AI chat work are disconnected. The date field validation is broken. But the core architecture is solid - it just needs to be connected properly.

Fix the urgent issues first, then decide whether to continue with Life OS or enhance the original SimpleDashboard.

Good luck!
