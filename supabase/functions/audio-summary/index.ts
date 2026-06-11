const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })

  try {
    const { audioBase64, mimeType } = await req.json()
    if (!audioBase64) throw new Error('audioBase64 is required')

    const openaiKey = Deno.env.get('OPENAI_API_KEY')
    const anthropicKey = Deno.env.get('ANTHROPIC_API_KEY')
    if (!openaiKey) throw new Error('OPENAI_API_KEY not configured')
    if (!anthropicKey) throw new Error('ANTHROPIC_API_KEY not configured')

    // Step 1: OpenAI Whisper로 음성 → 텍스트
    const audioBytes = Uint8Array.from(atob(audioBase64), c => c.charCodeAt(0))
    const formData = new FormData()
    formData.append('file', new Blob([audioBytes], { type: mimeType ?? 'audio/m4a' }), 'recording.m4a')
    formData.append('model', 'whisper-1')
    formData.append('language', 'ko')

    const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${openaiKey}` },
      body: formData,
    })
    if (!whisperRes.ok) throw new Error(`Whisper error ${whisperRes.status}`)
    const { text: transcript } = await whisperRes.json() as { text: string }

    // Step 2: Claude로 핵심 요약
    const claudeRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'x-api-key': anthropicKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        messages: [{
          role: 'user',
          content: `다음은 고양이 병원 진료 녹음을 텍스트로 변환한 내용입니다. 핵심 내용을 아래 JSON 형식으로 요약해주세요. JSON 외 텍스트 없이 반환하세요.

{"diagnosis":"진단명","medications":["처방약1","처방약2"],"nextVisit":"다음 방문 일정","notes":"기타 주의사항"}

녹음 내용:
${transcript}`,
        }],
      }),
    })
    if (!claudeRes.ok) throw new Error(`Claude error ${claudeRes.status}`)

    const claudeData = await claudeRes.json() as { content: Array<{ type: string; text: string }> }
    const rawText = claudeData.content.find(c => c.type === 'text')?.text ?? ''
    const match = rawText.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('요약 결과를 파싱할 수 없어요.')

    return new Response(JSON.stringify({ transcript, summary: JSON.parse(match[0]) }), {
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
