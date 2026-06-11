import { createContext, useContext, useState, ReactNode } from 'react'

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

type ScheduleCtx = {
  getSchedule: (catId: string) => CatSchedule
  updateSchedule: (catId: string, patch: Partial<CatSchedule>) => void
}

const ScheduleContext = createContext<ScheduleCtx>({
  getSchedule: () => defaultSchedule(),
  updateSchedule: () => {},
})

export function ScheduleProvider({ children }: { children: ReactNode }) {
  const [schedules, setSchedules] = useState<Record<string, CatSchedule>>({})

  const getSchedule = (catId: string): CatSchedule =>
    schedules[catId] ?? defaultSchedule()

  const updateSchedule = (catId: string, patch: Partial<CatSchedule>) =>
    setSchedules(prev => ({
      ...prev,
      [catId]: { ...(prev[catId] ?? defaultSchedule()), ...patch },
    }))

  return (
    <ScheduleContext.Provider value={{ getSchedule, updateSchedule }}>
      {children}
    </ScheduleContext.Provider>
  )
}

export const useSchedule = () => useContext(ScheduleContext)
