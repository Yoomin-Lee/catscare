import { supabase } from '@/lib/supabase'

const GEMINI_URL = 'https://kbjxjogmnwurxbxnpfsz.supabase.co/functions/v1/gemini'

const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? ''

async function callGemini(body: object): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token ?? ANON_KEY
  const res = await fetch(GEMINI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  })
  const json = await res.json() as { text?: string; error?: string }
  if (!res.ok || json.error) throw new Error(json.error ?? `오류 ${res.status}`)
  return json.text ?? ''
}

export async function askGemini(prompt: string): Promise<string> {
  return callGemini({ action: 'chat', prompt })
}

export async function summarizeVetRecording(audioBase64: string, mimeType: string): Promise<string> {
  return callGemini({ action: 'summarize-recording', audioBase64, audioMimeType: mimeType })
}

export async function analyzeFoodPreference(
  cat: { name: string; breed: string; ageYears: number; weightKg: number; gender: string; neutered: boolean },
  foods: { name: string; type: string; pref: string }[]
): Promise<string> {
  return callGemini({ action: 'analyze-food', cat, foods })
}
