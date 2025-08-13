/**
 * Cloudflare Worker: AI Agent Relay
 * 
 * Required environment variables:
 * - OPENAI_API_KEY or ANTHROPIC_API_KEY
 * - MODEL_PROVIDER: 'openai' | 'anthropic'
 * - MODEL_NAME: e.g., 'gpt-4' or 'claude-3-opus'
 */

export interface Env {
  OPENAI_API_KEY?: string
  ANTHROPIC_API_KEY?: string
  MODEL_PROVIDER: string
  MODEL_NAME: string
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405 })
    }

    try {
      const { messages } = await request.json()

      if (env.MODEL_PROVIDER === 'openai') {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: env.MODEL_NAME || 'gpt-4',
            messages,
            temperature: 0.7,
          }),
        })

        const data = await response.json()
        return new Response(JSON.stringify({
          content: data.choices[0].message.content,
          role: 'assistant',
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      if (env.MODEL_PROVIDER === 'anthropic') {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': env.ANTHROPIC_API_KEY!,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: env.MODEL_NAME || 'claude-3-opus-20240229',
            messages,
            max_tokens: 1024,
          }),
        })

        const data = await response.json()
        return new Response(JSON.stringify({
          content: data.content[0].text,
          role: 'assistant',
        }), {
          headers: { 'Content-Type': 'application/json' },
        })
      }

      return new Response('Invalid model provider', { status: 400 })
    } catch (error) {
      return new Response(JSON.stringify({ error: 'Internal server error' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      })
    }
  },
}