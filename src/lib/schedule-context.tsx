import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { supabase } from '@/lib/supabase'

export type CatSchedule = {
  hospitalLastDate: Date
  hospitalCycle: number  // months
  sandLastDate: Date
  sandCycle: number      // weeks
}

function defaultSchedule(): CatSchedule {
  const today = new Date()
  const oneMonthAgo = new Date(today)
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)
  return {
    hospitalLastDate: oneMonthAgo,
    hospitalCycle: 6,
    sandLastDate: today,
    sandCycle: 4,
  }
}

function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function fromDateStr(s: string): Date {
  const [y, m, d] = s.split('-').map(Number)
  return new Date(y, m - 1, d)
}

type ScheduleCtx = {
  getSchedule: (catId: string) => CatSchedule
  updateSchedule: (catId: string, patch: Partial<CatSchedule>) => void
}

const ScheduleContext = createContext<ScheduleCtx>({
  getSchedule: () => defaultSchedule(),
  updateSchedule: () => {},
})

export function ScheduleProvider({ userId, children }: { userId?: string; children: ReactNode }) {
  const [schedules, setSchedules] = useState<Record<string, CatSchedule>>({})
  const userIdRef = useRef(userId)
  const schedulesRef = useRef(schedules)
  userIdRef.current = userId
  schedulesRef.current = schedules

  useEffect(() => {
    if (!userId) { setSchedules({}); return }
    supabase
      .from('schedules')
      .select('cat_id, hospital_last_date, hospital_cycle, sand_last_date, sand_cycle')
      .eq('user_id', userId)
      .then(({ data }) => {
        if (!data) return
        const map: Record<string, CatSchedule> = {}
        data.forEach(r => {
          map[r.cat_id as string] = {
            hospitalLastDate: fromDateStr(r.hospital_last_date as string),
            hospitalCycle: r.hospital_cycle as number,
            sandLastDate: fromDateStr(r.sand_last_date as string),
            sandCycle: r.sand_cycle as number,
          }
        })
        setSchedules(map)
      })
  }, [userId])

  const getSchedule = (catId: string): CatSchedule =>
    schedules[catId] ?? defaultSchedule()

  const updateSchedule = (catId: string, patch: Partial<CatSchedule>) => {
    const uid = userIdRef.current
    const current = schedulesRef.current[catId] ?? defaultSchedule()
    const next = { ...current, ...patch }
    setSchedules(prev => ({ ...prev, [catId]: next }))
    if (!uid || catId === '__guest__') return
    supabase.from('schedules').upsert(
      {
        cat_id: catId,
        user_id: uid,
        hospital_last_date: toDateStr(next.hospitalLastDate),
        hospital_cycle: next.hospitalCycle,
        sand_last_date: toDateStr(next.sandLastDate),
        sand_cycle: next.sandCycle,
      },
      { onConflict: 'cat_id' }
    )
  }

  return (
    <ScheduleContext.Provider value={{ getSchedule, updateSchedule }}>
      {children}
    </ScheduleContext.Provider>
  )
}

export const useSchedule = () => useContext(ScheduleContext)
