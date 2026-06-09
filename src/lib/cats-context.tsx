import { createContext, useContext, useState, ReactNode } from 'react'

export type Cat = {
  id: string
  name: string
  breed: string
  ageYears: number
  weightKg: number
  gender: 'male' | 'female'
  neutered: boolean
  photoUri?: string
}

const BREED_PALETTE: { keyword: string; color: string }[] = [
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
  selectCat: (id: string) => void
  addCat: (c: Omit<Cat, 'id'>) => void
  updateCat: (id: string, c: Partial<Omit<Cat, 'id'>>) => void
  removeCat: (id: string) => void
}

const DEFAULT_CATS: Cat[] = [
  { id: '1', name: '나비', breed: '코리안숏헤어', ageYears: 3, weightKg: 4.2, gender: 'female', neutered: true },
]

const CatsContext = createContext<CatsCtx | null>(null)

export function CatsProvider({ children }: { children: ReactNode }) {
  const [cats, setCats] = useState<Cat[]>(DEFAULT_CATS)
  const [selectedId, setSelectedId] = useState(DEFAULT_CATS[0].id)

  const selectedCat = cats.find(c => c.id === selectedId) ?? cats[0]

  const addCat = (c: Omit<Cat, 'id'>) => {
    const newCat = { ...c, id: Date.now().toString() }
    setCats(prev => [...prev, newCat])
    setSelectedId(newCat.id)
  }

  const updateCat = (id: string, updates: Partial<Omit<Cat, 'id'>>) =>
    setCats(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))

  const removeCat = (id: string) => {
    setCats(prev => {
      const next = prev.filter(c => c.id !== id)
      if (selectedId === id && next.length > 0) setSelectedId(next[0].id)
      return next
    })
  }

  return (
    <CatsContext.Provider value={{ cats, selectedId, selectedCat, selectCat: setSelectedId, addCat, updateCat, removeCat }}>
      {children}
    </CatsContext.Provider>
  )
}

export function useCats() {
  const ctx = useContext(CatsContext)
  if (!ctx) throw new Error('useCats must be used inside CatsProvider')
  return ctx
}
