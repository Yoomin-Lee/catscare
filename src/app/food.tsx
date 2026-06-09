import { Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { useState } from 'react'
import { SafeAreaView } from 'react-native-safe-area-context'
import BottomSheet from '@/components/bottom-sheet'
import { useCats, catAvatarColor } from '@/lib/cats-context'

const FOODS = [
  { name: '고메 참치+새우 파우치', type: '습식', date: '2025.11.18', dots: 3, pref: '환장함', prefStyle: 'love' as const },
  { name: 'RC 헤어볼케어 건식', type: '건식', date: '2025.11.10', dots: 2, pref: '먹다가 맘', prefStyle: 'ok' as const },
  { name: '쉬바 닭+연어 캔', type: '습식', date: '2025.11.05', dots: 4, pref: '아주 좋아함', prefStyle: 'love' as const },
  { name: '퓨리나 닭고기 파우치', type: '습식', date: '2025.10.28', dots: 0, pref: '입도 안 댐', prefStyle: 'no' as const },
]

const PREF_OPTIONS = ['환장함', '잘 먹음', '먹다가 맘', '입도 안 댐'] as const

function FoodDots({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, marginBottom: 6 }}>
      {[...Array(5)].map((_, i) => (
        <View key={i} style={[
          styles.dot,
          i < count ? styles.dotFilled : styles.dotEmpty,
        ]} />
      ))}
    </View>
  )
}

export default function FoodScreen() {
  const { selectedCat } = useCats()
  const [addPanel, setAddPanel] = useState(false)
  const [selectedPref, setSelectedPref] = useState<string | null>(null)

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

        {/* AI 추천 카드 */}
        <View style={styles.recCard}>
          <View style={styles.recHeader}>
            <Feather name="star" size={16} color="#993C1D" />
            <Text style={styles.recTitle}>AI 취향 분석 추천</Text>
          </View>
          <Text style={styles.recBody}>
            나비는 <Text style={styles.recHighlight}>습식 위주, 생선 베이스</Text>를 선호해요.
            {' '}닭고기 파우치는 2번 연속 거부 → 구매 비추천.
            {' '}3살 중성화 암컷 기준 체중 유지형 사료가 적합해요.
          </Text>
          <TouchableOpacity style={styles.recBtn}>
            <Feather name="star" size={12} color="#993C1D" />
            <Text style={styles.recBtnText}>맞춤 추천 더 보기</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>기호성 기록</Text>

        <View style={styles.foodGrid}>
          {FOODS.map(food => (
            <View key={food.name} style={styles.foodCard}>
              <FoodDots count={food.dots} />
              <Text style={styles.foodName}>{food.name}</Text>
              <Text style={styles.foodMeta}>{food.type} · {food.date}</Text>
              <View style={[styles.prefBadge, styles[`pref_${food.prefStyle}`]]}>
                <Text style={[styles.prefBadgeText, styles[`prefText_${food.prefStyle}`]]}>{food.pref}</Text>
              </View>
            </View>
          ))}
        </View>

        <TouchableOpacity style={styles.primaryBtn} onPress={() => setAddPanel(true)}>
          <Text style={styles.primaryBtnText}>+ 식사 기록 추가</Text>
        </TouchableOpacity>

      </ScrollView>

      <BottomSheet visible={addPanel} onClose={() => setAddPanel(false)} title="식사 기록 추가">
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>사료명</Text>
          <TextInput style={styles.formInput} placeholder="예: 고메 참치 파우치" placeholderTextColor="#bbb" />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>종류</Text>
          <View style={styles.typeRow}>
            {['습식', '건식', '간식'].map(t => (
              <TouchableOpacity key={t} style={styles.typeBtn}>
                <Text style={styles.typeBtnText}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>기호성</Text>
          <View style={styles.prefRow}>
            {PREF_OPTIONS.map(opt => (
              <TouchableOpacity
                key={opt}
                style={[styles.prefSelectBtn, selectedPref === opt && styles.prefSelectBtnActive]}
                onPress={() => setSelectedPref(opt)}>
                <Text style={[styles.prefSelectText, selectedPref === opt && styles.prefSelectTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={() => setAddPanel(false)}>
          <Text style={styles.primaryBtnText}>저장하기</Text>
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
  catEmoji: { fontSize: 22 },
  catName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  catInfo: { fontSize: 12, color: '#999', marginTop: 1 },
  scroll: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  sectionTitle: { fontSize: 11, fontWeight: '600', color: '#aaa', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 10, marginTop: 4 },
  recCard: {
    borderRadius: 14, padding: 16, marginBottom: 16,
    backgroundColor: '#FFF0EB', borderWidth: 0.5, borderColor: '#F5C4B3',
  },
  recHeader: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
  recHeaderEmoji: { fontSize: 18 },
  recTitle: { fontSize: 14, fontWeight: '600', color: '#993C1D' },
  recBody: { fontSize: 13, color: '#712B13', lineHeight: 20 },
  recHighlight: { fontWeight: '700' },
  recBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, borderWidth: 0.5, borderColor: '#E9785A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' },
  recBtnText: { fontSize: 12, color: '#993C1D', fontWeight: '500' },
  foodGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: 16 },
  foodCard: {
    width: '47.5%', backgroundColor: '#fff', borderRadius: 14, padding: 14,
    borderWidth: 0.5, borderColor: '#EBEBEB',
  },
  dot: { width: 10, height: 10, borderRadius: 5 },
  dotFilled: { backgroundColor: '#E9785A' },
  dotEmpty: { backgroundColor: '#E5E5E5' },
  foodName: { fontSize: 13, fontWeight: '500', color: '#1a1a1a' },
  foodMeta: { fontSize: 11, color: '#aaa', marginTop: 3 },
  prefBadge: { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 3, alignSelf: 'flex-start', marginTop: 8 },
  prefBadgeText: { fontSize: 10, fontWeight: '600' },
  pref_love: { backgroundColor: '#FAECE7' },
  prefText_love: { color: '#993C1D' },
  pref_ok: { backgroundColor: '#FAEEDA' },
  prefText_ok: { color: '#BA7517' },
  pref_no: { backgroundColor: '#F1EFE8' },
  prefText_no: { color: '#666' },
  primaryBtn: { backgroundColor: '#E9785A', borderRadius: 12, padding: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 12, color: '#999', marginBottom: 6 },
  formInput: { backgroundColor: '#F7F7F7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a1a1a' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  typeBtnText: { fontSize: 13, color: '#555' },
  prefRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  prefSelectBtn: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  prefSelectBtnActive: { backgroundColor: '#FAECE7', borderColor: '#E9785A' },
  prefSelectText: { fontSize: 12, color: '#555' },
  prefSelectTextActive: { color: '#993C1D', fontWeight: '600' },
})
