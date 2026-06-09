import { Image, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import BottomSheet from '@/components/bottom-sheet'
import MedicationSection from '@/components/medication-section'
import { useCats, catAvatarColor } from '@/lib/cats-context'

function addMonths(date: Date, months: number) {
  const d = new Date(date); d.setMonth(d.getMonth() + months); return d
}
function addWeeks(date: Date, weeks: number) {
  const d = new Date(date); d.setDate(d.getDate() + weeks * 7); return d
}
function daysUntil(date: Date) {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const t = new Date(date); t.setHours(0, 0, 0, 0)
  return Math.ceil((t.getTime() - now.getTime()) / 86400000)
}
function fmt(date: Date) {
  return `${date.getFullYear()}.${String(date.getMonth() + 1).padStart(2, '0')}.${String(date.getDate()).padStart(2, '0')}`
}

const HOSPITAL_CYCLES = [
  { label: '1개월', months: 1 },
  { label: '3개월', months: 3 },
  { label: '6개월', months: 6 },
  { label: '1년', months: 12 },
]
const SAND_CYCLES = Array.from({ length: 10 }, (_, i) => ({ weeks: i + 1 }))

const WEEK_LABELS = ['일', '월', '화', '수', '목', '금', '토']

function CalendarDropdown({ value, max, onChange }: {
  value: Date
  max?: Date
  onChange: (date: Date) => void
}) {
  const [viewYear, setViewYear] = useState(value.getFullYear())
  const [viewMonth, setViewMonth] = useState(value.getMonth())

  const firstDow = new Date(viewYear, viewMonth, 1).getDay()
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate()

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1) }
    else setViewMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1) }
    else setViewMonth(m => m + 1)
  }

  const isSelected = (d: number) =>
    value.getFullYear() === viewYear && value.getMonth() === viewMonth && value.getDate() === d
  const isDisabled = (d: number) =>
    max ? new Date(viewYear, viewMonth, d) > max : false

  const blanks = Array.from({ length: firstDow })
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1)

  return (
    <View style={calStyles.container}>
      <View style={calStyles.nav}>
        <TouchableOpacity onPress={prevMonth} hitSlop={10} style={calStyles.navBtn}>
          <Feather name="chevron-left" size={18} color="#555" />
        </TouchableOpacity>
        <Text style={calStyles.navTitle}>{viewYear}년 {viewMonth + 1}월</Text>
        <TouchableOpacity onPress={nextMonth} hitSlop={10} style={calStyles.navBtn}>
          <Feather name="chevron-right" size={18} color="#555" />
        </TouchableOpacity>
      </View>
      <View style={calStyles.weekRow}>
        {WEEK_LABELS.map((w, i) => (
          <Text key={w} style={[calStyles.weekLabel, i === 0 && calStyles.sun, i === 6 && calStyles.sat]}>{w}</Text>
        ))}
      </View>
      <View style={calStyles.grid}>
        {blanks.map((_, i) => <View key={`b${i}`} style={calStyles.cell} />)}
        {days.map(d => {
          const col = (firstDow + d - 1) % 7
          const sel = isSelected(d)
          const dis = isDisabled(d)
          return (
            <TouchableOpacity
              key={d}
              style={[calStyles.cell, sel && calStyles.cellSel]}
              onPress={() => { if (!dis) onChange(new Date(viewYear, viewMonth, d)) }}
              disabled={dis}
              activeOpacity={0.7}
            >
              <Text style={[
                calStyles.dayText,
                col === 0 && !sel && calStyles.sun,
                col === 6 && !sel && calStyles.sat,
                sel && calStyles.dayTextSel,
                dis && calStyles.dayTextDis,
              ]}>{d}</Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

function relTime(date: Date): string {
  const diff = Math.round((Date.now() - date.getTime()) / 86400000)
  if (diff === 0) return '오늘'
  if (diff === 1) return '어제'
  if (diff < 7) return `${diff}일 전`
  if (diff < 30) return `${Math.floor(diff / 7)}주 전`
  if (diff < 365) return `${Math.floor(diff / 30)}개월 전`
  return `${Math.floor(diff / 365)}년 전`
}

function getBadgeStyle(days: number) {
  if (days <= 3) return { bg: '#FAEEDA', text: '#BA7517' }
  if (days <= 14) return { bg: '#FAECE7', text: '#993C1D' }
  return { bg: '#E1F5EE', text: '#1D9E75' }
}

export default function AlarmScreen() {
  const { selectedCat } = useCats()
  const [hospitalLastDate, setHospitalLastDate] = useState(new Date('2025-11-12'))
  const [hospitalCycle, setHospitalCycle] = useState(6)
  const [showHospitalPicker, setShowHospitalPicker] = useState(false)
  const [sandLastDate, setSandLastDate] = useState(new Date('2025-11-20'))
  const [sandHistory, setSandHistory] = useState<Date[]>([new Date('2025-11-20')])
  const [sandCycle, setSandCycle] = useState(4)
  const [showSandPicker, setShowSandPicker] = useState(false)

  const recordSand = (date: Date) => {
    setSandLastDate(date)
    setSandHistory(prev => {
      const key = fmt(date)
      const deduped = prev.filter(d => fmt(d) !== key)
      return [date, ...deduped].sort((a, b) => b.getTime() - a.getTime())
    })
    setShowSandPicker(false)
  }
  const [alarms, setAlarms] = useState({ hospital: true, sand: true, medication: false })
  const toggle = (key: keyof typeof alarms) => setAlarms(p => ({ ...p, [key]: !p[key] }))
  const [sandNotifyDays, setSandNotifyDays] = useState<number[]>([0, 3])

  const toggleNotifyDay = (d: number) =>
    setSandNotifyDays(prev =>
      prev.includes(d) ? prev.filter(x => x !== d) : [...prev, d].sort((a, b) => b - a)
    )

  const notifyLabel = (days: number[]) => {
    if (days.length === 0) return '없음'
    return days
      .sort((a, b) => b - a)
      .map(d => d === 0 ? '당일' : `${d}일 전`)
      .join(' · ')
  }
  const [panel, setPanel] = useState<'hospital' | 'sand' | null>(null)

  const nextHospital = addMonths(hospitalLastDate, hospitalCycle)
  const nextSand = addWeeks(sandLastDate, sandCycle)
  const hospitalDays = daysUntil(nextHospital)
  const sandDays = daysUntil(nextSand)
  const hospitalBadge = getBadgeStyle(hospitalDays)
  const sandBadge = getBadgeStyle(sandDays)

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
          <Text style={styles.catInfo}>{selectedCat.breed} · {selectedCat.ageYears}살 · {selectedCat.weightKg}kg</Text>
        </View>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={styles.sectionTitle}>다가오는 일정</Text>

        <TouchableOpacity style={styles.alarmCard} onPress={() => setPanel('hospital')}>
          <View style={styles.alarmCardMain}>
            <View style={[styles.alarmIcon, { backgroundColor: '#FAECE7' }]}>
              <Feather name="activity" size={18} color="#E9785A" />
            </View>
            <View style={styles.alarmBody}>
              <Text style={styles.alarmTitle}>정기 병원 방문</Text>
              <Text style={styles.alarmSub}>마지막 방문: {fmt(hospitalLastDate)} · {hospitalCycle >= 12 ? `${hospitalCycle / 12}년` : `${hospitalCycle}개월`} 주기</Text>
              <Text style={styles.nextDate}>다음 예정일: {fmt(nextHospital)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: hospitalBadge.bg }]}>
              <Text style={[styles.badgeText, { color: hospitalBadge.text }]}>
                {hospitalDays >= 0 ? `D-${hospitalDays}` : `D+${Math.abs(hospitalDays)}`}
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.alarmCard}>
          <TouchableOpacity style={styles.alarmCardMain} onPress={() => setPanel('sand')}>
            <View style={[styles.alarmIcon, { backgroundColor: '#FAEEDA' }]}>
              <Feather name="refresh-cw" size={18} color="#BA7517" />
            </View>
            <View style={styles.alarmBody}>
              <Text style={styles.alarmTitle}>화장실 모래 전체 교체</Text>
              <Text style={styles.alarmSub}>마지막 교체: {fmt(sandLastDate)} · {sandCycle}주 주기</Text>
              <Text style={styles.nextDate}>다음 예정일: {fmt(nextSand)}</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: sandBadge.bg }]}>
              <Text style={[styles.badgeText, { color: sandBadge.text }]}>
                {sandDays >= 0 ? `D-${sandDays}` : `D+${Math.abs(sandDays)}`}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity style={styles.quickLogBtn} onPress={() => recordSand(new Date())}>
            <Feather name="check" size={13} color="#BA7517" />
            <Text style={styles.quickLogText}>오늘 교체 완료</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>투약 알림</Text>
        <MedicationSection />

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>알람 설정</Text>
        <View style={styles.settingsCard}>
          {[
            { key: 'hospital' as const, label: '병원 방문 알림', sub: '방문 7일 전, 1일 전' },
            { key: 'sand' as const, label: '화장실 모래 교체 알림', sub: `교체 ${notifyLabel(sandNotifyDays)}` },
          ].map((item, i, arr) => (
            <View key={item.key} style={[styles.toggleRow, i < arr.length - 1 && styles.toggleBorder]}>
              <View style={styles.toggleInfo}>
                <Text style={styles.toggleLabel}>{item.label}</Text>
                <Text style={styles.toggleSub}>{item.sub}</Text>
              </View>
              <Switch value={alarms[item.key]} onValueChange={() => toggle(item.key)}
                trackColor={{ false: '#ddd', true: '#1D9E75' }} thumbColor="#fff" />
            </View>
          ))}
        </View>
      </ScrollView>

      <BottomSheet visible={panel === 'hospital'} onClose={() => setPanel(null)} title="병원 방문 주기 설정">
        <Text style={styles.fieldLabel}>마지막 방문일</Text>
        <TouchableOpacity style={[styles.dateBtn, showHospitalPicker && styles.dateBtnOpen]} onPress={() => setShowHospitalPicker(v => !v)}>
          <Feather name="calendar" size={15} color="#888" />
          <Text style={styles.dateBtnText}>{fmt(hospitalLastDate)}</Text>
          <Feather name={showHospitalPicker ? 'chevron-up' : 'chevron-down'} size={14} color="#aaa" />
        </TouchableOpacity>
        {showHospitalPicker && (
          <CalendarDropdown
            value={hospitalLastDate}
            max={new Date()}
            onChange={date => { setHospitalLastDate(date); setShowHospitalPicker(false) }}
          />
        )}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>방문 주기</Text>
        <View style={styles.cycleRow}>
          {HOSPITAL_CYCLES.map(c => (
            <TouchableOpacity key={c.label}
              style={[styles.cycleBtn, hospitalCycle === c.months && styles.cycleBtnActive]}
              onPress={() => setHospitalCycle(c.months)}>
              <Text style={[styles.cycleBtnText, hospitalCycle === c.months && styles.cycleBtnTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
        <View style={styles.nextDateBox}>
          <Text style={styles.nextDateLabel}>다음 방문 예정일</Text>
          <Text style={styles.nextDateValue}>{fmt(nextHospital)}</Text>
          <Text style={[styles.nextDateDday, { color: hospitalBadge.text }]}>
            {hospitalDays >= 0 ? `D-${hospitalDays}` : `D+${Math.abs(hospitalDays)}`}
          </Text>
        </View>
        <View style={[styles.toggleRow, { marginTop: 8 }]}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>알림</Text>
            <Text style={styles.toggleSub}>7일 전 + 1일 전</Text>
          </View>
          <Switch value={alarms.hospital} onValueChange={() => toggle('hospital')}
            trackColor={{ false: '#ddd', true: '#1D9E75' }} thumbColor="#fff" />
        </View>
      </BottomSheet>

      <BottomSheet visible={panel === 'sand'} onClose={() => setPanel(null)} title="화장실 모래 교체 설정">
        <Text style={styles.fieldLabel}>마지막 교체일</Text>
        <TouchableOpacity style={[styles.dateBtn, showSandPicker && styles.dateBtnOpen]} onPress={() => setShowSandPicker(v => !v)}>
          <Feather name="calendar" size={15} color="#888" />
          <Text style={styles.dateBtnText}>{fmt(sandLastDate)}</Text>
          <Feather name={showSandPicker ? 'chevron-up' : 'chevron-down'} size={14} color="#aaa" />
        </TouchableOpacity>
        {showSandPicker && (
          <CalendarDropdown
            value={sandLastDate}
            max={new Date()}
            onChange={recordSand}
          />
        )}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>교체 주기</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            style={[styles.stepperBtn, sandCycle <= 1 && styles.stepperBtnDisabled]}
            onPress={() => setSandCycle(v => Math.max(1, v - 1))}
            disabled={sandCycle <= 1}
          >
            <Text style={[styles.stepperBtnText, sandCycle <= 1 && styles.stepperBtnTextDisabled]}>－</Text>
          </TouchableOpacity>
          <View style={styles.stepperValue}>
            <Text style={styles.stepperNum}>{sandCycle}</Text>
            <Text style={styles.stepperUnit}>주</Text>
          </View>
          <TouchableOpacity
            style={[styles.stepperBtn, sandCycle >= 10 && styles.stepperBtnDisabled]}
            onPress={() => setSandCycle(v => Math.min(10, v + 1))}
            disabled={sandCycle >= 10}
          >
            <Text style={[styles.stepperBtnText, sandCycle >= 10 && styles.stepperBtnTextDisabled]}>＋</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.nextDateBox}>
          <Text style={styles.nextDateLabel}>다음 교체 예정일</Text>
          <Text style={styles.nextDateValue}>{fmt(nextSand)}</Text>
          <Text style={[styles.nextDateDday, { color: sandBadge.text }]}>
            {sandDays >= 0 ? `D-${sandDays}` : `D+${Math.abs(sandDays)}`}
          </Text>
        </View>
        <View style={[styles.toggleRow, { marginTop: 8 }]}>
          <View style={styles.toggleInfo}>
            <Text style={styles.toggleLabel}>교체 알림</Text>
            {alarms.sand
              ? <Text style={styles.toggleSub}>{notifyLabel(sandNotifyDays)}</Text>
              : <Text style={styles.toggleSub}>꺼짐</Text>
            }
          </View>
          <Switch value={alarms.sand} onValueChange={() => toggle('sand')}
            trackColor={{ false: '#ddd', true: '#1D9E75' }} thumbColor="#fff" />
        </View>
        {alarms.sand && (
          <View style={styles.notifySection}>
            <Text style={styles.notifySectionLabel}>알림 시기</Text>
            <View style={styles.notifyChips}>
              {[0, 1, 2, 3, 5, 7].map(d => {
                const active = sandNotifyDays.includes(d)
                return (
                  <TouchableOpacity
                    key={d}
                    style={[styles.notifyChip, active && styles.notifyChipActive]}
                    onPress={() => toggleNotifyDay(d)}
                  >
                    {active && <Feather name="check" size={11} color="#fff" />}
                    <Text style={[styles.notifyChipText, active && styles.notifyChipTextActive]}>
                      {d === 0 ? '당일' : `${d}일 전`}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>즐겨 쓰는 모래 바로가기</Text>
        {[
          { label: '두부 모래 구매 (쿠팡)', url: 'https://www.coupang.com/np/search?q=두부모래' },
          { label: '벤토나이트 모래 (네이버)', url: 'https://search.shopping.naver.com/search/all?query=벤토나이트+모래' },
        ].map(item => (
          <TouchableOpacity key={item.label} style={styles.linkBtnFull}>
            <Feather name="shopping-cart" size={14} color="#1D9E75" />
            <Text style={styles.linkBtnFullText}>{item.label}</Text>
          </TouchableOpacity>
        ))}
        <Text style={[styles.fieldLabel, { marginTop: 20 }]}>교체 기록</Text>
        <View style={styles.historyList}>
          {sandHistory.map((d, i) => (
            <View key={i} style={[styles.historyItem, i < sandHistory.length - 1 && styles.historyBorder]}>
              <View style={styles.historyDot} />
              <Text style={styles.historyDate}>{fmt(d)}</Text>
              <Text style={styles.historyRel}>{relTime(d)}</Text>
            </View>
          ))}
        </View>
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
  catAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FAECE7', alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  catInfo: { fontSize: 12, color: '#999', marginTop: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  alarmCard: {
    backgroundColor: '#fff', borderRadius: 14, marginBottom: 10,
    borderWidth: 0.5, borderColor: '#EBEBEB', overflow: 'hidden',
  },
  alarmCardMain: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 16,
  },
  quickLogBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    paddingVertical: 9, borderTopWidth: 0.5, borderTopColor: '#F5EDD8',
    backgroundColor: '#FFFBF2',
  },
  quickLogText: { fontSize: 13, color: '#BA7517', fontWeight: '600' },
  alarmIcon: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  alarmBody: { flex: 1 },
  alarmTitle: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  alarmSub: { fontSize: 12, color: '#999', marginTop: 2 },
  nextDate: { fontSize: 11, color: '#1D9E75', marginTop: 3, fontWeight: '500' },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  settingsCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#EBEBEB', paddingHorizontal: 16 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  toggleBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  toggleInfo: { flex: 1 },
  toggleLabel: { fontSize: 14, color: '#1a1a1a' },
  toggleSub: { fontSize: 11, color: '#aaa', marginTop: 2 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 8 },
  dateBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#F7F7F7', borderRadius: 10,
    paddingHorizontal: 16, paddingVertical: 13, borderWidth: 0.5, borderColor: '#E5E5E5',
  },
  dateBtnOpen: { borderColor: '#E9785A', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  dateBtnText: { fontSize: 15, color: '#1a1a1a', flex: 1 },
  cycleRow: { flexDirection: 'row', gap: 8 },
  cycleBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 0.5, borderColor: '#E5E5E5', alignItems: 'center' },
  cycleBtnActive: { backgroundColor: '#E9785A', borderColor: '#E9785A' },
  cycleBtnText: { fontSize: 13, color: '#666', fontWeight: '500' },
  cycleBtnTextActive: { color: '#fff', fontWeight: '700' },
  stepper: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: '#F7F7F7', borderRadius: 14,
    borderWidth: 0.5, borderColor: '#E5E5E5',
    overflow: 'hidden',
  },
  stepperBtn: {
    width: 52, height: 52,
    alignItems: 'center', justifyContent: 'center',
    backgroundColor: '#fff',
    borderWidth: 0.5, borderColor: '#E5E5E5',
  },
  stepperBtnDisabled: { backgroundColor: '#F7F7F7' },
  stepperBtnText: { fontSize: 22, color: '#BA7517', fontWeight: '300', lineHeight: 26 },
  stepperBtnTextDisabled: { color: '#ccc' },
  stepperValue: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    flexDirection: 'row', gap: 4, paddingVertical: 14,
  },
  stepperNum: { fontSize: 28, fontWeight: '700', color: '#1a1a1a' },
  stepperUnit: { fontSize: 14, fontWeight: '500', color: '#888', paddingTop: 6 },
  nextDateBox: { marginTop: 16, backgroundColor: '#FFF8F5', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextDateLabel: { fontSize: 13, color: '#888' },
  nextDateValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', flex: 1 },
  nextDateDday: { fontSize: 13, fontWeight: '700' },
  linkBtnFull: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E1F5EE', borderRadius: 10, padding: 13, marginBottom: 8 },
  linkBtnFullText: { fontSize: 13, color: '#1D9E75', fontWeight: '500' },
  notifySection: { backgroundColor: '#F9F9F9', borderRadius: 12, padding: 14, marginTop: 4 },
  notifySectionLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 10 },
  notifyChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  notifyChip: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    paddingHorizontal: 12, paddingVertical: 7,
    borderRadius: 20, borderWidth: 1, borderColor: '#E5E5E5',
    backgroundColor: '#fff',
  },
  notifyChipActive: { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  notifyChipText: { fontSize: 13, color: '#666', fontWeight: '500' },
  notifyChipTextActive: { color: '#fff', fontWeight: '600' },
  historyList: { borderRadius: 12, borderWidth: 0.5, borderColor: '#EBEBEB', overflow: 'hidden' },
  historyItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#fff' },
  historyBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F5F5F5' },
  historyDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#BA7517' },
  historyDate: { flex: 1, fontSize: 14, color: '#1a1a1a' },
  historyRel: { fontSize: 12, color: '#aaa' },
})

const calStyles = StyleSheet.create({
  container: {
    borderWidth: 0.5, borderColor: '#E9785A', borderTopWidth: 0,
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    backgroundColor: '#fff', paddingHorizontal: 8, paddingBottom: 8, marginBottom: 4,
  },
  nav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 10 },
  navBtn: { padding: 4 },
  navTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekLabel: { flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', color: '#999', paddingVertical: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: `${100 / 7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 100 },
  cellSel: { backgroundColor: '#E9785A' },
  dayText: { fontSize: 13, color: '#333' },
  dayTextSel: { color: '#fff', fontWeight: '700' },
  dayTextDis: { color: '#ddd' },
  sun: { color: '#E9785A' },
  sat: { color: '#5B8ECC' },
})
