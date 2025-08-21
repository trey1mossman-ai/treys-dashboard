# 🚀 Life OS Implementation Tasks - Complete Action Plan

## ✅ ALREADY COMPLETED
- [x] OpenAI SDK installed (v5.13.1)
- [x] Cost controller implemented ($100/month budget)
- [x] Model router with complexity assessment  
- [x] Local brain database (IndexedDB with Dexie)
- [x] Basic caching system
- [x] PII sanitization
- [x] Folder structure created
- [x] API key configured in .env.local

## 🔴 CRITICAL TASKS - DO THESE NOW

### 1. Fix Immediate Issues (30 minutes)
```bash
# Remove the offline banner
# In src/App.tsx, lines 52-74 and 109-131
sed -i '' '52,74d' src/App.tsx
sed -i '' '85,107d' src/App.tsx  # Adjusted line numbers after first deletion

# Force online status
# Add this at line 31 in App.tsx:
# const [apiStatus] = useState<ApiStatus>('online');
```

### 2. Integrate New OpenAI Client (1 hour)
```bash
# The new client is created at: src/lib/ai/openai-client.ts
# Now integrate it into the app:

# Update imports in AssistantDock.tsx
# Replace aiService with openAIClient
# Update src/features/assistant/AssistantDock.tsx
```

### 3. Initialize Core Systems (2 hours)
```typescript
// In src/main.tsx or App.tsx, add initialization:
import { autoPilot } from '@/lib/automation/autopilot-v2';
import { patternDetector } from '@/lib/intelligence/pattern-detector';
import { googleCalendar } from '@/lib/integrations/google-calendar';
import { localBrain } from '@/lib/database/local-brain';

// Initialize on app start
useEffect(() => {
  const initializeSystems = async () => {
    // Initialize pattern detection
    console.log('Initializing Life OS systems...');
    
    // Start autopilot
    await autoPilot.initialize();
    
    // Initialize calendar if tokens exist
    await googleCalendar.initialize();
    
    // Clean old cache periodically
    setInterval(() => localBrain.cleanupOldCache(), 86400000); // Daily
  };
  
  initializeSystems();
}, []);
```

## 📋 IMPLEMENTATION TASKS BY PRIORITY

### PHASE 1: Core AI Integration (Today)

#### Task 1.1: Update Assistant to Use New OpenAI Client
```typescript
// File: src/features/assistant/AssistantDock.tsx
// Replace the processCommand function to use openAIClient

import { openAIClient } from '@/lib/ai/openai-client';

const handleSend = async () => {
  // ... existing code ...
  
  try {
    // Use new OpenAI client with streaming
    const response = await openAIClient.chat(message.trim(), {
      session: sessionId,
      stream: false // Start with non-streaming
    });
    
    if (response.tools) {
      // Handle tool executions
      console.log('Tools executed:', response.tools);
    }
    
    setMessages(prev => [...prev, {
      id: Date.now().toString(),
      role: 'assistant',
      content: response.content,
      timestamp: new Date(),
      status: response.error ? 'error' : 'sent'
    }]);
    
  } catch (error) {
    console.error('Assistant error:', error);
  }
};
```

#### Task 1.2: Create Universal Command Palette
```typescript
// File: src/components/UniversalCommand.tsx
// Already outlined in the implementation - just needs to be integrated

// Add to App.tsx:
import { UniversalCommand } from '@/components/UniversalCommand';

// Add before closing div:
<UniversalCommand />
```

#### Task 1.3: Set Up Event Listeners for AI Actions
```typescript
// File: src/hooks/useAIEventListeners.ts
export function useAIEventListeners() {
  useEffect(() => {
    const handlers = {
      'ai-create-event': (e: CustomEvent) => {
        // Handle calendar event creation
        googleCalendar.createEvent(e.detail);
      },
      'ai-add-agenda': (e: CustomEvent) => {
        // Handle agenda item addition
        addAgendaItem(e.detail);
      },
      'ai-log-food': (e: CustomEvent) => {
        // Handle food logging
        addFoodItem(e.detail);
      },
      'autopilot-reminder': (e: CustomEvent) => {
        // Show reminder notification
        toast({
          title: 'Reminder',
          description: e.detail.title
        });
      }
    };
    
    // Register all handlers
    Object.entries(handlers).forEach(([event, handler]) => {
      window.addEventListener(event, handler as EventListener);
    });
    
    // Cleanup
    return () => {
      Object.entries(handlers).forEach(([event, handler]) => {
        window.removeEventListener(event, handler as EventListener);
      });
    };
  }, []);
}
```

### PHASE 2: Google Calendar Integration (Tomorrow)

#### Task 2.1: Get Google OAuth Credentials
```bash
# 1. Go to https://console.cloud.google.com
# 2. Create new project or select existing
# 3. Enable Google Calendar API
# 4. Create OAuth 2.0 credentials
# 5. Add to .env.local:
echo "VITE_GOOGLE_CLIENT_ID=your-client-id" >> .env.local
echo "VITE_GOOGLE_CLIENT_SECRET=your-secret" >> .env.local
```

#### Task 2.2: Create OAuth Callback Handler
```typescript
// File: src/pages/AuthCallback.tsx
export function AuthCallback() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    
    if (code) {
      // Exchange code for tokens
      // Send to parent window
      window.opener.postMessage({
        type: 'google-auth-success',
        code
      }, window.location.origin);
      
      window.close();
    }
  }, []);
  
  return <div>Authenticating...</div>;
}

// Add route in router
```

#### Task 2.3: Add Calendar Connection UI
```typescript
// In Settings or a new Calendar settings component
<button onClick={() => googleCalendar.authenticate()}>
  Connect Google Calendar
</button>
```

### PHASE 3: Pattern Learning & Automation (Day 3)

#### Task 3.1: Start Collecting Events
```typescript
// Add to every user action
await localBrain.logEvent('user_action', {
  type: 'task_completed',
  data: { taskId, title, duration }
});
```

#### Task 3.2: Run Pattern Detection Daily
```typescript
// Add to autopilot or separate job
const runDailyAnalysis = async () => {
  const events = await localBrain.events
    .where('timestamp')
    .above(Date.now() - 86400000) // Last 24 hours
    .toArray();
  
  const patterns = await patternDetector.detectDailyPatterns(events);
  console.log('Detected patterns:', patterns);
};
```

#### Task 3.3: Create Pattern Visualization
```typescript
// Component to show learned patterns
export function PatternInsights() {
  const [insights, setInsights] = useState<string[]>([]);
  
  useEffect(() => {
    patternDetector.getInsights().then(setInsights);
  }, []);
  
  return (
    <div className="insights-panel">
      <h3>AI Insights</h3>
      {insights.map(insight => (
        <div key={insight}>{insight}</div>
      ))}
    </div>
  );
}
```

### PHASE 4: Email Integration (Day 4)

#### Task 4.1: Gmail API Setup
```typescript
// Similar to calendar but with Gmail scopes
// File: src/lib/integrations/gmail.ts
```

#### Task 4.2: Email Triage Automation
```typescript
// Add to autopilot rules
{
  id: 'email-triage',
  trigger: { type: 'time', value: '09:00' },
  action: {
    type: 'triage_email',
    data: { maxEmails: 50 }
  }
}
```

### PHASE 5: Performance & Monitoring (Day 5)

#### Task 5.1: Add Performance Dashboard
```typescript
// File: src/components/PerformanceMonitor.tsx
export function PerformanceMonitor() {
  const stats = costController.getStats();
  const cacheStats = await localBrain.getCacheStats();
  
  return (
    <div className="stats-grid">
      <div>Daily Cost: ${stats.daily}</div>
      <div>Cache Hit Rate: {(cacheStats.hitRate * 100).toFixed(1)}%</div>
      <div>Time Saved Today: {calculateTimeSaved()}min</div>
    </div>
  );
}
```

#### Task 5.2: Implement Cost Alerts
```typescript
// Add to cost controller
if (this.monthlySpend > this.monthlyBudget * 0.9) {
  window.dispatchEvent(new CustomEvent('cost-alert', {
    detail: { 
      message: 'Approaching monthly budget limit',
      spent: this.monthlySpend,
      budget: this.monthlyBudget
    }
  }));
}
```

### PHASE 6: Testing & Validation (Day 6)

#### Task 6.1: Create Test Suite
```bash
# Install testing libraries
npm install -D vitest @testing-library/react

# Create test files
touch src/__tests__/pattern-detector.test.ts
touch src/__tests__/cost-controller.test.ts
touch src/__tests__/autopilot.test.ts
```

#### Task 6.2: Test Core Functionality
```typescript
// Pattern detection accuracy
test('detects morning routine pattern', async () => {
  const events = generateMockEvents();
  const patterns = await patternDetector.detectDailyPatterns(events);
  expect(patterns.some(p => p.type === 'time')).toBe(true);
});

// Cost tracking
test('stays within budget', () => {
  costController.recordSpend(1000, 'gpt-3.5-turbo');
  expect(costController.getStats().daily).toBeLessThan(3.33);
});
```

### PHASE 7: Deployment (Day 7)

#### Task 7.1: Build for Production
```bash
# Update wrangler.toml with secrets
npx wrangler secret put OPENAI_API_KEY

# Build and deploy
npm run build
npx wrangler pages deploy dist
```

#### Task 7.2: Set Up Monitoring
```typescript
// Add error tracking
window.addEventListener('error', (event) => {
  localBrain.logEvent('app_error', {
    message: event.message,
    stack: event.error?.stack
  });
});
```

## 🔧 CONFIGURATION FILES NEEDED

### 1. Update package.json scripts
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "test": "vitest",
    "deploy": "npm run build && npx wrangler pages deploy dist",
    "analyze": "npm run build -- --mode analyze"
  }
}
```

### 2. Create CLAUDE.md for context
```markdown
# Life OS - AI Context

## Architecture
- React + TypeScript + Vite
- IndexedDB with Dexie for local storage
- OpenAI GPT-4o for AI
- Cloudflare Pages deployment
- $100/month budget constraint

## Key Patterns
- User wakes at 7am
- Deep work 9-11am, 3-5pm
- Energy dip 2-3pm
- Workouts Mon/Wed/Fri 6pm

## Priorities
1. Time savings (target: 2+ hours/day)
2. Cost efficiency (<$100/month)
3. Privacy (PII never leaves device)
4. Automation (autopilot, not copilot)
```

## 📊 SUCCESS METRICS TO TRACK

1. **Cache Hit Rate**: Target >80%
2. **Daily API Cost**: Target <$3.33
3. **Time Saved**: Target >2 hours/day
4. **Automation Success**: Target >90%
5. **Pattern Detection Accuracy**: Target >70%
6. **User Interventions**: Target <5/day

## 🚨 COMMON ISSUES & FIXES

### Issue: "Budget exceeded" messages
```typescript
// Solution: Increase cache TTL
const CACHE_TTL = 86400 * 2; // 2 days instead of 1
```

### Issue: Patterns not detecting
```typescript
// Solution: Ensure events are being logged
console.log('Events count:', await localBrain.events.count());
// Should be >100 for good patterns
```

### Issue: Calendar not syncing
```typescript
// Solution: Check tokens
console.log('Calendar connected:', googleCalendar.isConnected());
// Re-authenticate if false
```

## 🎯 DAILY CHECKLIST

- [ ] Morning: Check cost dashboard
- [ ] Noon: Review automation success rate
- [ ] Evening: Check pattern insights
- [ ] Before bed: Review tomorrow's agenda

## 💡 OPTIMIZATION OPPORTUNITIES

1. **Batch API Calls**: Group multiple queries
2. **Precompute Common Queries**: Daily agenda, weekly summary
3. **Edge Caching**: Use Cloudflare KV for common responses
4. **Local LLM Fallback**: Consider Ollama for simple queries
5. **Progressive Enhancement**: Start basic, add features as patterns emerge

## 📱 NEXT FEATURES TO CONSIDER

1. **Voice Input**: Web Speech API (free)
2. **Meal Photo Analysis**: GPT-4 Vision for macro tracking
3. **Sleep Tracking**: Correlate with productivity
4. **Financial Tracking**: Monthly budget analysis
5. **Social Integration**: Calendar availability sharing

## 🏁 LAUNCH CHECKLIST

- [ ] All tests passing
- [ ] Cost tracking verified <$100/month
- [ ] Calendar integration working
- [ ] Autopilot running smoothly
- [ ] Pattern detection accurate
- [ ] Cache hit rate >80%
- [ ] No console errors
- [ ] PWA installable
- [ ] Backup/export working
- [ ] Privacy controls in place

---

Remember: Ship fast, iterate based on real usage. The goal is time savings, not perfection.
