/**
 * Cloudflare Worker: SMS Send
 * 
 * Required environment variables:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
 */

export interface Env {
  TWILIO_ACCOUNT_SID: string
  TWILIO_AUTH_TOKEN: string
  TWILIO_PHONE_NUMBER: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    try {
      const { to, body, from } = await request.json()

      const credentials = btoa(`${env.TWILIO_ACCOUNT_SID}:${env.TWILIO_AUTH_TOKEN}`)
      
      const response = await fetch(
        `https://api.twilio.com/2010-04-01/Accounts/${env.TWILIO_ACCOUNT_SID}/Messages.json`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Basic ${credentials}`,
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            To: to,
            From: from || env.TWILIO_PHONE_NUMBER,
            Body: body,
          }),
        }
      )

      const data = await response.json()

      if (response.ok) {
        return new Response(JSON.stringify({
          success: true,
          messageId: data.sid,
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ error: data.message }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
}