import { ActivityIndicator, Image, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View, Alert } from 'react-native'
import Feather from '@expo/vector-icons/Feather'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { useState, useEffect, useRef } from 'react'
import { analyzeFoodPreference } from '@/lib/gemini'
import { SafeAreaView } from 'react-native-safe-area-context'
import BottomSheet from '@/components/bottom-sheet'
import { useCats, catAvatarColor } from '@/lib/cats-context'
import { supabase } from '@/lib/supabase'

type FoodRecord = {
  id: string
  name: string
  type: string
  preference: string
  recordedAt: string
}

const PREF_OPTIONS = ['환장함', '잘 먹음', '먹다가 맘', '입도 안 댐'] as const
const FOOD_TYPES = ['습식', '건식', '간식'] as const

const PREF_DOTS: Record<string, number> = {
  '환장함': 5, '잘 먹음': 3, '먹다가 맘': 2, '입도 안 댐': 0,
}
const PREF_STYLE: Record<string, 'love' | 'ok' | 'no'> = {
  '환장함': 'love', '잘 먹음': 'ok', '먹다가 맘': 'ok', '입도 안 댐': 'no',
}

function FoodDots({ count }: { count: number }) {
  return (
    <View style={{ flexDirection: 'row', gap: 3, marginBottom: 6 }}>
      {[...Array(5)].map((_, i) => (
        <View key={i} style={[styles.dot, i < count ? styles.dotFilled : styles.dotEmpty]} />
      ))}
    </View>
  )
}

function emptyForm() {
  return { name: '', type: '습식' as string, preference: '잘 먹음' as string }
}

export default function FoodScreen() {
  const { selectedCat, userId } = useCats()
  const [foods, setFoods] = useState<FoodRecord[]>([])
  const [addPanel, setAddPanel] = useState(false)
  const [foodName, setFoodName] = useState('')
  const [foodType, setFoodType] = useState('습식')
  const [foodPref, setFoodPref] = useState('잘 먹음')
  const foodNameRef = useRef(foodName)
  const foodTypeRef = useRef(foodType)
  const foodPrefRef = useRef(foodPref)
  foodNameRef.current = foodName
  foodTypeRef.current = foodType
  foodPrefRef.current = foodPref
  const [aiRec, setAiRec] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiPanel, setAiPanel] = useState(false)

  useEffect(() => {
    if (!userId || selectedCat.id === '__guest__') { setFoods([]); return }
    supabase
      .from('food_records')
      .select('id, name, type, preference, recorded_at')
      .eq('cat_id', selectedCat.id)
      .order('recorded_at', { ascending: false })
      .then(({ data }) => {
        setFoods((data ?? []).map(r => ({
          id: r.id as string,
          name: r.name as string,
          type: r.type as string,
          preference: r.preference as string,
          recordedAt: (r.recorded_at as string).replace(/-/g, '.'),
        })))
      })
  }, [selectedCat.id, userId])

  const openAdd = () => {
    setFoodName('')
    setFoodType('습식')
    setFoodPref('잘 먹음')
    setAddPanel(true)
  }

  const saveFood = async () => {
    const name = foodNameRef.current
    const type = foodTypeRef.current
    const pref = foodPrefRef.current
    if (!name.trim()) return
    const today = new Date()
    const recorded_at = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

    if (!userId || selectedCat.id === '__guest__') {
      setFoods(prev => [{
        id: Date.now().toString(),
        name, type, preference: pref,
        recordedAt: recorded_at.replace(/-/g, '.'),
      }, ...prev])
      setAddPanel(false)
      return
    }

    const { data, error } = await supabase
      .from('food_records')
      .insert({
        cat_id: selectedCat.id,
        user_id: userId,
        name, type, preference: pref, recorded_at,
      })
      .select()
      .single()

    if (error) {
      Alert.alert('저장 실패', error.message)
      return
    }
    if (data) {
      setFoods(prev => [{
        id: data.id as string,
        name: data.name as string,
        type: data.type as string,
        preference: data.preference as string,
        recordedAt: (data.recorded_at as string).replace(/-/g, '.'),
      }, ...prev])
    }
    setAddPanel(false)
  }

  const loadAiRecommendation = async () => {
    setAiLoading(true)
    setAiPanel(true)
    try {
      const foodData = foods.length > 0
        ? foods.map(f => ({ name: f.name, type: f.type, pref: f.preference }))
        : [{ name: '기록 없음', type: '-', pref: '-' }]
      const result = await analyzeFoodPreference(
        {
          name: selectedCat.name,
          breed: selectedCat.breed,
          ageYears: selectedCat.ageYears,
          weightKg: selectedCat.weightKg,
          gender: selectedCat.gender,
          neutered: selectedCat.neutered,
        },
        foodData
      )
      setAiRec(result)
    } catch {
      setAiRec('AI 추천을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setAiLoading(false)
    }
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

        {/* AI 추천 카드 */}
        <View style={styles.recCard}>
          <View style={styles.recHeader}>
            <Feather name="star" size={16} color="#993C1D" />
            <Text style={styles.recTitle}>AI 취향 분석 추천</Text>
          </View>
          <Text style={styles.recBody}>
            {foods.length > 0
              ? `${selectedCat.name}의 식사 기록 ${foods.length}건을 바탕으로 맞춤 추천을 받아보세요.`
              : '식사 기록을 추가하면 AI가 취향을 분석해 드려요.'}
          </Text>
          <TouchableOpacity style={styles.recBtn} onPress={loadAiRecommendation} disabled={aiLoading}>
            {aiLoading
              ? <ActivityIndicator size="small" color="#993C1D" />
              : <Feather name="star" size={12} color="#993C1D" />}
            <Text style={styles.recBtnText}>{aiLoading ? 'AI 분석 중...' : '맞춤 추천 받기'}</Text>
          </TouchableOpacity>
        </View>

        <Text style={styles.sectionTitle}>기호성 기록</Text>

        {foods.length === 0 ? (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyText}>아직 식사 기록이 없어요</Text>
          </View>
        ) : (
          <View style={styles.foodGrid}>
            {foods.map(food => {
              const prefStyle = PREF_STYLE[food.preference] ?? 'ok'
              const dots = PREF_DOTS[food.preference] ?? 3
              return (
                <View key={food.id} style={styles.foodCard}>
                  <FoodDots count={dots} />
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodMeta}>{food.type} · {food.recordedAt}</Text>
                  <View style={[styles.prefBadge, styles[`pref_${prefStyle}`]]}>
                    <Text style={[styles.prefBadgeText, styles[`prefText_${prefStyle}`]]}>{food.preference}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        <TouchableOpacity style={styles.primaryBtn} onPress={openAdd}>
          <Text style={styles.primaryBtnText}>+ 식사 기록 추가</Text>
        </TouchableOpacity>

      </ScrollView>

      <BottomSheet visible={aiPanel} onClose={() => setAiPanel(false)} title="AI 취향 분석 추천">
        {aiLoading
          ? <ActivityIndicator size="large" color="#E9785A" style={{ paddingVertical: 40 }} />
          : <ScrollView style={{ maxHeight: 400 }}><Text style={styles.aiResultText}>{aiRec}</Text></ScrollView>}
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 16 }]} onPress={() => setAiPanel(false)}>
          <Text style={styles.primaryBtnText}>확인</Text>
        </TouchableOpacity>
      </BottomSheet>

      <BottomSheet visible={addPanel} onClose={() => setAddPanel(false)} title="식사 기록 추가">
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>사료명 *</Text>
          <TextInput
            style={styles.formInput}
            placeholder="예: 고메 참치 파우치"
            placeholderTextColor="#bbb"
            value={foodName}
            onChangeText={setFoodName}
          />
        </View>
        <View style={styles.formGroup}>
          <Text style={styles.formLabel}>종류</Text>
          <View style={styles.typeRow}>
            {FOOD_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typeBtn, foodType === t && styles.typeBtnActive]}
                onPress={() => setFoodType(t)}
              >
                <Text style={[styles.typeBtnText, foodType === t && styles.typeBtnTextActive]}>{t}</Text>
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
                style={[styles.prefSelectBtn, foodPref === opt && styles.prefSelectBtnActive]}
                onPress={() => setFoodPref(opt)}
              >
                <Text style={[styles.prefSelectText, foodPref === opt && styles.prefSelectTextActive]}>{opt}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
        <TouchableOpacity style={[styles.primaryBtn, { marginTop: 8 }]} onPress={saveFood}>
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
  recTitle: { fontSize: 14, fontWeight: '600', color: '#993C1D' },
  recBody: { fontSize: 13, color: '#712B13', lineHeight: 20 },
  recHighlight: { fontWeight: '700' },
  recBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, borderWidth: 0.5, borderColor: '#E9785A', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 7, alignSelf: 'flex-start' },
  recBtnText: { fontSize: 12, color: '#993C1D', fontWeight: '500' },
  emptyCard: { backgroundColor: '#F7F7F7', borderRadius: 14, padding: 24, alignItems: 'center', marginBottom: 16 },
  emptyText: { fontSize: 13, color: '#bbb' },
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
  aiResultText: { fontSize: 14, color: '#1a1a1a', lineHeight: 22 },
  primaryBtn: { backgroundColor: '#E9785A', borderRadius: 12, padding: 14, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontWeight: '700', fontSize: 14 },
  formGroup: { marginBottom: 16 },
  formLabel: { fontSize: 12, color: '#999', marginBottom: 6 },
  formInput: { backgroundColor: '#F7F7F7', borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14, color: '#1a1a1a', borderWidth: 0.5, borderColor: '#E5E5E5' },
  typeRow: { flexDirection: 'row', gap: 8 },
  typeBtn: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8 },
  typeBtnActive: { backgroundColor: '#FAECE7', borderColor: '#E9785A' },
  typeBtnText: { fontSize: 13, color: '#555' },
  typeBtnTextActive: { color: '#993C1D', fontWeight: '600' },
  prefRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  prefSelectBtn: { borderWidth: 0.5, borderColor: '#ddd', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 7 },
  prefSelectBtnActive: { backgroundColor: '#FAECE7', borderColor: '#E9785A' },
  prefSelectText: { fontSize: 12, color: '#555' },
  prefSelectTextActive: { color: '#993C1D', fontWeight: '600' },
})
