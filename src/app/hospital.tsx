import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import BottomSheet from '@/components/bottom-sheet'
import { useCats, catAvatarColor } from '@/lib/cats-context'
import { supabase } from '@/lib/supabase'

// ─── Types ───────────────────────────────────────────────
type ExamRecord = {
  id: string
  catId: string
  date: string   // 'YYYY-MM-DD'
  type: 'blood' | 'urine'
  metrics: Record<string, number>
}

type MetricDef = { key: string; label: string; unit: string; min: number; max: number }

// ─── Metric definitions (고양이 기준 정상 범위) ────────────
const BLOOD_METRICS: MetricDef[] = [
  { key: 'bun',        label: 'BUN',     unit: 'mg/dL', min: 14,   max: 36   },
  { key: 'creatinine', label: 'Cre',     unit: 'mg/dL', min: 0.8,  max: 2.4  },
  { key: 'alt',        label: 'ALT',     unit: 'U/L',   min: 12,   max: 45   },
  { key: 'ast',        label: 'AST',     unit: 'U/L',   min: 10,   max: 40   },
  { key: 'glucose',    label: 'Glucose', unit: 'mg/dL', min: 70,   max: 150  },
  { key: 'phosphorus', label: 'P',       unit: 'mg/dL', min: 3.0,  max: 6.0  },
  { key: 'potassium',  label: 'K',       unit: 'mEq/L', min: 3.5,  max: 5.8  },
]


const VACCINATIONS = [
  { name: '종합백신 (FVRCP)', detail: '2025년 3월 5일 · 다음 접종 2026년 3월', done: true },
  { name: '광견병 백신',       detail: '2025년 3월 5일 · 다음 접종 2026년 3월', done: true },
  { name: '고양이 백혈병 (FeLV)', detail: '접종 예정 · 다음 방문 시 수의사 상담', done: false },
]

// ─── Helpers ─────────────────────────────────────────────
function outOfRange(val: number, def: MetricDef) { return val < def.min || val > def.max }

// ─── Bar chart ───────────────────────────────────────────
const CHART_H = 110

function MetricBars({ records, defItem, range }: {
  records: ExamRecord[]
  defItem: MetricDef
  range: 'monthly' | 'yearly'
}) {
  const cutoffMs = range === 'monthly' ? 30 * 86400000 : 365 * 86400000
  const now = Date.now()
  const pts = records
    .filter(r => r.metrics[defItem.key] != null && now - new Date(r.date).getTime() <= cutoffMs)
    .sort((a, b) => a.date.localeCompare(b.date))

  if (pts.length === 0) {
    return <Text style={cst.empty}>기간 내 데이터 없음</Text>
  }

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
            <View style={cst.barTrack}>
              <View style={[cst.bar, { height: barH, backgroundColor: color }]} />
            </View>
            <Text style={cst.barDate}>{r.date.slice(5).replace('-', '/')}</Text>
          </View>
        )
      })}
    </ScrollView>
  )
}

// ─── Screen ───────────────────────────────────────────────
type PanelType = 'blood' | 'blood-chart' | 'blood-add' | 'urine' | null

export default function HospitalScreen() {
  const { selectedCat, userId } = useCats()
  const [bloodRecords, setBloodRecords] = useState<ExamRecord[]>([])
  const [panel, setPanel] = useState<PanelType>(null)
  const [chartMetric, setChartMetric] = useState(BLOOD_METRICS[0].key)
  const [chartRange, setChartRange] = useState<'monthly' | 'yearly'>('yearly')
  const [addDate, setAddDate] = useState('')
  const [addMetrics, setAddMetrics] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!userId || selectedCat.id === '__guest__') { setBloodRecords([]); return }
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
  }, [selectedCat.id, userId])

  const lastBlood = bloodRecords[0] ?? null

  const saveBloodRecord = async () => {
    if (!addDate) return
    const metrics: Record<string, number> = {}
    BLOOD_METRICS.forEach(m => {
      const v = parseFloat(addMetrics[m.key] ?? '')
      if (!isNaN(v)) metrics[m.key] = v
    })
    const newRec: ExamRecord = { id: '', catId: selectedCat.id, date: addDate, type: 'blood', metrics }

    if (!userId || selectedCat.id === '__guest__') {
      newRec.id = Date.now().toString()
      setBloodRecords(prev => [newRec, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    } else {
      const { data } = await supabase
        .from('exam_records')
        .insert({ cat_id: selectedCat.id, user_id: userId, date: addDate, type: 'blood', metrics })
        .select()
        .single()
      if (data) {
        newRec.id = data.id as string
        setBloodRecords(prev => [newRec, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      }
    }
    setAddDate(''); setAddMetrics({})
    setPanel('blood')
  }

  const chartDef = BLOOD_METRICS.find(m => m.key === chartMetric) ?? BLOOD_METRICS[0]

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
        {/* AI recording card */}
        <View style={st.aiCard}>
          <View style={st.aiRow}>
            <View style={st.aiBadge}><Text style={st.aiBadgeText}>AI</Text></View>
            <Text style={st.aiTitle}>진료 녹음 자동 요약</Text>
          </View>
          <Text style={st.aiBody}>수의사 동의 후 진료 중 녹음하면 진료 내용을 자동으로 텍스트로 변환하고 핵심 내용을 요약해 기록합니다.</Text>
          <View style={st.aiActions}>
            <TouchableOpacity style={st.outlineBtn}>
              <Feather name="mic" size={13} color="#534AB7" />
              <Text style={st.outlineBtnText}>녹음 시작</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.outlineBtn}>
              <Feather name="file-text" size={13} color="#534AB7" />
              <Text style={st.outlineBtnText}>지난 요약 보기</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={st.sectionTitle}>검사 기록</Text>

        {/* Blood card */}
        <TouchableOpacity style={st.examCard} onPress={() => setPanel('blood')}>
          <View style={[st.examIcon, { backgroundColor: '#FAECE7' }]}>
            <Feather name="droplet" size={20} color="#D94040" />
          </View>
          <View style={st.examBody}>
            <Text style={st.examName}>혈액 검사</Text>
            {lastBlood ? (
              <>
                <Text style={st.examSub}>최근: {lastBlood.date}</Text>
                <View style={st.chips}>
                  {BLOOD_METRICS.slice(0, 4).map(m => {
                    const val = lastBlood.metrics[m.key]
                    if (val == null) return null
                    const bad = outOfRange(val, m)
                    return (
                      <View key={m.key} style={[st.chip, bad && st.chipBad]}>
                        <Text style={[st.chipText, bad && st.chipTextBad]}>{m.label} {val}</Text>
                      </View>
                    )
                  })}
                </View>
              </>
            ) : (
              <Text style={st.examSub}>기록 없음 · 탭하여 추가</Text>
            )}
          </View>
          <Feather name="chevron-right" size={18} color="#ccc" />
        </TouchableOpacity>

        {/* Urine card */}
        <TouchableOpacity style={st.examCard} onPress={() => setPanel('urine')}>
          <View style={[st.examIcon, { backgroundColor: '#FAEEDA' }]}>
            <Feather name="thermometer" size={20} color="#BA7517" />
          </View>
          <View style={st.examBody}>
            <Text style={st.examName}>소변 검사</Text>
            <Text style={st.examSub}>기록 없음 · 탭하여 추가</Text>
          </View>
          <Feather name="chevron-right" size={18} color="#ccc" />
        </TouchableOpacity>

        <Text style={st.sectionTitle}>접종 체크</Text>
        <View style={st.vaccCard}>
          {VACCINATIONS.map((v, i) => (
            <View key={v.name} style={[st.vaccItem, i < VACCINATIONS.length - 1 && st.vaccBorder]}>
              <View style={[st.vaccDot, v.done ? st.vaccDotDone : st.vaccDotDue]}>
                <Feather name={v.done ? 'check' : 'clock'} size={12} color={v.done ? '#1D9E75' : '#BA7517'} />
              </View>
              <View style={st.vaccBody}>
                <Text style={st.vaccName}>{v.name}</Text>
                <Text style={st.vaccDetail}>{v.detail}</Text>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>

      {/* ── 혈액 검사 기록 목록 panel ── */}
      <BottomSheet visible={panel === 'blood'} onClose={() => setPanel(null)} title="혈액 검사 기록">
        <View style={st.panelBtns}>
          <TouchableOpacity style={st.panelBtn} onPress={() => setPanel('blood-chart')}>
            <Feather name="trending-up" size={14} color="#534AB7" />
            <Text style={st.panelBtnText}>수치 그래프</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.panelBtn, st.panelBtnAdd]} onPress={() => setPanel('blood-add')}>
            <Feather name="plus" size={14} color="#fff" />
            <Text style={[st.panelBtnText, { color: '#fff' }]}>기록 추가</Text>
          </TouchableOpacity>
        </View>
        {bloodRecords.length === 0 && <Text style={st.emptyMsg}>아직 기록이 없어요.</Text>}
        {bloodRecords.map((r, i) => (
          <View key={r.id} style={[st.recordRow, i < bloodRecords.length - 1 && st.recordBorder]}>
            <Text style={st.recordDate}>{r.date}</Text>
            <View style={st.chips}>
              {BLOOD_METRICS.map(m => {
                const val = r.metrics[m.key]
                if (val == null) return null
                const bad = outOfRange(val, m)
                return (
                  <View key={m.key} style={[st.chip, bad && st.chipBad]}>
                    <Text style={[st.chipText, bad && st.chipTextBad]}>{m.label} {val}</Text>
                  </View>
                )
              })}
            </View>
          </View>
        ))}
      </BottomSheet>

      {/* ── 수치 그래프 panel ── */}
      <BottomSheet visible={panel === 'blood-chart'} onClose={() => setPanel('blood')} title="수치 그래프">
        {/* Range toggle */}
        <View style={st.rangeRow}>
          {(['monthly', 'yearly'] as const).map(r => (
            <TouchableOpacity key={r}
              style={[st.rangeBtn, chartRange === r && st.rangeBtnActive]}
              onPress={() => setChartRange(r)}>
              <Text style={[st.rangeBtnText, chartRange === r && st.rangeBtnTextActive]}>
                {r === 'monthly' ? '최근 1개월' : '최근 1년'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {/* Metric tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
          <View style={st.metricTabs}>
            {BLOOD_METRICS.map(m => (
              <TouchableOpacity key={m.key}
                style={[st.metricTab, chartMetric === m.key && st.metricTabActive]}
                onPress={() => setChartMetric(m.key)}>
                <Text style={[st.metricTabText, chartMetric === m.key && st.metricTabTextActive]}>{m.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
        {/* Normal range label */}
        <Text style={st.normalRange}>
          정상 범위: {chartDef.min}–{chartDef.max} {chartDef.unit}
        </Text>
        <MetricBars records={bloodRecords} defItem={chartDef} range={chartRange} />
      </BottomSheet>

      {/* ── 기록 추가 panel ── */}
      <BottomSheet visible={panel === 'blood-add'} onClose={() => setPanel('blood')} title="혈액 검사 기록 추가">
        <Text style={st.fieldLabel}>검사일</Text>
        <TextInput
          style={st.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#bbb"
          value={addDate}
          onChangeText={setAddDate}
        />
        <Text style={[st.fieldLabel, { marginTop: 14 }]}>수치 입력 (비워두면 생략)</Text>
        {BLOOD_METRICS.map(m => (
          <View key={m.key} style={st.metricInputRow}>
            <Text style={st.metricLabel}>{m.label}<Text style={st.metricUnit}> {m.unit}</Text></Text>
            <TextInput
              style={st.metricInput}
              placeholder={`${m.min}–${m.max}`}
              placeholderTextColor="#ccc"
              value={addMetrics[m.key] ?? ''}
              onChangeText={v => setAddMetrics(p => ({ ...p, [m.key]: v }))}
              keyboardType="decimal-pad"
            />
          </View>
        ))}
        <TouchableOpacity style={st.saveBtn} onPress={saveBloodRecord}>
          <Text style={st.saveBtnText}>저장</Text>
        </TouchableOpacity>
      </BottomSheet>

      {/* ── 소변 검사 panel (placeholder) ── */}
      <BottomSheet visible={panel === 'urine'} onClose={() => setPanel(null)} title="소변 검사 기록">
        <Text style={st.emptyMsg}>아직 기록이 없어요.</Text>
      </BottomSheet>
    </SafeAreaView>
  )
}

// ─── Styles ──────────────────────────────────────────────
const st = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F5' },
  catHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 0.5, borderBottomColor: '#EEE', backgroundColor: '#fff' },
  catAvatar: { width: 42, height: 42, borderRadius: 21 },
  catName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  catInfo: { fontSize: 12, color: '#999', marginTop: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  // AI card
  aiCard: { backgroundColor: '#EEEDFE', borderWidth: 0.5, borderColor: '#AFA9EC', borderRadius: 14, padding: 16, marginBottom: 16 },
  aiRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  aiBadge: { backgroundColor: '#534AB7', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  aiBadgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  aiTitle: { fontSize: 14, fontWeight: '600', color: '#26215C' },
  aiBody: { fontSize: 13, color: '#534AB7', lineHeight: 20 },
  aiActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 0.5, borderColor: '#534AB7', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  outlineBtnText: { fontSize: 12, color: '#534AB7', fontWeight: '500' },
  // Exam card
  examCard: { flexDirection: 'row', alignItems: 'center', gap: 14, backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10, borderWidth: 0.5, borderColor: '#EBEBEB' },
  examIcon: { width: 44, height: 44, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  examBody: { flex: 1 },
  examName: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  examSub: { fontSize: 12, color: '#999', marginTop: 2 },
  // Chips
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, marginTop: 6 },
  chip: { backgroundColor: '#F0FBF6', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  chipBad: { backgroundColor: '#FEF0EC' },
  chipText: { fontSize: 10, color: '#1D9E75', fontWeight: '500' },
  chipTextBad: { color: '#E9785A' },
  // Vaccination
  vaccCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#EBEBEB', paddingHorizontal: 16 },
  vaccItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  vaccBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  vaccDot: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  vaccDotDone: { backgroundColor: '#E1F5EE' },
  vaccDotDue: { backgroundColor: '#FAEEDA' },
  vaccBody: { flex: 1 },
  vaccName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  vaccDetail: { fontSize: 11, color: '#999', marginTop: 2 },
  // Panel
  panelBtns: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  panelBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 10, borderWidth: 0.5, borderColor: '#534AB7' },
  panelBtnText: { fontSize: 13, color: '#534AB7', fontWeight: '600' },
  panelBtnAdd: { backgroundColor: '#E9785A', borderColor: '#E9785A' },
  emptyMsg: { textAlign: 'center', color: '#bbb', fontSize: 13, paddingVertical: 24 },
  // Records
  recordRow: { paddingVertical: 12 },
  recordBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F5F5F5' },
  recordDate: { fontSize: 13, fontWeight: '600', color: '#1a1a1a', marginBottom: 6 },
  // Chart controls
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
  // Add form
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 8 },
  input: { backgroundColor: '#F7F7F7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1a1a1a', borderWidth: 0.5, borderColor: '#E5E5E5', marginBottom: 8 },
  metricInputRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 0.5, borderBottomColor: '#F5F5F5' },
  metricLabel: { flex: 1, fontSize: 13, fontWeight: '600', color: '#444' },
  metricUnit: { fontSize: 11, color: '#aaa', fontWeight: '400' },
  metricInput: { width: 100, textAlign: 'right', fontSize: 14, color: '#1a1a1a', backgroundColor: '#F7F7F7', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  saveBtn: { backgroundColor: '#E9785A', borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
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
