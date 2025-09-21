# 🔐 SECRETS CONFIGURATION GUIDE

## How to Share Supabase Credentials Safely

### Option 1: Through Vercel Dashboard (RECOMMENDED)
1. Go to: https://vercel.com/dashboard
2. Select your project
3. Settings → Environment Variables
4. Add:
   - `VITE_SUPABASE_URL` = your-project.supabase.co
   - `VITE_SUPABASE_ANON_KEY` = your-anon-key

### Option 2: Encrypted File for Team (LOCAL DEV)
Create `.env.local.encrypted` and share the password separately:
```bash
# Encrypt
openssl enc -aes-256-cbc -salt -in .env.local -out .env.local.encrypted

# Decrypt
openssl enc -aes-256-cbc -d -in .env.local.encrypted -out .env.local
```

### Option 3: Direct Update (TEMPORARY)
You can update `.env.local` directly but remember:
- Never commit this file
- It's already in .gitignore
- Only for local development

## Current Environment Variables Needed

### Supabase (Required for Cloud Sync)
```env
VITE_SUPABASE_URL=https://[your-project].supabase.co
VITE_SUPABASE_ANON_KEY=eyJ[...]
```

### OpenAI (Optional - for AI features)
```env
VITE_OPENAI_API_KEY=sk-[...]
```

### Application Settings
```env
VITE_APP_MODE=production
VITE_MONTHLY_BUDGET=100
VITE_CACHE_TTL=86400
```

## Where to Add Them

### For Production (Vercel)
1. Vercel Dashboard → Settings → Environment Variables
2. Add each variable
3. Scope: Production, Preview, Development

### For Local Development
1. Update `.env.local` file
2. Restart dev server after changes
3. Never commit this file

### For Team Members
1. Share through secure channel
2. Or use encrypted file method
3. Or add team members to Vercel project

## Supabase Setup Checklist

Once you have credentials:

### 1. Database Schema
```sql
-- Run in Supabase SQL Editor
-- Schema already defined in src/services/lifeOS-db.ts
-- We'll generate migrations when ready
```

### 2. Row Level Security (RLS)
```sql
-- Enable RLS on all tables
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
-- etc for all tables
```

### 3. Authentication
- [ ] Enable Email/Password auth
- [ ] Set up OAuth providers (optional)
- [ ] Configure email templates

### 4. Storage Buckets (if needed)
- [ ] Create 'avatars' bucket
- [ ] Create 'attachments' bucket
- [ ] Set permissions

## Testing Supabase Connection

```javascript
// Quick test in console or component
import { supabase } from '@/services/supabase';

async function testConnection() {
  const { data, error } = await supabase
    .from('projects')
    .select('*')
    .limit(1);
  
  if (error) {
    console.error('Supabase error:', error);
  } else {
    console.log('Supabase connected!', data);
  }
}
```

## Security Best Practices

### DO ✅
- Use environment variables
- Add to Vercel Dashboard
- Use anon key for client
- Enable RLS on all tables
- Rotate keys periodically

### DON'T ❌
- Commit keys to Git
- Share service keys publicly
- Disable RLS in production
- Use service key in client
- Share credentials in plain text

---

## Ready to Add Credentials?

1. **Add to Vercel Dashboard** (for production)
2. **Update .env.local** (for development)
3. **Test connection** with the code above
4. **Commit this guide** (without actual keys)

The team sync system is ready once credentials are configured!
