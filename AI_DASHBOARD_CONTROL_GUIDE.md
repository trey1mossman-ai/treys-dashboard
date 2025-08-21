# AI Dashboard Control System - Complete Guide

## Overview

This AI control system provides comprehensive natural language control over all dashboard functionality. The AI can manage agenda items, todos, food logging, supplements, navigation, settings, and more through simple voice or text commands.

## Architecture

The system consists of four main components:

### 1. Dashboard Tools (`src/lib/ai/dashboard-tools.ts`)
- Defines 50+ tool functions for controlling all dashboard aspects
- Categories: Agenda, Todos, Nutrition, Supplements, Navigation, Settings, Quick Actions, Search, Content Generation
- Each tool has structured parameters and validation

### 2. Dashboard Controller (`src/lib/ai/dashboard-controller.ts`)
- Executes AI tool commands and manages state
- Integrates with existing stores (agenda, nutrition, UI)
- Manages internal state for todos and supplements
- Provides unified interface for all operations

### 3. AI Dashboard Bridge (`src/services/aiDashboardBridge.ts`)
- Main interface between AI services and dashboard
- Processes natural language commands
- Provides context awareness and command history
- Generates suggestions and manages bulk operations

### 4. Event Listeners (`src/hooks/useAIEventListeners.ts`)
- Handles all AI-generated events
- Provides real-time feedback via toast notifications
- Manages navigation, modals, and UI state changes
- Supports both new and legacy event formats

## Usage Examples

### Basic Commands

```javascript
// Simple agenda management
"Add a team meeting at 2 PM today"
"Schedule lunch with Sarah tomorrow at 12:30"
"Mark my 3 PM call as completed"
"Delete the cancelled meeting"

// Todo management
"Add a high-priority task to finish the report"
"Mark all completed todos as done"
"Reorder my todos by priority"
"Create a todo to call the dentist"

// Food logging
"Log 300 calories of chicken breast for lunch"
"Add an apple for my afternoon snack"
"Record my breakfast: 2 eggs, toast, and orange juice"

// Supplement management
"Add vitamin D 1000mg for morning"
"Mark my pre-workout supplements as taken"
"Schedule magnesium for evening"

// Navigation
"Go to the agenda section"
"Open the settings modal"
"Switch to the food tracking page"
"Show me the supplements view"
```

### Advanced Commands

```javascript
// Bulk operations
"Complete all high-priority todos"
"Delete all completed agenda items from last week"
"Mark all morning supplements as taken"

// Search and analysis
"Find all meetings with 'client' in the title"
"Show me my nutrition summary for today"
"Analyze my productivity patterns this week"

// Content generation
"Generate a todo list for project planning"
"Suggest agenda items for tomorrow based on my patterns"
"Create a meal plan focused on high protein"

// Settings and configuration
"Switch to dark theme"
"Enable focus mode for 25 minutes"
"Export my data to CSV format"
```

### Programmatic Usage

```javascript
import { aiDashboardBridge } from '@/services/aiDashboardBridge';

// Process a command
const response = await aiDashboardBridge.processCommand("Add a meeting at 3 PM");

// Execute a specific tool
const result = await aiDashboardBridge.executeTool('create_agenda_item', {
  title: 'Team Standup',
  startTime: '09:00',
  endTime: '09:30',
  tag: 'meeting'
});

// Get available tools
const tools = aiDashboardBridge.getAvailableTools();
```

### Event-Driven Usage

```javascript
// Dispatch AI commands via events
window.dispatchEvent(new CustomEvent('ai-dashboard-command', {
  detail: {
    command: "Add a todo to review the quarterly report",
    context: { currentSection: 'todos' }
  }
}));

// Execute specific tools
window.dispatchEvent(new CustomEvent('ai-execute-tool', {
  detail: {
    tool: 'create_todo',
    parameters: { text: 'Review Q1 results', priority: 'high' }
  }
}));

// Listen for results
window.addEventListener('ai-tool-completed', (event) => {
  console.log('Tool completed:', event.detail);
});
```

## Available Tools by Category

### Agenda Management (5 tools)
- `create_agenda_item` - Create new agenda items
- `update_agenda_item` - Update existing items
- `delete_agenda_item` - Remove items
- `toggle_agenda_completion` - Mark as complete/incomplete
- `list_agenda_items` - List with filtering

### Todo Management (6 tools)
- `create_todo` - Create new todos
- `update_todo` - Update existing todos
- `delete_todo` - Remove todos
- `toggle_todo_completion` - Toggle completion
- `reorder_todos` - Change order
- `bulk_todo_actions` - Bulk operations

### Nutrition & Food (5 tools)
- `log_food_item` - Log food with nutrition data
- `update_food_item` - Update nutrition info
- `delete_food_item` - Remove food items
- `get_nutrition_summary` - Daily nutrition totals
- `analyze_nutrition_trends` - Pattern analysis

### Supplement Management (5 tools)
- `add_supplement` - Add to routine
- `update_supplement` - Update details
- `delete_supplement` - Remove from routine
- `mark_supplement_taken` - Mark as taken/not taken
- `get_supplement_schedule` - Get schedule by time

### Navigation & UI (4 tools)
- `navigate_to_section` - Navigate between sections
- `toggle_focus_mode` - Enable/disable focus mode
- `open_modal` - Open specific modals
- `toggle_sidebar` - Show/hide sidebar

### Settings & Configuration (3 tools)
- `update_app_settings` - Update app preferences
- `configure_ai_settings` - Configure AI behavior
- `export_data` - Export user data

### Quick Actions & Automation (3 tools)
- `create_quick_action` - Create automation
- `execute_quick_action` - Run quick action
- `schedule_reminder` - Schedule notifications

### Search & Analysis (3 tools)
- `search_items` - Search across all items
- `analyze_patterns` - Pattern analysis
- `generate_report` - Generate reports

### Content Generation (3 tools)
- `generate_agenda_suggestions` - Smart agenda suggestions
- `generate_todo_list` - Generate todo lists
- `suggest_meal_plan` - Meal planning

## Integration Guide

### 1. Basic Setup

```typescript
import { aiDashboardBridge } from '@/services/aiDashboardBridge';
import { useAIEventListeners } from '@/hooks/useAIEventListeners';

// In your main app component
function App() {
  useAIEventListeners(); // This sets up all event handling
  
  // The bridge auto-initializes when imported
  return <YourAppContent />;
}
```

### 2. Adding Custom Commands

```typescript
// Extend the bridge with custom processing
aiDashboardBridge.updateConfig({
  enableAutoSuggestions: true,
  enableContextAwareness: true,
  maxActionsPerCommand: 10
});

// Add custom command processing
window.addEventListener('custom-ai-command', async (event) => {
  const response = await aiDashboardBridge.processCommand(event.detail);
  // Handle response
});
```

### 3. Component Integration

```tsx
// In any component, dispatch AI commands
const handleVoiceCommand = (transcript: string) => {
  window.dispatchEvent(new CustomEvent('ai-dashboard-command', {
    detail: { command: transcript }
  }));
};

// Or use the bridge directly
const executeAICommand = async (command: string) => {
  const response = await aiDashboardBridge.processCommand(command);
  if (response.success) {
    // Handle success
  }
};
```

## Configuration

### AI Behavior Configuration

```typescript
const config = {
  enableAutoSuggestions: true,      // Show follow-up suggestions
  enableContextAwareness: true,     // Use recent commands for context
  enableBulkOperations: true,       // Allow bulk actions
  defaultResponseFormat: 'detailed', // Response detail level
  maxActionsPerCommand: 5,          // Limit actions per command
  enableCommandHistory: true        // Keep command history
};

aiDashboardBridge.updateConfig(config);
```

### Storage and Persistence

- Command history: Stored in `localStorage` (last 100 commands)
- Todo/Supplement state: Automatically persisted to `localStorage`
- AI settings: Stored in `localStorage` as `ai_dashboard_config`
- Configuration: Auto-saves on changes

## Error Handling

The system provides comprehensive error handling:

```typescript
// Errors are returned in the response
const response = await aiDashboardBridge.processCommand("invalid command");
if (!response.success) {
  console.error('Command failed:', response.message);
  if (response.errors) {
    response.errors.forEach(error => {
      console.error(`Tool ${error.tool}: ${error.error}`);
    });
  }
}
```

## Events Reference

### Input Events (Commands to AI)
- `ai-dashboard-command` - Main command interface
- `ai-execute-tool` - Direct tool execution
- `ai-navigate` - Navigation requests
- `toggle-focus-mode` - Focus mode control
- `open-modal` - Modal control
- `toggle-sidebar` - Sidebar control

### Output Events (AI Responses)
- `ai-tool-completed` - Tool execution completed
- `search-results` - Search results available
- `content-generated` - Content generation completed
- `agenda-updated` - Agenda state changed
- `todos-updated` - Todo state changed
- `nutrition-updated` - Nutrition state changed
- `supplements-updated` - Supplements state changed

## Performance Considerations

- Commands are processed asynchronously
- Bulk operations are batched for efficiency
- Event listeners are properly cleaned up
- State changes trigger minimal re-renders
- History is automatically pruned (max 100 items)

## Security Notes

- API keys are stored encrypted in localStorage
- No sensitive data is logged to console in production
- Command history can be cleared via `aiDashboardBridge.clearHistory()`
- Tool parameters are validated before execution

## Troubleshooting

### Common Issues

1. **Commands not working**: Check AI service configuration in settings
2. **Events not firing**: Ensure `useAIEventListeners` is called in app root
3. **State not updating**: Check console for tool execution errors
4. **Navigation failing**: Verify route paths match your router setup

### Debug Mode

```typescript
// Enable detailed logging
localStorage.setItem('ai_debug', 'true');

// View command history
console.log(aiDashboardBridge.getCommandHistory());

// Check available tools
console.log(aiDashboardBridge.getAvailableTools());
```

## Future Enhancements

The system is designed for extensibility:

- Add new tools by extending `dashboard-tools.ts`
- Implement new event handlers in `useAIEventListeners.ts`
- Extend the controller with new state management
- Add custom AI processing logic in the bridge

This comprehensive AI control system makes the dashboard fully voice and chat controllable, providing a modern, intelligent interface for all productivity tasks.