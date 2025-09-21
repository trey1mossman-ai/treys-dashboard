# PWA IMPLEMENTATION GUIDE
## For Claude Code - Afternoon Sprint
## Team Lead: Claude

---

## ✅ **ALREADY COMPLETED**

1. **manifest.json** - Created at `/public/manifest.json`
2. **service-worker.js** - Created at `/public/service-worker.js`

---

## 🎯 **YOUR IMPLEMENTATION TASKS**

### **1. Register Service Worker in App.tsx**
```typescript
// Add to src/App.tsx
useEffect(() => {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js')
        .then(reg => console.log('Service Worker registered'))
        .catch(err => console.error('Service Worker failed', err));
    });
  }
}, []);
```

### **2. Add Install Prompt Hook**
Create `/src/hooks/useInstallPrompt.ts`:
```typescript
import { useState, useEffect } from 'react';

export function useInstallPrompt() {
  const [installPrompt, setInstallPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState(false);

  useEffect(() => {
    const handler = (e: any) => {
      e.preventDefault();
      setInstallPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const install = async () => {
    if (!installPrompt) return false;
    
    installPrompt.prompt();
    const result = await installPrompt.userChoice;
    
    if (result.outcome === 'accepted') {
      setIsInstallable(false);
      setInstallPrompt(null);
      return true;
    }
    return false;
  };

  return { isInstallable, install };
}
```

### **3. Add Install Button to Dashboard**
In SimpleDashboard.tsx:
```typescript
const { isInstallable, install } = useInstallPrompt();

// Add button in header
{isInstallable && (
  <button
    onClick={install}
    className="fixed top-4 right-4 bg-violet-600 text-white px-4 py-2 rounded-lg
               hover:bg-violet-700 transition-colors z-50"
    data-testid="install-button"
  >
    Install App
  </button>
)}
```

### **4. Update index.html**
Add to `<head>`:
```html
<!-- PWA Meta Tags -->
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#A884FF">
<link rel="apple-touch-icon" href="/icon-192.png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
```

### **5. Create Offline Page**
Create `/public/offline.html`:
```html
<!DOCTYPE html>
<html>
<head>
  <title>Offline - Trey's Dashboard</title>
  <style>
    body {
      background: #0F0F14;
      color: #E5E5EA;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      height: 100vh;
      margin: 0;
    }
    .container {
      text-align: center;
      padding: 2rem;
    }
    h1 { color: #A884FF; }
    p { opacity: 0.8; }
    button {
      margin-top: 1rem;
      padding: 0.75rem 1.5rem;
      background: #A884FF;
      color: white;
      border: none;
      border-radius: 0.5rem;
      cursor: pointer;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>You're Offline</h1>
    <p>The dashboard needs an internet connection to sync.</p>
    <button onclick="location.reload()">Try Again</button>
  </div>
</body>
</html>
```

### **6. Create Icon Placeholders**
For now, create simple placeholder icons:
```bash
# In public/ directory:
touch icon-192.png icon-512.png
# These should be actual icons - use Canvas or any tool to create them
# Violet background (#A884FF) with white "TD" text works great
```

---

## ⚡ **QUICK WINS**

### **Mobile Viewport Fix**
Add to your global CSS:
```css
/* PWA Mobile Optimizations */
@supports (padding: env(safe-area-inset-top)) {
  .dashboard-container {
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
  }
}

/* Prevent bounce scrolling on iOS */
body {
  position: fixed;
  overflow: hidden;
  width: 100%;
  height: 100%;
}

.main-content {
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  height: 100vh;
}
```

### **Install Metrics**
Track install events:
```typescript
window.addEventListener('appinstalled', () => {
  console.log('PWA installed successfully');
  // Track in analytics
  window.dispatchEvent(new CustomEvent('pwa:installed'));
});
```

---

## 🧪 **TESTING PWA FEATURES**

### **Desktop Chrome**
1. Open DevTools → Application tab
2. Check Manifest section
3. Check Service Workers section
4. Test "Install" button in address bar

### **Mobile Testing**
1. Use ngrok or local network URL
2. Open in Chrome/Safari
3. Look for "Add to Home Screen" prompt
4. Test offline mode (airplane mode)

### **Lighthouse PWA Audit**
```bash
# Run PWA audit
npm run build
npx serve dist
# Chrome DevTools → Lighthouse → PWA
```

---

## 📊 **SUCCESS CRITERIA**

- [ ] Service worker registered
- [ ] Install prompt appears
- [ ] Offline page shows when disconnected
- [ ] Icons display correctly
- [ ] Manifest validated in DevTools
- [ ] Lighthouse PWA score > 90

---

## 🚀 **YOU'VE GOT THIS!**

The foundation is laid. Just connect the pieces and we'll have a fully installable PWA by 2 PM!

Ping me if you hit any blockers. I'm running E2E tests and can jump in to help at any point.

**- Claude (Team Lead)**