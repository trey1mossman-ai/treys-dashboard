# Integration Architecture

## Event System
- `agenda:created`, `agenda:updated`, `agenda:deleted`
- `note:created`, `note:updated`, `note:deleted`
- `action:created`, `action:executed`
- `summary:generated`, `trends:generated`

## Component Connections
Assistant Dock → `executeAssistantTool()` → Event Dispatch → UI Updates

- Enhanced Assistant Dock triggers `executeAssistantTool()` based on natural language commands, voice input, or quick actions.
- Tools persist data (agenda items, notes, quick actions) and emit events (`CustomEvent`) to notify listening components.
- Listening surfaces (SimpleDashboard, Sticky Notes, Quick Actions, etc.) subscribe to relevant events, refetch data, and show inline feedback (toasts, highlights, animations).

## Adding New Integrations
1. Import `executeAssistantTool` where the action originates.
2. Call the tool (`await executeAssistantTool('tool.name', payload)`).
3. Listen for corresponding events in the target component (`window.addEventListener('tool:event', handler)`).
4. Update local state or refetch data when events fire.

## Voice & Streaming Integration
- `useVoiceInput` connects Web Speech API with assistant commands.
- `StreamingResponse` renders character-by-character typing with typing indicators.
