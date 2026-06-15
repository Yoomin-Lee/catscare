import { Platform } from 'react-native'
import { supabase } from './supabase'

const VAPID_PUBLIC_KEY = process.env.EXPO_PUBLIC_VAPID_PUBLIC_KEY ?? ''

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  return Uint8Array.from([...rawData].map(c => c.charCodeAt(0)))
}

export async function registerServiceWorker() {
  if (Platform.OS !== 'web' || !('serviceWorker' in navigator)) return
  try {
    await navigator.serviceWorker.register('/catscare/sw.js', { scope: '/catscare/' })
  } catch {}
}

export async function isPushSupported(): Promise<boolean> {
  return Platform.OS === 'web' && 'serviceWorker' in navigator && 'PushManager' in window
}

export async function getPushPermission(): Promise<NotificationPermission | null> {
  if (!(await isPushSupported())) return null
  return Notification.permission
}

export async function subscribePush(userId: string): Promise<boolean> {
  if (!(await isPushSupported())) return false
  const permission = await Notification.requestPermission()
  if (permission !== 'granted') return false

  try {
    const reg = await navigator.serviceWorker.ready
    const existing = await reg.pushManager.getSubscription()
    const sub = existing ?? await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
    })
    const json = sub.toJSON()
    await supabase.from('push_subscriptions').upsert({
      user_id: userId,
      endpoint: sub.endpoint,
      p256dh: json.keys?.p256dh ?? '',
      auth: json.keys?.auth ?? '',
    }, { onConflict: 'endpoint' })
    return true
  } catch {
    return false
  }
}

export async function unsubscribePush(userId: string): Promise<void> {
  if (!(await isPushSupported())) return
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    await supabase.from('push_subscriptions').delete()
      .eq('user_id', userId).eq('endpoint', sub.endpoint)
    await sub.unsubscribe()
  } catch {}
}

export async function isPushSubscribed(): Promise<boolean> {
  if (!(await isPushSupported())) return false
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return !!sub
  } catch {
    return false
  }
}
