const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { imageBase64, mediaType } = await req.json()
    if (!imageBase64) throw new Error('imageBase64 is required')

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY not configured')

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType ?? 'image/jpeg', data: imageBase64 } },
            {
              type: 'text',
              text: `고양이 혈액검사 결과지 이미지입니다. 아래 항목의 측정값을 추출해 JSON만 반환하세요.

{"glu":null,"bun":null,"crea":null,"ca":null,"tp":null,"alb":null,"glob":null,"alt":null,"alp":null,"ggt":null,"tbil":null,"chol":null,"amy":null,"lipa":null,"ntprobnp":null,"saa":null,"sdma":null}

규칙: 읽을 수 없으면 null. "<5"→5, "<0.10"→0.10. JSON 외 텍스트 없이.`,
            },
          ],
        }],
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error((err as { error?: { message?: string } }).error?.message ?? `Anthropic API error ${res.status}`)
    }

    const data = await res.json() as { content: Array<{ type: string; text: string }> }
    const text = data.content.find((c) => c.type === 'text')?.text ?? ''
    const match = text.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('검사지에서 수치를 찾지 못했어요.')

    const parsed = JSON.parse(match[0]) as Record<string, unknown>
    const metrics: Record<string, number | null> = {}
    Object.keys(parsed).forEach((k) => {
      metrics[k] = typeof parsed[k] === 'number' ? (parsed[k] as number) : null
    })

    return new Response(JSON.stringify({ metrics }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    })
  }
})
