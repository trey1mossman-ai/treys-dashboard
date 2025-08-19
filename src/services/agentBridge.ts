// Stub implementation for agent bridge
export const agentBridge = {
  initialize: () => {},
  processNaturalCommand: async (_command: string) => {
    return {
      success: false,
      message: 'Agent integration not yet configured. Please set up n8n webhook in Settings.',
      results: []
    };
  }
};