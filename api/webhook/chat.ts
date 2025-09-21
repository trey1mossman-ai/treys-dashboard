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
      res.status(200).json(jsonData)
    } catch {
      // If not JSON, wrap in response object for consistency
      res.status(200).json({ 
        success: true,
        response: data 
      })
    }
  } catch (error) {
    console.error('Chat webhook proxy error:', error)
    res.status(500).json({ 
      error: 'Failed to proxy chat webhook',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}