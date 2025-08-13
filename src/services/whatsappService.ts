import { apiClient } from './apiClient'
import { WhatsAppSchema } from '@/lib/validators'
import type { WhatsAppData } from '@/features/workflows/types'

export const whatsappService = {
  async send(data: WhatsAppData) {
    const validated = WhatsAppSchema.parse(data)
    
    try {
      const response = await apiClient.post('/whatsapp/send', {
        to: validated.to,
        body: validated.body,
        from: validated.from
      })
      
      return response
    } catch (error) {
      console.error('WhatsApp service error:', error)
      throw new Error('Failed to send WhatsApp message')
    }
  },
  
  async sendMedia(data: WhatsAppData & { mediaUrl: string; caption?: string }) {
    const validated = WhatsAppSchema.parse(data)
    
    return apiClient.post('/whatsapp/send-media', {
      to: validated.to,
      from: validated.from,
      mediaUrl: data.mediaUrl,
      caption: data.caption || validated.body
    })
  },
  
  async getStatus(messageId: string) {
    return apiClient.get(`/whatsapp/status/${messageId}`)
  }
}