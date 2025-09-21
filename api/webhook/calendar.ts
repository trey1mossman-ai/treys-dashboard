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
    console.log('Proxying calendar webhook request')

    const response = await fetch('https://flow.voxemarketing.com/webhook/f4fd2f67-df3b-4ee2-b426-944e51d01f28', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(req.body || { action: 'sync', days: 7 })
    })

    const data = await response.text()

    try {
      const jsonData = JSON.parse(data)

      // Save calendar events to Supabase if we received any
      if (jsonData.events && Array.isArray(jsonData.events)) {
        console.log(`Saving ${jsonData.events.length} calendar events to Supabase...`)

        for (const event of jsonData.events) {
          try {
            await supabase
              .from('calendar_events')
              .upsert({
                id: event.id || `event-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                summary: event.summary || event.title || 'No Title',
                start: event.start || event.startTime || new Date().toISOString(),
                end: event.end || event.endTime || new Date(Date.now() + 3600000).toISOString(),
                location: event.location || '',
                description: event.description || '',
                attendees: event.attendees || [],
                video_link: event.video_link || event.hangoutLink || event.meetingUrl || '',
                all_day: event.all_day || event.allDay || false,
                status: event.status || 'confirmed'
              })
          } catch (saveError) {
            console.error('Error saving individual calendar event:', saveError)
          }
        }
      }

      res.status(200).json(jsonData)
    } catch {
      // If not JSON, return as text
      res.status(200).send(data)
    }
  } catch (error) {
    console.error('Calendar webhook proxy error:', error)
    res.status(500).json({
      error: 'Failed to proxy calendar webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}