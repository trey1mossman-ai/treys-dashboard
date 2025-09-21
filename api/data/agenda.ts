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
    // Return empty agenda items for now
    // This endpoint can be expanded later to fetch actual agenda data
    res.status(200).json({
      items: [],
      date: req.query.date || new Date().toISOString().split('T')[0],
      message: 'No agenda items for today'
    })
  } catch (error) {
    console.error('Agenda API error:', error)
    res.status(500).json({ 
      error: 'Failed to load agenda items',
      message: error instanceof Error ? error.message : 'Unknown error'
    })
  }
}