import type { VercelRequest, VercelResponse } from '@vercel/node'
import { createClient } from '@supabase/supabase-js'

// Supabase configuration
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://ceubhminnsfgrsiootoq.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNldWJobWlubnNmZ3JzaW9vdG9xIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1ODQxNjk5NCwiZXhwIjoyMDczOTkyOTk0fQ.w3YxBFY1vWgSWrOAqgvjZbCJV8fJ8bqEeR31-p3VDDM'

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY)

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', 'true')
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT')
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  )

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  try {
    console.log('Proxying AI chat webhook request with body:', req.body)

    const response = await fetch('https://flow.voxemarketing.com/webhook/c0552eb4-8ed7-4a46-b141-492ba7fefd04/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body)
    })

    const data = await response.text()
    console.log('AI chat response:', data)

    try {
      const jsonData = JSON.parse(data)

      // Log AI conversation to Supabase
      if (req.body?.chatInput) {
        try {
          const sessionId = req.body.sessionId || `session-${Date.now()}`
          const timestamp = new Date().toISOString()

          const conversationEntries = [
            {
              session_id: sessionId,
              role: 'user',
              message: req.body.chatInput,
              metadata: {
                action_type: req.body.action || 'chat',
                entry_type: 'request',
                logged_at: timestamp
              }
            },
            {
              session_id: sessionId,
              role: 'assistant',
              message: jsonData.response || data,
              metadata: {
                action_type: req.body.action || 'chat',
                entry_type: 'response',
                logged_at: timestamp
              }
            }
          ]

          await supabase
            .from('ai_conversations')
            .insert(conversationEntries)

          console.log('AI conversation logged to Supabase')
        } catch (saveError) {
          console.error('Error saving AI conversation:', saveError)
        }
      }

      res.status(200).json(jsonData)
    } catch {
      // If not JSON, wrap in response object for consistency
      const responseData = {
        success: true,
        response: data
      }

      // Still log the conversation even if response isn't JSON
      if (req.body?.chatInput) {
        try {
          const sessionId = req.body.sessionId || `session-${Date.now()}`
          const timestamp = new Date().toISOString()

          const conversationEntries = [
            {
              session_id: sessionId,
              role: 'user',
              message: req.body.chatInput,
              metadata: {
                action_type: req.body.action || 'chat',
                entry_type: 'request',
                logged_at: timestamp
              }
            },
            {
              session_id: sessionId,
              role: 'assistant',
              message: data,
              metadata: {
                action_type: req.body.action || 'chat',
                entry_type: 'response',
                logged_at: timestamp
              }
            }
          ]

          await supabase
            .from('ai_conversations')
            .insert(conversationEntries)
        } catch (saveError) {
          console.error('Error saving AI conversation:', saveError)
        }
      }

      res.status(200).json(responseData)
    }
  } catch (error) {
    console.error('Chat webhook proxy error:', error)
    res.status(500).json({
      error: 'Failed to proxy chat webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}