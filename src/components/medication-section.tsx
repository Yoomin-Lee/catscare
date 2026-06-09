import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Platform, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { useState } from 'react'
import BottomSheet from './bottom-sheet'

// ─── 타입 ─────────────────────────────────────────────────────
type FreqType = 'daily' | 'every_other' | 'weekly' | 'monthly'
type DosesPerDay = 1 | 2 | 3

type Medication = {
  id: string
  name: string
  dosage: string
  frequency: FreqType
  dosesPerDay: DosesPerDay
  times: Date[]
  alarmOn: boolean
}

// ─── 상수 ─────────────────────────────────────────────────────
const FREQ_OPTIONS: { key: FreqType; label: string }[] = [
  { key: 'daily', label: '매일' },
  { key: 'every_other', label: '격일' },
  { key: 'weekly', label: '매주' },
  { key: 'monthly', label: '매월' },
]
const FREQ_LABEL: Record<FreqType, string> = {
  daily: '매일', every_other: '격일', weekly: '매주', monthly: '매월',
}
// 회수별 기본 시간
const DEFAULT_TIMES: Record<DosesPerDay, number[]> = {
  1: [9],
  2: [9, 21],
  3: [8, 14, 21],
}
const DOSE_LABELS: { count: DosesPerDay; label: string }[] = [
  { count: 1, label: '1회' },
  { count: 2, label: '2회' },
  { count: 3, label: '3회' },
]

// ─── 유틸 ─────────────────────────────────────────────────────
function fmtTime(date: Date): string {
  const h = date.getHours()
  const m = date.getMinutes()
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  return `${ampm} ${h12}시${m > 0 ? ` ${m}분` : ''}`
}

function makeTime(hour: number, minute = 0): Date {
  const d = new Date(); d.setHours(hour, minute, 0, 0); return d
}

function makeTimes(doses: DosesPerDay): Date[] {
  return DEFAULT_TIMES[doses].map(h => makeTime(h))
}

const EMPTY_FORM = (): Omit<Medication, 'id'> => ({
  name: '', dosage: '', frequency: 'daily',
  dosesPerDay: 1, times: makeTimes(1), alarmOn: true,
})

// ─── 컴포넌트 ─────────────────────────────────────────────────
export default function MedicationSection() {
  const [meds, setMeds] = useState<Medication[]>([
    { id: '1', name: '구충제 (내부)', dosage: '1정', frequency: 'monthly', dosesPerDay: 1, times: [makeTime(9)], alarmOn: true },
  ])
  const [panelOpen, setPanelOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<string | null>(null)
  const [form, setForm] = useState(EMPTY_FORM())
  const [activePickerIdx, setActivePickerIdx] = useState<number | null>(null)

  const openAdd = () => {
    setEditTarget(null); setForm(EMPTY_FORM()); setActivePickerIdx(null); setPanelOpen(true)
  }
  const openEdit = (med: Medication) => {
    setEditTarget(med.id)
    setForm({ name: med.name, dosage: med.dosage, frequency: med.frequency, dosesPerDay: med.dosesPerDay, times: med.times.map(t => new Date(t)), alarmOn: med.alarmOn })
    setActivePickerIdx(null); setPanelOpen(true)
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
  const remove = () => { if (editTarget) setMeds(ms => ms.filter(m => m.id !== editTarget)); setPanelOpen(false) }
  const toggleAlarm = (id: string) => setMeds(ms => ms.map(m => m.id === id ? { ...m, alarmOn: !m.alarmOn } : m))

  // 회수 변경 시: 기존 시간 최대한 유지, 부족하면 기본값으로 채움
  const handleDosesChange = (doses: DosesPerDay) => {
    const defaultHours = DEFAULT_TIMES[doses]
    const newTimes = defaultHours.map((h, i) =>
      form.times[i] ? new Date(form.times[i]) : makeTime(h)
    )
    setForm(f => ({ ...f, dosesPerDay: doses, times: newTimes }))
    setActivePickerIdx(null)
  }

  const onTimeChange = (e: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setActivePickerIdx(null)
    if (e.type === 'set' && date != null && activePickerIdx != null) {
      const newTimes = [...form.times]
      newTimes[activePickerIdx] = date
      setForm(f => ({ ...f, times: newTimes }))
    }
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

      {/* 추가/수정 패널 */}
      <BottomSheet visible={panelOpen} onClose={() => setPanelOpen(false)} title={editTarget ? '투약 수정' : '투약 추가'}>

        <Text style={styles.fieldLabel}>약 이름</Text>
        <TextInput style={styles.input} placeholder="예: 비타민 B complex, 아목시실린"
          placeholderTextColor="#bbb" value={form.name}
          onChangeText={v => setForm(f => ({ ...f, name: v }))} />

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>용량</Text>
        <TextInput style={styles.input} placeholder="예: 1정, 0.5ml, 1/2정"
          placeholderTextColor="#bbb" value={form.dosage}
          onChangeText={v => setForm(f => ({ ...f, dosage: v }))} />

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
                {DEFAULT_TIMES[count].map(h => `${h < 12 ? '오전' : '오후'}${h > 12 ? h - 12 : h}시`).join('·')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>복용 시간 설정</Text>
        {form.times.map((t, i) => (
          <View key={i}>
            <TouchableOpacity
              style={[styles.timeBtn, activePickerIdx === i && styles.timeBtnActive]}
              onPress={() => setActivePickerIdx(activePickerIdx === i ? null : i)}>
              <Text style={styles.timeDoseLabel}>{i + 1}회차</Text>
              <Feather name="clock" size={13} color="#888" style={{ marginRight: 4 }} />
              <Text style={styles.timeBtnText}>{fmtTime(t)}</Text>
              <Text style={styles.timeArrow}>{activePickerIdx === i ? '▲' : '▼'}</Text>
            </TouchableOpacity>
            {activePickerIdx === i && (
              <View style={styles.pickerWrapper}>
                <DateTimePicker value={t} mode="time"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={onTimeChange} />
                {Platform.OS === 'ios' && (
                  <TouchableOpacity style={styles.confirmBtn} onPress={() => setActivePickerIdx(null)}>
                    <Text style={styles.confirmBtnText}>확인</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        ))}

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
  medCard: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    marginBottom: 8, borderWidth: 0.5, borderColor: '#EBEBEB',
  },
  medCardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  medIcon: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center' },
  medIconText: { fontSize: 18 },
  medBody: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  medDetail: { fontSize: 12, color: '#999', marginTop: 2 },
  addBtn: { borderWidth: 1, borderColor: '#E9785A', borderStyle: 'dashed', borderRadius: 12, padding: 13, alignItems: 'center' },
  addBtnText: { color: '#E9785A', fontWeight: '600', fontSize: 14 },
  maxReached: { borderRadius: 12, padding: 13, alignItems: 'center', backgroundColor: '#F7F7F7' },
  maxReachedText: { color: '#aaa', fontSize: 13 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 8 },
  input: {
    backgroundColor: '#F7F7F7', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1a1a1a', borderWidth: 0.5, borderColor: '#E5E5E5',
  },
  optionRow: { flexDirection: 'row', gap: 8 },
  optionBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 0.5, borderColor: '#E5E5E5', alignItems: 'center' },
  optionBtnWide: { paddingVertical: 10 },
  optionBtnActive: { backgroundColor: '#E9785A', borderColor: '#E9785A' },
  optionBtnText: { fontSize: 13, color: '#666', fontWeight: '500' },
  optionBtnTextActive: { color: '#fff', fontWeight: '700' },
  optionSubText: { fontSize: 9, color: '#aaa', marginTop: 2 },
  timeBtn: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F7F7F7', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 0.5, borderColor: '#E5E5E5', marginBottom: 8,
  },
  timeBtnActive: { borderColor: '#E9785A', backgroundColor: '#FFF5F2' },
  timeDoseLabel: { fontSize: 11, color: '#aaa', fontWeight: '600', width: 30 },
  timeBtnText: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  timeArrow: { fontSize: 10, color: '#bbb' },
  pickerWrapper: { marginBottom: 8 },
  confirmBtn: { backgroundColor: '#E9785A', borderRadius: 10, paddingVertical: 9, alignItems: 'center', marginBottom: 8 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 13 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 4 },
  toggleLabel: { fontSize: 14, color: '#1a1a1a' },
  saveBtn: { backgroundColor: '#E9785A', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 20 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteBtn: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  deleteBtnText: { color: '#E9785A', fontSize: 13 },
})
