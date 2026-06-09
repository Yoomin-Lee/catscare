import { DarkTheme, DefaultTheme, ThemeProvider } from 'expo-router'
import Head from 'expo-router/head'
import { useColorScheme } from 'react-native'
import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'

import { supabase } from '@/lib/supabase'
import { CatsProvider } from '@/lib/cats-context'
import { AnimatedSplashOverlay } from '@/components/animated-icon'
import AppTabs from '@/components/app-tabs'
import LoginScreen from '@/components/login-screen'

export default function RootLayout() {
  const colorScheme = useColorScheme()
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })

    return () => subscription.unsubscribe()
  }, [])

  if (!__DEV__ && session === undefined) return null

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Head>
        <link rel="icon" href="/favicon.png" type="image/png" />
        <title>CatsCare</title>
      </Head>
      <CatsProvider>
        <AnimatedSplashOverlay />
        {(__DEV__ || session) ? <AppTabs /> : <LoginScreen />}
      </CatsProvider>
    </ThemeProvider>
  )
}
