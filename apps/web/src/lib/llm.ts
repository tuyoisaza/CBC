import Anthropic from '@anthropic-ai/sdk'
import { getIntegrationValues } from './integration-secrets'

/**
 * Provider-agnostic text generation: Claude when a real Anthropic key is
 * configured, otherwise OpenAI (gpt-4o) using the key that already powers
 * DALL-E. A "real" key is longer than the "sk-ant-" stub placeholder configs
 * carry.
 */
function hasRealAnthropicKey(k = ''): boolean {
  return k.startsWith('sk-ant-') && k.length > 20
}

export async function generateText(opts: {
  system: string
  prompt: string
  maxTokens: number
}): Promise<string> {
  try {
    const config = await getIntegrationValues(['ANTHROPIC_API_KEY', 'OPENAI_API_KEY'])
    if (hasRealAnthropicKey(config.ANTHROPIC_API_KEY)) {
      const client = new Anthropic({ apiKey: config.ANTHROPIC_API_KEY })
      const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: opts.maxTokens,
        system: opts.system,
        messages: [{ role: 'user', content: opts.prompt }],
      })
      return (response.content[0] as { text: string }).text
    }

    // OpenAI via plain fetch — avoids adding the openai SDK to the web bundle
    if (!config.OPENAI_API_KEY) throw new Error('No text generation provider configured')
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        max_tokens: opts.maxTokens,
        messages: [
          { role: 'system', content: opts.system },
          { role: 'user', content: opts.prompt },
        ],
      }),
    })
    if (!res.ok) throw new Error('Text generation request failed')
    const data = await res.json()
    return data.choices[0].message.content
  } catch {
    // SDK exceptions can contain headers/request data; never propagate them.
    throw new Error('Text generation unavailable')
  }
}

/** Strip markdown fences some models add around JSON despite instructions. */
export function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
}
