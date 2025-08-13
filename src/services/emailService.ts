import { apiClient } from './apiClient'
import { EmailSchema } from '@/lib/validators'
import type { EmailData } from '@/features/workflows/types'

export const emailService = {
  async send(data: EmailData) {
    const validated = EmailSchema.parse(data)
    
    try {
      const response = await apiClient.post('/email/send', {
        to: validated.to,
        subject: validated.subject,
        text: validated.body,
        html: validated.html,
        from: validated.from
      })
      
      return response
    } catch (error) {
      console.error('Email service error:', error)
      throw new Error('Failed to send email')
    }
  },
  
  async sendBatch(emails: EmailData[]) {
    const validated = emails.map(email => EmailSchema.parse(email))
    
    return apiClient.post('/email/send-batch', {
      emails: validated
    })
  },
  
  async getTemplates() {
    return apiClient.get('/email/templates')
  }
}