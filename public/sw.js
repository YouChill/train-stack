/* Service worker TRAINstack — wyłącznie powiadomienia push.
 *
 * Świadomie NIE cache'uje niczego. Handler `fetch` jest pusty i nie woła
 * respondWith — istnieje tylko dlatego, że Chrome na Androidzie wymaga
 * zarejestrowanego handlera fetch, żeby uznać stronę za instalowalną PWA
 * (a bez instalacji nie ma push na iOS). Prawdziwe cache'owanie SPA
 * z hashowanymi bundlami Vite to prosta droga do serwowania nieaktualnej
 * aplikacji po deployu — osobny temat, poza zakresem powiadomień.
 */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})

self.addEventListener('push', (event) => {
  // Payload może nie dojść albo być śmieciem. showNotification MUSI zostać
  // wywołane przy każdym pushu: Safari odbiera uprawnienie po kilku "cichych"
  // pushach, a Chrome pokazuje wtedy systemowe "strona zaktualizowana w tle".
  let d = {}
  try { d = event.data ? event.data.json() : {} } catch { d = {} }

  event.waitUntil(self.registration.showNotification(d.title || 'TRAINstack', {
    body: d.body || 'Zbliża się zaplanowany trening',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    // renotify bez ustawionego tag rzuca TypeError w Chrome — zawsze razem.
    tag: d.tag || 'trainstack',
    renotify: true,
    data: { url: d.url || '/' },
  }))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = new URL(event.notification.data?.url || '/', self.location.origin).href
  event.waitUntil((async () => {
    // Jeśli aplikacja jest już otwarta, podnosimy istniejące okno zamiast
    // otwierać drugie. openWindow na iOS działa tylko wewnątrz tego handlera.
    const wins = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const w of wins) {
      if (w.url.startsWith(self.location.origin)) {
        await w.focus()
        return
      }
    }
    await self.clients.openWindow(url)
  })())
})

// Przeglądarka bywa, że rotuje endpoint subskrypcji. Odtwarzamy ją lokalnie;
// wysłanie na serwer i tak nastąpi przy najbliższym otwarciu aplikacji
// (src/push.js → syncSubscription), bo tutaj nie mamy tokenu JWT.
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(self.registration.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: event.oldSubscription?.options?.applicationServerKey,
  }).catch(() => {}))
})
