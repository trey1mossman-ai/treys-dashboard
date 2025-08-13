import { apiClient } from './apiClient'

export interface WhatsAppItem {
  id: string
  from: string
  body: string
  time: string
}

export interface EmailItem {
  id: string
  from: string
  subject: string
  snippet: string
  time: string
}

export interface SMSItem {
  id: string
  from: string
  body: string
  time: string
}

export const n8nService = {
  async getEmailDigest(limit: number = 15) {
    return apiClient.post('/n8n/email-digest', { limit })
  },
  
  async getCalendarSummary() {
    return apiClient.get('/n8n/calendar-summary')
  },
  
  async getStatusDraft(day: string) {
    return apiClient.post('/n8n/status-draft', { day })
  },
  
  async createLead(text: string) {
    return apiClient.post('/n8n/create-lead', { text })
  },
  
  async pushAgenda(items: any[]) {
    return apiClient.post('/n8n/push-agenda', { items })
  },
  
  async followUp(data: { title: string; start: string; end: string; notes?: string }) {
    return apiClient.post('/n8n/followup', data)
  },

  async getRecentWhatsApp(limit = 5): Promise<WhatsAppItem[]> {
    try {
      const response = await apiClient.get<{ ok: boolean; items: WhatsAppItem[] }>(
        `/n8n/recent-whatsapp?limit=${limit}`
      )
      return response.items || []
    } catch {
      return []
    }
  },

  async getRecentEmail(limit = 5): Promise<EmailItem[]> {
    try {
      const response = await apiClient.get<{ ok: boolean; items: EmailItem[] }>(
        `/n8n/recent-email?limit=${limit}`
      )
      return response.items || []
    } catch {
      return []
    }
  },

  async getRecentSMS(limit = 5): Promise<SMSItem[]> {
    try {
      const response = await apiClient.get<{ ok: boolean; items: SMSItem[] }>(
        `/n8n/recent-sms?limit=${limit}`
      )
      return response.items || []
    } catch {
      return []
    }
  }
}