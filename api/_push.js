// Wysyłka Web Push (VAPID). Helper, nie route — pliki z prefiksem `_` nie liczą
// się do limitu 12 funkcji serverless na planie Hobby.
//
// Klucze generuje się RAZ:
//   npx web-push generate-vapid-keys --json
// i wkleja do Environment Variables w Vercel (Production i Preview). Zmiana
// klucza publicznego unieważnia wszystkie istniejące subskrypcje we wszystkich
// przeglądarkach, więc nie rotujemy go bez potrzeby.
import webpush from 'web-push'

export const DEFAULT_TZ = 'Europe/Warsaw'
export const LEAD_MIN = 5
export const LEAD_MAX = 240

// Ta sama walidacja co w api/report.js — nazwa strefy trafia do SQL
// (AT TIME ZONE), więc nie może być dowolnym stringiem. To jednak tylko
// pierwszy etap: 'Europe/Atlantis' przechodzi regex, a nieistniejąca strefa
// wywala zapytanie dyspozytora dla WSZYSTKICH użytkowników, nie tylko winnego.
// Drugim etapem jest sprawdzenie w pg_timezone_names (api/push/index.js).
export const TZ_RE = /^[A-Za-z]+(?:[_-][A-Za-z]+)*(?:\/[A-Za-z0-9]+(?:[_+-][A-Za-z0-9]+)*){0,2}$/

export function vapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || ''
}

let configured = false
export function configureVapid() {
  if (configured) return true
  const pub = process.env.VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) return false
  // Apple odrzuca subject inny niż mailto: lub https: (BadJwtToken).
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:noreply@trainstack.app', pub, priv)
  configured = true
  return true
}

export function parseSubscription(body) {
  const sub = body?.subscription || body
  const endpoint = typeof sub?.endpoint === 'string' ? sub.endpoint.trim() : ''
  const p256dh = typeof sub?.keys?.p256dh === 'string' ? sub.keys.p256dh : ''
  const auth = typeof sub?.keys?.auth === 'string' ? sub.keys.auth : ''
  if (!endpoint || !endpoint.startsWith('https://') || endpoint.length > 2000) return null
  if (!p256dh || !auth) return null
  return { endpoint, p256dh, auth }
}

// Zwraca 'ok' | 'gone' | 'retry'.
//   gone  – 404/410: subskrypcja martwa (odinstalowana PWA, wyczyszczone dane
//           przeglądarki) → wołający kasuje ją z bazy, inaczej tabela puchnie,
//           a każdy przebieg dyspozytora marnuje czas na trupy.
//   retry – 429/5xx/sieć: błąd przejściowy → wołający zwalnia rezerwację,
//           żeby następny tick spróbował ponownie w oknie tolerancji.
export async function sendPush(sub, payload, ttlSec) {
  try {
    await webpush.sendNotification(
      { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
      JSON.stringify(payload),
      // urgency:'high' jest istotne, nie kosmetyczne — bez niego APNs i tryb
      // Doze na Androidzie potrafią zbuforować dostawę o kilkanaście minut,
      // co przy 30-minutowym wyprzedzeniu zjada cały sens funkcji.
      // TTL, bo przypomnienie dostarczone po treningu jest bezwartościowe.
      { TTL: Math.max(60, ttlSec || 1800), urgency: 'high' }
    )
    return 'ok'
  } catch (e) {
    const code = e?.statusCode
    if (code === 404 || code === 410) return 'gone'
    console.error('Push send error:', code, e?.body || e?.message)
    return 'retry'
  }
}
