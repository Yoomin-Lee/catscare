import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import { useCats, catAvatarColor } from '@/lib/cats-context'

const CHART_DATA = {
  w: { labels: ['월', '화', '수', '목', '금', '토', '일'], values: [4.3, 4.3, 4.25, 4.2, 4.2, 4.2, 4.2] },
  m: { labels: ['11/1', '11/5', '11/9', '11/13', '11/17', '11/21', '11/25', '오늘'], values: [4.5, 4.4, 4.4, 4.35, 4.3, 4.25, 4.2, 4.2] },
  y: { labels: ['1월', '3월', '5월', '7월', '9월', '11월'], values: [4.8, 4.7, 4.6, 4.5, 4.35, 4.2] },
}

const MEDICATIONS = [
  { name: '구충제 (내부)', detail: '2025년 11월 1일 투약 · 3개월 주기 → D-14', done: true },
  { name: '외부 기생충 예방 (프론트라인)', detail: '투약 예정 · 매달 1회', done: false },
]

function WeightChart({ period }: { period: 'w' | 'm' | 'y' }) {
  const { labels, values } = CHART_DATA[period]
  const min = Math.min(...values) - 0.1
  const max = Math.max(...values) + 0.1
  const range = max - min
  const CHART_H = 90

  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', height: CHART_H + 28, gap: 2 }}>
      {values.map((val, i) => {
        const barH = Math.round(((val - min) / range) * CHART_H)
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

export default function BodyScreen() {
  const { selectedCat } = useCats()
  const [period, setPeriod] = useState<'w' | 'm' | 'y'>('m')

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

        {/* 통계 */}
        <View style={styles.statRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>4.2<Text style={styles.statUnit}>kg</Text></Text>
            <Text style={styles.statLabel}>현재 체중</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNum, { color: '#1D9E75' }]}>▼0.1</Text>
            <Text style={styles.statLabel}>전주 대비</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statNum}>4.1<Text style={styles.statUnit}>kg</Text></Text>
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
          <WeightChart period={period} />
        </View>

        <Text style={styles.sectionTitle}>투약 기록</Text>

        <View style={styles.medCard}>
          {MEDICATIONS.map((med, i) => (
            <View key={med.name} style={[styles.medItem, i < MEDICATIONS.length - 1 && styles.medBorder]}>
              <View style={[styles.medIcon, med.done ? styles.iconDone : styles.iconDue]}>
                <Feather name={med.done ? 'check' : 'clock'} size={12} color={med.done ? '#1D9E75' : '#BA7517'} />
              </View>
              <View style={styles.medBody}>
                <Text style={styles.medName}>{med.name}</Text>
                <Text style={styles.medDetail}>{med.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryBtn}>
          <Text style={styles.primaryBtnText}>+ 기록 추가하기</Text>
        </TouchableOpacity>

      </ScrollView>
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
  catEmoji: { fontSize: 22 },
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
  chartCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#EBEBEB', padding: 16, marginBottom: 16 },
  chartHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  chartTitle: { fontSize: 14, fontWeight: '600', color: '#1a1a1a' },
  periodTabs: { flexDirection: 'row', gap: 4 },
  periodTab: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, borderWidth: 0.5, borderColor: '#EBEBEB' },
  periodTabActive: { backgroundColor: '#1D9E75', borderColor: '#1D9E75' },
  periodTabText: { fontSize: 11, color: '#999' },
  periodTabTextActive: { color: '#fff', fontWeight: '600' },
  medCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#EBEBEB', paddingHorizontal: 16, marginBottom: 12 },
  medItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  medBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  medIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  iconDone: { backgroundColor: '#E1F5EE' },
  iconDue: { backgroundColor: '#FAEEDA' },
  medIconText: { fontSize: 12, fontWeight: '700' },
  medBody: { flex: 1 },
  medName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  medDetail: { fontSize: 11, color: '#999', marginTop: 2 },
  primaryBtn: { backgroundColor: '#1D9E75', borderRadius: 12, padding: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
