import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCats, catAvatarColor } from '@/lib/cats-context'
import { supabase } from '@/lib/supabase'
import BottomSheet from '@/components/bottom-sheet'

type WeightRecord = {
  id: string
  weightKg: number
  date: string  // 'YYYY-MM-DD'
}

const FREQ_LABEL: Record<string, string> = {
  daily: '매일', every_other: '격일', weekly: '매주', monthly: '매월',
}

function computeChartData(records: WeightRecord[], period: 'w' | 'm' | 'y') {
  const ms = { w: 7, m: 30, y: 365 }[period] * 86400000
  const cutoff = new Date(Date.now() - ms)
  const pts = records
    .filter(r => new Date(r.date) >= cutoff)
    .sort((a, b) => a.date.localeCompare(b.date))
  if (!pts.length) return null
  return {
    labels: pts.map(r => {
      const [, m, d] = r.date.split('-').map(Number)
      return period === 'y' ? `${m}월` : `${m}/${d}`
    }),
    values: pts.map(r => r.weightKg),
  }
}

function WeightChart({ data }: { data: { labels: string[]; values: number[] } | null }) {
  if (!data) return <Text style={styles.emptyChart}>아직 체중 기록이 없어요</Text>
  const { labels, values } = data
  const min = Math.min(...values) - 0.1
  const max = Math.max(...values) + 0.1
  const range = max - min || 1
  const CHART_H = 90
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H + 28, gap: 2 }}>
      {values.map((val, i) => {
        const barH = Math.max(Math.round(((val - min) / range) * CHART_H), 4)
        return (
          <View key={i} style={{ flex: 1, alignItems: 'center', justifyContent: 'flex-end' }}>
            <View style={{ alignItems: 'center', justifyContent: 'flex-end', height: CHART_H }}>
              <View style={{ width: '70%', height: barH, backgroundColor: '#E1F5EE', borderRadius: 4, alignItems: 'center' }}>
                <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: '#1D9E75', marginTop: -4 }} />
              </View>
            </View>
            <Text style={{ fontSize: 8, color: '#aaa', marginTop: 5, textAlign: 'center' }}>{labels[i]}</Text>
          </View>
        )
      })}
    </View>
  )
}

type MedRow = { id: string; name: string; detail: string }

export default function BodyScreen() {
  const { selectedCat, userId } = useCats()
  const [period, setPeriod] = useState<'w' | 'm' | 'y'>('m')
  const [records, setRecords] = useState<WeightRecord[]>([])
  const [meds, setMeds] = useState<MedRow[]>([])
  const [addSheet, setAddSheet] = useState(false)
  const [addWeight, setAddWeight] = useState('')
  const [addDate, setAddDate] = useState('')

  useEffect(() => {
    if (!userId || selectedCat.id === '__guest__') { setRecords([]); return }
    supabase
      .from('weight_records')
      .select('*')
      .eq('cat_id', selectedCat.id)
      .order('recorded_at', { ascending: false })
      .then(({ data }) => {
        setRecords((data ?? []).map(r => ({
          id: r.id as string,
          weightKg: parseFloat(String(r.weight_kg)),
          date: r.recorded_at as string,
        })))
      })
  }, [selectedCat.id, userId])

  useEffect(() => {
    if (!userId || selectedCat.id === '__guest__') { setMeds([]); return }
    supabase
      .from('medications')
      .select('id, name, dosage, frequency, doses_per_day')
      .eq('cat_id', selectedCat.id)
      .then(({ data }) => {
        setMeds((data ?? []).map(m => ({
          id: m.id as string,
          name: m.name as string,
          detail: `${m.dosage} · ${FREQ_LABEL[m.frequency as string] ?? m.frequency} ${m.doses_per_day}회`,
        })))
      })
  }, [selectedCat.id, userId])

  const openAdd = () => {
    const today = new Date().toISOString().split('T')[0]
    setAddWeight(String(selectedCat.weightKg || ''))
    setAddDate(today)
    setAddSheet(true)
  }

  const saveRecord = async () => {
    const w = parseFloat(addWeight)
    if (isNaN(w) || w <= 0 || !addDate) return
    const newRec: WeightRecord = { id: '', weightKg: w, date: addDate }

    if (!userId || selectedCat.id === '__guest__') {
      newRec.id = Date.now().toString()
      setRecords(prev => [newRec, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
    } else {
      const { data } = await supabase
        .from('weight_records')
        .insert({ cat_id: selectedCat.id, user_id: userId, weight_kg: w, recorded_at: addDate })
        .select()
        .single()
      if (data) {
        newRec.id = data.id as string
        setRecords(prev => [newRec, ...prev].sort((a, b) => b.date.localeCompare(a.date)))
      }
    }
    setAddSheet(false)
  }

  const currentWeight = records.length > 0 ? records[0].weightKg : selectedCat.weightKg
  const prevWeight = records.length > 1 ? records[1].weightKg : null
  const diff = prevWeight !== null ? currentWeight - prevWeight : null
  const chartData = computeChartData(records, period)

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.catHeader}>
        {selectedCat.photoUri ? (
          <Image source={{ uri: selectedCat.photoUri }} style={styles.catAvatar} />
        ) : (
          <View style={[styles.catAvatar, { backgroundColor: catAvatarColor(selectedCat) + '22', alignItems: 'center', justifyContent: 'center' }]}>
            <FontAwesome5 name="cat" size={20} color={catAvatarColor(selectedCat)} />
          </View>
        )}
        <View>
          <Text style={styles.catName}>{selectedCat.name}</Text>
          <Text style={styles.catInfo}>{selectedCat.breed} · {selectedCat.ageYears}살 · {currentWeight.toFixed(1)}kg</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* 통계 */}
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{currentWeight.toFixed(1)}<Text style={styles.statUnit}>kg</Text></Text>
            <Text style={styles.statLabel}>현재 체중</Text>
          </View>
          <View style={styles.statBox}>
            {diff !== null ? (
              <>
                <Text style={[styles.statNum, { color: diff <= 0 ? '#1D9E75' : '#E9785A', fontSize: 18 }]}>
                  {diff <= 0 ? '▼' : '▲'}{Math.abs(diff).toFixed(2)}
                </Text>
                <Text style={styles.statLabel}>직전 대비</Text>
              </>
            ) : (
              <>
                <Text style={[styles.statNum, { fontSize: 14, color: '#bbb' }]}>-</Text>
                <Text style={styles.statLabel}>직전 대비</Text>
              </>
            )}
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>{Math.max(0, currentWeight - 0.1).toFixed(1)}<Text style={styles.statUnit}>kg</Text></Text>
            <Text style={styles.statLabel}>목표 체중</Text>
          </View>
        </View>

        {/* 차트 */}
        <View style={styles.chartCard}>
          <View style={styles.chartHeader}>
            <Text style={styles.chartTitle}>체중 추이</Text>
            <View style={styles.periodTabs}>
              {(['w', 'm', 'y'] as const).map(p => (
                <TouchableOpacity
                  key={p}
                  style={[styles.periodTab, period === p && styles.periodTabActive]}
                  onPress={() => setPeriod(p)}>
                  <Text style={[styles.periodTabText, period === p && styles.periodTabTextActive]}>
                    {p === 'w' ? '주간' : p === 'm' ? '월간' : '연간'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          <WeightChart data={chartData} />
        </View>

        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Feather name="plus-circle" size={15} color="#1D9E75" />
          <Text style={styles.addBtnText}>체중 기록 추가</Text>
        </TouchableOpacity>

        {/* 투약 기록 */}
        <Text style={styles.sectionTitle}>투약 기록</Text>
        {meds.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyCardText}>등록된 투약이 없어요{'\n'}알람 탭에서 투약을 추가해보세요</Text>
          </View>
        ) : (
          <View style={styles.medCard}>
            {meds.map((med, i) => (
              <View key={med.id} style={[styles.medItem, i < meds.length - 1 && styles.medBorder]}>
                <View style={[styles.medIcon, styles.iconDone]}>
                  <Feather name="check" size={12} color="#1D9E75" />
                </View>
                <View style={styles.medBody}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.medDetail}>{med.detail}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

      </ScrollView>

      {/* 체중 추가 시트 */}
      <BottomSheet visible={addSheet} onClose={() => setAddSheet(false)} title="체중 기록 추가">
        <Text style={styles.fieldLabel}>체중 (kg)</Text>
        <TextInput
          style={styles.input}
          placeholder="예: 4.20"
          placeholderTextColor="#bbb"
          keyboardType="decimal-pad"
          value={addWeight}
          onChangeText={v => { if (/^\d*\.?\d{0,2}$/.test(v)) setAddWeight(v) }}
        />
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>측정일</Text>
        <TextInput
          style={styles.input}
          placeholder="YYYY-MM-DD"
          placeholderTextColor="#bbb"
          value={addDate}
          onChangeText={setAddDate}
        />
        <TouchableOpacity style={styles.saveBtn} onPress={saveRecord}>
          <Text style={styles.saveBtnText}>저장하기</Text>
        </TouchableOpacity>
      </BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F5' },
  catHeader: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#EEE', backgroundColor: '#fff',
  },
  catAvatar: { width: 42, height: 42, borderRadius: 21 },
  catName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  catInfo: { fontSize: 12, color: '#999', marginTop: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  statRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  statBox: { flex: 1, backgroundColor: '#F4F4F6', borderRadius: 12, padding: 14, alignItems: 'center' },
  statNum: { fontSize: 22, fontWeight: '600', color: '#1a1a1a' },
  statUnit: { fontSize: 13, fontWeight: '400' },
  statLabel: { fontSize: 11, color: '#999', marginTop: 2 },
  chartCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#EBEBEB', padding: 16, marginBottom: 10 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chartTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  periodTabs: { flexDirection: 'row', gap: 4 },
  periodTab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 0.5, borderColor: '#EBEBEB' },
  periodTabActive: { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  periodTabText: { fontSize: 11, color: '#999' },
  periodTabTextActive: { color: '#fff', fontWeight: '600' },
  emptyChart: { textAlign: 'center', color: '#bbb', fontSize: 13, paddingVertical: 20 },
  addBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, borderWidth: 1, borderColor: '#1D9E75', borderStyle: 'dashed', borderRadius: 12, padding: 12, marginBottom: 16 },
  addBtnText: { color: '#1D9E75', fontWeight: '600', fontSize: 14 },
  medCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#EBEBEB', paddingHorizontal: 16, marginBottom: 12 },
  medItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  medBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  medIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  iconDone: { backgroundColor: '#E1F5EE' },
  medBody: { flex: 1 },
  medName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  medDetail: { fontSize: 11, color: '#999', marginTop: 2 },
  emptyCard: { backgroundColor: '#F7F7F7', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 12 },
  emptyCardText: { fontSize: 13, color: '#bbb', textAlign: 'center', lineHeight: 20 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 8 },
  input: { backgroundColor: '#F7F7F7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a1a1a', borderWidth: 0.5, borderColor: '#E5E5E5' },
  saveBtn: { backgroundColor: '#1D9E75', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
})
