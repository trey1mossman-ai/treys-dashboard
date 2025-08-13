import { apiClient } from './apiClient'
import { SMSSchema } from '@/lib/validators'
import type { SMSData } from '@/features/workflows/types'

export const smsService = {
  async send(data: SMSData) {
    const validated = SMSSchema.parse(data)
    
    try {
      const response = await apiClient.post('/sms/send', {
        to: validated.to,
        body: validated.body,
        from: validated.from
      })
      
      return response
    } catch (error) {
      console.error('SMS service error:', error)
      throw new Error('Failed to send SMS')
    }
  },
  
  async getStatus(messageId: string) {
    return apiClient.get(`/sms/status/${messageId}`)
  },
  
  async getHistory(phoneNumber?: string) {
    return apiClient.get('/sms/history', {
      params: phoneNumber ? { phone: phoneNumber } : undefined
    })
  }
}