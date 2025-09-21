// PWA Validation Script
// Run this in Chrome DevTools Console to verify PWA is working

console.log('🧪 PWA Validation Starting...\n');

// 1. Check Service Worker
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistration()
    .then(reg => {
      if (reg) {
        console.log('✅ Service Worker registered:', reg.scope);
        console.log('   Status:', reg.active ? 'Active' : 'Installing/Waiting');
      } else {
        console.warn('⚠️ Service Worker not registered yet');
      }
    });
} else {
  console.error('❌ Service Workers not supported');
}

// 2. Check Manifest
const manifestLink = document.querySelector('link[rel="manifest"]');
if (manifestLink) {
  console.log('✅ Manifest linked:', manifestLink.href);
  fetch(manifestLink.href)
    .then(r => r.json())
    .then(m => console.log('   Name:', m.name, '| Display:', m.display));
} else {
  console.warn('⚠️ No manifest link found in HTML');
}

// 3. Check Install Prompt
if (window.deferredPrompt || window.installPromptEvent) {
  console.log('✅ Install prompt captured and ready');
} else {
  console.log('ℹ️ Install prompt not triggered (may already be installed or not eligible)');
}

// 4. Check Offline Capability
if (navigator.onLine) {
  console.log('📡 Currently online - toggle offline in DevTools to test');
} else {
  console.log('📴 Currently offline - check if app still works');
}

// 5. Check Cache Storage
if ('caches' in window) {
  caches.keys().then(names => {
    if (names.length > 0) {
      console.log('✅ Caches active:', names.join(', '));
      names.forEach(name => {
        caches.open(name).then(cache => {
          cache.keys().then(keys => {
            console.log(`   ${name}: ${keys.length} items cached`);
          });
        });
      });
    } else {
      console.log('ℹ️ No caches created yet');
    }
  });
}

// 6. Check HTTPS
if (location.protocol === 'https:' || location.hostname === 'localhost') {
  console.log('✅ HTTPS/localhost - PWA eligible');
} else {
  console.warn('⚠️ Not on HTTPS - PWA features limited');
}

// 7. Check Lighthouse Score
console.log('\n📊 For full PWA audit:');
console.log('   1. Open DevTools → Lighthouse tab');
console.log('   2. Check "Progressive Web App"');
console.log('   3. Click "Analyze page load"');

console.log('\n✨ PWA Validation Complete!');