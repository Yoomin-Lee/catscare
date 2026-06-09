import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import BottomSheet from '@/components/bottom-sheet'
import { useCats, catAvatarColor } from '@/lib/cats-context'

const VACCINATIONS = [
  { name: '종합백신 (FVRCP)', detail: '2025년 3월 5일 접종 완료 · 다음 접종 2026년 3월', done: true },
  { name: '광견병 백신', detail: '2025년 3월 5일 접종 완료 · 다음 접종 2026년 3월', done: true },
  { name: '고양이 백혈병 (FeLV)', detail: '접종 예정 · 다음 방문 시 수의사 상담 필요', done: false },
]

const RECORDS = [
  { key: 'blood' as const, iconName: 'droplet', iconColor: '#D94040', bgColor: '#FAECE7', name: '혈액 검사', desc: '수치 AI 설명 포함\n사진 자동 입력' },
  { key: 'urine' as const, iconName: 'thermometer', iconColor: '#BA7517', bgColor: '#FAEEDA', name: '소변 검사', desc: '수치 AI 설명 포함\n사진 자동 입력' },
]

export default function HospitalScreen() {
  const { selectedCat } = useCats()
  const [panel, setPanel] = useState<'blood' | 'urine' | null>(null)

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

        <View style={styles.aiCard}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>AI</Text></View>
            <Text style={styles.aiCardTitle}>진료 녹음 자동 요약</Text>
          </View>
          <Text style={styles.aiCardBody}>
            수의사 동의 후 진료 중 녹음하면, 진료 내용을 자동으로 텍스트로 변환하고 핵심 내용을 요약해 기록합니다.
          </Text>
          <View style={styles.aiActions}>
            <TouchableOpacity style={styles.outlineBtn}>
              <Feather name="mic" size={13} color="#534AB7" />
              <Text style={styles.outlineBtnText}>녹음 시작</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.outlineBtn}>
              <Feather name="file-text" size={13} color="#534AB7" />
              <Text style={styles.outlineBtnText}>지난 요약 보기</Text>
            </TouchableOpacity>
          </View>
        </View>

        <Text style={styles.sectionTitle}>검사 기록</Text>

        <View style={styles.recordGrid}>
          {RECORDS.map(item => (
            <TouchableOpacity key={item.key} style={styles.recordCard} onPress={() => setPanel(item.key)}>
              <View style={[styles.recordIconWrap, { backgroundColor: item.bgColor }]}>
                <Feather name={item.iconName as any} size={20} color={item.iconColor} />
              </View>
              <Text style={styles.recordName}>{item.name}</Text>
              <Text style={styles.recordDesc}>{item.desc}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.sectionTitle}>접종 체크</Text>

        <View style={styles.vaccCard}>
          {VACCINATIONS.map((vacc, i) => (
            <View key={vacc.name} style={[styles.vaccItem, i < VACCINATIONS.length - 1 && styles.vaccBorder]}>
              <View style={[styles.vaccIcon, vacc.done ? styles.vaccDone : styles.vaccDue]}>
                <Feather name={vacc.done ? 'check' : 'clock'} size={12} color={vacc.done ? '#1D9E75' : '#BA7517'} />
              </View>
              <View style={styles.vaccBody}>
                <Text style={styles.vaccName}>{vacc.name}</Text>
                <Text style={styles.vaccDetail}>{vacc.detail}</Text>
              </View>
            </View>
          ))}
        </View>

      </ScrollView>

      <BottomSheet visible={panel === 'blood'} onClose={() => setPanel(null)} title="혈액 검사 기록">
        <TouchableOpacity style={styles.ocrZone}>
          <View style={styles.ocrIconWrap}>
            <Feather name="camera" size={28} color="#bbb" />
          </View>
          <Text style={styles.ocrText}>검사지 사진 촬영 → AI 자동 입력</Text>
        </TouchableOpacity>
        <View style={styles.aiResultCard}>
          <View style={styles.aiCardHeader}>
            <View style={styles.aiBadge}><Text style={styles.aiBadgeText}>AI 해설</Text></View>
          </View>
          <Text style={styles.aiCardBody}>
            BUN 28.4 mg/dL — 정상 범위 (14–36) 내에 있어요. 크레아티닌 1.2 mg/dL — 정상. 전체적으로 신장 수치는 양호합니다. ALT가 경계치(52 U/L)이므로 다음 방문 시 재검사를 권장해요.
          </Text>
        </View>
        <TouchableOpacity style={styles.primaryBtn}>
          <Feather name="zap" size={15} color="#fff" />
          <Text style={styles.primaryBtnText}>수치 상세 AI 설명</Text>
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet visible={panel === 'urine'} onClose={() => setPanel(null)} title="소변 검사 기록">
        <TouchableOpacity style={styles.ocrZone}>
          <View style={styles.ocrIconWrap}>
            <Feather name="camera" size={28} color="#bbb" />
          </View>
          <Text style={styles.ocrText}>검사지 사진 촬영 → AI 자동 입력</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.primaryBtn, { backgroundColor: '#534AB7' }]}>
          <Feather name="zap" size={15} color="#fff" />
          <Text style={styles.primaryBtnText}>수치 상세 AI 설명</Text>
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
  catAvatar: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#FAECE7', alignItems: 'center', justifyContent: 'center' },
  catName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  catInfo: { fontSize: 12, color: '#999', marginTop: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  aiCard: { backgroundColor: '#EEEDFE', borderWidth: 0.5, borderColor: '#AFA9EC', borderRadius: 14, padding: 16, marginBottom: 16 },
  aiResultCard: { backgroundColor: '#EEEDFE', borderWidth: 0.5, borderColor: '#AFA9EC', borderRadius: 14, padding: 16, marginBottom: 12 },
  aiCardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  aiBadge: { backgroundColor: '#534AB7', borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  aiBadgeText: { fontSize: 10, fontWeight: '600', color: '#fff' },
  aiCardTitle: { fontSize: 14, fontWeight: '600', color: '#26215C' },
  aiCardBody: { fontSize: 13, color: '#534AB7', lineHeight: 20 },
  aiActions: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 0.5, borderColor: '#534AB7', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7 },
  outlineBtnText: { fontSize: 12, color: '#534AB7', fontWeight: '500' },
  recordGrid: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  recordCard: { flex: 1, backgroundColor: '#fff', borderRadius: 14, padding: 16, borderWidth: 0.5, borderColor: '#EBEBEB' },
  recordIconWrap: { width: 40, height: 40, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 10 },
  recordName: { fontSize: 13, fontWeight: '600', color: '#1a1a1a' },
  recordDesc: { fontSize: 11, color: '#999', marginTop: 4, lineHeight: 16 },
  vaccCard: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 0.5, borderColor: '#EBEBEB', paddingHorizontal: 16 },
  vaccItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14 },
  vaccBorder: { borderBottomWidth: 0.5, borderBottomColor: '#F0F0F0' },
  vaccIcon: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  vaccDone: { backgroundColor: '#E1F5EE' },
  vaccDue: { backgroundColor: '#FAEEDA' },
  vaccBody: { flex: 1 },
  vaccName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  vaccDetail: { fontSize: 11, color: '#999', marginTop: 2 },
  ocrZone: { borderWidth: 1.5, borderColor: '#E5E5E5', borderStyle: 'dashed', borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 12 },
  ocrIconWrap: { marginBottom: 8 },
  ocrText: { fontSize: 13, color: '#999' },
  primaryBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#534AB7', borderRadius: 12, padding: 14 },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
})
