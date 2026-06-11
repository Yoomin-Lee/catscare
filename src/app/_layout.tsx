import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import Head from 'expo-router/head'
import { Platform, useColorScheme, View } from 'react-native'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'
import { CatsProvider } from '@/lib/cats-context'
import { AuthContext } from '@/lib/auth-context'
import { AnimatedSplashOverlay } from '@/components/animated-icon'
import AppTabs from '@/components/app-tabs'
import LoginScreen from '@/components/login-screen'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [guestMode, setGuestMode] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) setGuestMode(false)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!__DEV__ && session === undefined) return null

  const content = (
    <AuthContext.Provider value={{ exitGuestMode: () => setGuestMode(false) }}>
      <CatsProvider userId={session?.user.id}>
        <AnimatedSplashOverlay />
        {(__DEV__ || session || guestMode) ? <AppTabs /> : <LoginScreen onGuest={() => setGuestMode(true)} />}
      </CatsProvider>
    </AuthContext.Provider>
  )

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Head>
        <link rel="icon" href="/catscare/favicon.png" type="image/png" />
        <title>CatsCare</title>
      </Head>
      {Platform.OS === 'web' ? (
        <View style={{ flex: 1, backgroundColor: '#d8d8d8', alignItems: 'center' }}>
          <View style={{ flex: 1, width: '100%', maxWidth: 430 }}>
            {content}
          </View>
        </View>
      ) : content}
    </ThemeProvider>
  )
}
