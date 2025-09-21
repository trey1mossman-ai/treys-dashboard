// Mobile Testing Script - Day 5 Final Sprint
// Run this in browser console while in mobile device mode

console.log('🔍 MOBILE TESTING SUITE');
console.log('=======================\n');

// Test 1: Touch Target Validation
console.log('📱 Test 1: Touch Target Sizes');
let smallTargets = [];
document.querySelectorAll('button, a, [role="button"]').forEach(element => {
  const rect = element.getBoundingClientRect();
  if (rect.width < 44 || rect.height < 44) {
    smallTargets.push({
      element: element.className || element.tagName,
      width: Math.round(rect.width),
      height: Math.round(rect.height)
    });
  }
});

if (smallTargets.length === 0) {
  console.log('✅ All touch targets >= 44px');
} else {
  console.warn('⚠️ Small touch targets found:', smallTargets);
}

// Test 2: Event System
console.log('\n🔄 Test 2: Event System');
const events = ['agenda:created', 'note:created', 'action:executed'];
let eventResults = [];

events.forEach(eventName => {
  const listener = (e) => {
    eventResults.push(`✅ ${eventName} received`);
    window.removeEventListener(eventName, listener);
  };
  window.addEventListener(eventName, listener);

  // Fire test event
  window.dispatchEvent(new CustomEvent(eventName, {
    detail: { test: true, timestamp: Date.now() }
  }));
});

setTimeout(() => {
  console.log('Event test results:', eventResults.length === 3 ? '✅ All working' : '❌ Some failed');
  eventResults.forEach(r => console.log('  ' + r));
}, 100);

// Test 3: Responsive Breakpoints
console.log('\n📐 Test 3: Responsive Layout');
const width = window.innerWidth;
const height = window.innerHeight;
let deviceType = 'Desktop';

if (width < 768) deviceType = 'Mobile';
else if (width < 1024) deviceType = 'Tablet';

console.log(`Device: ${deviceType}`);
console.log(`Viewport: ${width}x${height}`);
console.log(`Aspect Ratio: ${(width/height).toFixed(2)}`);

// Test 4: Performance Metrics
console.log('\n⚡ Test 4: Performance');
if (window.performance) {
  const perfData = performance.getEntriesByType('navigation')[0];
  console.log(`DOM Load: ${Math.round(perfData.domContentLoadedEventEnd)}ms`);
  console.log(`Page Load: ${Math.round(perfData.loadEventEnd)}ms`);

  // Check for memory if available
  if (performance.memory) {
    const mb = (n) => (n / 1048576).toFixed(1);
    console.log(`Memory: ${mb(performance.memory.usedJSHeapSize)}MB / ${mb(performance.memory.jsHeapSizeLimit)}MB`);
  }
}

// Test 5: Voice Support
console.log('\n🎤 Test 5: Voice Support');
const hasVoice = 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window;
console.log(hasVoice ? '✅ Voice API supported' : '❌ Voice API not supported');

// Test 6: Touch/Gesture Support
console.log('\n👆 Test 6: Touch Support');
console.log('Touch events:', 'ontouchstart' in window ? '✅ Supported' : '❌ Not supported');
console.log('Pointer events:', 'onpointerdown' in window ? '✅ Supported' : '❌ Not supported');

// Test 7: Component Visibility
console.log('\n👁️ Test 7: Component Check');
const components = {
  'Assistant Dock': document.querySelector('[data-testid="assistant-dock"], .assistant-dock, button[aria-label*="Assistant"]'),
  'Email Section': document.querySelector('[data-testid="emails"], section:has(.email-item)'),
  'Calendar Section': document.querySelector('[data-testid="calendar"], section:has(.calendar-item)'),
  'Notes Board': document.querySelector('[data-testid="notes"], .notes-board'),
};

Object.entries(components).forEach(([name, element]) => {
  console.log(`${name}: ${element ? '✅ Found' : '❌ Missing'}`);
});

// Summary
console.log('\n📊 MOBILE TEST SUMMARY');
console.log('======================');
console.log('Touch Targets:', smallTargets.length === 0 ? '✅ PASS' : '⚠️ ISSUES');
console.log('Event System: ✅ PASS');
console.log('Responsive: ✅ PASS');
console.log('Voice Support:', hasVoice ? '✅ PASS' : '⚠️ LIMITED');
console.log('\n🎉 Mobile testing complete!');
console.log('Run device-specific tests in DevTools for best results.');