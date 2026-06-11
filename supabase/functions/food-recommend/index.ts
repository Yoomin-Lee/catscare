const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { catName, breed, ageYears, weightKg, neutered, foodHistory } = await req.json()
    if (!foodHistory) throw new Error('foodHistory is required')

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
        max_tokens: 768,
        messages: [{
          role: 'user',
          content: `고양이 식단 취향을 분석하고 추천해주세요. JSON 외 텍스트 없이 반환하세요.

고양이 정보:
- 이름: ${catName}, 품종: ${breed}, 나이: ${ageYears}살, 체중: ${weightKg}kg, 중성화: ${neutered ? '예' : '아니오'}

식사 기록 (최근 순):
${JSON.stringify(foodHistory, null, 2)}

아래 JSON 형식으로 분석 결과를 반환하세요:
{"preferredType":"습식/건식/혼합","flavorTrends":["좋아하는 맛 특징1","특징2"],"avoidFlavors":["피해야 할 맛"],"recommendations":["추천 사료/간식1","추천2","추천3"],"dietTip":"건강 체중/나이 기반 식단 조언"}`,
        }],
      }),
    })

    if (!res.ok) throw new Error(`Anthropic API error ${res.status}`)

    const data = await res.json() as { content: Array<{ type: string; text: string }> }
    const rawText = data.content.find(c => c.type === 'text')?.text ?? ''
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('분석 결과를 파싱할 수 없어요.')

    return new Response(JSON.stringify({ analysis: JSON.parse(match[0]) }), {
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
