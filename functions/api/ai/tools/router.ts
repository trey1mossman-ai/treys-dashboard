import { json } from '../../../_utils/json';
import { z } from 'zod';

export interface Env {
  TWILIO_ACCOUNT_SID: string;
  TWILIO_AUTH_TOKEN: string;
  TWILIO_PHONE_NUMBER: string;
  SENDGRID_API_KEY: string;
  DEFAULT_FROM_EMAIL: string;
  N8N_BASE_URL: string;
  N8N_API_KEY: string;
  AI_TOOLS: KVNamespace;
  AI_LOGS: KVNamespace;
}

// Tool schemas for validation
const toolSchemas = {
  open_view: z.object({
    id: z.string()
  }),
  
  create_task: z.object({
    title: z.string(),
    when: z.string().datetime().optional(),
    project: z.string().optional()
  }),
  
  send_message: z.object({
    channel: z.enum(['sms', 'email', 'whatsapp']),
    to: z.string(),
    subject: z.string().optional(),
    body: z.string()
  }),
  
  trigger_workflow: z.object({
    name: z.string(),
    payload: z.record(z.any()).optional()
  }),
  
  fetch_knowledge: z.object({
    query: z.string(),
    top_k: z.number().default(5)
  }),
  
  update_agenda_block: z.object({
    id: z.string(),
    status: z.enum(['pending', 'in_progress', 'completed']).optional(),
    notes: z.string().optional(),
    time: z.string().optional()
  }),
  
  search_contacts: z.object({
    q: z.string()
  }),
  
  open_url: z.object({
    url: z.string().url()
  })
};

// Tool execution handlers
class ActionRouter {
  constructor(private env: Env) {}

  async execute(toolName: string, args: any, userId?: string): Promise<any> {
    // Validate against schema
    const schema = toolSchemas[toolName as keyof typeof toolSchemas];
    if (!schema) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    const validated = schema.parse(args);
    
    // Log tool execution
    await this.logExecution(toolName, validated, userId);
    
    // Execute based on tool name
    switch (toolName) {
      case 'open_view':
        return this.openView(validated as z.infer<typeof toolSchemas.open_view>);
      
      case 'create_task':
        return this.createTask(validated as z.infer<typeof toolSchemas.create_task>);
      
      case 'send_message':
        return this.sendMessage(validated as z.infer<typeof toolSchemas.send_message>);
      
      case 'trigger_workflow':
        return this.triggerWorkflow(validated as z.infer<typeof toolSchemas.trigger_workflow>);
      
      case 'fetch_knowledge':
        return this.fetchKnowledge(validated as z.infer<typeof toolSchemas.fetch_knowledge>);
      
      case 'update_agenda_block':
        return this.updateAgendaBlock(validated as z.infer<typeof toolSchemas.update_agenda_block>);
      
      case 'search_contacts':
        return this.searchContacts(validated as z.infer<typeof toolSchemas.search_contacts>);
      
      case 'open_url':
        return this.openUrl(validated as z.infer<typeof toolSchemas.open_url>);
      
      default:
        throw new Error(`Tool ${toolName} not implemented`);
    }
  }

  private async logExecution(tool: string, args: any, userId?: string) {
    const logEntry = {
      tool,
      args,
      userId,
      timestamp: new Date().toISOString(),
      id: crypto.randomUUID()
    };
    
    await this.env.AI_LOGS?.put(
      `tool:${logEntry.id}`,
      JSON.stringify(logEntry),
      { expirationTtl: 86400 * 30 } // 30 days
    );
  }

  private async openView(args: z.infer<typeof toolSchemas.open_view>) {
    // This would be handled client-side via event
    return {
      success: true,
      action: 'open_view',
      viewId: args.id,
      message: `Opening view: ${args.id}`
    };
  }

  private async createTask(args: z.infer<typeof toolSchemas.create_task>) {
    // Store task in KV or database
    const task = {
      id: crypto.randomUUID(),
      ...args,
      created: new Date().toISOString()
    };
    
    await this.env.AI_TOOLS?.put(
      `task:${task.id}`,
      JSON.stringify(task)
    );
    
    return {
      success: true,
      taskId: task.id,
      message: `Task created: ${args.title}`
    };
  }

  private async sendMessage(args: z.infer<typeof toolSchemas.send_message>) {
    switch (args.channel) {
      case 'sms':
        return await this.sendSMS(args.to, args.body);
      
      case 'email':
        return await this.sendEmail(args.to, args.subject || 'No Subject', args.body);
      
      case 'whatsapp':
        return await this.sendWhatsApp(args.to, args.body);
      
      default:
        throw new Error(`Unsupported channel: ${args.channel}`);
    }
  }

  private async sendSMS(to: string, body: string) {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.env.TWILIO_ACCOUNT_SID}:${this.env.TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: this.env.TWILIO_PHONE_NUMBER,
          Body: body,
        }),
      }
    );

    const data = await response.json();
    
    return {
      success: response.ok,
      messageId: data.sid,
      message: response.ok ? `SMS sent to ${to}` : `Failed to send SMS: ${data.message}`
    };
  }

  private async sendEmail(to: string, subject: string, body: string) {
    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.env.SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email: to }] }],
        from: { email: this.env.DEFAULT_FROM_EMAIL },
        subject,
        content: [{ type: 'text/plain', value: body }],
      }),
    });

    return {
      success: response.ok,
      message: response.ok ? `Email sent to ${to}` : `Failed to send email`
    };
  }

  private async sendWhatsApp(to: string, body: string) {
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${this.env.TWILIO_ACCOUNT_SID}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + btoa(`${this.env.TWILIO_ACCOUNT_SID}:${this.env.TWILIO_AUTH_TOKEN}`),
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: `whatsapp:${to}`,
          From: `whatsapp:${this.env.TWILIO_PHONE_NUMBER}`,
          Body: body,
        }),
      }
    );

    const data = await response.json();
    
    return {
      success: response.ok,
      messageId: data.sid,
      message: response.ok ? `WhatsApp sent to ${to}` : `Failed to send WhatsApp: ${data.message}`
    };
  }

  private async triggerWorkflow(args: z.infer<typeof toolSchemas.trigger_workflow>) {
    const response = await fetch(`${this.env.N8N_BASE_URL}/webhook/${args.name}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': this.env.N8N_API_KEY,
      },
      body: JSON.stringify(args.payload || {}),
    });

    return {
      success: response.ok,
      message: response.ok ? `Workflow ${args.name} triggered` : `Failed to trigger workflow`
    };
  }

  private async fetchKnowledge(args: z.infer<typeof toolSchemas.fetch_knowledge>) {
    // This would integrate with your RAG system
    // For now, return placeholder
    return {
      success: true,
      passages: [
        {
          text: 'Sample knowledge passage',
          source: 'knowledge_base',
          score: 0.95
        }
      ],
      query: args.query,
      message: `Found knowledge for: ${args.query}`
    };
  }

  private async updateAgendaBlock(args: z.infer<typeof toolSchemas.update_agenda_block>) {
    const updates = {
      id: args.id,
      ...(args.status && { status: args.status }),
      ...(args.notes && { notes: args.notes }),
      ...(args.time && { time: args.time }),
      updated: new Date().toISOString()
    };
    
    await this.env.AI_TOOLS?.put(
      `agenda:${args.id}`,
      JSON.stringify(updates)
    );
    
    return {
      success: true,
      agendaId: args.id,
      message: `Agenda block ${args.id} updated`
    };
  }

  private async searchContacts(args: z.infer<typeof toolSchemas.search_contacts>) {
    // This would search your contacts database
    // For now, return placeholder
    return {
      success: true,
      contacts: [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890'
        }
      ],
      query: args.q,
      message: `Found contacts matching: ${args.q}`
    };
  }

  private async openUrl(args: z.infer<typeof toolSchemas.open_url>) {
    // This would be handled client-side
    return {
      success: true,
      url: args.url,
      message: `Opening URL: ${args.url}`
    };
  }
}

// API endpoint for tool execution
export async function onRequestPost(context: {
  request: Request;
  env: Env;
}): Promise<Response> {
  const { request, env } = context;

  try {
    const body = await request.json();
    const { tool, args, userId } = body;

    if (!tool || !args) {
      return json({ error: 'Missing required parameters: tool and args' }, 400);
    }

    const router = new ActionRouter(env);
    const result = await router.execute(tool, args, userId);

    return json({ success: true, result });
  } catch (error: any) {
    console.error('Tool execution error:', error);
    
    if (error.name === 'ZodError') {
      return json({ 
        error: 'Validation error', 
        details: error.errors 
      }, 400);
    }
    
    return json({ 
      error: error.message || 'Internal server error' 
    }, 500);
  }
}