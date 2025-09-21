// Data Test ID Helper for E2E Testing
// Team Lead: Claude - Day 6
// Quick reference for Claude Code to add test IDs

/**
 * REQUIRED DATA-TESTID ATTRIBUTES
 * Add these to SimpleDashboard.tsx and related components
 */

export const requiredTestIds = {
  // Main Container
  dashboard: 'data-testid="dashboard-container"',
  
  // Assistant Dock
  assistantButton: 'data-testid="assistant-dock-button"',
  assistantPanel: 'data-testid="assistant-panel"',
  assistantInput: 'data-testid="assistant-input"',
  assistantResponse: 'data-testid="assistant-response"',
  
  // Agenda Section
  agendaSection: 'data-testid="agenda-section"',
  addAgendaButton: 'data-testid="add-agenda-button"',
  agendaTitleInput: 'data-testid="agenda-title-input"',
  agendaStartTime: 'data-testid="agenda-start-time"',
  agendaEndTime: 'data-testid="agenda-end-time"',
  agendaSubmitButton: 'data-testid="agenda-submit-button"',
  agendaCheckbox: 'data-testid="agenda-checkbox"',
  
  // Notes Section
  notesBoard: 'data-testid="notes-board"',
  addNoteButton: 'data-testid="add-note-button"',
  noteContent: 'data-testid="note-content"',
  stickyNote: 'data-testid="sticky-note"',
  
  // Quick Actions
  quickActionsGrid: 'data-testid="quick-actions-grid"',
  actionTile: 'data-testid="action-tile"',
  addActionButton: 'data-testid="add-action-button"',
  
  // Completion Bar
  completionBar: 'data-testid="completion-bar"',
  progressWork: 'data-testid="progress-work"',
  progressGym: 'data-testid="progress-gym"',
  progressNutrition: 'data-testid="progress-nutrition"'
};

/**
 * EXAMPLE IMPLEMENTATION
 */

// In SimpleDashboard.tsx:
/*
return (
  <div 
    className="dashboard-container" 
    data-testid="dashboard-container"  // ADD THIS
  >
    <section 
      className="agenda-section"
      data-testid="agenda-section"     // ADD THIS
    >
      <button 
        onClick={handleAddAgenda}
        data-testid="add-agenda-button" // ADD THIS
      >
        Add Agenda Item
      </button>
    </section>
  </div>
);
*/

/**
 * QUICK ADD SCRIPT
 * Run this in browser console to add test IDs quickly:
 */
export const quickAddScript = `
// Add test IDs to existing elements
document.querySelector('.dashboard-container')?.setAttribute('data-testid', 'dashboard-container');
document.querySelector('.agenda-section')?.setAttribute('data-testid', 'agenda-section');
document.querySelector('.notes-board')?.setAttribute('data-testid', 'notes-board');
document.querySelector('.assistant-dock button')?.setAttribute('data-testid', 'assistant-dock-button');

console.log('Test IDs added! Check with: document.querySelectorAll("[data-testid]")');
`;

/**
 * VALIDATION SCRIPT
 * Check if all required test IDs are present:
 */
export function validateTestIds(): boolean {
  const required = Object.values(requiredTestIds).map(id => 
    id.match(/data-testid="([^"]+)"/)?.[1]
  );
  
  const missing: string[] = [];
  
  required.forEach(id => {
    if (id && !document.querySelector(`[data-testid="${id}"]`)) {
      missing.push(id);
    }
  });
  
  if (missing.length > 0) {
    console.warn('Missing test IDs:', missing);
    return false;
  }
  
  console.log('✅ All test IDs present!');
  return true;
}