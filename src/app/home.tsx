import { Image, ScrollView, StyleSheet, Switch, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import * as ImagePicker from 'expo-image-picker'
import { useState, useEffect } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import BottomSheet from '@/components/bottom-sheet'
import { useCats, catAvatarColor, type Cat } from '@/lib/cats-context'
import { useAuth } from '@/lib/auth-context'
import { useSchedule } from '@/lib/schedule-context'
import { supabase } from '@/lib/supabase'

const NOW = new Date()
const YEARS = Array.from({ length: 30 }, (_, i) => String(NOW.getFullYear() - i))
const MONTHS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'))
const DAYS = Array.from({ length: 31 }, (_, i) => String(i + 1).padStart(2, '0'))

function calcAge(birthDate: string): number {
  const [y, m, d] = birthDate.split('.').map(Number)
  if (!y || !m || !d) return 0
  let age = NOW.getFullYear() - y
  if (NOW.getMonth() + 1 < m || (NOW.getMonth() + 1 === m && NOW.getDate() < d)) age--
  return Math.max(0, age)
}

function parseBirth(birthDate?: string) {
  const parts = birthDate?.split('.') ?? []
  return { y: parts[0] ?? '', m: parts[1] ?? '', d: parts[2] ?? '' }
}

const GENDER_COLORS = { female: '#E9785A', male: '#534AB7' }

const BREEDS = [
  '코리안숏헤어 (고등어)', '코리안숏헤어 (턱시도)', '코리안숏헤어 (치즈)',
  '코리안숏헤어 (삼색)', '코리안숏헤어 (흰색)', '코리안숏헤어 (검정)',
  '__divider__',
  '페르시안', '러시안블루', '샴', '노르웨이숲고양이',
  '메인쿤', '스코티시폴드', '버만', '뱅갈', '터키시앙고라',
  '아비시니안', '브리티시숏헤어', '렉돌', '먼치킨', '히말라얀', '기타',
]

function catSubtitle(cat: Cat) {
  const age = cat.birthDate ? calcAge(cat.birthDate) : cat.ageYears
  const birthStr = cat.birthDate ? ` (${cat.birthDate})` : ''
  return `${cat.breed} · ${age}살${birthStr} · ${cat.weightKg}kg`
}

function emptyForm(): Omit<Cat, 'id'> {
  return { name: '', breed: '', ageYears: 0, birthDate: undefined, weightKg: 0, gender: 'female', neutered: false, photoUri: undefined }
}

function CatAvatarDisplay({ cat, size }: { cat: Cat; size: number }) {
  const color = catAvatarColor(cat)
  if (cat.photoUri) {
    return <Image source={{ uri: cat.photoUri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: color + '22', alignItems: 'center', justifyContent: 'center' }}>
      <FontAwesome5 name="cat" size={size * 0.5} color={color} />
    </View>
  )
}

type AccountInfo = {
  email: string
  provider: 'google' | 'email' | 'kakao' | 'unknown'
}

const PROVIDER_LABEL: Record<AccountInfo['provider'], string> = {
  google: 'Google',
  email: '이메일',
  kakao: '카카오',
  unknown: '알 수 없음',
}
const PROVIDER_COLOR: Record<AccountInfo['provider'], string> = {
  google: '#EA4335',
  email: '#534AB7',
  kakao: '#FEE500',
  unknown: '#aaa',
}
const PROVIDER_ICON: Record<AccountInfo['provider'], string> = {
  google: 'globe',
  email: 'mail',
  kakao: 'message-circle',
  unknown: 'user',
}

export default function HomeScreen() {
  const { cats, selectedId, selectedCat, selectCat, addCat, updateCat, removeCat } = useCats()
  const { exitGuestMode } = useAuth()
  const { getSchedule } = useSchedule()

  const schedule = getSchedule(selectedCat.id)
  const nextHospital = (() => { const d = new Date(schedule.hospitalLastDate); d.setMonth(d.getMonth() + schedule.hospitalCycle); return d })()
  const nextSand = (() => { const d = new Date(schedule.sandLastDate); d.setDate(d.getDate() + schedule.sandCycle * 7); return d })()
  const hospitalDays = Math.ceil((nextHospital.setHours(0,0,0,0), nextHospital.getTime() - new Date().setHours(0,0,0,0)) / 86400000)
  const sandDays = Math.ceil((nextSand.setHours(0,0,0,0), nextSand.getTime() - new Date().setHours(0,0,0,0)) / 86400000)
  const fmtDate = (d: Date) => `${d.getFullYear()}.${String(d.getMonth()+1).padStart(2,'0')}.${String(d.getDate()).padStart(2,'0')}`
  const dday = (days: number) => days >= 0 ? `D-${days}` : `D+${Math.abs(days)}`
  const ddayColor = (days: number) => days <= 3 ? '#BA7517' : days <= 14 ? '#993C1D' : '#1D9E75'

  const [sheetMode, setSheetMode] = useState<'add' | 'edit' | 'settings' | null>(null)
  const [account, setAccount] = useState<AccountInfo | null>(null)
  const [form, setForm] = useState<Omit<Cat, 'id'>>(emptyForm())
  const [editId, setEditId] = useState<string | null>(null)
  const [showBreedList, setShowBreedList] = useState(false)
  const [breedOption, setBreedOption] = useState('')
  const [openDrop, setOpenDrop] = useState<'year' | 'month' | 'day' | null>(null)
  const [birthY, setBirthY] = useState('')
  const [birthM, setBirthM] = useState('')
  const [birthD, setBirthD] = useState('')
  const [weightText, setWeightText] = useState('')

  const setBirthPart = (part: 'y' | 'm' | 'd', val: string) => {
    const next = { y: birthY, m: birthM, d: birthD, [part]: val }
    if (part === 'y') setBirthY(val)
    if (part === 'm') setBirthM(val)
    if (part === 'd') setBirthD(val)
    const dateStr = next.y && next.m && next.d ? `${next.y}.${next.m}.${next.d}` : undefined
    setForm(f => ({ ...f, birthDate: dateStr, ageYears: dateStr ? calcAge(dateStr) : f.ageYears }))
    setOpenDrop(null)
  }

  const openAdd = () => {
    const ef = emptyForm()
    setForm(ef); setEditId(null); setBreedOption(''); setShowBreedList(false)
    setBirthY(''); setBirthM(''); setBirthD(''); setOpenDrop(null)
    setWeightText(''); setSheetMode('add')
  }
  const openEdit = (cat: Cat) => {
    setForm({ name: cat.name, breed: cat.breed, ageYears: cat.ageYears, birthDate: cat.birthDate, weightKg: cat.weightKg, gender: cat.gender, neutered: cat.neutered, photoUri: cat.photoUri })
    setBreedOption(BREEDS.includes(cat.breed) ? cat.breed : (cat.breed ? '기타' : ''))
    const p = parseBirth(cat.birthDate)
    setBirthY(p.y); setBirthM(p.m); setBirthD(p.d)
    setWeightText(String(cat.weightKg))
    setShowBreedList(false); setOpenDrop(null); setEditId(cat.id); setSheetMode('edit')
  }
  const selectBreed = (breed: string) => {
    if (breed === '__divider__') return
    setBreedOption(breed)
    if (breed !== '기타') setForm(f => ({ ...f, breed }))
    else setForm(f => ({ ...f, breed: '' }))
    setShowBreedList(false)
  }
  const save = () => {
    if (!form.name.trim()) return
    if (sheetMode === 'edit' && editId) updateCat(editId, form)
    else addCat(form)
    setSheetMode(null)
  }
  const pickPhoto = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    })
    if (!result.canceled && result.assets[0]) {
      setForm(f => ({ ...f, photoUri: result.assets[0].uri }))
    }
  }
  const remove = () => {
    if (editId) removeCat(editId)
    setSheetMode(null)
  }

  const openSettings = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setAccount(null); setSheetMode('settings'); return }
    const identity = user.identities?.[0]
    const provider = (identity?.provider ?? 'unknown') as AccountInfo['provider']
    setAccount({ email: user.email ?? '', provider })
    setSheetMode('settings')
  }

  const logout = async () => {
    await supabase.auth.signOut()
    setSheetMode(null)
  }

  const accentColor = GENDER_COLORS[selectedCat.gender]

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.pageHeader}>
        <Text style={styles.pageTitle}>CatsCare</Text>
        <TouchableOpacity onPress={openSettings} style={styles.settingsBtn}>
          <Feather name="settings" size={20} color="#bbb" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>

        {/* ── 고양이 선택 ── */}
        <Text style={styles.sectionTitle}>내 고양이</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll} contentContainerStyle={styles.catScrollContent}>
          {cats.map(cat => {
            const isSelected = cat.id === selectedId
            const color = catAvatarColor(cat)
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.catCard, isSelected && { borderColor: color, borderWidth: 2 }]}
                onPress={() => selectCat(cat.id)}>
                <CatAvatarDisplay cat={cat} size={40} />
                <Text style={[styles.catCardName, isSelected && { color }]}>{cat.name}</Text>
                <Text style={styles.catCardBreed} numberOfLines={1}>{cat.breed}</Text>
                {isSelected && (
                  <TouchableOpacity style={styles.editIconBtn} onPress={() => openEdit(cat)}>
                    <Feather name="edit-2" size={11} color={color} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )
          })}
          <TouchableOpacity style={styles.addCatCard} onPress={openAdd}>
            <View style={styles.addCatIcon}>
              <Feather name="plus" size={20} color="#bbb" />
            </View>
            <Text style={styles.addCatLabel}>추가</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* ── 선택된 고양이 프로필 ── */}
        <View style={[styles.profileCard, { borderLeftColor: accentColor }]}>
          <CatAvatarDisplay cat={selectedCat} size={50} />
          <View style={styles.profileInfo}>
            <View style={styles.profileNameRow}>
              <Text style={styles.profileName}>{selectedCat.name}</Text>
              <View style={[styles.genderBadge, { backgroundColor: accentColor + '20' }]}>
                <Text style={[styles.genderBadgeText, { color: accentColor }]}>
                  {selectedCat.gender === 'female' ? '암컷' : '수컷'}
                </Text>
              </View>
              {selectedCat.neutered && (
                <View style={styles.neuteredBadge}>
                  <Text style={styles.neuteredBadgeText}>중성화</Text>
                </View>
              )}
            </View>
            <Text style={styles.profileDetail}>{catSubtitle(selectedCat)}</Text>
          </View>
          <TouchableOpacity onPress={() => openEdit(selectedCat)}>
            <Feather name="edit-2" size={16} color="#ccc" />
          </TouchableOpacity>
        </View>

        {/* ── 다가오는 일정 ── */}
        <Text style={styles.sectionTitle}>다가오는 일정</Text>
        <View style={styles.scheduleRow}>
          <View style={[styles.scheduleCard, { borderLeftColor: '#E9785A' }]}>
            <View style={[styles.scheduleIconWrap, { backgroundColor: '#FAECE7' }]}>
              <Feather name="activity" size={16} color="#E9785A" />
            </View>
            <Text style={styles.scheduleLabel}>정기 병원</Text>
            <Text style={[styles.scheduleDday, { color: ddayColor(hospitalDays) }]}>{dday(hospitalDays)}</Text>
            <Text style={styles.scheduleDate}>{fmtDate(nextHospital)}</Text>
          </View>
          <View style={[styles.scheduleCard, { borderLeftColor: '#BA7517' }]}>
            <View style={[styles.scheduleIconWrap, { backgroundColor: '#FAEEDA' }]}>
              <Feather name="refresh-cw" size={16} color="#BA7517" />
            </View>
            <Text style={styles.scheduleLabel}>모래 교체</Text>
            <Text style={[styles.scheduleDday, { color: ddayColor(sandDays) }]}>{dday(sandDays)}</Text>
            <Text style={styles.scheduleDate}>{fmtDate(nextSand)}</Text>
          </View>
        </View>

        {/* ── 투약 현황 ── */}
        <Text style={styles.sectionTitle}>투약 현황</Text>
        <View style={styles.medCard}>
          <View style={styles.medRow}>
            <View style={styles.medIconWrap}>
              <FontAwesome5 name="pills" size={15} color="#1D9E75" />
            </View>
            <View style={styles.medBody}>
              <Text style={styles.medName}>구충제 (내부)</Text>
              <Text style={styles.medDetail}>1정 · 매월 1회 · 오전 9시</Text>
            </View>
            <View style={styles.statusBadge}>
              <Text style={styles.statusBadgeText}>복용중</Text>
            </View>
          </View>
        </View>

        {/* ── 건강 통계 ── */}
        <Text style={styles.sectionTitle}>건강 통계</Text>
        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Feather name="activity" size={18} color="#1D9E75" />
            <Text style={styles.statNum}>{selectedCat.weightKg}<Text style={styles.statUnit}>kg</Text></Text>
            <Text style={styles.statLabel}>현재 체중</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="trending-down" size={18} color="#1D9E75" />
            <Text style={[styles.statNum, { color: '#1D9E75', fontSize: 18 }]}>▼0.1</Text>
            <Text style={styles.statLabel}>전주 대비</Text>
          </View>
          <View style={styles.statCard}>
            <Feather name="target" size={18} color="#534AB7" />
            <Text style={styles.statNum}>{(selectedCat.weightKg - 0.1).toFixed(1)}<Text style={styles.statUnit}>kg</Text></Text>
            <Text style={styles.statLabel}>목표 체중</Text>
          </View>
        </View>

        {/* ── 최근 식사 ── */}
        <Text style={styles.sectionTitle}>최근 식사</Text>
        <View style={styles.foodCard}>
          <View style={styles.foodIconWrap}>
            <Feather name="coffee" size={18} color="#E9785A" />
          </View>
          <View style={styles.foodBody}>
            <Text style={styles.foodName}>고메 참치+새우 파우치</Text>
            <Text style={styles.foodMeta}>습식 · 2025.11.18</Text>
          </View>
          <View style={styles.foodPref}>
            <Feather name="heart" size={13} color="#E9785A" />
            <Text style={styles.foodPrefText}>환장함</Text>
          </View>
        </View>

        {/* ── 접종 현황 ── */}
        <Text style={styles.sectionTitle}>접종 현황</Text>
        <View style={styles.vaccCard}>
          {[
            { name: '종합백신 (FVRCP)', next: '다음 접종 2026.03', done: true },
            { name: '광견병 백신', next: '다음 접종 2026.03', done: true },
            { name: '고양이 백혈병 (FeLV)', next: '미접종 · 수의사 상담 필요', done: false },
          ].map((v, i, arr) => (
            <View key={v.name} style={[styles.vaccItem, i < arr.length - 1 && styles.vaccBorder]}>
              <Feather name={v.done ? 'check-circle' : 'circle'} size={16} color={v.done ? '#1D9E75' : '#BA7517'} />
              <View style={styles.vaccBody}>
                <Text style={styles.vaccName}>{v.name}</Text>
                <Text style={[styles.vaccNext, !v.done && { color: '#BA7517' }]}>{v.next}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      {/* ── 계정 설정 바텀시트 ── */}
      <BottomSheet visible={sheetMode === 'settings'} onClose={() => setSheetMode(null)} title="계정 설정">
        {account ? (
          <>
            <View style={styles.accountCard}>
              <View style={[styles.accountIconWrap, { backgroundColor: PROVIDER_COLOR[account.provider] + '18' }]}>
                <Feather name={PROVIDER_ICON[account.provider] as any} size={22} color={PROVIDER_COLOR[account.provider]} />
              </View>
              <View style={styles.accountInfo}>
                <View style={styles.accountBadgeRow}>
                  <View style={[styles.providerBadge, { backgroundColor: PROVIDER_COLOR[account.provider] + '18' }]}>
                    <Text style={[styles.providerBadgeText, { color: PROVIDER_COLOR[account.provider] }]}>
                      {PROVIDER_LABEL[account.provider]}
                    </Text>
                  </View>
                  <Text style={styles.accountConnectedText}>로 연결됨</Text>
                </View>
                <Text style={styles.accountEmail}>{account.email}</Text>
              </View>
            </View>
            <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
              <Feather name="log-out" size={16} color="#E9785A" />
              <Text style={styles.logoutBtnText}>로그아웃</Text>
            </TouchableOpacity>
          </>
        ) : (
          <View style={styles.guestAccountCard}>
            <Feather name="user" size={28} color="#bbb" />
            <Text style={styles.guestAccountText}>게스트 모드로 사용 중이에요{'\n'}로그인하면 데이터가 저장돼요</Text>
            <TouchableOpacity style={styles.guestLoginBtn} onPress={() => { setSheetMode(null); exitGuestMode() }}>
              <Text style={styles.guestLoginBtnText}>로그인하러 가기</Text>
            </TouchableOpacity>
          </View>
        )}
      </BottomSheet>

      {/* ── 추가/수정 바텀시트 ── */}
      <BottomSheet
        visible={sheetMode === 'add' || sheetMode === 'edit'}
        onClose={() => setSheetMode(null)}
        title={sheetMode === 'edit' ? '프로필 수정' : '새 고양이 추가'}>

        {/* 프로필 사진 */}
        <View style={styles.photoSection}>
          <TouchableOpacity style={styles.photoBtn} onPress={pickPhoto}>
            {form.photoUri ? (
              <Image source={{ uri: form.photoUri }} style={styles.photoPreview} />
            ) : (
              (() => {
                const avatarColor = catAvatarColor({ name: form.name, breed: form.breed })
                return (
                  <View style={[styles.photoPlaceholder, { backgroundColor: avatarColor + '28' }]}>
                    <FontAwesome5 name="cat" size={28} color={avatarColor} />
                  </View>
                )
              })()
            )}
            <View style={styles.photoEditBadge}>
              <Feather name="camera" size={12} color="#fff" />
            </View>
          </TouchableOpacity>
          <View style={styles.photoHint}>
            <Text style={styles.photoHintTitle}>프로필 사진</Text>
            <Text style={styles.photoHintSub}>사진을 등록하지 않으면{'\n'}품종에 맞는 색상으로 자동 생성돼요</Text>
          </View>
        </View>

        <Text style={styles.fieldLabel}>이름 *</Text>
        <TextInput style={styles.input} placeholder="예: 나비, 미호" placeholderTextColor="#bbb"
          value={form.name} onChangeText={v => setForm(f => ({ ...f, name: v }))} />

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>품종</Text>
        <TouchableOpacity style={[styles.selectBtn, showBreedList && styles.selectBtnOpen]} onPress={() => setShowBreedList(v => !v)}>
          <Text style={[styles.selectBtnText, !breedOption && { color: '#bbb' }]}>
            {breedOption || '품종 선택'}
          </Text>
          <Feather name={showBreedList ? 'chevron-up' : 'chevron-down'} size={16} color="#aaa" />
        </TouchableOpacity>
        {showBreedList && (
          <View style={styles.breedDropdown}>
            {BREEDS.map((b, i) =>
              b === '__divider__' ? (
                <View key="divider" style={styles.breedDivider} />
              ) : (
                <TouchableOpacity key={b} style={[styles.breedItem, breedOption === b && styles.breedItemSelected]} onPress={() => selectBreed(b)}>
                  <View style={[styles.breedDot, { backgroundColor: catAvatarColor({ name: '', breed: b }) }]} />
                  <Text style={[styles.breedItemText, b === '기타' && styles.breedItemOther, breedOption === b && styles.breedItemTextSelected]}>{b}</Text>
                  {breedOption === b && <Feather name="check" size={15} color="#E9785A" />}
                </TouchableOpacity>
              )
            )}
          </View>
        )}
        {breedOption === '기타' && (
          <TextInput
            style={[styles.input, { marginTop: 8 }]}
            placeholder="품종을 직접 입력하세요"
            placeholderTextColor="#bbb"
            value={form.breed}
            onChangeText={v => setForm(f => ({ ...f, breed: v }))}
            autoFocus
          />
        )}

        {/* 생년월일 */}
        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>생년월일</Text>
        <View style={styles.birthDropRow}>
          <TouchableOpacity style={[styles.birthDropBtn, openDrop === 'year' && styles.birthDropBtnOpen]} onPress={() => setOpenDrop(openDrop === 'year' ? null : 'year')}>
            <Text style={[styles.birthDropText, !birthY && { color: '#bbb' }]}>{birthY ? `${birthY}년` : '연도'}</Text>
            <Feather name={openDrop === 'year' ? 'chevron-up' : 'chevron-down'} size={13} color="#aaa" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.birthDropBtn, openDrop === 'month' && styles.birthDropBtnOpen]} onPress={() => setOpenDrop(openDrop === 'month' ? null : 'month')}>
            <Text style={[styles.birthDropText, !birthM && { color: '#bbb' }]}>{birthM ? `${birthM}월` : '월'}</Text>
            <Feather name={openDrop === 'month' ? 'chevron-up' : 'chevron-down'} size={13} color="#aaa" />
          </TouchableOpacity>
          <TouchableOpacity style={[styles.birthDropBtn, openDrop === 'day' && styles.birthDropBtnOpen]} onPress={() => setOpenDrop(openDrop === 'day' ? null : 'day')}>
            <Text style={[styles.birthDropText, !birthD && { color: '#bbb' }]}>{birthD ? `${birthD}일` : '일'}</Text>
            <Feather name={openDrop === 'day' ? 'chevron-up' : 'chevron-down'} size={13} color="#aaa" />
          </TouchableOpacity>
        </View>
        {openDrop === 'year' && (
          <ScrollView style={styles.birthDropList} nestedScrollEnabled>
            {YEARS.map(y => (
              <TouchableOpacity key={y} style={[styles.birthDropItem, birthY === y && styles.birthDropItemSel]} onPress={() => setBirthPart('y', y)}>
                <Text style={[styles.birthDropItemText, birthY === y && styles.birthDropItemTextSel]}>{y}년</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {openDrop === 'month' && (
          <ScrollView style={styles.birthDropList} nestedScrollEnabled>
            {MONTHS.map(m => (
              <TouchableOpacity key={m} style={[styles.birthDropItem, birthM === m && styles.birthDropItemSel]} onPress={() => setBirthPart('m', m)}>
                <Text style={[styles.birthDropItemText, birthM === m && styles.birthDropItemTextSel]}>{m}월</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {openDrop === 'day' && (
          <ScrollView style={styles.birthDropList} nestedScrollEnabled>
            {DAYS.map(d => (
              <TouchableOpacity key={d} style={[styles.birthDropItem, birthD === d && styles.birthDropItemSel]} onPress={() => setBirthPart('d', d)}>
                <Text style={[styles.birthDropItemText, birthD === d && styles.birthDropItemTextSel]}>{d}일</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
        {form.birthDate && (
          <Text style={styles.birthCalcText}>만 {calcAge(form.birthDate)}살</Text>
        )}

        <View style={[styles.rowFields, { marginTop: 14 }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.fieldLabel}>체중 (kg)</Text>
            <TextInput style={styles.input} placeholder="0.00kg" placeholderTextColor="#bbb"
              keyboardType="decimal-pad" value={weightText}
              onChangeText={v => {
                if (/^\d*\.?\d{0,2}$/.test(v)) {
                  setWeightText(v)
                  const n = parseFloat(v)
                  if (!isNaN(n)) setForm(f => ({ ...f, weightKg: n }))
                }
              }} />
          </View>
        </View>

        <Text style={[styles.fieldLabel, { marginTop: 14 }]}>성별</Text>
        <View style={styles.optionRow}>
          {(['female', 'male'] as const).map(g => (
            <TouchableOpacity key={g}
              style={[styles.optionBtn, form.gender === g && { backgroundColor: GENDER_COLORS[g], borderColor: GENDER_COLORS[g] }]}
              onPress={() => setForm(f => ({ ...f, gender: g }))}>
              <Text style={[styles.optionBtnText, form.gender === g && { color: '#fff', fontWeight: '700' }]}>
                {g === 'female' ? '암컷' : '수컷'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>중성화 여부</Text>
          <Switch value={form.neutered} onValueChange={v => setForm(f => ({ ...f, neutered: v }))}
            trackColor={{ false: '#ddd', true: '#1D9E75' }} thumbColor="#fff" />
        </View>

        <TouchableOpacity style={styles.saveBtn} onPress={save}>
          <Text style={styles.saveBtnText}>저장하기</Text>
        </TouchableOpacity>

        {sheetMode === 'edit' && cats.length > 1 && (
          <TouchableOpacity style={styles.deleteBtn} onPress={remove}>
            <Text style={styles.deleteBtnText}>이 고양이 삭제</Text>
          </TouchableOpacity>
        )}
      </BottomSheet>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#FFF8F5' },
  pageHeader: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: 0.5, borderBottomColor: '#EEE', backgroundColor: '#fff',
  },
  pageTitle: { fontSize: 17, fontWeight: '700', color: '#1a1a1a' },
  settingsBtn: { padding: 4 },
  accountCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#F7F7F7', borderRadius: 14, padding: 16, marginBottom: 16,
  },
  accountIconWrap: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  accountInfo: { flex: 1 },
  accountBadgeRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  providerBadge: { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 3 },
  providerBadgeText: { fontSize: 11, fontWeight: '700' },
  accountConnectedText: { fontSize: 12, color: '#999' },
  accountEmail: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1, borderColor: '#FDDDD5', borderRadius: 12, padding: 14,
  },
  logoutBtnText: { color: '#E9785A', fontWeight: '600', fontSize: 14 },
  guestAccountCard: { alignItems: 'center', gap: 12, paddingVertical: 24 },
  guestAccountText: { fontSize: 14, color: '#aaa', textAlign: 'center', lineHeight: 22 },
  guestLoginBtn: { backgroundColor: '#E9785A', borderRadius: 12, paddingVertical: 12, paddingHorizontal: 28, marginTop: 4 },
  guestLoginBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 8 },

  catScroll: { marginHorizontal: -16 },
  catScrollContent: { paddingHorizontal: 16, gap: 10 },
  catCard: {
    width: 80, backgroundColor: '#fff', borderRadius: 14, padding: 10,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#EBEBEB',
    position: 'relative',
  },
  catAvatarSmall: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  catCardName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  catCardBreed: { fontSize: 10, color: '#bbb', marginTop: 1, textAlign: 'center' },
  editIconBtn: {
    position: 'absolute', top: 6, right: 6,
    width: 18, height: 18, borderRadius: 9,
    backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center',
  },
  addCatCard: {
    width: 80, backgroundColor: '#F9F9F9', borderRadius: 14, padding: 10,
    alignItems: 'center', borderWidth: 1.5, borderColor: '#E5E5E5', borderStyle: 'dashed',
    justifyContent: 'center', minHeight: 88,
  },
  addCatIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#F0F0F0', alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
  addCatLabel: { fontSize: 12, color: '#bbb' },

  profileCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 4,
    borderWidth: 0.5, borderColor: '#EBEBEB', borderLeftWidth: 3,
  },
  profileAvatar: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center' },
  profileInfo: { flex: 1 },
  profileNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 3 },
  profileName: { fontSize: 16, fontWeight: '700', color: '#1a1a1a' },
  genderBadge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  genderBadgeText: { fontSize: 10, fontWeight: '600' },
  neuteredBadge: { backgroundColor: '#F0F0F0', borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  neuteredBadgeText: { fontSize: 10, color: '#888' },
  profileDetail: { fontSize: 12, color: '#999' },

  scheduleRow: { flexDirection: 'row', gap: 10, marginBottom: 4 },
  scheduleCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: '#EBEBEB', borderLeftWidth: 3,
  },
  scheduleIconWrap: { width: 30, height: 30, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 8 },
  scheduleLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
  scheduleDday: { fontSize: 20, fontWeight: '700', color: '#1a1a1a' },
  scheduleDate: { fontSize: 11, color: '#aaa', marginTop: 2 },

  medCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#EBEBEB', paddingHorizontal: 14, paddingVertical: 12, marginBottom: 4 },
  medRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  medIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#E1F5EE', alignItems: 'center', justifyContent: 'center' },
  medBody: { flex: 1 },
  medName: { fontSize: 14, fontWeight: '500', color: '#1a1a1a' },
  medDetail: { fontSize: 12, color: '#999', marginTop: 2 },
  statusBadge: { backgroundColor: '#E1F5EE', borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 },
  statusBadgeText: { fontSize: 11, color: '#1D9E75', fontWeight: '600' },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: 4 },
  statCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 14, alignItems: 'center', borderWidth: 0.5, borderColor: '#EBEBEB', gap: 4 },
  statNum: { fontSize: 20, fontWeight: '600', color: '#1a1a1a' },
  statUnit: { fontSize: 12, fontWeight: '400' },
  statLabel: { fontSize: 11, color: '#999' },

  foodCard: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: '#EBEBEB', marginBottom: 4,
  },
  foodIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#FAECE7', alignItems: 'center', justifyContent: 'center' },
  foodBody: { flex: 1 },
  foodName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  foodMeta: { fontSize: 11, color: '#aaa', marginTop: 2 },
  foodPref: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  foodPrefText: { fontSize: 11, color: '#E9785A', fontWeight: '600' },

  vaccCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#EBEBEB', paddingHorizontal: 16 },
  vaccItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 13 },
  vaccBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  vaccBody: { flex: 1 },
  vaccName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  vaccNext: { fontSize: 11, color: '#999', marginTop: 2 },

  photoSection: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 },
  photoBtn: { position: 'relative' },
  photoPreview: { width: 72, height: 72, borderRadius: 36 },
  photoPlaceholder: { width: 72, height: 72, borderRadius: 36, backgroundColor: '#F5F5F5', alignItems: 'center', justifyContent: 'center' },
  photoEditBadge: {
    position: 'absolute', bottom: 0, right: 0,
    width: 24, height: 24, borderRadius: 12,
    backgroundColor: '#E9785A', alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  photoHint: { flex: 1 },
  photoHintTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  photoHintSub: { fontSize: 12, color: '#aaa', lineHeight: 18 },
  selectBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F7F7F7', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    borderWidth: 0.5, borderColor: '#E5E5E5',
  },
  selectBtnOpen: { borderBottomLeftRadius: 0, borderBottomRightRadius: 0, borderBottomColor: 'transparent' },
  selectBtnText: { fontSize: 14, color: '#1a1a1a' },
  breedDropdown: {
    backgroundColor: '#F7F7F7', borderWidth: 0.5, borderTopWidth: 0, borderColor: '#E5E5E5',
    borderBottomLeftRadius: 10, borderBottomRightRadius: 10, overflow: 'hidden',
  },
  breedItem: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12, borderTopWidth: 0.5, borderTopColor: '#EBEBEB' },
  breedItemSelected: { backgroundColor: '#FFF0EC' },
  breedItemText: { fontSize: 14, color: '#1a1a1a', flex: 1 },
  breedItemOther: { color: '#888' },
  breedItemTextSelected: { color: '#E9785A', fontWeight: '600' },
  breedDot: { width: 10, height: 10, borderRadius: 5 },
  breedDivider: { height: 1, backgroundColor: '#F0F0F0', marginVertical: 4, marginHorizontal: 14 },
  fieldLabel: { fontSize: 12, fontWeight: '600', color: '#999', marginBottom: 8 },
  input: {
    backgroundColor: '#F7F7F7', borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 14, color: '#1a1a1a', borderWidth: 0.5, borderColor: '#E5E5E5',
  },
  rowFields: { flexDirection: 'row', gap: 10, marginTop: 14 },
  halfField: { flex: 1 },

  birthDropRow: { flexDirection: 'row', gap: 8 },
  birthDropBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#F7F7F7', borderRadius: 10, paddingHorizontal: 10, paddingVertical: 12,
    borderWidth: 0.5, borderColor: '#E5E5E5',
  },
  birthDropBtnOpen: { borderColor: '#E9785A', borderBottomLeftRadius: 0, borderBottomRightRadius: 0 },
  birthDropText: { fontSize: 14, color: '#1a1a1a', flex: 1 },
  birthDropList: {
    maxHeight: 160,
    backgroundColor: '#fff', borderRadius: 10, borderBottomLeftRadius: 10, borderBottomRightRadius: 10,
    borderWidth: 0.5, borderColor: '#E9785A', marginTop: 2,
  },
  birthDropItem: { paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  birthDropItemSel: { backgroundColor: '#FFF0EC' },
  birthDropItemText: { fontSize: 14, color: '#1a1a1a' },
  birthDropItemTextSel: { color: '#E9785A', fontWeight: '700' },
  birthCalcText: { fontSize: 12, color: '#1D9E75', fontWeight: '600', marginTop: 8, textAlign: 'right' },

  optionRow: { flexDirection: 'row', gap: 8 },
  optionBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 0.5, borderColor: '#E5E5E5', alignItems: 'center' },
  optionBtnText: { fontSize: 14, color: '#666' },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 14 },
  toggleLabel: { fontSize: 14, color: '#1a1a1a' },
  saveBtn: { backgroundColor: '#E9785A', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },
  deleteBtn: { alignItems: 'center', marginTop: 12, paddingVertical: 8 },
  deleteBtnText: { color: '#E9785A', fontSize: 13 },
})
