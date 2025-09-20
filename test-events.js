// Test event firing and handling
console.log('Testing cross-component events...');

// Test agenda creation
window.dispatchEvent(new CustomEvent('agenda:created', {
  detail: {
    id: 'test-1',
    title: 'Integration Test Meeting',
    startTime: Date.now(),
    endTime: Date.now() + 3600000
  }
}));

// Test note creation
window.dispatchEvent(new CustomEvent('note:created', {
  detail: {
    id: 'test-note-1',
    content: 'Integration test note',
    position: { x: 100, y: 100 },
    color: 'yellow'
  }
}));

// Test action execution
window.dispatchEvent(new CustomEvent('action:executed', {
  detail: {
    action: { name: 'Test Action' },
    response: true
  }
}));

console.log('✅ Events fired - check UI for updates');
