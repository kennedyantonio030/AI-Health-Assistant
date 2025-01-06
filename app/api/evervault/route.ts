import { llm } from "@/utils/llm"


export const maxDuration = 300

export async function POST(req: Request) {
  const body = await req.json()

  console.log('evervaulty', body)
  const prompt = body.prompt.trim() + "\n\nAssistant:"
  const response = await llm(prompt, 3, body.model || "claude-2", body.max_tokens_to_sample || 500)
  return new Response(JSON.stringify({ completion: response }), {
    headers: { 'content-type': 'application/json' },
  })
}

