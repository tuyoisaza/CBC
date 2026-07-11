import Anthropic from '@anthropic-ai/sdk'

/**
 * Provider-agnostic text generation: Claude when a real Anthropic key is
 * configured, otherwise OpenAI (gpt-4o) using the key that already powers
 * DALL-E. A "real" key is longer than the "sk-ant-" stub placeholder configs
 * carry.
 */
function hasRealAnthropicKey(): boolean {
  const k = process.env.ANTHROPIC_API_KEY || ''
  return k.startsWith('sk-ant-') && k.length > 20
}

export async function generateText(opts: {
  system: string
  prompt: string
  maxTokens: number
}): Promise<string> {
  if (hasRealAnthropicKey()) {
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: opts.maxTokens,
      system: opts.system,
      messages: [{ role: 'user', content: opts.prompt }],
    })
    return (response.content[0] as { text: string }).text
  }

  // OpenAI via plain fetch — avoids adding the openai SDK to the web bundle
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
  if (!res.ok) throw new Error(`OpenAI error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return data.choices[0].message.content
}

/** Strip markdown fences some models add around JSON despite instructions. */
export function stripJsonFences(text: string): string {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '')
}
