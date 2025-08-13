/**
 * Cloudflare Worker: Email Send
 * 
 * Required environment variables:
 * - SENDGRID_API_KEY or RESEND_API_KEY
 * - EMAIL_PROVIDER: 'sendgrid' | 'resend'
 * - DEFAULT_FROM_EMAIL
 */

export interface Env {
  SENDGRID_API_KEY?: string
  RESEND_API_KEY?: string
  EMAIL_PROVIDER: string
  DEFAULT_FROM_EMAIL: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    try {
      const { to, subject, text, html, from } = await request.json()

      if (env.EMAIL_PROVIDER === 'sendgrid') {
        const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.SENDGRID_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            personalizations: [{ to: [{ email: to }] }],
            from: { email: from || env.DEFAULT_FROM_EMAIL },
            subject,
            content: [
              { type: 'text/plain', value: text },
              ...(html ? [{ type: 'text/html', value: html }] : []),
            ],
          }),
        })

        if (response.ok) {
          return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' },
          })
        }

        return new Response(JSON.stringify({ error: 'Failed to send email' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (env.EMAIL_PROVIDER === 'resend') {
        const response = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: from || env.DEFAULT_FROM_EMAIL,
            to,
            subject,
            text,
            html,
          }),
        })

        const data = await response.json()
        return new Response(JSON.stringify(data), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Invalid email provider', { status: 400 })
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
}