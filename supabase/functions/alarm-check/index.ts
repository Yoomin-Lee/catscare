import { createClient } from 'jsr:@supabase/supabase-js@2'

const PUSH_NOTIFY_URL = 'https://kbjxjogmnwurxbxnpfsz.supabase.co/functions/v1/push-notify'

function addMonths(dateStr: string, months: number): Date {
  const d = new Date(dateStr)
  d.setMonth(d.getMonth() + months)
  return d
}

function addWeeks(dateStr: string, weeks: number): Date {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + weeks * 7)
  return d
}

function daysUntil(target: Date, now: Date): number {
  const t = new Date(target); t.setHours(0, 0, 0, 0)
  const n = new Date(now);    n.setHours(0, 0, 0, 0)
  return Math.ceil((t.getTime() - n.getTime()) / 86400000)
}

Deno.serve(async () => {
  const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
  const SERVICE_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const SERVICE_ANON = Deno.env.get('SUPABASE_ANON_KEY')!

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY)
  const now = new Date()
  // Supabase Edge Functions run in UTC. Convert to KST (UTC+9) for time comparison.
  // Also floor minutes to the nearest 30-min bucket to tolerate pg_cron jitter.
  const kstNow = new Date(now.getTime() + 9 * 60 * 60 * 1000)
  const kstH = kstNow.getHours()
  const kstM = kstNow.getMinutes() < 30 ? 0 : 30
  const nowHHMM = `${String(kstH).padStart(2, '0')}:${String(kstM).padStart(2, '0')}`

  const { data: schedules } = await supabase
    .from('schedules')
    .select('user_id, hospital_last_date, hospital_cycle, sand_last_date, sand_cycle, alarms_enabled, hospital_notify, sand_notify')

  if (!schedules?.length) return new Response('ok')

  for (const s of schedules) {
    const alarmsEnabled = s.alarms_enabled as { hospital: boolean; sand: boolean } | null
    const hospitalNotify = (s.hospital_notify as Array<{ days: number; time: string }>) ?? []
    const sandNotify     = (s.sand_notify     as Array<{ days: number; time: string }>) ?? []

    if (alarmsEnabled?.hospital) {
      const nextHospital = addMonths(s.hospital_last_date as string, s.hospital_cycle as number)
      const daysLeft = daysUntil(nextHospital, kstNow)
      for (const n of hospitalNotify) {
        if (n.days === daysLeft && n.time === nowHHMM) {
          await fetch(PUSH_NOTIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ANON}` },
            body: JSON.stringify({
              userId: s.user_id,
              title: '병원 방문 알림',
              body: daysLeft === 0 ? '오늘 병원 방문 예정일이에요!' : `병원 방문까지 ${daysLeft}일 남았어요.`,
            }),
          })
        }
      }
    }

    if (alarmsEnabled?.sand) {
      const nextSand = addWeeks(s.sand_last_date as string, s.sand_cycle as number)
      const daysLeft = daysUntil(nextSand, kstNow)
      for (const n of sandNotify) {
        if (n.days === daysLeft && n.time === nowHHMM) {
          await fetch(PUSH_NOTIFY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_ANON}` },
            body: JSON.stringify({
              userId: s.user_id,
              title: '화장실 모래 교체 알림',
              body: daysLeft === 0 ? '오늘 모래 교체일이에요!' : `모래 교체까지 ${daysLeft}일 남았어요.`,
            }),
          })
        }
      }
    }
  }

  return new Response('ok')
})
