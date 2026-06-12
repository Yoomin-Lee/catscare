import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type Part =
  | { text: string }
  | { inlineData: { mimeType: string; data: string } }

type RequestBody = {
  action: 'chat' | 'summarize-recording' | 'analyze-food'
  prompt?: string
  audioBase64?: string
  audioMimeType?: string
  cat?: { name: string; breed: string; ageYears: number; weightKg: number; gender: string; neutered: boolean }
  foods?: { name: string; type: string; pref: string }[]
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  try {
    const apiKey = Deno.env.get('GEMINI_API_KEY')
    if (!apiKey) return new Response(JSON.stringify({ error: 'GEMINI_API_KEY not set' }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })

    const body: RequestBody = await req.json()
    let parts: Part[] = []

    if (body.action === 'chat') {
      parts = [{ text: body.prompt ?? '' }]
    } else if (body.action === 'summarize-recording') {
      parts = [
        { inlineData: { mimeType: body.audioMimeType ?? 'audio/webm', data: body.audioBase64 ?? '' } },
        { text: `당신은 수의사 진료 내용을 정리하는 전문가입니다.
이 녹음은 고양이 진료 중 녹음된 것입니다. 아래 형식으로 정리해주세요.

**주요 증상/내용**:
**진단/소견**:
**처방·치료 계획**:
**다음 방문·주의사항**:

불명확한 부분은 (불명확) 으로 표시하고, 한국어로 작성해주세요.` },
      ]
    } else if (body.action === 'analyze-food') {
      const cat = body.cat!
      const foods = body.foods ?? []
      const foodList = foods.length
        ? foods.map(f => `- ${f.name} (${f.type}): ${f.pref}`).join('\n')
        : '아직 기록된 식사 데이터가 없습니다.'
      parts = [{ text: `당신은 고양이 영양 전문가입니다. 아래 정보를 바탕으로 취향 분석과 맞춤 추천을 해주세요.

**고양이 정보**
- 이름: ${cat.name} / 품종: ${cat.breed || '믹스'} / 나이: ${cat.ageYears}살
- 몸무게: ${cat.weightKg}kg / ${cat.gender === 'female' ? '암컷' : '수컷'}${cat.neutered ? ' (중성화)' : ''}

**기호성 기록**
${foodList}

다음 항목으로 간결하게 분석해주세요:
**취향 패턴**: (2-3문장)
**피해야 할 것**:
**추천 식품 유형**: (구체적 2-3가지)
**건강 참고**: (나이·체중·중성화 기준 주의사항 한 줄)` }]
    } else {
      return new Response(JSON.stringify({ error: 'Unknown action' }), { status: 400, headers: { ...CORS, 'Content-Type': 'application/json' } })
    }

    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts }] }),
      }
    )

    const data = await res.json() as { candidates?: { content: { parts: { text: string }[] } }[]; error?: { message: string } }
    if (!res.ok || data.error) throw new Error(data.error?.message ?? `Gemini 오류 ${res.status}`)

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    return new Response(JSON.stringify({ text }), { headers: { ...CORS, 'Content-Type': 'application/json' } })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : '알 수 없는 오류'
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...CORS, 'Content-Type': 'application/json' } })
  }
})
