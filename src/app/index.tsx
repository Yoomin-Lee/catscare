import { Image, Linking, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native'
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

type NotifyEntry = { id: string; days: number; time: string }

const DAY_OPTIONS = [
  { value: 0,  label: '당일' },
  { value: 1,  label: '1일 전' },
  { value: 2,  label: '2일 전' },
  { value: 3,  label: '3일 전' },
  { value: 5,  label: '5일 전' },
  { value: 7,  label: '1주 전' },
  { value: 14, label: '2주 전' },
]

const TIME_OPTIONS = Array.from({ length: 34 }, (_, i) => {
  const totalMins = 360 + i * 30   // 06:00 ~ 22:30, 30분 단위
  const h = Math.floor(totalMins / 60)
  const m = totalMins % 60
  const ampm = h < 12 ? '오전' : '오후'
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h
  const pad = (n: number) => String(n).padStart(2, '0')
  return { value: `${pad(h)}:${pad(m)}`, label: `${ampm} ${h12}:${pad(m)}` }
})

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
  const [sandNotify, setSandNotify] = useState<NotifyEntry[]>([
    { id: '1', days: 3, time: '09:00' },
    { id: '2', days: 0, time: '09:00' },
  ])
  const [hospitalNotify, setHospitalNotify] = useState<NotifyEntry[]>([
    { id: 'h1', days: 7, time: '09:00' },
    { id: 'h2', days: 1, time: '09:00' },
  ])
  const [openDrop, setOpenDrop] = useState<string | null>(null)

  const notifyLabel = (entries: NotifyEntry[]) => {
    if (entries.length === 0) return '없음'
    return entries
      .sort((a, b) => b.days - a.days)
      .map(e => {
        const dayStr = DAY_OPTIONS.find(o => o.value === e.days)?.label ?? `${e.days}일 전`
        const timeStr = TIME_OPTIONS.find(o => o.value === e.time)?.label ?? e.time
        return `${dayStr} ${timeStr}`
      })
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
            { key: 'hospital' as const, label: '병원 방문 알림', sub: `방문 ${notifyLabel(hospitalNotify)}` },
            { key: 'sand' as const, label: '화장실 모래 교체 알림', sub: `교체 ${notifyLabel(sandNotify)}` },
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
            <Text style={styles.toggleLabel}>방문 알림</Text>
            {alarms.hospital
              ? <Text style={styles.toggleSub}>{notifyLabel(hospitalNotify)}</Text>
              : <Text style={styles.toggleSub}>꺼짐</Text>
            }
          </View>
          <Switch value={alarms.hospital} onValueChange={() => toggle('hospital')}
            trackColor={{ false: '#ddd', true: '#1D9E75' }} thumbColor="#fff" />
        </View>
        {alarms.hospital && (
          <View style={styles.notifySection}>
            <Text style={styles.notifySectionLabel}>알림 시기</Text>
            {hospitalNotify.map(entry => {
              const dayOpen  = openDrop === `${entry.id}-day`
              const timeOpen = openDrop === `${entry.id}-time`
              const dayLabel  = DAY_OPTIONS.find(o => o.value === entry.days)?.label ?? ''
              const timeLabel = TIME_OPTIONS.find(o => o.value === entry.time)?.label ?? ''
              return (
                <View key={entry.id} style={styles.notifyRow}>
                  <View style={styles.notifySelRow}>
                    <TouchableOpacity
                      style={[styles.notifySel, styles.notifySelDay, dayOpen && styles.notifySelOpen]}
                      onPress={() => setOpenDrop(dayOpen ? null : `${entry.id}-day`)}
                    >
                      <Text style={styles.notifySelText}>{dayLabel}</Text>
                      <Feather name={dayOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#888" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.notifySel, styles.notifySelTime, timeOpen && styles.notifySelOpen]}
                      onPress={() => setOpenDrop(timeOpen ? null : `${entry.id}-time`)}
                    >
                      <Text style={styles.notifySelText}>{timeLabel}</Text>
                      <Feather name={timeOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#888" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.notifyRemove}
                      onPress={() => { setHospitalNotify(p => p.filter(e => e.id !== entry.id)); setOpenDrop(null) }}
                    >
                      <Feather name="x" size={15} color="#bbb" />
                    </TouchableOpacity>
                  </View>
                  {dayOpen && (
                    <View style={styles.dropList}>
                      {DAY_OPTIONS.map(o => (
                        <TouchableOpacity key={o.value} style={styles.dropItem}
                          onPress={() => { setHospitalNotify(p => p.map(e => e.id === entry.id ? { ...e, days: o.value } : e)); setOpenDrop(null) }}>
                          <Feather name="check" size={13} color={entry.days === o.value ? '#1D9E75' : 'transparent'} />
                          <Text style={[styles.dropItemText, entry.days === o.value && styles.dropItemActive]}>{o.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {timeOpen && (
                    <View style={styles.dropList}>
                      {TIME_OPTIONS.map(o => (
                        <TouchableOpacity key={o.value} style={styles.dropItem}
                          onPress={() => { setHospitalNotify(p => p.map(e => e.id === entry.id ? { ...e, time: o.value } : e)); setOpenDrop(null) }}>
                          <Feather name="check" size={13} color={entry.time === o.value ? '#1D9E75' : 'transparent'} />
                          <Text style={[styles.dropItemText, entry.time === o.value && styles.dropItemActive]}>{o.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )
            })}
            {hospitalNotify.length < 5 && (
              <TouchableOpacity style={styles.addNotifyBtn}
                onPress={() => setHospitalNotify(p => [...p, { id: Date.now().toString(), days: 1, time: '09:00' }])}>
                <Feather name="plus" size={13} color="#1D9E75" />
                <Text style={styles.addNotifyText}>알림 추가</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
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
              ? <Text style={styles.toggleSub}>{notifyLabel(sandNotify)}</Text>
              : <Text style={styles.toggleSub}>꺼짐</Text>
            }
          </View>
          <Switch value={alarms.sand} onValueChange={() => toggle('sand')}
            trackColor={{ false: '#ddd', true: '#1D9E75' }} thumbColor="#fff" />
        </View>
        {alarms.sand && (
          <View style={styles.notifySection}>
            <Text style={styles.notifySectionLabel}>알림 시기</Text>
            {sandNotify.map(entry => {
              const dayOpen  = openDrop === `${entry.id}-day`
              const timeOpen = openDrop === `${entry.id}-time`
              const dayLabel  = DAY_OPTIONS.find(o => o.value === entry.days)?.label ?? ''
              const timeLabel = TIME_OPTIONS.find(o => o.value === entry.time)?.label ?? ''
              return (
                <View key={entry.id} style={styles.notifyRow}>
                  <View style={styles.notifySelRow}>
                    <TouchableOpacity
                      style={[styles.notifySel, styles.notifySelDay, dayOpen && styles.notifySelOpen]}
                      onPress={() => setOpenDrop(dayOpen ? null : `${entry.id}-day`)}
                    >
                      <Text style={styles.notifySelText}>{dayLabel}</Text>
                      <Feather name={dayOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#888" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.notifySel, styles.notifySelTime, timeOpen && styles.notifySelOpen]}
                      onPress={() => setOpenDrop(timeOpen ? null : `${entry.id}-time`)}
                    >
                      <Text style={styles.notifySelText}>{timeLabel}</Text>
                      <Feather name={timeOpen ? 'chevron-up' : 'chevron-down'} size={12} color="#888" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.notifyRemove}
                      onPress={() => { setSandNotify(p => p.filter(e => e.id !== entry.id)); setOpenDrop(null) }}
                    >
                      <Feather name="x" size={15} color="#bbb" />
                    </TouchableOpacity>
                  </View>
                  {dayOpen && (
                    <View style={styles.dropList}>
                      {DAY_OPTIONS.map(o => (
                        <TouchableOpacity key={o.value} style={styles.dropItem}
                          onPress={() => { setSandNotify(p => p.map(e => e.id === entry.id ? { ...e, days: o.value } : e)); setOpenDrop(null) }}>
                          <Feather name="check" size={13} color={entry.days === o.value ? '#1D9E75' : 'transparent'} />
                          <Text style={[styles.dropItemText, entry.days === o.value && styles.dropItemActive]}>{o.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  {timeOpen && (
                    <View style={styles.dropList}>
                      {TIME_OPTIONS.map(o => (
                        <TouchableOpacity key={o.value} style={styles.dropItem}
                          onPress={() => { setSandNotify(p => p.map(e => e.id === entry.id ? { ...e, time: o.value } : e)); setOpenDrop(null) }}>
                          <Feather name="check" size={13} color={entry.time === o.value ? '#1D9E75' : 'transparent'} />
                          <Text style={[styles.dropItemText, entry.time === o.value && styles.dropItemActive]}>{o.label}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              )
            })}
            {sandNotify.length < 5 && (
              <TouchableOpacity style={styles.addNotifyBtn}
                onPress={() => setSandNotify(p => [...p, { id: Date.now().toString(), days: 1, time: '09:00' }])}>
                <Feather name="plus" size={13} color="#1D9E75" />
                <Text style={styles.addNotifyText}>알림 추가</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        <Text style={[styles.fieldLabel, { marginTop: 16 }]}>즐겨 쓰는 모래 바로가기</Text>
        {[
          { label: '두부 모래 구매 (쿠팡)', url: 'https://www.coupang.com/np/search?q=두부모래' },
          { label: '벤토나이트 모래 (쿠팡)', url: 'https://www.coupang.com/vp/products/1349710539?itemId=28075863531&vendorItemId=95032406165&q=%EC%98%A4%EB%8D%94%EC%BA%85+%EB%AC%B4%ED%96%A5&searchId=63508eff1405195&sourceType=search&itemsCount=60&searchRank=2&rank=2&traceId=mq6o2tm0' },
        ].map(item => (
          <TouchableOpacity key={item.label} style={styles.linkBtnFull} onPress={() => Linking.openURL(item.url)}>
            <Feather name="shopping-cart" size={14} color="#1D9E75" />
            <Text style={styles.linkBtnFullText}>{item.label}</Text>
            <Feather name="external-link" size={12} color="#1D9E75" />
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
  notifyRow: { marginBottom: 6 },
  notifySelRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  notifySel: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fff', borderRadius: 8, borderWidth: 0.5, borderColor: '#E5E5E5',
    paddingHorizontal: 10, paddingVertical: 9,
  },
  notifySelDay: { flex: 1 },
  notifySelTime: { flex: 1.4 },
  notifySelOpen: { borderColor: '#1D9E75', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  notifySelText: { flex: 1, fontSize: 13, color: '#1a1a1a' },
  notifyRemove: { padding: 6 },
  dropList: {
    backgroundColor: '#fff', borderWidth: 0.5, borderColor: '#1D9E75',
    borderTopWidth: 0, borderBottomLeftRadius: 8, borderBottomRightRadius: 8,
    marginBottom: 2, overflow: 'hidden',
  },
  dropItem: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderTopWidth: 0.5, borderTopColor: '#F5F5F5' },
  dropItemText: { fontSize: 13, color: '#444' },
  dropItemActive: { color: '#1D9E75', fontWeight: '600' },
  addNotifyBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 6, paddingVertical: 8 },
  addNotifyText: { fontSize: 13, color: '#1D9E75', fontWeight: '600' },
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
