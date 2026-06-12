import { createContext, useContext, useState, useEffect, useRef, ReactNode } from 'react'
import { Alert, Platform } from 'react-native'
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
  breed: '코리안숏헤어 (고등어)',
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
  const rawDate = row.birth_date as string | null
  return {
    id: row.id as string,
    name: row.name as string,
    breed: (row.breed as string) || '',
    ageYears: (row.age_years as number) || 0,
    birthDate: rawDate ? rawDate.replace(/-/g, '.') : undefined,
    weightKg: parseFloat(String(row.weight_kg)) || 0,
    gender: row.gender as 'male' | 'female',
    neutered: Boolean(row.neutered),
    photoUri: (row.photo_url as string | null) ?? undefined,
  }
}

// 웹에서 blob:/data: URI를 200×200 JPEG data URI로 리사이즈 (DB에 직접 저장)
async function resizePhotoForWeb(photoUri: string | undefined): Promise<string | null> {
  if (!photoUri) return null
  if (!photoUri.startsWith('blob:') && !photoUri.startsWith('data:')) return photoUri

  if (typeof document === 'undefined') return null
  try {
    const img = new window.Image()
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve()
      img.onerror = reject
      img.src = photoUri
    })
    const MAX = 300
    const scale = Math.min(MAX / img.naturalWidth, MAX / img.naturalHeight, 1)
    const w = Math.round(img.naturalWidth * scale)
    const h = Math.round(img.naturalHeight * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
    return canvas.toDataURL('image/jpeg', 0.82)
  } catch (e) {
    console.error('[resizePhoto] error:', e)
    return null
  }
}

const CatsContext = createContext<CatsCtx | null>(null)

export function CatsProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const [cats, setCats] = useState<Cat[]>([])
  const [selectedId, setSelectedId] = useState('')
  const [loading, setLoading] = useState(false)

  // React Compiler stale closure 방지: userId ref를 render마다 갱신
  const userIdRef = useRef(userId)
  userIdRef.current = userId

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
      .then(({ data, error }) => {
        if (error) {
          console.error('[fetchCats] supabase error:', error)
          Alert.alert('불러오기 오류', `고양이 목록을 불러오지 못했습니다.\n${error.message ?? ''}`)
        }
        if (data && data.length > 0) {
          const mapped = data.map(r => dbRowToCat(r as Record<string, unknown>))
          setCats(mapped)
          setSelectedId(mapped[0].id)
        } else if (!error) {
          setCats([])
          setSelectedId('')
        }
        setLoading(false)
      })
  }, [userId])

  const selectedCat = cats.find(c => c.id === selectedId) ?? cats[0] ?? DEFAULT_CAT

  const addCat = async (c: Omit<Cat, 'id'>) => {
    const uid = userIdRef.current
    if (!uid) {
      const newCat: Cat = { ...c, id: Date.now().toString() }
      setCats(prev => [...prev, newCat])
      setSelectedId(newCat.id)
      return
    }
    const tempId = `__temp_${Date.now()}`
    setCats(prev => [...prev, { ...c, id: tempId }])
    setSelectedId(tempId)

    // 웹에서 blob/data URI는 리사이즈해서 data URI로 저장
    const persistedPhotoUrl = Platform.OS === 'web'
      ? await resizePhotoForWeb(c.photoUri)
      : (c.photoUri ?? null)

    const { data, error } = await supabase
      .from('cats')
      .insert({
        user_id: uid,
        name: c.name,
        breed: c.breed,
        age_years: c.ageYears,
        birth_date: c.birthDate ? c.birthDate.replace(/\./g, '-') : null,
        weight_kg: c.weightKg,
        gender: c.gender,
        neutered: c.neutered,
        photo_url: persistedPhotoUrl,
      })
      .select()
      .single()

    if (error) {
      console.error('[addCat] uid:', uid, 'error:', JSON.stringify(error))
      Alert.alert('저장 실패', `고양이 정보를 저장하지 못했습니다.\n오류: ${error.message ?? error.code ?? JSON.stringify(error)}`)
    }
    if (data) {
      const newCat = dbRowToCat(data as Record<string, unknown>)
      const localPhoto = c.photoUri
      setCats(prev => prev.map(cat => cat.id === tempId ? { ...newCat, photoUri: newCat.photoUri ?? localPhoto } : cat))
      setSelectedId(newCat.id)
    }
  }

  const updateCat = async (id: string, updates: Partial<Omit<Cat, 'id'>>) => {
    setCats(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c))
    const uid = userIdRef.current
    if (!uid || id === '__guest__') return

    // 웹에서 사진 업데이트 시 리사이즈
    let resolvedUpdates = { ...updates }
    if (Platform.OS === 'web' && updates.photoUri) {
      const resized = await resizePhotoForWeb(updates.photoUri)
      if (resized) resolvedUpdates = { ...resolvedUpdates, photoUri: resized }
    }

    const dbUpdates: Record<string, unknown> = {}
    for (const [jsKey, dbKey] of Object.entries(FIELD_MAP)) {
      if (jsKey in resolvedUpdates) {
        const val = (resolvedUpdates as Record<string, unknown>)[jsKey]
        dbUpdates[dbKey] = val === undefined ? null : val
      }
    }
    const { error } = await supabase.from('cats').update(dbUpdates).eq('id', id).eq('user_id', uid)
    if (error) console.error('[updateCat] supabase error:', error)
  }

  const removeCat = async (id: string) => {
    const uid = userIdRef.current
    setCats(prev => {
      const next = prev.filter(c => c.id !== id)
      if (selectedId === id && next.length > 0) setSelectedId(next[0].id)
      return next
    })
    if (!uid || id === '__guest__') return
    const { error } = await supabase.from('cats').delete().eq('id', id).eq('user_id', uid)
    if (error) console.error('[removeCat] supabase error:', error)
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
