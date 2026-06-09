import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker'
import { Image, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
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
const SAND_CYCLES = [
  { label: '1주', weeks: 1 },
  { label: '2주', weeks: 2 },
  { label: '4주', weeks: 4 },
  { label: '8주', weeks: 8 },
]

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
  const [sandCycle, setSandCycle] = useState(4)
  const [showSandPicker, setShowSandPicker] = useState(false)
  const [alarms, setAlarms] = useState({ hospital: true, sand: true, medication: false })
  const toggle = (key: keyof typeof alarms) => setAlarms(p => ({ ...p, [key]: !p[key] }))
  const [panel, setPanel] = useState<'hospital' | 'sand' | null>(null)

  const nextHospital = addMonths(hospitalLastDate, hospitalCycle)
  const nextSand = addWeeks(sandLastDate, sandCycle)
  const hospitalDays = daysUntil(nextHospital)
  const sandDays = daysUntil(nextSand)
  const hospitalBadge = getBadgeStyle(hospitalDays)
  const sandBadge = getBadgeStyle(sandDays)

  const onHospitalDateChange = (e: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowHospitalPicker(false)
    if (e.type === 'set' && date) setHospitalLastDate(date)
  }
  const onSandDateChange = (e: DateTimePickerEvent, date?: Date) => {
    if (Platform.OS === 'android') setShowSandPicker(false)
    if (e.type === 'set' && date) setSandLastDate(date)
  }

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
        </TouchableOpacity>

        <TouchableOpacity style={styles.alarmCard} onPress={() => setPanel('sand')}>
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

        <Text style={styles.sectionTitle}>투약 알림</Text>
        <MedicationSection />

        <Text style={[styles.sectionTitle, { marginTop: 8 }]}>알람 설정</Text>
        <View style={styles.settingsCard}>
          {[
            { key: 'hospital' as const, label: '병원 방문 알림', sub: '방문 7일 전, 1일 전' },
            { key: 'sand' as const, label: '화장실 모래 교체 알림', sub: '교체 3일 전, 당일' },
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
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowHospitalPicker(true)}>
          <Feather name="calendar" size={15} color="#888" />
          <Text style={styles.dateBtnText}>{fmt(hospitalLastDate)}</Text>
        </TouchableOpacity>
        {showHospitalPicker && (
          <DateTimePicker value={hospitalLastDate} mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={new Date()} onChange={onHospitalDateChange} style={styles.datePicker} />
        )}
        {Platform.OS === 'ios' && showHospitalPicker && (
          <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowHospitalPicker(false)}>
            <Text style={styles.confirmBtnText}>확인</Text>
          </TouchableOpacity>
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
        <TouchableOpacity style={styles.dateBtn} onPress={() => setShowSandPicker(true)}>
          <Feather name="calendar" size={15} color="#888" />
          <Text style={styles.dateBtnText}>{fmt(sandLastDate)}</Text>
        </TouchableOpacity>
        {showSandPicker && (
          <DateTimePicker value={sandLastDate} mode="date"
            display={Platform.OS === 'ios' ? 'inline' : 'default'}
            maximumDate={new Date()} onChange={onSandDateChange} style={styles.datePicker} />
        )}
        {Platform.OS === 'ios' && showSandPicker && (
          <TouchableOpacity style={styles.confirmBtn} onPress={() => setShowSandPicker(false)}>
            <Text style={styles.confirmBtnText}>확인</Text>
          </TouchableOpacity>
        )}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>교체 주기</Text>
        <View style={styles.cycleRow}>
          {SAND_CYCLES.map(c => (
            <TouchableOpacity key={c.label}
              style={[styles.cycleBtn, sandCycle === c.weeks && styles.cycleBtnActive]}
              onPress={() => setSandCycle(c.weeks)}>
              <Text style={[styles.cycleBtnText, sandCycle === c.weeks && styles.cycleBtnTextActive]}>{c.label}</Text>
            </TouchableOpacity>
          ))}
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
            <Text style={styles.toggleSub}>3일 전 + 당일</Text>
          </View>
          <Switch value={alarms.sand} onValueChange={() => toggle('sand')}
            trackColor={{ false: '#ddd', true: '#1D9E75' }} thumbColor="#fff" />
        </View>
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
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 14, padding: 16, marginBottom: 10,
    borderWidth: 0.5, borderColor: '#EBEBEB',
  },
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
  dateBtnText: { fontSize: 15, color: '#1a1a1a' },
  datePicker: { marginTop: 8 },
  confirmBtn: { backgroundColor: '#E9785A', borderRadius: 10, paddingVertical: 10, alignItems: 'center', marginTop: 8 },
  confirmBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  cycleRow: { flexDirection: 'row', gap: 8 },
  cycleBtn: { flex: 1, paddingVertical: 9, borderRadius: 10, borderWidth: 0.5, borderColor: '#E5E5E5', alignItems: 'center' },
  cycleBtnActive: { backgroundColor: '#E9785A', borderColor: '#E9785A' },
  cycleBtnText: { fontSize: 13, color: '#666', fontWeight: '500' },
  cycleBtnTextActive: { color: '#fff', fontWeight: '700' },
  nextDateBox: { marginTop: 16, backgroundColor: '#FFF8F5', borderRadius: 12, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 8 },
  nextDateLabel: { fontSize: 13, color: '#888' },
  nextDateValue: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', flex: 1 },
  nextDateDday: { fontSize: 13, fontWeight: '700' },
  linkBtnFull: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#E1F5EE', borderRadius: 10, padding: 13, marginBottom: 8 },
  linkBtnFullText: { fontSize: 13, color: '#1D9E75', fontWeight: '500' },
})
