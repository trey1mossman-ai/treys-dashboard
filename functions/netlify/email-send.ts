/**
 * Netlify Function: Email Send
 * 
 * Required environment variables:
 * - SENDGRID_API_KEY or RESEND_API_KEY
 * - EMAIL_PROVIDER: 'sendgrid' | 'resend'
 * - DEFAULT_FROM_EMAIL
 */

import type { Handler } from '@netlify/functions'

export const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' }),
    }
  }

  try {
    const { to, subject, text, html, from } = JSON.parse(event.body || '{}')
    const provider = process.env.EMAIL_PROVIDER
    const defaultFrom = process.env.DEFAULT_FROM_EMAIL

    if (provider === 'sendgrid') {
      const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.SENDGRID_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: to }] }],
          from: { email: from || defaultFrom },
          subject,
          content: [
            { type: 'text/plain', value: text },
            ...(html ? [{ type: 'text/html', value: html }] : []),
          ],
        }),
      })

      if (response.ok) {
        return {
          statusCode: 200,
          body: JSON.stringify({ success: true }),
        }
      }

      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Failed to send email' }),
      }
    }

    if (provider === 'resend') {
      const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: from || defaultFrom,
          to,
          subject,
          text,
          html,
        }),
      })

      const data = await response.json()
      return {
        statusCode: response.ok ? 200 : 400,
        body: JSON.stringify(data),
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid email provider' }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}