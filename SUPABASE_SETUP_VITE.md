# 🔧 SUPABASE INTEGRATION FOR LIFE OS (VITE)

## ⚠️ Important: We're Using Vite, Not Next.js!

The code you shared is for Next.js. Our Life OS uses **Vite + React**, which has a simpler setup.

## What We Already Have ✅

```typescript
// src/services/supabase.ts - Already configured!
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

## What I Need From You 🔑

### Your Supabase Project Details:

1. **Go to your Supabase Dashboard:** https://supabase.com/dashboard
2. **Select your project**
3. **Go to Settings → API**
4. **Copy these two values:**

```
Project URL: https://[YOUR-PROJECT-ID].supabase.co
Anon/Public Key: eyJ[YOUR-LONG-KEY-HERE]...
```

**Paste them here:**
```
SUPABASE URL: 
SUPABASE ANON KEY: 
```

## What I'll Set Up For You 🚀

### 1. Environment Variables
```env
# .env.local
VITE_SUPABASE_URL=your-url-here
VITE_SUPABASE_ANON_KEY=your-key-here
```

### 2. Database Schema
```sql
-- Projects table
CREATE TABLE projects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'active',
  priority TEXT DEFAULT 'medium',
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Tasks table  
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  project_id UUID REFERENCES projects(id),
  status TEXT DEFAULT 'todo',
  priority TEXT DEFAULT 'B',
  due_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  user_id UUID REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
```

### 3. Authentication (Optional for Now)
```typescript
// For user auth later
const { data: { user } } = await supabase.auth.getUser();
```

### 4. Real-time Sync
```typescript
// Subscribe to changes
supabase
  .channel('projects')
  .on('postgres_changes', 
    { event: '*', schema: 'public', table: 'projects' },
    (payload) => {
      console.log('Change received!', payload);
      // Update local state
    }
  )
  .subscribe();
```

## Quick Start Steps

### Step 1: Share Your Credentials
Just paste your Supabase URL and Anon Key above.

### Step 2: I'll Update Your Files
- `.env.local` for development
- Vercel Dashboard for production

### Step 3: Create Database Tables
I'll generate a migration file you can run in Supabase.

### Step 4: Test Connection
```bash
npm run dev
# Open browser console
# Should see "Supabase connected!" message
```

## Vite vs Next.js Differences

| Feature | Next.js | Vite (Our App) |
|---------|---------|---------------|
| Env Vars | `NEXT_PUBLIC_*` | `VITE_*` |
| SSR | Built-in | Not needed |
| Middleware | Required | Not needed |
| Client | Complex | Simple |
| Auth | Server-side | Client-side |

## Why This is Simpler for Life OS

1. **No SSR needed** - We're a SPA
2. **Client-side only** - Simpler auth
3. **Direct API calls** - No middleware
4. **IndexedDB fallback** - Works offline
5. **Progressive sync** - Best of both

## Security Notes

✅ **Safe to share:** Anon/Public key (it's meant for client-side)
❌ **Never share:** Service role key (server-side only)
✅ **RLS enabled:** Row Level Security protects data
✅ **Auth required:** For user-specific data

---

## Ready? Just paste your Supabase credentials above!

The setup is much simpler than Next.js. We just need:
1. Your Supabase URL
2. Your Anon Key

That's it! No server components, no middleware, no complex setup. 🚀
