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
    console.log('Proxying email webhook request')

    const response = await fetch('https://flow.voxemarketing.com/webhook/c14a535e-80bf-4bd9-9b3d-1001e6917d85', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body || { action: 'refresh', limit: 20 })
    })

    const data = await response.text()

    try {
      const jsonData = JSON.parse(data)

      // Save emails to Supabase if we received any
      if (jsonData.emails && Array.isArray(jsonData.emails)) {
        console.log(`Saving ${jsonData.emails.length} emails to Supabase...`)

        for (const email of jsonData.emails) {
          try {
            await supabase
              .from('emails')
              .upsert({
                id: email.id || `email-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                timestamp: email.timestamp || email.date || new Date().toISOString(),
                from_email: email.from_email || email.from || '',
                from_name: email.from_name || email.fromName || '',
                subject: email.subject || 'No Subject',
                body: email.body || email.content || '',
                body_plain: email.body_plain || email.textContent || email.snippet || '',
                snippet: email.snippet || email.body_plain?.substring(0, 100) || '',
                labels: email.labels || [],
                is_read: email.is_read || false,
                is_starred: email.is_starred || false
              })
          } catch (saveError) {
            console.error('Error saving individual email:', saveError)
          }
        }
      }

      res.status(200).json(jsonData)
    } catch {
      // If not JSON, return as text
      res.status(200).send(data)
    }
  } catch (error) {
    console.error('Email webhook proxy error:', error)
    res.status(500).json({
      error: 'Failed to proxy email webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}