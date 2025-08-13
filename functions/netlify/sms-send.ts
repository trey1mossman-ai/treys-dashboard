/**
 * Netlify Function: SMS Send
 * 
 * Required environment variables:
 * - TWILIO_ACCOUNT_SID
 * - TWILIO_AUTH_TOKEN
 * - TWILIO_PHONE_NUMBER
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
    const { to, body, from } = JSON.parse(event.body || '{}')
    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const twilioNumber = process.env.TWILIO_PHONE_NUMBER

    const credentials = Buffer.from(`${accountSid}:${authToken}`).toString('base64')
    
    const response = await fetch(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${credentials}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          To: to,
          From: from || twilioNumber!,
          Body: body,
        }),
      }
    )

    const data = await response.json()

    if (response.ok) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          success: true,
          messageId: data.sid,
        }),
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: data.message }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}