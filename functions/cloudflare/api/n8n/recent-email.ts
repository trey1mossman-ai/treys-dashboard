import { handleOptions } from '../_utils/cors'
import { jsonResponse, errorResponse } from '../_utils/json'

interface Env {
  N8N_BASE_URL: string
  N8N_TOKEN: string
  VITE_PUBLIC_ORIGIN?: string
}

/**
 * GET /api/n8n/recent-email?limit=5
 * Fetches recent emails from n8n webhook
 * 
 * curl "http://localhost:8788/api/n8n/recent-email?limit=5"
 */
export const onRequestGet: PagesFunction<Env> = async (context) => {
  const origin = context.env.VITE_PUBLIC_ORIGIN || '*'
  
  if (context.request.method === 'OPTIONS') {
    return handleOptions(origin)
  }

  try {
    const url = new URL(context.request.url)
    const limit = url.searchParams.get('limit') || '5'
    
    if (!context.env.N8N_BASE_URL || !context.env.N8N_TOKEN) {
      return jsonResponse({
        ok: true,
        items: [] // Return empty array if not configured
      }, 200, origin)
    }
    
    // Call n8n webhook to get recent emails
    const n8nUrl = `${context.env.N8N_BASE_URL}/webhook/recent-email?limit=${limit}`
    const response = await fetch(n8nUrl, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${context.env.N8N_TOKEN}`,
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      console.error('n8n Email fetch failed:', response.status)
      return jsonResponse({
        ok: true,
        items: [] // Gracefully handle errors
      }, 200, origin)
    }
    
    const data = await response.json()
    
    // Normalize the response to expected format
    const items = (data.emails || data.items || []).slice(0, parseInt(limit)).map((email: any) => ({
      id: email.id || crypto.randomUUID(),
      from: email.from || email.sender || 'Unknown',
      subject: email.subject || 'No Subject',
      snippet: email.snippet || email.preview || email.body?.substring(0, 100) || '',
      time: email.time || email.timestamp || email.date || new Date().toISOString()
    }))
    
    return jsonResponse({
      ok: true,
      items
    }, 200, origin)
    
  } catch (error) {
    console.error('Recent Email error:', error)
    // Return empty array on error to prevent UI breaks
    return jsonResponse({
      ok: true,
      items: []
    }, 200, origin)
  }
}