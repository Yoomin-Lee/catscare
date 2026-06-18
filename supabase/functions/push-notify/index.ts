import webpush from 'npm:web-push'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const VAPID_PUBLIC  = Deno.env.get('VAPID_PUBLIC_KEY')!
  const VAPID_PRIVATE = Deno.env.get('VAPID_PRIVATE_KEY')!
  const SUPABASE_URL  = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  webpush.setVapidDetails('mailto:yoominggg2164@gmail.com', VAPID_PUBLIC, VAPID_PRIVATE)

  const { userId, title, body } = await req.json() as { userId: string; title: string; body: string }

  const res = await fetch(
    `${SUPABASE_URL}/rest/v1/push_subscriptions?user_id=eq.${userId}&select=endpoint,p256dh,auth`,
    {
      headers: {
        'apikey': SERVICE_KEY,
        'Authorization': `Bearer ${SERVICE_KEY}`,
      }
    }
  )
  const subs = await res.json()
  console.log('subs:', JSON.stringify(subs), 'status:', res.status, 'hasServiceKey:', !!SERVICE_KEY)

  if (!Array.isArray(subs) || !subs.length) return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders })

  let sent = 0
  await Promise.all(subs.map(async (s: { endpoint: string; p256dh: string; auth: string }) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title, body })
      )
      sent++
    } catch (e) {
      const err = e as { statusCode?: number; message?: string; body?: string }
      console.log('sendNotification error:', err?.statusCode, err?.message, err?.body)
      if (err?.statusCode === 410) {
        await fetch(
          `${SUPABASE_URL}/rest/v1/push_subscriptions?endpoint=eq.${encodeURIComponent(s.endpoint)}`,
          {
            method: 'DELETE',
            headers: { 'apikey': SERVICE_KEY, 'Authorization': `Bearer ${SERVICE_KEY}` }
          }
        )
      }
    }
  }))

  return new Response(JSON.stringify({ sent }), { headers: corsHeaders })
})
