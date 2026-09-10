// Klient Web Push: wykrywanie wsparcia, subskrypcja i jej odtwarzanie.
import * as api from './api.js'

export const isSupported = () =>
  typeof navigator !== 'undefined' &&
  'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window

// iPadOS podaje się za Maca, stąd druga część warunku.
export const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)

// Na iOS push działa wyłącznie w aplikacji uruchomionej z ekranu początkowego.
export const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true

export const browserTz = () =>
  Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Warsaw'

export const permission = () =>
  typeof Notification === 'undefined' ? 'unsupported' : Notification.permission

// Klucz VAPID jest base64url, a pushManager.subscribe chce Uint8Array.
function urlB64ToUint8Array(b64) {
  const padded = (b64 + '='.repeat((4 - (b64.length % 4)) % 4))
    .replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(padded)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

const toJson = (sub) => {
  const j = sub.toJSON()
  return { endpoint: j.endpoint, keys: { p256dh: j.keys.p256dh, auth: j.keys.auth } }
}

// UWAGA: musi być wołane bezpośrednio z handlera kliknięcia, a
// Notification.requestPermission() musi polecieć PRZED jakimkolwiek innym
// awaitem na sieci — Safari na iOS odrzuca prośbę o zgodę, jeśli wcześniej
// był `await fetch(...)`. Dlatego klucz VAPID przychodzi tu gotowy, pobrany
// razem z preferencjami przy otwarciu modala.
export async function enablePush(vapidPublicKey) {
  if (!isSupported()) throw new Error('Ta przeglądarka nie obsługuje powiadomień push')
  if (!vapidPublicKey) throw new Error('Powiadomienia nie są skonfigurowane na serwerze')

  const perm = await Notification.requestPermission()
  if (perm !== 'granted') return { granted: false }

  const reg = await navigator.serviceWorker.register('/sw.js')
  await navigator.serviceWorker.ready
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlB64ToUint8Array(vapidPublicKey),
  })
  await api.push.subscribe({ subscription: toJson(sub), timezone: browserTz() })
  return { granted: true }
}

export async function disablePush() {
  if (!isSupported()) return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  const { endpoint } = sub.toJSON()
  await sub.unsubscribe().catch(() => {})
  await api.push.unsubscribe({ endpoint })
}

// Leczenie po reinstalacji PWA albo rotacji endpointu: przy każdym starcie,
// gdy zgoda jest udzielona, odczytujemy aktualną subskrypcję i wysyłamy ją
// ponownie (upsert po stronie serwera jest idempotentny). Bez tego na iOS po
// usunięciu i ponownym dodaniu ikony przypomnienia po cichu przestają
// przychodzić, bez żadnego sygnału dla użytkownika.
export async function syncSubscription() {
  if (!isSupported() || Notification.permission !== 'granted') return
  const reg = await navigator.serviceWorker.getRegistration()
  const sub = await reg?.pushManager.getSubscription()
  if (!sub) return
  await api.push.subscribe({ subscription: toJson(sub), timezone: browserTz() })
}
