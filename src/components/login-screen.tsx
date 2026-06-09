import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useState } from 'react'
import FontAwesome5 from '@expo/vector-icons/FontAwesome5'
import { supabase } from '@/lib/supabase'

export default function LoginScreen({ onGuest }: { onGuest?: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [signUpDone, setSignUpDone] = useState(false)

  const handleSubmit = async () => {
    setError('')
    setLoading(true)

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      setLoading(false)
      if (error) setError(error.message)
      else setSignUpDone(true)
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      setLoading(false)
      if (error) setError(error.message)
    }
  }

  const toggleMode = () => {
    setIsSignUp(!isSignUp)
    setError('')
    setSignUpDone(false)
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
      <View style={styles.hero}>
        <View style={styles.logoBadge}>
          <FontAwesome5 name="cat" size={40} color="#fff" style={{ transform: [{ translateY: 3 }] }} />
        </View>
        <View style={styles.titleRow}>
          <Text style={styles.titleCats}>Cats</Text>
          <Text style={styles.titleCare}>Care</Text>
          <Text style={styles.titlePaw}>🐾</Text>
        </View>
        <Text style={styles.subtitle}>우리 고양이의 생애를 기록해요</Text>
      </View>

      <View style={styles.card}>
        {signUpDone ? (
          <View style={styles.successBox}>
            <Text style={styles.successEmoji}>📬</Text>
            <Text style={styles.successText}>가입 완료!</Text>
            <Text style={styles.successSub}>이메일을 확인하고 인증을 완료해주세요</Text>
            <TouchableOpacity onPress={toggleMode}>
              <Text style={styles.toggleText}>로그인으로 돌아가기</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <Text style={styles.formTitle}>{isSignUp ? '회원가입' : '로그인'}</Text>

            <TextInput
              style={styles.input}
              placeholder="이메일"
              placeholderTextColor="#bbb"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!loading}
            />
            <TextInput
              style={styles.input}
              placeholder="비밀번호"
              placeholderTextColor="#bbb"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!loading}
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

            <TouchableOpacity
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSubmit}
              disabled={loading}>
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>{isSignUp ? '가입하기' : '로그인'}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity style={styles.toggleRow} onPress={toggleMode}>
              <Text style={styles.toggleText}>
                {isSignUp ? '이미 계정이 있어요 · 로그인' : '처음이신가요? · 회원가입'}
              </Text>
            </TouchableOpacity>

            {onGuest && !isSignUp && (
              <TouchableOpacity style={styles.guestBtn} onPress={onGuest}>
                <Text style={styles.guestText}>로그인 없이 둘러보기</Text>
              </TouchableOpacity>
            )}
          </>
        )}
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF8F5',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  hero: {
    alignItems: 'center',
    marginBottom: 36,
  },
  logoBadge: {
    width: 88,
    height: 88,
    backgroundColor: '#E9785A',
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    shadowColor: '#E9785A',
    shadowOpacity: 0.4,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 6 },
    elevation: 8,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  titleCats: {
    fontSize: 30,
    fontWeight: '800',
    color: '#E9785A',
    letterSpacing: -0.5,
  },
  titleCare: {
    fontSize: 30,
    fontWeight: '800',
    color: '#1D9E75',
    letterSpacing: -0.5,
  },
  titlePaw: {
    fontSize: 18,
    marginLeft: 4,
    opacity: 0.8,
  },
  subtitle: {
    fontSize: 14,
    color: '#aaa',
    marginTop: 6,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  formTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 20,
  },
  input: {
    backgroundColor: '#F7F7F7',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1a1a1a',
    marginBottom: 12,
  },
  errorText: {
    color: '#E9785A',
    fontSize: 13,
    marginBottom: 8,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#E9785A',
    borderRadius: 12,
    paddingVertical: 15,
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },
  toggleRow: {
    alignItems: 'center',
  },
  toggleText: {
    color: '#E9785A',
    fontSize: 13,
    fontWeight: '500',
  },
  guestBtn: {
    alignItems: 'center',
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 0.5,
    borderTopColor: '#F0F0F0',
  },
  guestText: {
    color: '#aaa',
    fontSize: 13,
  },
  successBox: {
    alignItems: 'center',
    paddingVertical: 12,
    gap: 8,
  },
  successEmoji: {
    fontSize: 48,
  },
  successText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  successSub: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 8,
  },
})
