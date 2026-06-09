import { ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { useState } from 'react'
import BottomSheet from './bottom-sheet'

// ─── Types ───────────────────────────────────────────────
type FreqType = 'daily' | 'every_other' | 'weekly' | 'monthly'
type DosesPerDay = 1 | 2 | 3

type Medication = {
  id: string
  name: string
  dosage: string
  frequency: FreqType
  dosesPerDay: DosesPerDay
  times: string[]   // 'HH:MM' strings
  alarmOn: boolean
}

// ─── Constants ───────────────────────────────────────────
const FREQ_OPTIONS: { key: FreqType; label: string }[] = [
  { key: 'daily',       label: '매일' },
  { key: 'every_other', label: '격일' },
  { key: 'weekly',      label: '매주' },
  { key: 'monthly',     label: '매월' },
]
const FREQ_LABEL: Record<FreqType, string> = {
  daily: '매일', every_other: '격일', weekly: '매주', monthly: '매월',
}

const DEFAULT_TIMES: Record<DosesPerDay, string[]> = {
  1: ['09:00'],
  2: ['09:00', '21:00'],
  3: ['08:00', '14:00', '21:00'],
}

const DOSE_LABELS: { count: DosesPerDay; label: string }[] = [
  { count: 1, label: '1회' },
  { count: 2, label: '2회' },
  { count: 3, label: '3회' },
]

// 30분 단위, 06:00 ~ 22:30
const TIME_OPTIONS = Array.from({ length: 34 }, (_, i) => {
  const totalMins = 360 + i * 30
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const pad = (n: number) => String(n).padStart(2, '0')
  return { value: `${pad(h)}:${pad(m)}`, label: `${ampm} ${h12}:${pad(m)}` }
})

// ─── Helpers ─────────────────────────────────────────────
function fmtTime(time: string): string {
  const [hStr, mStr] = time.split(':')
  const h = parseInt(hStr, 10)
  const m = parseInt(mStr, 10)
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${ampm} ${h12}:${String(m).padStart(2, '0')}`
}

const EMPTY_FORM = (): Omit<Medication, 'id'> => ({
  name: '', dosage: '', frequency: 'daily',
  dosesPerDay: 1, times: [...DEFAULT_TIMES[1]], alarmOn: true,
})

// ─── Component ───────────────────────────────────────────
export default function MedicationSection() {
  const [meds, setMeds] = useState<Medication[]>([
    { id: '1', name: '구충제 (내부)', dosage: '1정', frequency: 'monthly', dosesPerDay: 1, times: ['09:00'], alarmOn: true },
  ])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM())
  const [openTimeDrop, setOpenTimeDrop] = useState<number | null>(null)
  const [openDosageDrop, setOpenDosageDrop] = useState(false)

  const openAdd = () => {
    setEditTarget(null); setForm(EMPTY_FORM()); setOpenTimeDrop(null); setPanelOpen(true)
  }
  const openEdit = (med: Medication) => {
    setEditTarget(med.id)
    setForm({ name: med.name, dosage: med.dosage, frequency: med.frequency, dosesPerDay: med.dosesPerDay, times: [...med.times], alarmOn: med.alarmOn })
    setOpenTimeDrop(null); setPanelOpen(true)
  }

  const save = () => {
    if (!form.name.trim()) return
    if (editTarget) {
      setMeds(ms => ms.map(m => m.id === editTarget ? { ...form, id: editTarget } : m))
    } else {
      setMeds(ms => [...ms, { ...form, id: Date.now().toString() }])
    }
    setPanelOpen(false)
  }
  const remove = () => {
    if (editTarget) setMeds(ms => ms.filter(m => m.id !== editTarget))
    setPanelOpen(false)
  }
  const toggleAlarm = (id: string) =>
    setMeds(ms => ms.map(m => m.id === id ? { ...m, alarmOn: !m.alarmOn } : m))

  const handleDosesChange = (doses: DosesPerDay) => {
    const newTimes = DEFAULT_TIMES[doses].map((def, i) => form.times[i] ?? def)
    setForm(f => ({ ...f, dosesPerDay: doses, times: newTimes }))
    setOpenTimeDrop(null)
  }

  const setTime = (idx: number, value: string) => {
    const newTimes = [...form.times]
    newTimes[idx] = value
    setForm(f => ({ ...f, times: newTimes }))
    setOpenTimeDrop(null)
  }

  return (
    <>
      {meds.map(med => (
        <View key={med.id} style={styles.medCard}>
          <TouchableOpacity style={styles.medCardLeft} onPress={() => openEdit(med)}>
            <View style={styles.medIcon}><FontAwesome5 name="pills" size={16} color="#1D9E75" /></View>
            <View style={styles.medBody}>
              <Text style={styles.medName}>{med.name}</Text>
              <Text style={styles.medDetail}>
                {med.dosage} · {FREQ_LABEL[med.frequency]} {med.dosesPerDay}회 · {med.times.map(fmtTime).join(' / ')}
              </Text>
            </View>
          </TouchableOpacity>
          <Switch value={med.alarmOn} onValueChange={() => toggleAlarm(med.id)}
            trackColor={{ false: '#ddd', true: '#1D9E75' }} thumbColor="#fff" />
        </View>
      ))}

      {meds.length < 5 ? (
        <TouchableOpacity style={styles.addBtn} onPress={openAdd}>
          <Text style={styles.addBtnText}>+ 투약 추가 ({meds.length}/5)</Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.maxReached}>
          <Text style={styles.maxReachedText}>최대 5개까지 등록할 수 있어요</Text>
        </View>
      )}

      <BottomSheet visible={panelOpen} onClose={() => setPanelOpen(false)} title={editTarget ? '투약 수정' : '투약 추가'}>

        <Text style={styles.fieldLabel}>약 이름</Text>
        <TextInput style={styles.input} placeholder="예: 레나메진, 아조딜 등"
          placeholderTextColor="#bbb" value={form.name}
          onChangeText={v => setForm(f => ({ ...f, name: v }))} />

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>용량</Text>
        <TouchableOpacity
          style={[styles.timeBtn, openDosageDrop && styles.timeBtnOpen]}
          onPress={() => { setOpenDosageDrop(v => !v); setOpenTimeDrop(null) }}
        >
          <Text style={[styles.timeBtnText, !form.dosage && { color: '#bbb' }]}>
            {form.dosage || '선택하세요'}
          </Text>
          <Feather name={openDosageDrop ? 'chevron-up' : 'chevron-down'} size={12} color="#aaa" />
        </TouchableOpacity>
        {openDosageDrop && (
          <View style={[styles.timeDrop, { borderColor: '#E9785A' }]}>
            {['1정', '2정', '3정', '4정', '5정'].map(opt => (
              <TouchableOpacity key={opt} style={styles.timeDropItem}
                onPress={() => { setForm(f => ({ ...f, dosage: opt })); setOpenDosageDrop(false) }}>
                <Feather name="check" size={13} color={form.dosage === opt ? '#E9785A' : 'transparent'} />
                <Text style={[styles.timeDropText, form.dosage === opt && styles.timeDropTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>복용 주기</Text>
        <View style={styles.optionRow}>
          {FREQ_OPTIONS.map(opt => (
            <TouchableOpacity key={opt.key}
              style={[styles.optionBtn, form.frequency === opt.key && styles.optionBtnActive]}
              onPress={() => setForm(f => ({ ...f, frequency: opt.key }))}>
              <Text style={[styles.optionBtnText, form.frequency === opt.key && styles.optionBtnTextActive]}>
                {opt.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>하루 복용 횟수</Text>
        <View style={styles.optionRow}>
          {DOSE_LABELS.map(({ count, label }) => (
            <TouchableOpacity key={count}
              style={[styles.optionBtn, styles.optionBtnWide, form.dosesPerDay === count && styles.optionBtnActive]}
              onPress={() => handleDosesChange(count)}>
              <Text style={[styles.optionBtnText, form.dosesPerDay === count && styles.optionBtnTextActive]}>
                {label}
              </Text>
              <Text style={[styles.optionSubText, form.dosesPerDay === count && { color: 'rgba(255,255,255,0.8)' }]}>
                {DEFAULT_TIMES[count].map(fmtTime).join('·')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>복용 시간 설정</Text>
        {form.times.map((t, i) => {
          const isOpen = openTimeDrop === i
          const timeLabel = TIME_OPTIONS.find(o => o.value === t)?.label ?? fmtTime(t)
          return (
            <View key={i} style={styles.timeRow}>
              <TouchableOpacity
                style={[styles.timeBtn, isOpen && styles.timeBtnOpen]}
                onPress={() => { setOpenTimeDrop(isOpen ? null : i); setOpenDosageDrop(false) }}
              >
                <Text style={styles.timeDoseLabel}>{i + 1}회차</Text>
                <Feather name="clock" size={13} color="#888" />
                <Text style={styles.timeBtnText}>{timeLabel}</Text>
                <Feather name={isOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#aaa" />
              </TouchableOpacity>
              {isOpen && (
                <ScrollView style={styles.timeDrop} nestedScrollEnabled>
                  {TIME_OPTIONS.map(o => (
                    <TouchableOpacity key={o.value} style={styles.timeDropItem} onPress={() => setTime(i, o.value)}>
                      <Feather name="check" size={13} color={t === o.value ? '#E9785A' : 'transparent'} />
                      <Text style={[styles.timeDropText, t === o.value && styles.timeDropTextActive]}>{o.label}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )
        })}

        <View style={[styles.toggleRow, { marginTop: 16 }]}>
          <Text style={styles.toggleLabel}>알림 켜기</Text>
          <Switch value={form.alarmOn} onValueChange={v => setForm(f => ({ ...f, alarmOn: v }))}
            trackColor={{ false: '#ddd', true: '#1D9E75' }} thumbColor="#fff" />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>저장하기</Text>
        </TouchableOpacity>
        {editTarget && (
          <TouchableOpacity style={styles.deleteBtn} onPress={remove}>
            <Text style={styles.deleteBtnText}>삭제</Text>
          </TouchableOpacity>
        )}
      </BottomSheet>
    </>
  )
}

const styles = StyleSheet.create({
  medCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 0.5, borderColor: '#EBEBEB' },
  medCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  medIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center' },
  medBody: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  medDetail: { fontSize: 12, color: '#999', marginTop: 2 },
  addBtn: { borderWidth: 1, borderColor: '#E9785A', borderStyle: 'dashed', borderRadius: 12, padding: 13, alignItems: 'center' },
  addBtnText: { color: '#E9785A', fontWeight: '600', fontSize: 14 },
  maxReached: { borderRadius: 12, padding: 13, alignItems: 'center', backgroundColor: '#F7F7F7' },
  maxReachedText: { color: '#aaa', fontSize: 13 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 8 },
  input: { backgroundColor: '#F7F7F7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a1a1a', borderWidth: 0.5, borderColor: '#E5E5E5' },
  optionRow: { flexDirection: 'row', gap: 8 },
  optionBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 0.5, borderColor: '#E5E5E5', alignItems: 'center' },
  optionBtnWide: { paddingVertical: 10 },
  optionBtnActive: { backgroundColor: '#E9785A', borderColor: '#E9785A' },
  optionBtnText: { fontSize: 13, color: '#666', fontWeight: '500' },
  optionBtnTextActive: { color: '#fff', fontWeight: '700' },
  optionSubText: { fontSize: 9, color: '#aaa', marginTop: 2 },
  // Time dropdown
  timeRow: { marginBottom: 8 },
  timeBtn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F7F7F7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 0.5, borderColor: '#E5E5E5' },
  timeBtnOpen: { borderColor: '#E9785A', borderBottomLeftRadius: 0, borderBottomRightRadius: 0, backgroundColor: '#FFF5F2' },
  timeDoseLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', width: 30 },
  timeBtnText: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  timeDrop: { backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#E9785A', borderTopWidth: 0, borderBottomLeftRadius: 10, borderBottomRightRadius: 10, maxHeight: 200 },
  timeDropItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: '#F5F5F5' },
  timeDropText: { fontSize: 13, color: '#444' },
  timeDropTextActive: { color: '#E9785A', fontWeight: '600' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  toggleLabel: { fontSize: 14, color: '#1a1a1a' },
  saveBtn: { backgroundColor: '#E9785A', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteBtn: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  deleteBtnText: { color: '#E9785A', fontSize: 13 },
})
