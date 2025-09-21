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