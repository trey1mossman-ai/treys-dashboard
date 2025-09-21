// Determine API URL based on environment
const getApiUrl = () => {
  return window.location.hostname === 'localhost'
    ? 'http://localhost:8788'
    : 'https://ailifeassistanttm.com';
};

// Dynamic webhook URLs that adjust based on environment
const WEBHOOK_URLS = {
  get email() { return `${getApiUrl()}/api/webhook/emails`; },
  get calendar() { return `${getApiUrl()}/api/webhook/calendar`; },
  agent: 'https://n8n.treys.cc/webhook/agent-chat'
} as const;

async function handleJsonResponse(response: Response) {
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || `Request failed with status ${response.status}`);
  }

  try {
    return await response.json();
  } catch (error) {
    throw new Error('Invalid JSON response from webhook');
  }
}

export class WebhookService {
  get urls() {
    return WEBHOOK_URLS;
  }

  async fetchEmails() {
    const apiUrl = getApiUrl();
    
    // Trigger workflow first
    await fetch(`${apiUrl}/api/trigger/emails`);
    // Wait for workflow to complete
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Fetch the results
    const response = await fetch(`${apiUrl}/api/webhook/emails?t=${Date.now()}`, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    return handleJsonResponse(response);
  }

  async fetchCalendar() {
    const apiUrl = getApiUrl();
    
    // Trigger workflow first
    await fetch(`${apiUrl}/api/trigger/calendar`);
    // Wait for workflow to complete
    await new Promise(resolve => setTimeout(resolve, 6000));
    
    // Fetch the results
    const response = await fetch(`${apiUrl}/api/webhook/calendar?t=${Date.now()}`, {
      cache: 'no-cache',
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    return handleJsonResponse(response);
  }

  async sendToAgent(message: string, sessionId?: string) {
    // Use n8n webhook directly for agent chat
    const payload = {
      sessionId: sessionId || crypto.randomUUID(),
      action: 'sendMessage',
      chatInput: message
    };
    
    const response = await fetch(WEBHOOK_URLS.agent, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });
    return handleJsonResponse(response);
  }

  async ping(url: keyof typeof WEBHOOK_URLS) {
    try {
      const apiUrl = getApiUrl();
      const endpoint = url === 'agent' ? WEBHOOK_URLS.agent : `${apiUrl}/api/webhook/${url === 'email' ? 'emails' : url}`;
      
      const response = await fetch(endpoint, { 
        method: 'HEAD',
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });
      
      if (response.ok) return true;

      // Some endpoints don't support HEAD (405). Fall back to GET.
      if (response.status !== 405) {
        throw new Error(`Webhook ${url} returned status ${response.status}`);
      }
    } catch (error) {
      if ((error as Error).name === 'TypeError' || (error as Error).name === 'AbortError') {
        // Network error or timeout, fall through to GET
      } else if ((error as Error).message?.includes('status')) {
        throw error;
      }
    }

    const apiUrl = getApiUrl();
    const endpoint = url === 'agent' ? WEBHOOK_URLS.agent : `${apiUrl}/api/webhook/${url === 'email' ? 'emails' : url}`;
    
    const fallback = await fetch(endpoint, {
      method: 'GET',
      headers: {
        'Cache-Control': 'no-cache'
      },
      signal: AbortSignal.timeout(5000)
    });

    if (!fallback.ok) {
      throw new Error(`Webhook ${url} returned status ${fallback.status}`);
    }

    return true;
  }
}

export const webhookService = new WebhookService();
export { WEBHOOK_URLS };
