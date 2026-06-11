import { Image, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import * as ImagePicker from 'expo-image-picker'
import BottomSheet from '@/components/bottom-sheet'
import { useCats, catAvatarColor } from '@/lib/cats-context'
import { supabase } from '@/lib/supabase'

const OCR_FUNCTION_URL = 'https://kbjxjogmnwurxbxnpfsz.supabase.co/functions/v1/ocr-blood-test'

type ExamRecord = {
  id: string
  catId: string
  date: string
  type: 'blood' | 'urine'
  metrics: Record<string, number>
}

type MetricDef = { key: string; label: string; unit: string; min: number; max: number }
type MetricGroup = { title: string; items: MetricDef[] }

const BLOOD_GROUPS: MetricGroup[] = [
  {
    title: '기본 수치',
    items: [
      { key: 'glu',  label: 'GLU',  unit: 'mg/dL', min: 74,   max: 152  },
      { key: 'bun',  label: 'BUN',  unit: 'mg/dL', min: 15.0, max: 37.0 },
      { key: 'crea', label: 'CREA', unit: 'mg/dL', min: 0.7,  max: 2.1  },
      { key: 'ca',   label: 'Ca',   unit: 'mg/dL', min: 2.6,  max: 6.4  },
      { key: 'tp',   label: 'TP',   unit: 'g/dL',  min: 5.8,  max: 9.1  },
      { key: 'alb',  label: 'ALB',  unit: 'g/dL',  min: 2.2,  max: 4.1  },
      { key: 'glob', label: 'GLOB', unit: 'g/dL',  min: 2.6,  max: 5.1  },
    ],
  },
  {
    title: '간 수치',
    items: [
      { key: 'alt',  label: 'ALT',  unit: 'U/L',   min: 13,   max: 109  },
      { key: 'alp',  label: 'ALP',  unit: 'U/L',   min: 9,    max: 109  },
      { key: 'ggt',  label: 'GGT',  unit: 'U/L',   min: 0,    max: 5    },
      { key: 'tbil', label: 'TBIL', unit: 'mg/dL', min: 0.00, max: 1.00 },
    ],
  },
  {
    title: '콜레스테롤 / 췌장',
    items: [
      { key: 'chol', label: 'CHOL', unit: 'mg/dL', min: 50,   max: 230  },
      { key: 'amy',  label: 'AMY',  unit: 'U/L',   min: 500,  max: 1400 },
      { key: 'lipa', label: 'LIPA', unit: 'U/L',   min: 0,    max: 30   },
    ],
  },
  {
    title: '특수 검사',
    items: [
      { key: 'ntprobnp', label: 'NT-proBNP', unit: 'pmol/L', min: 0, max: 100 },
      { key: 'saa',      label: 'fSAA',      unit: 'ug/mL',  min: 0, max: 5   },
      { key: 'sdma',     label: 'SDMA',      unit: 'ug/dL',  min: 0, max: 14  },
    ],
  },
]

const ALL_METRICS: MetricDef[] = BLOOD_GROUPS.flatMap(g => g.items)
const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토']

// ─── Calendar ────────────────────────────────────────────────────────────────
function CalendarDropdown({ value, max, onChange }: {
  value: Date; max?: Date; onChange: (d: Date) => void
}) {
  const [vy, setVy] = useState(value.getFullYear())
  const [vm, setVm] = useState(value.getMonth())
  const firstDow = new Date(vy, vm, 1).getDay()
  const dim = new Date(vy, vm + 1, 0).getDate()
  const prev = () => vm === 0 ? (setVm(11), setVy(y => y - 1)) : setVm(m => m - 1)
  const next = () => vm === 11 ? (setVm(0), setVy(y => y + 1)) : setVm(m => m + 1)
  const isSel = (d: number) => value.getFullYear() === vy && value.getMonth() === vm && value.getDate() === d
  const isDis = (d: number) => !!max && new Date(vy, vm, d) > max
  return (
    <View style={calSt.container}>
      <View style={calSt.nav}>
        <TouchableOpacity onPress={prev} hitSlop={10} style={calSt.navBtn}><Feather name="chevron-left" size={18} color="#555" /></TouchableOpacity>
        <Text style={calSt.navTitle}>{vy}년 {vm + 1}월</Text>
        <TouchableOpacity onPress={next} hitSlop={10} style={calSt.navBtn}><Feather name="chevron-right" size={18} color="#555" /></TouchableOpacity>
      </View>
      <View style={calSt.weekRow}>{WEEK_LABELS.map((w, i) => <Text key={w} style={[calSt.weekLabel, i === 0 && calSt.sun, i === 6 && calSt.sat]}>{w}</Text>)}</View>
      <View style={calSt.grid}>
        {Array.from({ length: firstDow }).map((_, i) => <View key={`b${i}`} style={calSt.cell} />)}
        {Array.from({ length: dim }, (_, i) => i + 1).map(d => {
          const col = (firstDow + d - 1) % 7
          const sel = isSel(d), dis = isDis(d)
          return (
            <TouchableOpacity key={d} style={[calSt.cell, sel && calSt.cellSel]}
              onPress={() => !dis && onChange(new Date(vy, vm, d))} disabled={dis} activeOpacity={0.7}>
              <Text style={[calSt.dayText, col === 0 && !sel && calSt.sun, col === 6 && !sel && calSt.sat, sel && calSt.dayTextSel, dis && calSt.dayTextDis]}>{d}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function fmtDate(d: Date) {
  return `${d.getFullYear()}년 ${String(d.getMonth() + 1).padStart(2, '0')}월 ${String(d.getDate()).padStart(2, '0')}일`
}
function toDateStr(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function outOfRange(val: number, def: MetricDef) { return val < def.min || val > def.max }

// ─── Chart ───────────────────────────────────────────────────────────────────
const CHART_H = 110
function MetricBars({ records, defItem, range }: {
  records: ExamRecord[]; defItem: MetricDef; range: 'monthly' | 'yearly'
}) {
  const cutoff = range === 'monthly' ? 30 * 86400000 : 365 * 86400000
  const now = Date.now()
  const pts = records
    .filter(r => r.metrics[defItem.key] != null && now - new Date(r.date).getTime() <= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!pts.length) return <Text style={cst.empty}>기간 내 데이터 없음</Text>
  const vals = pts.map(r => r.metrics[defItem.key])
  const peak = Math.max(...vals, defItem.max) * 1.2
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={cst.chartScroll}>
      {pts.map(r => {
        const val = r.metrics[defItem.key]
        const barH = Math.max(6, (val / peak) * CHART_H)
        const bad = outOfRange(val, defItem)
        const color = bad ? '#E9785A' : '#1D9E75'
        return (
          <View key={r.id} style={cst.barCol}>
            <Text style={[cst.barVal, { color }]}>{val}</Text>
            <View style={cst.barTrack}><View style={[cst.bar, { height: barH, backgroundColor: color }]} /></View>
            <Text style={cst.barDate}>{r.date.slice(5).replace('-', '/')}</Text>
          </View>
        )
      })}
    </ScrollView>
  )
}

// ─── OCR via Supabase Edge Function ──────────────────────────────────────────
async function callOcrFunction(base64: string, mediaType: string): Promise<Record<string, number | null>> {
  const { data: { session } } = await supabase.auth.getSession()
  const res = await fetch(OCR_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}),
    },
    body: JSON.stringify({ imageBase64: base64, mediaType }),
  })
  const json = await res.json() as { metrics?: Record<string, number | null>; error?: string }
  if (!res.ok || json.error) throw new Error(json.error ?? `오류 ${res.status}`)
  return json.metrics ?? {}
}

// ─── Vaccinations ────────────────────────────────────────────────────────────
type Vaccination = {
  id: string
  catId: string
  name: string
  date: string
  nextDate: string | null
  notes: string | null
}

const VACC_PRESETS = [
  '종합백신 3종 (FVRCP)',
  '종합백신 5종 (FVRCP+FeLV+FIV)',
  '광견병 (Rabies)',
  '고양이 백혈병 (FeLV)',
  '고양이 면역결핍 (FIV)',
  '고양이 복막염 (FIP)',
  '클라미디아',
  '보르데텔라',
  '심장사상충 예방',
  '외부기생충 예방 (벼룩·진드기)',
  '직접 입력',
]

type PanelType = 'blood' | 'blood-chart' | 'blood-add' | 'urine' | 'vacc-add' | null

// ─── Main Screen ─────────────────────────────────────────────────────────────
export default function HospitalScreen() {
  const { selectedCat, userId } = useCats()
  const [bloodRecords, setBloodRecords] = useState<ExamRecord[]>([])
  const [panel, setPanel] = useState<PanelType>(null)
  const [chartMetric, setChartMetric] = useState(ALL_METRICS[0].key)
  const [chartRange, setChartRange] = useState<'monthly' | 'yearly'>('yearly')

  // add form
  const [addDate, setAddDate] = useState<Date>(new Date())
  const [showDatePicker, setShowDatePicker] = useState(false)
  const [addMetrics, setAddMetrics] = useState<Record<string, string>>({})

  // ocr
  const [showOcrSheet, setShowOcrSheet] = useState(false)
  const [ocrLoading, setOcrLoading] = useState(false)
  const [ocrError, setOcrError] = useState('')

  // vaccinations
  const [vaccinations, setVaccinations] = useState<Vaccination[]>([])
  const [vaccName, setVaccName] = useState('')
  const [vaccCustomName, setVaccCustomName] = useState('')
  const [vaccDate, setVaccDate] = useState<Date>(new Date())
  const [vaccNextDate, setVaccNextDate] = useState<Date | null>(null)
  const [vaccNotes, setVaccNotes] = useState('')
  const [showVaccDatePicker, setShowVaccDatePicker] = useState(false)
  const [showVaccNextPicker, setShowVaccNextPicker] = useState(false)

  useEffect(() => {
    if (!userId || selectedCat.id === '__guest__') { setBloodRecords([]); setVaccinations([]); return }
    supabase
      .from('exam_records')
      .select('*')
      .eq('cat_id', selectedCat.id)
      .eq('type', 'blood')
      .order('date', { ascending: false })
      .then(({ data }) => {
        setBloodRecords((data ?? []).map(r => ({
          id: r.id as string,
          catId: r.cat_id as string,
          date: r.date as string,
          type: r.type as 'blood' | 'urine',
          metrics: r.metrics as Record<string, number>,
        })))
      })
    supabase
      .from('vaccinations')
      .select('*')
      .eq('cat_id', selectedCat.id)
      .order('date', { ascending: false })
      .then(({ data }) => {
        setVaccinations((data ?? []).map(r => ({
          id: r.id as string,
          catId: r.cat_id as string,
          name: r.name as string,
          date: r.date as string,
          nextDate: r.next_date as string | null,
          notes: r.notes as string | null,
        })))
      })
  }, [selectedCat.id, userId])

  const openAdd = () => {
    setAddDate(new Date()); setShowDatePicker(false); setAddMetrics({}); setOcrError(''); setPanel('blood-add')
  }

  const openVaccAdd = () => {
    setVaccName(''); setVaccCustomName(''); setVaccDate(new Date())
    setVaccNextDate(null); setVaccNotes(''); setShowVaccDatePicker(false); setShowVaccNextPicker(false)
    setPanel('vacc-add')
  }

  const saveVaccination = async () => {
    const finalName = vaccName === '직접 입력' ? vaccCustomName.trim() : vaccName
    if (!finalName) return
    const dateStr = toDateStr(vaccDate)
    const nextStr = vaccNextDate ? toDateStr(vaccNextDate) : null
    const newV: Vaccination = { id: '', catId: selectedCat.id, name: finalName, date: dateStr, nextDate: nextStr, notes: vaccNotes.trim() || null }
    if (!userId || selectedCat.id === '__guest__') {
      newV.id = Date.now().toString()
      setVaccinations(prev => [newV, ...prev])
    } else {
      const { data } = await supabase
        .from('vaccinations')
        .insert({ cat_id: selectedCat.id, user_id: userId, name: finalName, date: dateStr, next_date: nextStr, notes: vaccNotes.trim() || null })
        .select().single()
      if (data) { newV.id = data.id as string; setVaccinations(prev => [newV, ...prev]) }
    }
    setPanel(null)
  }

  const deleteVaccination = async (id: string) => {
    setVaccinations(prev => prev.filter(v => v.id !== id))
    if (userId && selectedCat.id !== '__guest__') {
      await supabase.from('vaccinations').delete().eq('id', id)
    }
  }

  const saveBloodRecord = async () => {
    const dateStr = toDateStr(addDate)
    const metrics: Record<string, number> = {}
    ALL_METRICS.forEach(m => { const v = parseFloat(addMetrics[m.key] ?? ''); if (!isNaN(v)) metrics[m.key] = v })
    const newRec: ExamRecord = { id: '', catId: selectedCat.id, date: dateStr, type: 'blood', metrics }
    if (!userId || selectedCat.id === '__guest__') {
      newRec.id = Date.now().toString()
      setBloodRecords(prev => [newRec, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    } else {
      const { data } = await supabase
        .from('exam_records')
        .insert({ cat_id: selectedCat.id, user_id: userId, date: dateStr, type: 'blood', metrics })
        .select().single()
      if (data) {
        newRec.id = data.id as string
        setBloodRecords(prev => [newRec, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      }
    }
    setPanel('blood')
  }

  // ── OCR helpers ──
  const handleImagePicked = async (result: ImagePicker.ImagePickerResult) => {
    setShowOcrSheet(false)
    if (result.canceled || !result.assets?.[0]) return
    const asset = result.assets[0]
    if (!asset.base64) { setOcrError('이미지를 불러오지 못했어요.'); return }
    setOcrLoading(true); setOcrError('')
    try {
      const metrics = await callOcrFunction(asset.base64, asset.mimeType ?? 'image/jpeg')
      const filled: Record<string, string> = {}
      Object.entries(metrics).forEach(([k, v]) => { if (v !== null) filled[k] = String(v) })
      setAddMetrics(filled)
    } catch (e: unknown) {
      setOcrError(e instanceof Error ? e.message : '오류가 발생했어요.')
    } finally {
      setOcrLoading(false)
    }
  }

  const launchCamera = async () => {
    const perm = await ImagePicker.requestCameraPermissionsAsync()
    if (!perm.granted) { setOcrError('카메라 권한이 필요해요.'); setShowOcrSheet(false); return }
    const result = await ImagePicker.launchCameraAsync({ base64: true, quality: 0.7 })
    await handleImagePicked(result)
  }

  const launchGallery = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', base64: true, quality: 0.7 })
    await handleImagePicked(result)
  }

  const chartDef = ALL_METRICS.find(m => m.key === chartMetric) ?? ALL_METRICS[0]
  const lastBlood = bloodRecords[0] ?? null

  return (
    <SafeAreaView style={st.safe} edges={['top']}>
      {/* Cat header */}
      <View style={st.catHeader}>
        {selectedCat.photoUri ? (
          <Image source={{ uri: selectedCat.photoUri }} style={st.catAvatar} />
        ) : (
          <View style={[st.catAvatar, { backgroundColor: catAvatarColor(selectedCat) + '22', alignItems: 'center', justifyContent: 'center' }]}>
            <FontAwesome5 name="cat" size={20} color={catAvatarColor(selectedCat)} />
          </View>
        )}
        <View>
          <Text style={st.catName}>{selectedCat.name}</Text>
          <Text style={st.catInfo}>{selectedCat.breed} · {selectedCat.ageYears}살</Text>
        </View>
      </View>

      <ScrollView style={st.scroll} contentContainerStyle={st.content}>
        <View style={st.aiCard}>
          <View style={st.aiRow}>
            <View style={st.aiBadge}><Text style={st.aiBadgeText}>AI</Text></View>
            <Text style={st.aiTitle}>진료 녹음 자동 요약</Text>
          </View>
          <Text style={st.aiBody}>수의사 동의 후 진료 중 녹음하면 진료 내용을 자동으로 텍스트로 변환하고 핵심 내용을 요약해 기록합니다.</Text>
          <View style={st.aiActions}>
            <TouchableOpacity style={st.outlineBtn}><Feather name="mic" size={13} color="#534AB7" /><Text style={st.outlineBtnText}>녹음 시작</Text></TouchableOpacity>
            <TouchableOpacity style={st.outlineBtn}><Feather name="file-text" size={13} color="#534AB7" /><Text style={st.outlineBtnText}>지난 요약 보기</Text></TouchableOpacity>
          </View>
        </View>

        <Text style={st.sectionTitle}>검사 기록</Text>
        <TouchableOpacity style={st.examCard} onPress={() => setPanel('blood')}>
          <View style={[st.examIcon, { backgroundColor: '#FAECE7' }]}><Feather name="droplet" size={20} color="#D94040" /></View>
          <View style={st.examBody}>
            <Text style={st.examName}>혈액 검사</Text>
            {lastBlood ? (
              <>
                <Text style={st.examSub}>최근: {lastBlood.date}</Text>
                <View style={st.chips}>
                  {['alt', 'bun', 'crea', 'chol', 'ntprobnp', 'sdma'].map(key => {
                    const def = ALL_METRICS.find(m => m.key === key)
                    const val = lastBlood.metrics[key]
                    if (!def || val == null) return null
                    const bad = outOfRange(val, def)
                    return <View key={key} style={[st.chip, bad && st.chipBad]}><Text style={[st.chipText, bad && st.chipTextBad]}>{def.label} {val}</Text></View>
                  })}
                </View>
              </>
            ) : (
              <Text style={st.examSub}>기록 없음 · 탭하여 추가</Text>
            )}
          </View>
          <Feather name="chevron-right" size={18} color="#ccc" />
        </TouchableOpacity>

        <TouchableOpacity style={st.examCard} onPress={() => setPanel('urine')}>
          <View style={[st.examIcon, { backgroundColor: '#FAEEDA' }]}><Feather name="thermometer" size={20} color="#BA7517" /></View>
          <View style={st.examBody}><Text style={st.examName}>소변 검사</Text><Text style={st.examSub}>기록 없음 · 탭하여 추가</Text></View>
          <Feather name="chevron-right" size={18} color="#ccc" />
        </TouchableOpacity>

        <View style={st.sectionRow}>
          <Text style={st.sectionTitle}>접종 체크</Text>
          <TouchableOpacity style={st.sectionAddBtn} onPress={openVaccAdd}>
            <Feather name="plus" size={14} color="#1D9E75" />
            <Text style={st.sectionAddText}>추가</Text>
          </TouchableOpacity>
        </View>
        <View style={st.vaccCard}>
          {vaccinations.length === 0 && (
            <TouchableOpacity style={st.vaccEmpty} onPress={openVaccAdd}>
              <Text style={st.vaccEmptyText}>+ 접종 기록을 추가해보세요</Text>
            </TouchableOpacity>
          )}
          {vaccinations.map((v, i) => {
            const today = new Date().toISOString().slice(0, 10)
            const isDue = !v.nextDate || v.nextDate >= today
            return (
              <View key={v.id} style={[st.vaccItem, i < vaccinations.length - 1 && st.vaccBorder]}>
                <View style={[st.vaccDot, st.vaccDotDone]}>
                  <Feather name="check" size={12} color="#1D9E75" />
                </View>
                <View style={st.vaccBody}>
                  <Text style={st.vaccName}>{v.name}</Text>
                  <Text style={st.vaccDetail}>
                    접종일: {v.date}
                    {v.nextDate ? `  ·  다음 접종: ${v.nextDate}` : ''}
                  </Text>
                  {v.notes ? <Text style={st.vaccNoteText}>{v.notes}</Text> : null}
                </View>
                {v.nextDate && v.nextDate <= today && (
                  <View style={st.vaccDueBadge}><Text style={st.vaccDueBadgeText}>접종 필요</Text></View>
                )}
                <TouchableOpacity onPress={() => deleteVaccination(v.id)} hitSlop={10} style={{ padding: 4 }}>
                  <Feather name="trash-2" size={14} color="#ddd" />
                </TouchableOpacity>
              </View>
            )
          })}
        </View>
      </ScrollView>

      {/* ── 혈액 검사 목록 ── */}
      <BottomSheet visible={panel === 'blood'} onClose={() => setPanel(null)} title="혈액 검사 기록">
        <View style={st.panelBtns}>
          <TouchableOpacity style={st.panelBtn} onPress={() => setPanel('blood-chart')}>
            <Feather name="trending-up" size={14} color="#534AB7" /><Text style={st.panelBtnText}>수치 그래프</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.panelBtn, st.panelBtnAdd]} onPress={openAdd}>
            <Feather name="plus" size={14} color="#fff" /><Text style={[st.panelBtnText, { color: '#fff' }]}>기록 추가</Text>
          </TouchableOpacity>
        </View>
        {!bloodRecords.length && <Text style={st.emptyMsg}>아직 기록이 없어요.</Text>}
        {bloodRecords.map((r, i) => (
          <View key={r.id} style={[st.recordRow, i < bloodRecords.length - 1 && st.recordBorder]}>
            <Text style={st.recordDate}>{r.date}</Text>
            <View style={st.chips}>
              {ALL_METRICS.map(m => {
                const val = r.metrics[m.key]
                if (val == null) return null
                const bad = outOfRange(val, m)
                return <View key={m.key} style={[st.chip, bad && st.chipBad]}><Text style={[st.chipText, bad && st.chipTextBad]}>{m.label} {val}</Text></View>
              })}
            </View>
          </View>
        ))}
      </BottomSheet>

      {/* ── 수치 그래프 ── */}
      <BottomSheet visible={panel === 'blood-chart'} onClose={() => setPanel('blood')} title="수치 그래프">
        <View style={st.rangeRow}>
          {(['monthly', 'yearly'] as const).map(r => (
            <TouchableOpacity key={r} style={[st.rangeBtn, chartRange === r && st.rangeBtnActive]} onPress={() => setChartRange(r)}>
              <Text style={[st.rangeBtnText, chartRange === r && st.rangeBtnTextActive]}>{r === 'monthly' ? '최근 1개월' : '최근 1년'}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={st.metricTabs}>
            {ALL_METRICS.map(m => (
              <TouchableOpacity key={m.key} style={[st.metricTab, chartMetric === m.key && st.metricTabActive]} onPress={() => setChartMetric(m.key)}>
                <Text style={[st.metricTabText, chartMetric === m.key && st.metricTabTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        <Text style={st.normalRange}>정상 범위: {chartDef.min}–{chartDef.max} {chartDef.unit}</Text>
        <MetricBars records={bloodRecords} defItem={chartDef} range={chartRange} />
      </BottomSheet>

      {/* ── 기록 추가 ── */}
      <BottomSheet visible={panel === 'blood-add'} onClose={() => setPanel('blood')} title="혈액 검사 기록 추가">
        {/* OCR 자동 입력 버튼 */}
        <TouchableOpacity
          style={[st.ocrBtn, ocrLoading && st.ocrBtnLoading]}
          onPress={() => { setOcrError(''); setShowOcrSheet(true) }}
          disabled={ocrLoading}
        >
          {ocrLoading
            ? <ActivityIndicator size="small" color="#fff" />
            : <Feather name="camera" size={16} color="#fff" />}
          <Text style={st.ocrBtnText}>{ocrLoading ? 'OCR 분석 중...' : '검사지 촬영으로 자동 입력'}</Text>
        </TouchableOpacity>
        {!!ocrError && <Text style={st.ocrError}>{ocrError}</Text>}

        <Text style={[st.fieldLabel, { marginTop: 12 }]}>검사일</Text>
        <TouchableOpacity style={[st.dateBtn, showDatePicker && st.dateBtnOpen]} onPress={() => setShowDatePicker(v => !v)}>
          <Feather name="calendar" size={15} color="#888" />
          <Text style={st.dateBtnText}>{fmtDate(addDate)}</Text>
          <Feather name={showDatePicker ? 'chevron-up' : 'chevron-down'} size={14} color="#aaa" />
        </TouchableOpacity>
        {showDatePicker && <CalendarDropdown value={addDate} max={new Date()} onChange={d => { setAddDate(d); setShowDatePicker(false) }} />}

        <Text style={[st.fieldLabel, { marginTop: 16 }]}>수치 입력 (비워두면 생략)</Text>
        {BLOOD_GROUPS.map(group => (
          <View key={group.title}>
            <Text style={st.groupLabel}>{group.title}</Text>
            {group.items.map(m => (
              <View key={m.key} style={st.metricInputRow}>
                <Text style={st.metricLabel}>{m.label}<Text style={st.metricUnit}> {m.unit}</Text></Text>
                <TextInput
                  style={[st.metricInput, !!addMetrics[m.key] && st.metricInputFilled]}
                  placeholder={`${m.min}–${m.max}`} placeholderTextColor="#ccc"
                  value={addMetrics[m.key] ?? ''}
                  onChangeText={v => setAddMetrics(p => ({ ...p, [m.key]: v }))}
                  keyboardType="decimal-pad"
                />
              </View>
            ))}
          </View>
        ))}
        <TouchableOpacity style={st.saveBtn} onPress={saveBloodRecord}>
          <Text style={st.saveBtnText}>저장</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* ── 소변 검사 ── */}
      <BottomSheet visible={panel === 'urine'} onClose={() => setPanel(null)} title="소변 검사 기록">
        <Text style={st.emptyMsg}>아직 기록이 없어요.</Text>
      </BottomSheet>

      {/* ── 접종 추가 ── */}
      <BottomSheet visible={panel === 'vacc-add'} onClose={() => setPanel(null)} title="접종 기록 추가">
        <Text style={st.fieldLabel}>백신 종류</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 12 }}
          contentContainerStyle={{ flexDirection: 'row', gap: 8, paddingRight: 8 }}
        >
          {VACC_PRESETS.map(p => (
            <TouchableOpacity key={p}
              style={[st.presetChip, vaccName === p && st.presetChipActive]}
              onPress={() => setVaccName(p)}>
              <Text style={[st.presetChipText, vaccName === p && st.presetChipTextActive]}>{p}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
        {vaccName === '직접 입력' && (
          <TextInput
            style={[st.metricInput, { width: '100%', textAlign: 'left', marginBottom: 12, paddingHorizontal: 14, paddingVertical: 12 }]}
            placeholder="백신 이름 입력"
            placeholderTextColor="#ccc"
            value={vaccCustomName}
            onChangeText={setVaccCustomName}
          />
        )}

        <Text style={st.fieldLabel}>접종일</Text>
        <TouchableOpacity style={[st.dateBtn, showVaccDatePicker && st.dateBtnOpen]} onPress={() => setShowVaccDatePicker(v => !v)}>
          <Feather name="calendar" size={15} color="#888" />
          <Text style={st.dateBtnText}>{fmtDate(vaccDate)}</Text>
          <Feather name={showVaccDatePicker ? 'chevron-up' : 'chevron-down'} size={14} color="#aaa" />
        </TouchableOpacity>
        {showVaccDatePicker && (
          <CalendarDropdown value={vaccDate} max={new Date()} onChange={d => { setVaccDate(d); setShowVaccDatePicker(false) }} />
        )}

        <Text style={[st.fieldLabel, { marginTop: 14 }]}>다음 접종 예정일 <Text style={{ color: '#ccc', fontWeight: '400' }}>(선택)</Text></Text>
        <TouchableOpacity style={[st.dateBtn, showVaccNextPicker && st.dateBtnOpen]} onPress={() => setShowVaccNextPicker(v => !v)}>
          <Feather name="calendar" size={15} color="#888" />
          <Text style={[st.dateBtnText, !vaccNextDate && { color: '#ccc' }]}>
            {vaccNextDate ? fmtDate(vaccNextDate) : '날짜 선택 안 함'}
          </Text>
          <Feather name={showVaccNextPicker ? 'chevron-up' : 'chevron-down'} size={14} color="#aaa" />
        </TouchableOpacity>
        {showVaccNextPicker && (
          <CalendarDropdown value={vaccNextDate ?? new Date()} onChange={d => { setVaccNextDate(d); setShowVaccNextPicker(false) }} />
        )}

        <Text style={[st.fieldLabel, { marginTop: 14 }]}>메모 <Text style={{ color: '#ccc', fontWeight: '400' }}>(선택)</Text></Text>
        <TextInput
          style={[st.metricInput, { width: '100%', textAlign: 'left', paddingHorizontal: 14, paddingVertical: 12, minHeight: 70 }]}
          placeholder="예: 이상반응 없음"
          placeholderTextColor="#ccc"
          value={vaccNotes}
          onChangeText={setVaccNotes}
          multiline
        />

        <TouchableOpacity
          style={[st.saveBtn, { marginTop: 20, opacity: !vaccName || (vaccName === '직접 입력' && !vaccCustomName.trim()) ? 0.4 : 1 }]}
          onPress={saveVaccination}
          disabled={!vaccName || (vaccName === '직접 입력' && !vaccCustomName.trim())}
        >
          <Text style={st.saveBtnText}>저장</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* ── OCR 소스 선택 시트 ── */}
      <Modal transparent visible={showOcrSheet} animationType="slide" onRequestClose={() => setShowOcrSheet(false)}>
        <TouchableOpacity style={st.sheetOverlay} activeOpacity={1} onPress={() => setShowOcrSheet(false)}>
          <View style={st.ocrSheet}>
            <Text style={st.ocrSheetTitle}>검사지 불러오기</Text>
            <TouchableOpacity style={st.ocrSourceBtn} onPress={launchCamera}>
              <View style={[st.ocrSourceIcon, { backgroundColor: '#E8F9F0' }]}>
                <Feather name="camera" size={22} color="#1D9E75" />
              </View>
              <View>
                <Text style={st.ocrSourceLabel}>카메라 촬영</Text>
                <Text style={st.ocrSourceSub}>지금 바로 검사지를 찍어요</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={st.ocrSourceBtn} onPress={launchGallery}>
              <View style={[st.ocrSourceIcon, { backgroundColor: '#EEF0FE' }]}>
                <Feather name="image" size={22} color="#534AB7" />
              </View>
              <View>
                <Text style={st.ocrSourceLabel}>갤러리에서 선택</Text>
                <Text style={st.ocrSourceSub}>저장된 사진을 불러와요</Text>
              </View>
            </TouchableOpacity>
            <TouchableOpacity style={st.ocrCancelBtn} onPress={() => setShowOcrSheet(false)}>
              <Text style={st.ocrCancelText}>취소</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

    </SafeAreaView>
  )
}

// ─── Styles ──────────────────────────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F5' },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#EEE', backgroundColor: '#fff' },
  catAvatar: { width: 42, height: 42, borderRadius: 21 },
  catName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  catInfo: { fontSize: 12, color: '#999', marginTop: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  aiCard: { backgroundColor: '#EEEDFE', borderWidth: 0.5, borderColor: '#AFA9EC', borderRadius: 14, padding: 16, marginBottom: 16 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  aiBadge: { backgroundColor: '#534AB7', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  aiBadgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  aiTitle: { fontSize: 14, fontWeight: '600', color: '#26215C' },
  aiBody: { fontSize: 13, color: '#534AB7', lineHeight: 20 },
  aiActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 0.5, borderColor: '#534AB7', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  outlineBtnText: { fontSize: 12, color: '#534AB7', fontWeight: '500' },
  examCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 0.5, borderColor: '#EBEBEB' },
  examIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  examBody: { flex: 1 },
  examName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  examSub: { fontSize: 12, color: '#999', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chip: { backgroundColor: '#F0FBF6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  chipBad: { backgroundColor: '#FEF0EC' },
  chipText: { fontSize: 10, color: '#1D9E75', fontWeight: '500' },
  chipTextBad: { color: '#E9785A' },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, marginTop: 4 },
  sectionAddBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionAddText: { fontSize: 13, color: '#1D9E75', fontWeight: '600' },
  vaccCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#EBEBEB', paddingHorizontal: 16 },
  vaccEmpty: { paddingVertical: 20, alignItems: 'center' },
  vaccEmptyText: { fontSize: 13, color: '#ccc' },
  vaccItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  vaccBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  vaccDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  vaccDotDone: { backgroundColor: '#E1F5EE' },
  vaccDotDue: { backgroundColor: '#FAEEDA' },
  vaccBody: { flex: 1 },
  vaccName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  vaccDetail: { fontSize: 11, color: '#999', marginTop: 2 },
  vaccNoteText: { fontSize: 11, color: '#aaa', marginTop: 2 },
  vaccDueBadge: { backgroundColor: '#FEF0EC', borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3, marginRight: 4 },
  vaccDueBadgeText: { fontSize: 10, color: '#E9785A', fontWeight: '600' },
  presetChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 0.5, borderColor: '#E5E5E5', backgroundColor: '#F7F7F7' },
  presetChipActive: { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  presetChipText: { fontSize: 13, color: '#888', fontWeight: '500' },
  presetChipTextActive: { color: '#fff', fontWeight: '700' },
  panelBtns: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  panelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 0.5, borderColor: '#534AB7' },
  panelBtnText: { fontSize: 13, color: '#534AB7', fontWeight: '600' },
  panelBtnAdd: { backgroundColor: '#E9785A', borderColor: '#E9785A' },
  emptyMsg: { textAlign: 'center', color: '#bbb', fontSize: 13, paddingVertical: 24 },
  recordRow: { paddingVertical: 12 },
  recordBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F5F5F5' },
  recordDate: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 },
  rangeRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  rangeBtn: { flex: 1, paddingVertical: 8, borderRadius: 8, borderWidth: 0.5, borderColor: '#E5E5E5', alignItems: 'center' },
  rangeBtnActive: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
  rangeBtnText: { fontSize: 13, color: '#888', fontWeight: '500' },
  rangeBtnTextActive: { color: '#fff', fontWeight: '700' },
  metricTabs: { flexDirection: 'row', gap: 6 },
  metricTab: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 0.5, borderColor: '#E5E5E5', backgroundColor: '#F7F7F7' },
  metricTabActive: { backgroundColor: '#534AB7', borderColor: '#534AB7' },
  metricTabText: { fontSize: 12, color: '#888', fontWeight: '500' },
  metricTabTextActive: { color: '#fff', fontWeight: '700' },
  normalRange: { fontSize: 12, color: '#888', marginBottom: 10 },
  // add form
  ocrBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#1D9E75', borderRadius: 12, paddingVertical: 13, marginBottom: 4 },
  ocrBtnLoading: { backgroundColor: '#68C9A8' },
  ocrBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  ocrError: { fontSize: 12, color: '#E9785A', textAlign: 'center', marginTop: 4, marginBottom: 4 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 8 },
  groupLabel: { fontSize: 11, fontWeight: '700', color: '#aaa', textTransform: 'uppercase', letterSpacing: 0.6, marginTop: 16, marginBottom: 4 },
  dateBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F7F7F7', borderRadius: 10, borderWidth: 0.5, borderColor: '#E5E5E5', paddingHorizontal: 14, paddingVertical: 12 },
  dateBtnOpen: { borderColor: '#D94040', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  dateBtnText: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  metricInputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#F5F5F5' },
  metricLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#444' },
  metricUnit: { fontSize: 11, color: '#aaa', fontWeight: '400' },
  metricInput: { width: 100, textAlign: 'right', fontSize: 14, color: '#1a1a1a', backgroundColor: '#F7F7F7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  metricInputFilled: { backgroundColor: '#E8F5F0', color: '#1D9E75' },
  saveBtn: { backgroundColor: '#E9785A', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  // ocr source sheet
  sheetOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  ocrSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  ocrSheetTitle: { fontSize: 16, fontWeight: '700', color: '#1a1a1a', marginBottom: 20, textAlign: 'center' },
  ocrSourceBtn: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#F5F5F5' },
  ocrSourceIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  ocrSourceLabel: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  ocrSourceSub: { fontSize: 12, color: '#999', marginTop: 2 },
  ocrCancelBtn: { marginTop: 16, paddingVertical: 12, alignItems: 'center' },
  ocrCancelText: { fontSize: 14, color: '#999', fontWeight: '500' },
})

const cst = StyleSheet.create({
  chartScroll: { paddingBottom: 4, gap: 8, flexDirection: 'row', alignItems: 'flex-end' },
  barCol: { alignItems: 'center', width: 44 },
  barVal: { fontSize: 11, fontWeight: '600', marginBottom: 4 },
  barTrack: { width: 28, height: CHART_H, justifyContent: 'flex-end' },
  bar: { width: 28, borderRadius: 4 },
  barDate: { fontSize: 10, color: '#aaa', marginTop: 6 },
  empty: { textAlign: 'center', color: '#bbb', fontSize: 13, paddingVertical: 20 },
})

const calSt = StyleSheet.create({
  container: { borderWidth: 0.5, borderColor: '#D94040', borderTopWidth: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, backgroundColor: '#fff', paddingHorizontal: 8, paddingBottom: 8, marginBottom: 4 },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  navBtn: { padding: 4 },
  navTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#999', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  cellSel: { backgroundColor: '#D94040' },
  dayText: { fontSize: 13, color: '#333' },
  dayTextSel: { color: '#fff', fontWeight: '700' },
  dayTextDis: { color: '#ddd' },
  sun: { color: '#E9785A' },
  sat: { color: '#5B8ECC' },
})
