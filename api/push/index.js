import crypto from 'crypto'
import getPool from '../_db.js'
import { verifyUser, cors } from '../_auth.js'
import { rateLimit, clientIp } from '../_ratelimit.js'
import {
  configureVapid, vapidPublicKey, parseSubscription, sendPush,
  TZ_RE, LEAD_MIN, LEAD_MAX,
} from '../_push.js'

// Powiadomienia Web Push o zbliżającym się treningu.
//
// Cały moduł siedzi w jednym pliku routowanym przez ?action=, bo Vercel na
// planie Hobby dopuszcza 12 funkcji serverless na deployment, a projekt ma ich
// już 10 (pliki z prefiksem `_` się nie liczą) — osobne pliki na
// subscribe/prefs/dispatch zjadłyby cały zapas.
//
// Akcje z JWT: key, prefs (GET/PUT), subscribe, unsubscribe, test.
// Akcja dispatch uwierzytelnia się sekretem CRON_SECRET w nagłówku
// Authorization: Bearer … — dokładnie w formacie, jaki wysyła Vercel Cron,
// więc przejście z zewnętrznego pingera na cron Vercela nie wymaga zmian w kodzie.

// Domyślny limit funkcji na Hobby to 10 s, a jedna wysyłka to round-trip HTTPS
// do FCM/APNs. Przy kilkunastu subskrypcjach 10 s jest realnie osiągalne — a
// wtedy część przypomnień jest już zarezerwowana w rejestrze i nigdy nie
// zostałaby wysłana.
export const config = { maxDuration: 60 }

const DAY_KEYS = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun']
const MAX_BATCH = 200
const REMINDER_RETENTION_DAYS = 30

let schemaReady
function ensureSchema(pool) {
  if (!schemaReady) {
    schemaReady = pool.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone        TEXT    NOT NULL DEFAULT 'Europe/Warsaw';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_enabled  BOOLEAN NOT NULL DEFAULT TRUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_lead_min INT     NOT NULL DEFAULT 30;
      CREATE TABLE IF NOT EXISTS push_subscriptions (
        endpoint     TEXT PRIMARY KEY,
        user_id      INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        p256dh       TEXT NOT NULL,
        auth         TEXT NOT NULL,
        user_agent   TEXT DEFAULT '',
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_push_subs_user ON push_subscriptions(user_id);
      CREATE TABLE IF NOT EXISTS workout_reminders (
        workout_id INT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
        user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        planned_at TIMESTAMPTZ NOT NULL,
        sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (workout_id, planned_at)
      );
      CREATE INDEX IF NOT EXISTS idx_workout_reminders_sent ON workout_reminders(sent_at);
    `).catch((e) => { schemaReady = undefined; throw e })
  }
  return schemaReady
}

// Porównanie hashy zamiast surowych stringów (jak safeEqual w api/agent/index.js):
// timingSafeEqual wymaga buforów tej samej długości, a długość sekretu nie może
// wyciekać czasem odpowiedzi.
function safeEqual(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest()
  const hb = crypto.createHash('sha256').update(String(b)).digest()
  return crypto.timingSafeEqual(ha, hb)
}

// Dwa formaty, żeby przejście z cron-job.org na Vercel Cron nie wymagało zmiany
// kodu. Wariant ?key= zostaje tylko awaryjnie — sekrety w query lądują w logach.
function extractCronKey(req) {
  const h = req.headers.authorization
  if (h?.startsWith('Bearer ')) return h.slice(7)
  return req.headers['x-cron-key'] || req.query.key || null
}

// Strefa musi zostać sprawdzona w katalogu Postgresa, nie tylko regexem:
// AT TIME ZONE z nieznaną nazwą rzuca wyjątek, który przerywa zapytanie
// dyspozytora dla wszystkich użytkowników naraz.
async function validTimezone(pool, tz) {
  if (typeof tz !== 'string' || !TZ_RE.test(tz)) return null
  const { rows } = await pool.query('SELECT 1 FROM pg_timezone_names WHERE name = $1', [tz])
  return rows.length ? tz : null
}

// Jedno zapytanie zamiast N+1: wylicza moment startu każdego nadchodzącego
// treningu w strefie właściciela, rezerwuje go w rejestrze i dokleja subskrypcje.
//
// Dwie rzeczy są tu nieoczywiste i konieczne:
//
// 1. CASE wokół rzutowania godziny. sanitizeStartTime (api/_sanitize.js)
//    przepuszcza \d{1,2}:\d{2} bez kontroli zakresu, a '99:99'::time wywala
//    CAŁĄ paczkę, nie pojedynczy wiersz. CASE wymusza krótkie spięcie.
//
// 2. Rezerwacja (CTE `claimed`) wykonuje się w tym samym zapytaniu i zwracane
//    są wyłącznie wiersze, dla których INSERT faktycznie się udał. Sam
//    anti-join NOT EXISTS nie wystarcza, bo dwa równoległe przebiegi widzą ten
//    sam snapshot — chroni dopiero klucz unikalny.
const CAND_DUE_CTE = `
  WITH cand AS (
    SELECT w.id, w.user_id, w.title, w.start_time,
           COALESCE(NULLIF(d.name, ''), w.discipline) AS disc_name,
           COALESCE(d.icon, '🏋️')                    AS disc_icon,
           u.notify_lead_min,
           ((w.week_start
              + (array_position($1::text[], w.day) - 1)
              + CASE WHEN w.start_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
                     THEN make_time(split_part(w.start_time, ':', 1)::int,
                                    split_part(w.start_time, ':', 2)::int, 0)
                END
            )::timestamp AT TIME ZONE u.timezone) AS planned_at
    FROM workouts w
    JOIN users u ON u.id = w.user_id
    LEFT JOIN disciplines d ON d.user_id = w.user_id AND d.ext_id = w.discipline
    WHERE u.notify_enabled
      AND w.rest IS NOT TRUE
      AND w.done IS NOT TRUE
      AND w.start_time <> ''
      AND w.start_time ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]$'
      -- week_start to zawsze poniedziałek, więc niedzielny trening ma go
      -- sprzed 6 dni. Węższe okno gubiło treningi z weekendu.
      AND w.week_start BETWEEN CURRENT_DATE - 8 AND CURRENT_DATE + 1
      AND EXISTS (SELECT 1 FROM push_subscriptions s WHERE s.user_id = w.user_id)
  ),
  due AS MATERIALIZED (
    SELECT c.* FROM cand c
    WHERE c.planned_at IS NOT NULL
      AND c.planned_at - (c.notify_lead_min * interval '1 minute') <= NOW()
      -- Tolerancja spóźnienia: pinger może przepaść na kilka cykli.
      -- LEAST(lead, 20) gwarantuje, że spóźnione przypomnienie nigdy nie
      -- przyjdzie PO rozpoczęciu treningu.
      AND c.planned_at - (c.notify_lead_min * interval '1 minute')
          > NOW() - (LEAST(c.notify_lead_min, 20) * interval '1 minute')
      AND NOT EXISTS (
        SELECT 1 FROM workout_reminders r
        WHERE r.workout_id = c.id AND r.planned_at = c.planned_at
      )
    ORDER BY c.planned_at
    LIMIT ${MAX_BATCH}
  )`

const DISPATCH_SQL = `${CAND_DUE_CTE},
  claimed AS (
    INSERT INTO workout_reminders (workout_id, user_id, planned_at)
    SELECT id, user_id, planned_at FROM due
    ON CONFLICT (workout_id, planned_at) DO NOTHING
    RETURNING workout_id, planned_at
  )
  SELECT d.id AS workout_id, d.user_id, d.title, d.start_time,
         d.disc_name, d.disc_icon, d.notify_lead_min, d.planned_at,
         s.endpoint, s.p256dh, s.auth
  FROM due d
  JOIN claimed cl ON cl.workout_id = d.id AND cl.planned_at = d.planned_at
  JOIN push_subscriptions s ON s.user_id = d.user_id
  ORDER BY d.planned_at
`

// Wariant podglądowy (?dry=1): ci sami kandydaci, ale bez rezerwacji i bez
// wysyłki. Najszybsza droga do odpowiedzi "dlaczego nic nie przyszło".
const DRY_SQL = `${CAND_DUE_CTE}
  SELECT d.id AS workout_id, d.user_id, d.title, d.start_time,
         d.disc_name, d.notify_lead_min, d.planned_at,
         d.planned_at - (d.notify_lead_min * interval '1 minute') AS fire_at
  FROM due d
  ORDER BY d.planned_at
`

function notificationPayload(row) {
  const name = String(row.title || '').trim() || row.disc_name || 'Trening'
  const mins = Math.max(1, Math.round((new Date(row.planned_at) - Date.now()) / 60000))
  return {
    title: `Trening za ${mins} min`,
    body: `${row.disc_icon} ${name} · ${row.start_time}`,
    url: '/',
    // tag różny per trening i termin — dwa treningi o tej samej godzinie mają
    // dać dwa powiadomienia, a nie nadpisać się nawzajem.
    tag: `w${row.workout_id}-${new Date(row.planned_at).toISOString()}`,
  }
}

async function dispatch(pool) {
  const started = Date.now()
  const { rows } = await pool.query(DISPATCH_SQL, [DAY_KEYS])

  // Grupujemy po treningu: jeden wpis w rejestrze, ale push leci na wszystkie
  // urządzenia użytkownika.
  const byWorkout = new Map()
  for (const r of rows) {
    const key = `${r.workout_id}|${new Date(r.planned_at).toISOString()}`
    if (!byWorkout.has(key)) byWorkout.set(key, { ...r, subs: [] })
    byWorkout.get(key).subs.push({ endpoint: r.endpoint, p256dh: r.p256dh, auth: r.auth })
  }

  let sent = 0, failed = 0
  const gone = []
  const release = []

  for (const item of byWorkout.values()) {
    const payload = notificationPayload(item)
    const ttl = Math.max(60, Math.round((new Date(item.planned_at) - Date.now()) / 1000))
    const results = await Promise.all(item.subs.map((s) => sendPush(s, payload, ttl)))

    let ok = 0, retry = 0
    results.forEach((r, i) => {
      if (r === 'ok') { ok++; sent++ }
      else if (r === 'gone') gone.push(item.subs[i].endpoint)
      else { retry++; failed++ }
    })

    // Nie udało się dostarczyć na żadne urządzenie, a błędy były przejściowe →
    // zwalniamy rezerwację, żeby następny tick spróbował ponownie.
    if (ok === 0 && retry > 0) release.push(item)
  }

  if (gone.length) {
    await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])', [gone])
  }
  if (release.length) {
    await pool.query(
      `DELETE FROM workout_reminders
       WHERE (workout_id, planned_at) IN (SELECT * FROM unnest($1::int[], $2::timestamptz[]))`,
      [release.map((r) => r.workout_id), release.map((r) => r.planned_at)]
    )
  }

  // Sprzątanie rejestru oportunistycznie, idiomem z api/_ratelimit.js — bez
  // tego tabela rośnie w nieskończoność, a osobnego crona na to nie mamy.
  if (Math.random() < 0.02) {
    pool.query(
      `DELETE FROM workout_reminders WHERE sent_at < NOW() - ($1 || ' days')::interval`,
      [String(REMINDER_RETENTION_DAYS)]
    ).catch(() => {})
  }

  return {
    ok: true,
    due: byWorkout.size,
    sent,
    failed,
    pruned: gone.length,
    released: release.length,
    ms: Date.now() - started,
  }
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()

  const pool = getPool()
  const { action } = req.query

  try {
    await ensureSchema(pool)

    // Dyspozytor uwierzytelnia się stałym sekretem, nie JWT — musi być
    // rozpatrzony PRZED verifyUser, inaczej cron dostawałby 401.
    if (action === 'dispatch') {
      const secret = process.env.CRON_SECRET
      if (!secret) return res.status(503).json({ error: 'CRON_SECRET nie jest skonfigurowany' })
      const given = extractCronKey(req)
      if (!given || !safeEqual(given, secret)) {
        await rateLimit(pool, `push-cron:${clientIp(req)}`, 20, 900)
        return res.status(401).json({ error: 'Nieprawidłowy klucz' })
      }
      if (req.query.dry) {
        const { rows } = await pool.query(DRY_SQL, [DAY_KEYS])
        return res.json({ ok: true, dry: true, candidates: rows })
      }
      if (!configureVapid()) return res.status(503).json({ error: 'Klucze VAPID nie są skonfigurowane' })
      return res.json(await dispatch(pool))
    }

    // ── Pozostałe akcje wymagają zalogowanego użytkownika ──
    const payload = await verifyUser(req, pool)
    if (!payload) return res.status(401).json({ error: 'Brak tokenu' })
    const userId = payload.id

    if (action === 'prefs') {
      if (req.method === 'PUT') {
        const { enabled, lead_min, timezone } = req.body || {}
        let lead = null
        if (lead_min !== undefined) {
          lead = Number(lead_min)
          if (!Number.isFinite(lead) || lead < LEAD_MIN || lead > LEAD_MAX) {
            return res.status(400).json({ error: `Wyprzedzenie musi być z zakresu ${LEAD_MIN}–${LEAD_MAX} minut` })
          }
          lead = Math.round(lead)
        }
        let tz = null
        if (timezone !== undefined) {
          tz = await validTimezone(pool, timezone)
          if (!tz) return res.status(400).json({ error: 'Nieznana strefa czasowa' })
        }
        const { rows } = await pool.query(
          `UPDATE users SET
             notify_enabled  = COALESCE($1, notify_enabled),
             notify_lead_min = COALESCE($2, notify_lead_min),
             timezone        = COALESCE($3, timezone)
           WHERE id = $4
           RETURNING notify_enabled AS enabled, notify_lead_min AS lead_min, timezone`,
          [typeof enabled === 'boolean' ? enabled : null, lead, tz, userId]
        )
        return res.json(rows[0])
      }

      const { rows } = await pool.query(
        `SELECT u.notify_enabled AS enabled, u.notify_lead_min AS lead_min, u.timezone,
                COALESCE((
                  SELECT json_agg(json_build_object(
                    'endpoint', s.endpoint, 'user_agent', s.user_agent, 'created_at', s.created_at
                  ) ORDER BY s.created_at)
                  FROM push_subscriptions s WHERE s.user_id = u.id
                ), '[]'::json) AS devices
         FROM users u WHERE u.id = $1`,
        [userId]
      )
      if (!rows.length) return res.status(404).json({ error: 'Nie znaleziono użytkownika' })
      // Klucz publiczny leci razem z preferencjami, żeby modal miał go już w
      // stanie w momencie kliknięcia. Notification.requestPermission() po
      // wcześniejszym `await fetch(...)` jest na iOS odrzucane — to najczęstsza
      // przyczyna "przycisk nic nie robi".
      return res.json({ ...rows[0], vapid_public_key: vapidPublicKey() })
    }

    if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

    if (action === 'subscribe') {
      const sub = parseSubscription(req.body)
      if (!sub) return res.status(400).json({ error: 'Nieprawidłowa subskrypcja push' })
      const tz = await validTimezone(pool, req.body?.timezone)
      const ua = String(req.headers['user-agent'] || '').slice(0, 300)

      // ON CONFLICT po endpoint: ta sama przeglądarka po ponownym włączeniu
      // powiadomień aktualizuje wpis zamiast tworzyć duplikat, który wysyłałby
      // dwa powiadomienia. Przy okazji urządzenie przechodzi na konto, na
      // którym akurat jesteśmy zalogowani.
      await pool.query(
        `INSERT INTO push_subscriptions (endpoint, user_id, p256dh, auth, user_agent)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (endpoint) DO UPDATE
           SET user_id = EXCLUDED.user_id, p256dh = EXCLUDED.p256dh,
               auth = EXCLUDED.auth, user_agent = EXCLUDED.user_agent,
               last_seen_at = NOW()`,
        [sub.endpoint, userId, sub.p256dh, sub.auth, ua]
      )
      await pool.query(
        `UPDATE users SET notify_enabled = TRUE, timezone = COALESCE($1, timezone) WHERE id = $2`,
        [tz, userId]
      )
      return res.status(201).json({ ok: true })
    }

    if (action === 'unsubscribe') {
      const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : ''
      if (!endpoint) return res.status(400).json({ error: 'Brak endpointu' })
      await pool.query('DELETE FROM push_subscriptions WHERE endpoint = $1 AND user_id = $2', [endpoint, userId])
      return res.json({ ok: true })
    }

    // Natychmiastowy push testowy. Bez tego jedynym sposobem sprawdzenia
    // konfiguracji na telefonie jest czekanie na prawdziwy trening.
    if (action === 'test') {
      if (!configureVapid()) return res.status(503).json({ error: 'Klucze VAPID nie są skonfigurowane' })
      const { rows } = await pool.query(
        'SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1', [userId]
      )
      if (!rows.length) return res.status(400).json({ error: 'Brak subskrypcji — najpierw włącz powiadomienia' })
      const results = await Promise.all(rows.map((s) => sendPush(s, {
        title: 'TRAINstack',
        body: '✅ Powiadomienia działają. Przypomnimy o treningu przed startem.',
        url: '/',
        tag: 'test',
      }, 60)))
      const goneList = rows.filter((_, i) => results[i] === 'gone').map((s) => s.endpoint)
      if (goneList.length) {
        await pool.query('DELETE FROM push_subscriptions WHERE endpoint = ANY($1::text[])', [goneList])
      }
      const sent = results.filter((r) => r === 'ok').length
      if (!sent) return res.status(502).json({ error: 'Nie udało się wysłać powiadomienia na żadne urządzenie' })
      return res.json({ sent })
    }

    return res.status(400).json({ error: 'Nieznana akcja' })
  } catch (e) {
    console.error('Push error:', e)
    return res.status(500).json({ error: 'Błąd serwera' })
  }
}
