import { createHmac } from 'crypto';
import { v4 as uuidv4 } from 'uuid';

/**
 * Agent Command Client for Node.js
 * Handles authentication, signing, and retry logic
 */
export class AgentCommandClient {
  constructor(config) {
    this.baseUrl = config.baseUrl || process.env.AGENT_BASE_URL;
    this.serviceToken = config.serviceToken || process.env.AGENT_SERVICE_TOKEN;
    this.hmacSecret = config.hmacSecret || process.env.AGENT_HMAC_SECRET;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
    
    if (!this.baseUrl || !this.serviceToken || !this.hmacSecret) {
      throw new Error('Missing required configuration: baseUrl, serviceToken, hmacSecret');
    }
  }
  
  /**
   * Execute a command with automatic retry logic
   */
  async execute(tool, args, options = {}) {
    const idempotencyKey = options.idempotencyKey || uuidv4();
    const dryRun = options.dryRun || false;
    
    let lastError;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await this._sendCommand(tool, args, idempotencyKey, dryRun);
        
        if (result.ok) {
          return result;
        }
        
        // Handle specific error codes
        if (result.error?.code === 'RETRY') {
          // Exponential backoff for retry errors
          if (attempt < this.maxRetries) {
            const delay = this.retryDelay * Math.pow(2, attempt);
            console.log(`Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms: ${result.error.message}`);
            await this._sleep(delay);
            continue;
          }
        }
        
        // Don't retry on validation errors or forbidden
        if (['VALIDATION_ERROR', 'FORBIDDEN', 'NOT_FOUND', 'CONFLICT'].includes(result.error?.code)) {
          throw new AgentCommandError(result.error.code, result.error.message);
        }
        
        lastError = result.error;
        
      } catch (error) {
        if (error instanceof AgentCommandError) {
          throw error;
        }
        
        // Network or other errors - retry
        if (attempt < this.maxRetries) {
          const delay = this.retryDelay * Math.pow(2, attempt);
          console.log(`Retry ${attempt + 1}/${this.maxRetries} after ${delay}ms: ${error.message}`);
          await this._sleep(delay);
          lastError = error;
        } else {
          throw error;
        }
      }
    }
    
    throw new AgentCommandError('RETRY', `Max retries exceeded: ${lastError?.message || 'Unknown error'}`);
  }
  
  /**
   * Send a single command request
   */
  async _sendCommand(tool, args, idempotencyKey, dryRun) {
    const timestamp = Math.floor(Date.now() / 1000);
    const body = JSON.stringify({ tool, args, dryRun });
    
    // Generate HMAC signature
    const signature = createHmac('sha256', this.hmacSecret)
      .update(body)
      .digest('hex');
    
    const response = await fetch(`${this.baseUrl}/api/agent/command`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.serviceToken}`,
        'X-Signature': `sha256=${signature}`,
        'X-TS': timestamp.toString(),
        'X-Idempotency-Key': idempotencyKey
      },
      body
    });
    
    const result = await response.json();
    return result;
  }
  
  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
  
  // Convenience methods for common operations
  
  async createAgendaItem(date, title, startTs, endTs, options = {}) {
    return this.execute('agenda.create', {
      date,
      title,
      start_ts: startTs,
      end_ts: endTs,
      ...options
    });
  }
  
  async updateAgendaItem(id, patch) {
    return this.execute('agenda.update', { id, patch });
  }
  
  async deleteAgendaItem(id) {
    return this.execute('agenda.delete', { id });
  }
  
  async listAgendaByDate(date) {
    return this.execute('agenda.listByDate', { date });
  }
  
  async createTask(title, options = {}) {
    return this.execute('tasks.create', { title, ...options });
  }
  
  async toggleTask(id, status) {
    return this.execute('tasks.toggle', { id, status });
  }
  
  async createNote(body, tag = null) {
    return this.execute('notes.create', { body, tag });
  }
  
  async archiveNote(id) {
    return this.execute('notes.archive', { id });
  }
  
  async updateMetrics(date, metrics) {
    return this.execute('metrics.update', { date, ...metrics });
  }
  
  async logTraining(entries) {
    return this.execute('trainer.log', { entries });
  }
}

export class AgentCommandError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AgentCommandError';
    this.code = code;
  }
}

// Example usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const client = new AgentCommandClient({
    baseUrl: 'https://your-app.pages.dev',
    serviceToken: 'your-service-token',
    hmacSecret: 'your-hmac-secret'
  });
  
  // Example: Create an agenda item
  client.createAgendaItem(
    '2025-08-13',
    'Deep Work Session',
    Math.floor(new Date('2025-08-13T09:00:00').getTime() / 1000),
    Math.floor(new Date('2025-08-13T11:00:00').getTime() / 1000),
    { tag: 'work', notes: 'Focus on API development' }
  ).then(result => {
    console.log('Created agenda item:', result);
  }).catch(error => {
    console.error('Error:', error);
  });
}