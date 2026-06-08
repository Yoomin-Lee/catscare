import AsyncStorage from '@react-native-async-storage/async-storage'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://kbjxjogmnwurxbxnpfsz.supabase.co'
const supabaseAnonKey = 'sb_publishable_VcjCyKvydLBxY37qClPtzw_1L7jZnx7'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
})