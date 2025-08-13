/**
 * Netlify Function: AI Agent Relay
 * 
 * Required environment variables:
 * - OPENAI_API_KEY or ANTHROPIC_API_KEY
 * - MODEL_PROVIDER: 'openai' | 'anthropic'
 * - MODEL_NAME: e.g., 'gpt-4' or 'claude-3-opus'
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
    const { messages } = JSON.parse(event.body || '{}')
    const provider = process.env.MODEL_PROVIDER
    const modelName = process.env.MODEL_NAME

    if (provider === 'openai') {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName || 'gpt-4',
          messages,
          temperature: 0.7,
        }),
      })

      const data = await response.json()
      return {
        statusCode: 200,
        body: JSON.stringify({
          content: data.choices[0].message.content,
          role: 'assistant',
        }),
      }
    }

    if (provider === 'anthropic') {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'x-api-key': process.env.ANTHROPIC_API_KEY!,
          'anthropic-version': '2023-06-01',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: modelName || 'claude-3-opus-20240229',
          messages,
          max_tokens: 1024,
        }),
      })

      const data = await response.json()
      return {
        statusCode: 200,
        body: JSON.stringify({
          content: data.content[0].text,
          role: 'assistant',
        }),
      }
    }

    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid model provider' }),
    }
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    }
  }
}