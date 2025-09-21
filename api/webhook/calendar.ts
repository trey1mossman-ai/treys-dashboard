import type { VercelRequest, VercelResponse } from '@vercel/node'

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