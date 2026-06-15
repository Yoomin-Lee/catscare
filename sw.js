self.addEventListener('push', function (event) {
  if (!event.data) return
  const data = event.data.json()
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/catscare/apple-touch-icon.png',
      badge: '/catscare/apple-touch-icon.png',
      data: { url: '/catscare/' },
    })
  )
})

self.addEventListener('notificationclick', function (event) {
  event.notification.close()
  event.waitUntil(clients.openWindow(event.notification.data?.url ?? '/catscare/'))
})
