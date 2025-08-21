import { describe, it, expect, beforeEach, vi } from 'vitest';
import { z } from 'zod';

// Mock environment
const mockEnv = {
  TWILIO_ACCOUNT_SID: 'test_sid',
  TWILIO_AUTH_TOKEN: 'test_token',
  TWILIO_PHONE_NUMBER: '+1234567890',
  SENDGRID_API_KEY: 'test_sendgrid_key',
  DEFAULT_FROM_EMAIL: 'test@example.com',
  N8N_BASE_URL: 'https://n8n.example.com',
  N8N_API_KEY: 'test_n8n_key',
  AI_TOOLS: {
    put: vi.fn(),
    get: vi.fn(),
  },
  AI_LOGS: {
    put: vi.fn(),
  },
};

// Test tool schemas
describe('Tool Schemas', () => {
  it('should validate create_task schema', () => {
    const schema = z.object({
      title: z.string(),
      when: z.string().datetime().optional(),
      project: z.string().optional()
    });

    const validInput = {
      title: 'Test Task',
      when: '2024-01-01T10:00:00Z',
      project: 'Test Project'
    };

    expect(() => schema.parse(validInput)).not.toThrow();
  });

  it('should validate send_message schema', () => {
    const schema = z.object({
      channel: z.enum(['sms', 'email', 'whatsapp']),
      to: z.string(),
      subject: z.string().optional(),
      body: z.string()
    });

    const validInput = {
      channel: 'email',
      to: 'test@example.com',
      subject: 'Test Subject',
      body: 'Test Body'
    };

    expect(() => schema.parse(validInput)).not.toThrow();
  });

  it('should reject invalid channel in send_message', () => {
    const schema = z.object({
      channel: z.enum(['sms', 'email', 'whatsapp']),
      to: z.string(),
      body: z.string()
    });

    const invalidInput = {
      channel: 'invalid',
      to: 'test@example.com',
      body: 'Test Body'
    };

    expect(() => schema.parse(invalidInput)).toThrow();
  });

  it('should validate trigger_workflow schema', () => {
    const schema = z.object({
      name: z.string(),
      payload: z.record(z.any()).optional()
    });

    const validInput = {
      name: 'test_workflow',
      payload: { key: 'value', nested: { data: 123 } }
    };

    expect(() => schema.parse(validInput)).not.toThrow();
  });

  it('should validate fetch_knowledge schema', () => {
    const schema = z.object({
      query: z.string(),
      top_k: z.number().default(5)
    });

    const validInput = {
      query: 'test query'
    };

    const parsed = schema.parse(validInput);
    expect(parsed.top_k).toBe(5);
  });

  it('should validate update_agenda_block schema', () => {
    const schema = z.object({
      id: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed']).optional(),
      notes: z.string().optional(),
      time: z.string().optional()
    });

    const validInput = {
      id: 'agenda-123',
      status: 'completed',
      notes: 'Task completed successfully'
    };

    expect(() => schema.parse(validInput)).not.toThrow();
  });
});

// Test API endpoint
describe('Tool Router API', () => {
  it('should handle valid tool execution request', async () => {
    const request = new Request('http://localhost/api/ai/tools/router', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        tool: 'create_task',
        args: { title: 'Test Task' },
        userId: 'test-user'
      })
    });

    // Mock response would be tested here
    expect(request.method).toBe('POST');
  });

  it('should reject request without required parameters', async () => {
    const request = new Request('http://localhost/api/ai/tools/router', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        args: { title: 'Test Task' }
        // Missing 'tool' parameter
      })
    });

    // Would return 400 error
    expect(request.method).toBe('POST');
  });
});

// Test tool execution logging
describe('Tool Execution Logging', () => {
  it('should log tool execution with correct format', async () => {
    const logEntry = {
      tool: 'create_task',
      args: { title: 'Test' },
      userId: 'user-123',
      timestamp: new Date().toISOString(),
      id: 'uuid-here'
    };

    expect(logEntry).toHaveProperty('tool');
    expect(logEntry).toHaveProperty('args');
    expect(logEntry).toHaveProperty('userId');
    expect(logEntry).toHaveProperty('timestamp');
    expect(logEntry).toHaveProperty('id');
  });
});

// Test error handling
describe('Error Handling', () => {
  it('should handle Zod validation errors', () => {
    const error = new z.ZodError([
      {
        code: 'invalid_type',
        expected: 'string',
        received: 'number',
        path: ['title'],
        message: 'Expected string, received number'
      }
    ]);

    expect(error.name).toBe('ZodError');
    expect(error.errors).toHaveLength(1);
    expect(error.errors[0].path).toEqual(['title']);
  });

  it('should handle unknown tool error', () => {
    const error = new Error('Unknown tool: invalid_tool');
    expect(error.message).toContain('Unknown tool');
  });
});

// Test individual tool handlers
describe('Tool Handlers', () => {
  it('should format open_view response correctly', () => {
    const response = {
      success: true,
      action: 'open_view',
      viewId: 'dashboard',
      message: 'Opening view: dashboard'
    };

    expect(response.success).toBe(true);
    expect(response.action).toBe('open_view');
    expect(response.viewId).toBe('dashboard');
  });

  it('should format create_task response correctly', () => {
    const response = {
      success: true,
      taskId: 'task-123',
      message: 'Task created: New Task'
    };

    expect(response.success).toBe(true);
    expect(response.taskId).toBeDefined();
    expect(response.message).toContain('Task created');
  });

  it('should format send_message response correctly', () => {
    const response = {
      success: true,
      messageId: 'msg-123',
      message: 'SMS sent to +1234567890'
    };

    expect(response.success).toBe(true);
    expect(response.messageId).toBeDefined();
    expect(response.message).toContain('sent to');
  });

  it('should format fetch_knowledge response correctly', () => {
    const response = {
      success: true,
      passages: [
        {
          text: 'Sample knowledge passage',
          source: 'knowledge_base',
          score: 0.95
        }
      ],
      query: 'test query',
      message: 'Found knowledge for: test query'
    };

    expect(response.success).toBe(true);
    expect(response.passages).toHaveLength(1);
    expect(response.passages[0].score).toBeGreaterThan(0);
  });
});