import { AnthropicStream, StreamingTextResponse } from 'ai'


export const runtime = 'edge'

export async function POST(req: Request) {
  const { prompt } = await req.json()

  const response = await fetch('https://api.anthropic.com/v1/complete', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.ANTHROPIC_API_KEY!
    },
    body: JSON.stringify({
      prompt: prompt,
      model: 'claude-2',
      max_tokens_to_sample: 1000,
      stream: true
    })
  })

  // Convert the response into a friendly text-stream
  const stream = AnthropicStream(response)

  // Respond with the stream
  return new StreamingTextResponse(stream)
}

