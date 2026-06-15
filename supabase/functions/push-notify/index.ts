import { createClient } from 'jsr:@supabase/supabase-js@2'
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

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const { data: subs } = await supabase
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subs?.length) return new Response(JSON.stringify({ sent: 0 }), { headers: corsHeaders })

  let sent = 0
  await Promise.all(subs.map(async (s) => {
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        JSON.stringify({ title, body })
      )
      sent++
    } catch (e) {
      if ((e as { statusCode?: number }).statusCode === 410) {
        await supabase.from('push_subscriptions').delete().eq('endpoint', s.endpoint)
      }
    }
  }))

  return new Response(JSON.stringify({ sent }), { headers: corsHeaders })
})
