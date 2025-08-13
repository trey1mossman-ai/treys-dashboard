import { apiClient } from './apiClient'
import { z } from 'zod'

const AgentResponseSchema = z.object({
  content: z.string(),
  role: z.literal('assistant')
})

export const agentService = {
  async sendMessage(messages: { role: string; content: string }[]) {
    try {
      const response = await apiClient.post(
        '/agent/relay',
        { messages },
        {},
        AgentResponseSchema
      )
      return response
    } catch (error) {
      console.error('Agent service error:', error)
      return {
        content: 'I apologize, but I\'m currently unavailable. Please try again later.',
        role: 'assistant' as const
      }
    }
  },
  
  async streamMessage(messages: { role: string; content: string }[]) {
    const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || '/api'}/agent/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ messages })
    })
    
    if (!response.ok) {
      throw new Error('Stream failed')
    }
    
    return response.body
  }
}