# DAY 3-4 COORDINATION DOCUMENT
## Team Sync Protocol - Performance Foundation Phase

### **Current Status: 9:00 AM Start**
**Date**: Day 3-4 (Week 1 - Foundation Rebuild)
**Phase**: Performance & Mobile-First Implementation

---

## 📊 **Task Ownership Matrix**

| Component | Owner | Status | Dependencies | Handoff Time |
|-----------|-------|--------|--------------|--------------|
| **IndexedDB Service** | Claude | ✅ Complete | None | Ready |
| **useOptimizedData Hook** | Claude | ✅ Complete | db.ts | Ready |
| **Performance Monitor** | Claude | ✅ Complete | None | Ready |
| **SimpleDashboard Refactor** | Claude Code | 🔄 In Progress | db.ts, useOptimizedData | 12:00 PM |
| **VirtualList Component** | Claude Code | ⏳ Pending | None | 11:00 AM |
| **Skeleton Component** | Claude Code | ⏳ Pending | None | 10:30 AM |
| **ResponsiveCard** | Codex | ⏳ Starting | None | 10:00 AM |
| **useGestures Hook** | Codex | ⏳ Pending | None | 11:00 AM |
| **Keyboard Shortcuts** | Codex | ⏳ Pending | None | 11:30 AM |

---

## 🔒 **File Lock Registry**

### **Locked Files (DO NOT EDIT)**

#### Claude's Files (9:00 AM - 12:00 PM)
```
✅ /src/services/db.ts - COMPLETE
✅ /src/hooks/useOptimizedData.ts - COMPLETE  
✅ /scripts/perf-monitor.js - COMPLETE
🔒 /src/components/PerformanceMonitor.tsx - IN PROGRESS
```

#### Claude Code's Files (9:00 AM - 2:00 PM)
```
🔒 /src/pages/SimpleDashboard.tsx - LOCKED
🔒 /src/components/VirtualList.tsx - LOCKED
🔒 /src/components/ui/Skeleton.tsx - LOCKED
🔒 /src/features/agenda/AgendaSection.tsx - LOCKED
```

#### Codex's Files (9:00 AM - 2:00 PM)
```
🔒 /src/components/ui/ResponsiveCard.tsx - LOCKED
🔒 /src/hooks/useGestures.ts - LOCKED
🔒 /src/hooks/useKeyboardShortcuts.ts - LOCKED
🔒 /src/styles/responsive-system.css - LOCKED
```

---

## 🤝 **Integration Points**

### **10:00 AM Sync**
```typescript
// Claude → Claude Code
import { db } from '@/services/db'; // ✅ Ready
import { useOptimizedData } from '@/hooks/useOptimizedData'; // ✅ Ready

// Codex → Claude Code
import { ResponsiveCard } from '@/components/ui/ResponsiveCard'; // ⏳ ETA 10:00 AM
```

### **12:00 PM Integration**
```typescript
// All components ready for SimpleDashboard integration
// Test build together
// Performance benchmarks
```

---

## 📈 **Progress Tracking**

### **Claude (Team Lead)**
- [x] Create IndexedDB service with Dexie
- [x] Implement useOptimizedData hook with React Query
- [x] Create performance monitoring script
- [ ] Create PerformanceMonitor component
- [ ] Run initial performance benchmarks
- [ ] Document integration patterns

### **Claude Code**
- [ ] Replace all setTimeout delays in SimpleDashboard
- [ ] Integrate useOptimizedData for all data fetching
- [ ] Implement VirtualList for agenda/todos
- [ ] Add Skeleton loaders to all sections
- [ ] Remove manual state management
- [ ] Test with 1000+ items

### **Codex**
- [ ] Create ResponsiveCard with mobile-first breakpoints
- [ ] Implement swipe gestures for mobile
- [ ] Add keyboard shortcuts system
- [ ] Ensure 44px touch targets everywhere
- [ ] Create responsive grid system
- [ ] Test on actual mobile devices

---

## 🚨 **Blockers & Issues**

### **Current Blockers**
- None reported

### **Resolved Issues**
- ✅ TypeScript configuration (Day 2)
- ✅ Build errors (Day 2)
- ✅ WebSocket connection (Day 2)

---

## 📝 **Handoff Protocol**

### **When handing off work:**
1. **Commit with clear message**: 
   ```bash
   git commit -m "feat(day3): [component] - description"
   ```

2. **Add handoff comment in file**:
   ```typescript
   // HANDOFF: Claude → Claude Code at 10:00 AM
   // Status: db service ready for integration
   // Notes: Use getCached() for initial load, setCached() for updates
   ```

3. **Update this document** with status change

4. **Post in sync channel** (if exists)

---

## 🎯 **Success Metrics for Day 3-4**

| Metric | Target | Current | Status |
|--------|--------|---------|--------|
| Bundle Size | < 400KB | TBD | ⏳ |
| TTI | < 3s | TBD | ⏳ |
| FCP | < 1.5s | TBD | ⏳ |
| Touch Targets | 44px min | TBD | ⏳ |
| Virtual Scrolling | Working | TBD | ⏳ |
| IndexedDB Caching | Working | ✅ | ✅ |

---

## 💬 **Communication Log**

### **9:00 AM - Claude**
```
IndexedDB service complete ✅
useOptimizedData hook complete ✅
Performance monitor ready ✅
Ready for integration!
```

### **[Time] - [Name]**
```
[Your update here]
```

---

## 🔄 **Next Sync Points**

- **10:00 AM**: Quick status check
- **11:00 AM**: Component integration check
- **12:00 PM**: Full integration & testing
- **2:00 PM**: Day 3-4 completion review

---

## 📋 **Testing Checklist**

Before 2:00 PM review, ensure:

- [ ] Build passes without errors
- [ ] Bundle size < 400KB
- [ ] No console errors
- [ ] SimpleDashboard loads < 3s
- [ ] Virtual scrolling works with 1000+ items
- [ ] Mobile gestures functional
- [ ] Keyboard shortcuts working
- [ ] All data persists to IndexedDB
- [ ] Cache invalidation works
- [ ] Performance monitor shows green

---

## 🚀 **Day 5 Preview**

Tomorrow's focus:
- Section-by-section optimization
- Animation implementation
- PWA setup
- Testing suite creation

---

**Remember**: No one edits another team member's locked files without explicit handoff!