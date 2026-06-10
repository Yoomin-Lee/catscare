import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { supabase } from './supabase'

export type Cat = {
  id: string
  name: string
  breed: string
  ageYears: number
  birthDate?: string   // 'YYYY.MM.DD'
  weightKg: number
  gender: 'male' | 'female'
  neutered: boolean
  photoUri?: string
}

const BREED_PALETTE: { keyword: string; color: string }[] = [
  { keyword: '고등어', color: '#78909C' },
  { keyword: '턱시도', color: '#455A64' },
  { keyword: '치즈', color: '#F4900C' },
  { keyword: '삼색', color: '#C2185B' },
  { keyword: '흰색', color: '#5B8ECC' },
  { keyword: '검정', color: '#546E7A' },
  { keyword: '코리안', color: '#E9785A' },
  { keyword: '페르시안', color: '#9E9E9E' },
  { keyword: '러시안', color: '#607D8B' },
  { keyword: '샴', color: '#8D6E63' },
  { keyword: '노르웨이', color: '#FF8F00' },
  { keyword: '메인쿤', color: '#795548' },
  { keyword: '스코티시', color: '#78909C' },
  { keyword: '버만', color: '#CE93D8' },
  { keyword: '뱅갈', color: '#FFA726' },
  { keyword: '터키시', color: '#80DEEA' },
]

const NAME_COLORS = ['#E9785A', '#1D9E75', '#534AB7', '#BA7517', '#D94040', '#2196F3', '#E91E63']

export function catAvatarColor(cat: Pick<Cat, 'name' | 'breed'>): string {
  for (const { keyword, color } of BREED_PALETTE) {
    if (cat.breed.includes(keyword)) return color
  }
  const idx = (cat.name.charCodeAt(0) || 0) % NAME_COLORS.length
  return NAME_COLORS[idx]
}

type CatsCtx = {
  cats: Cat[]
  selectedId: string
  selectedCat: Cat
  userId?: string
  loading: boolean
  selectCat: (id: string) => void
  addCat: (c: Omit<Cat, 'id'>) => Promise<void>
  updateCat: (id: string, c: Partial<Omit<Cat, 'id'>>) => Promise<void>
  removeCat: (id: string) => Promise<void>
}

const DEFAULT_CAT: Cat = {
  id: '__guest__',
  name: '나비',
  breed: '코리안숏헤어',
  ageYears: 3,
  weightKg: 4.2,
  gender: 'female',
  neutered: true,
}

const FIELD_MAP: Record<string, string> = {
  name: 'name',
  breed: 'breed',
  ageYears: 'age_years',
  birthDate: 'birth_date',
  weightKg: 'weight_kg',
  gender: 'gender',
  neutered: 'neutered',
  photoUri: 'photo_url',
}

function dbRowToCat(row: Record<string, unknown>): Cat {
  return {
    id: row.id as string,
    name: row.name as string,
    breed: (row.breed as string) || '',
    ageYears: (row.age_years as number) || 0,
    birthDate: (row.birth_date as string | null) ?? undefined,
    weightKg: parseFloat(String(row.weight_kg)) || 0,
    gender: row.gender as 'male' | 'female',
    neutered: Boolean(row.neutered),
    photoUri: (row.photo_url as string | null) ?? undefined,
  }
}

const CatsContext = createContext<CatsCtx | null>(null)

export function CatsProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [cats, setCats] = useState<Cat[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!userId) {
      setCats([DEFAULT_CAT])
      setSelectedId(DEFAULT_CAT.id)
      return
    }
    setLoading(true)
    supabase
      .from('cats')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true })
      .then(({ data }) => {
        if (data && data.length > 0) {
          const mapped = data.map(r => dbRowToCat(r as Record<string, unknown>))
          setCats(mapped)
          setSelectedId(mapped[0].id)
        } else {
          setCats([])
          setSelectedId('')
        }
        setLoading(false)
      })
  }, [userId])

  const selectedCat = cats.find(c => c.id === selectedId) ?? cats[0] ?? DEFAULT_CAT

  const addCat = async (c: Omit<Cat, 'id'>) => {
    if (!userId) {
      const newCat: Cat = { ...c, id: Date.now().toString() }
      setCats(prev => [...prev, newCat])
      setSelectedId(newCat.id)
      return
    }
    const { data } = await supabase
      .from('cats')
      .insert({
        user_id: userId,
        name: c.name,
        breed: c.breed,
        age_years: c.ageYears,
        birth_date: c.birthDate ?? null,
        weight_kg: c.weightKg,
        gender: c.gender,
        neutered: c.neutered,
        photo_url: c.photoUri ?? null,
      })
      .select()
      .single()
    if (data) {
      const newCat = dbRowToCat(data as Record<string, unknown>)
      setCats(prev => [...prev, newCat])
      setSelectedId(newCat.id)
    }
  }

  const updateCat = async (id: string, updates: Partial<Omit<Cat, 'id'>>) => {
    setCats(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    if (!userId || id === '__guest__') return

    const dbUpdates: Record<string, unknown> = {}
    for (const [jsKey, dbKey] of Object.entries(FIELD_MAP)) {
      if (jsKey in updates) {
        const val = (updates as Record<string, unknown>)[jsKey]
        dbUpdates[dbKey] = val === undefined ? null : val
      }
    }
    await supabase.from('cats').update(dbUpdates).eq('id', id).eq('user_id', userId)
  }

  const removeCat = async (id: string) => {
    setCats(prev => {
      const next = prev.filter(c => c.id !== id)
      if (selectedId === id && next.length > 0) setSelectedId(next[0].id)
      return next
    })
    if (!userId || id === '__guest__') return
    await supabase.from('cats').delete().eq('id', id).eq('user_id', userId)
  }

  return (
    <CatsContext.Provider value={{
      cats, selectedId, selectedCat, userId, loading,
      selectCat: setSelectedId, addCat, updateCat, removeCat,
    }}>
      {children}
    </CatsContext.Provider>
  )
}

export function useCats() {
  const ctx = useContext(CatsContext)
  if (!ctx) throw new Error('useCats must be used inside CatsProvider')
  return ctx
}
