import getPool from './_db.js'
import { verifyUser, cors } from './_auth.js'

// Ta sama normalizacja nazw ćwiczeń co w api/exercise-logs.js — bez niej
// "Bench press" i "bench  press" rozdzieliłyby statystyki jednego ćwiczenia.
const NORM = (col) => `lower(btrim(regexp_replace(${col}, '\\s+', ' ', 'g')))`

// Wartości serii pochodzą z pól tekstowych — do liczb bierzemy tylko wpisy
// czysto liczbowe (dopuszczając przecinek), reszta ("8-10", "max") odpada.
const NUM_RE = `'^[0-9]+([.,][0-9]+)?$'`
const NUM = (expr) => `replace(${expr}, ',', '.')::numeric`

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/
const TZ_RE = /^[A-Za-z][A-Za-z0-9_+/-]{0,40}$/
const MAX_DAYS = 186

// logged_at to TIMESTAMPTZ — dzień sesji zależy od strefy użytkownika,
// inaczej trening o 23:30 wpadałby do następnej doby (UTC).
const DAY = `(wl.logged_at AT TIME ZONE $2)::date`

const diffDays = (from, to) => {
  const p = (s) => { const [y, m, d] = s.split('-').map(Number); return Date.UTC(y, m - 1, d) }
  return Math.round((p(to) - p(from)) / 86400000)
}

const shiftDate = (iso, n) => {
  const [y, m, d] = iso.split('-').map(Number)
  const dt = new Date(Date.UTC(y, m - 1, d + n))
  return dt.toISOString().slice(0, 10)
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' })

  const pool = getPool()
  const payload = await verifyUser(req, pool)
  if (!payload) return res.status(401).json({ error: 'Brak tokenu' })
  const userId = payload.id

  const { from, to } = req.query
  const tz = TZ_RE.test(req.query.tz || '') ? req.query.tz : 'Europe/Warsaw'
  if (!DATE_RE.test(from || '') || !DATE_RE.test(to || '')) {
    return res.status(400).json({ error: 'Podaj from i to w formacie YYYY-MM-DD' })
  }
  const days = diffDays(from, to) + 1
  if (days < 1) return res.status(400).json({ error: 'from nie może być późniejsze niż to' })
  if (days > MAX_DAYS) return res.status(400).json({ error: `Maksymalny okres to ${MAX_DAYS} dni` })

  // Tryb szczegółowy: ?exercise=nazwa → tylko dane jednego ćwiczenia
  // (osobne pobranie przy wyborze z listy, bez przeliczania całego raportu)
  if (req.query.exercise !== undefined) {
    const norm = String(req.query.exercise).trim().replace(/\s+/g, ' ').toLowerCase()
    if (!norm) return res.status(400).json({ error: 'Podaj exercise' })
    try {
      const [canonical, perDay] = await Promise.all([
        pool.query(
          `SELECT exercise_name FROM exercise_logs
           WHERE user_id = $1 AND ${NORM('exercise_name')} = $2
           ORDER BY logged_date ASC, id ASC LIMIT 1`,
          [userId, norm]
        ),
        pool.query(
          `WITH flat AS (
             SELECT el.logged_date,
                    CASE WHEN COALESCE(s->>'load_unit', 'kg') = 'kg' AND s->>'actual_load' ~ ${NUM_RE}
                         THEN ${NUM(`s->>'actual_load'`)} END AS load,
                    CASE WHEN s->>'actual_reps' ~ ${NUM_RE}
                         THEN ${NUM(`s->>'actual_reps'`)} END AS reps
             FROM exercise_logs el
             CROSS JOIN LATERAL jsonb_array_elements(el.sets) s
             WHERE el.user_id = $1 AND ${NORM('el.exercise_name')} = $2
               AND el.logged_date BETWEEN $3 AND $4
           )
           SELECT logged_date::text AS date,
                  COUNT(*)::int AS sets,
                  COALESCE(SUM(reps), 0)::float AS reps,
                  MAX(load)::float AS max_load,
                  COALESCE(SUM(reps * load), 0)::float AS volume_kg
           FROM flat
           GROUP BY logged_date
           ORDER BY logged_date`,
          [userId, norm, from, to]
        ),
      ])
      const rows = perDay.rows
      return res.json({
        period: { from, to, days },
        exercise: {
          name: canonical.rows[0]?.exercise_name || req.query.exercise,
          perDay: rows,
          days: rows.length,
          bestLoad: rows.reduce((m, r) => Math.max(m, r.max_load || 0), 0) || null,
          totalReps: rows.reduce((s, r) => s + r.reps, 0),
          volumeKg: rows.reduce((s, r) => s + r.volume_kg, 0),
        },
      })
    } catch (e) {
      console.error('Report exercise error:', e)
      return res.status(500).json({ error: 'Błąd serwera' })
    }
  }

  // Okno porównawcze: ten sam rozmiar, bezpośrednio przed okresem raportu
  const prevTo = shiftDate(from, -1)
  const prevFrom = shiftDate(from, -days)

  const sessionsQ = (f, t) => pool.query(
    `SELECT COUNT(*)::int AS sessions,
            COUNT(DISTINCT ${DAY})::int AS active_days,
            AVG(wl.feeling)::float AS avg_feeling
     FROM workout_logs wl
     WHERE wl.user_id = $1 AND ${DAY} BETWEEN $3 AND $4`,
    [userId, tz, f, t]
  )

  // Tonaż tylko z serii w kg — stretching zapisuje sekundy w polu load
  // (loadUnit="sek") i nie może wpadać do kilogramów.
  const volumeQ = (f, t) => pool.query(
    `SELECT COALESCE(SUM(${NUM(`s->>'actual_reps'`)} * ${NUM(`s->>'actual_load'`)}), 0)::float AS volume_kg
     FROM exercise_logs el
     CROSS JOIN LATERAL jsonb_array_elements(el.sets) s
     WHERE el.user_id = $1 AND el.logged_date BETWEEN $2 AND $3
       AND COALESCE(s->>'load_unit', 'kg') = 'kg'
       AND s->>'actual_reps' ~ ${NUM_RE} AND s->>'actual_load' ~ ${NUM_RE}`,
    [userId, f, t]
  )

  // Realizacja planu: workouts trafiają do okresu po faktycznej dacie dnia
  // (week_start + offset dnia tygodnia), dni odpoczynku nie liczą się do planu.
  const plannedQ = pool.query(
    `SELECT COUNT(*)::int AS planned, COUNT(*) FILTER (WHERE done)::int AS done
     FROM workouts
     WHERE user_id = $1 AND COALESCE(rest, FALSE) = FALSE AND week_start IS NOT NULL
       AND week_start + CASE day WHEN 'mon' THEN 0 WHEN 'tue' THEN 1 WHEN 'wed' THEN 2
           WHEN 'thu' THEN 3 WHEN 'fri' THEN 4 WHEN 'sat' THEN 5 WHEN 'sun' THEN 6 ELSE 0 END
           BETWEEN $2 AND $3`,
    [userId, from, to]
  )

  const byDiscQ = pool.query(
    `SELECT w.discipline, COUNT(*)::int AS count, AVG(wl.feeling)::float AS avg_feeling
     FROM workout_logs wl
     JOIN workouts w ON w.id = wl.workout_id
     WHERE wl.user_id = $1 AND ${DAY} BETWEEN $3 AND $4
     GROUP BY w.discipline
     ORDER BY count DESC`,
    [userId, tz, from, to]
  )

  const perDayQ = pool.query(
    `SELECT ${DAY}::text AS date, COUNT(*)::int AS count
     FROM workout_logs wl
     WHERE wl.user_id = $1 AND ${DAY} BETWEEN $3 AND $4
     GROUP BY 1 ORDER BY 1`,
    [userId, tz, from, to]
  )

  // Progres per ćwiczenie: max obciążenie z pierwszego vs ostatniego dnia
  // logowania w okresie (dzienne maksima, żeby pojedyncza lekka seria
  // rozgrzewkowa nie zaniżała wyniku).
  const topExQ = pool.query(
    `WITH flat AS (
       SELECT ${NORM('el.exercise_name')} AS norm,
              el.exercise_name AS name,
              el.logged_date,
              CASE WHEN COALESCE(s->>'load_unit', 'kg') = 'kg' AND s->>'actual_load' ~ ${NUM_RE}
                   THEN ${NUM(`s->>'actual_load'`)} END AS load,
              CASE WHEN s->>'actual_reps' ~ ${NUM_RE}
                   THEN ${NUM(`s->>'actual_reps'`)} END AS reps
       FROM exercise_logs el
       CROSS JOIN LATERAL jsonb_array_elements(el.sets) s
       WHERE el.user_id = $1 AND el.logged_date BETWEEN $2 AND $3
     ), per_day AS (
       SELECT norm, logged_date, MAX(name) AS name,
              MAX(load) AS day_max, SUM(load * reps) AS day_vol
       FROM flat GROUP BY norm, logged_date
     )
     SELECT (array_agg(name ORDER BY logged_date ASC))[1] AS name,
            COUNT(*)::int AS days,
            MAX(day_max)::float AS best_load,
            COALESCE(SUM(day_vol), 0)::float AS volume_kg,
            (array_agg(day_max ORDER BY logged_date ASC) FILTER (WHERE day_max IS NOT NULL))[1]::float AS first_max,
            (array_agg(day_max ORDER BY logged_date DESC) FILTER (WHERE day_max IS NOT NULL))[1]::float AS last_max
     FROM per_day
     GROUP BY norm
     ORDER BY days DESC, volume_kg DESC
     LIMIT 8`,
    [userId, from, to]
  )

  // Płaska lista sesji pod eksport CSV (arkusze kalkulacyjne)
  const sessionsListQ = pool.query(
    `SELECT ${DAY}::text AS date,
            to_char(wl.logged_at AT TIME ZONE $2, 'HH24:MI') AS time,
            w.title, w.discipline, wl.feeling, wl.note
     FROM workout_logs wl
     JOIN workouts w ON w.id = wl.workout_id
     WHERE wl.user_id = $1 AND ${DAY} BETWEEN $3 AND $4
     ORDER BY wl.logged_at ASC
     LIMIT 1000`,
    [userId, tz, from, to]
  )

  const notesQ = pool.query(
    `SELECT ${DAY}::text AS date, w.title, w.discipline, wl.feeling, wl.note
     FROM workout_logs wl
     JOIN workouts w ON w.id = wl.workout_id
     WHERE wl.user_id = $1 AND btrim(COALESCE(wl.note, '')) <> ''
       AND ${DAY} BETWEEN $3 AND $4
     ORDER BY wl.logged_at DESC
     LIMIT 50`,
    [userId, tz, from, to]
  )

  try {
    const [cur, prev, vol, prevVol, plan, byDisc, perDay, topEx, notes, sessionsList] = await Promise.all([
      sessionsQ(from, to), sessionsQ(prevFrom, prevTo),
      volumeQ(from, to), volumeQ(prevFrom, prevTo),
      plannedQ, byDiscQ, perDayQ, topExQ, notesQ, sessionsListQ,
    ])

    const c = cur.rows[0]
    const p = prev.rows[0]
    const { planned, done } = plan.rows[0]

    res.json({
      period: { from, to, days },
      kpi: {
        sessions: c.sessions,
        activeDays: c.active_days,
        avgFeeling: c.avg_feeling,
        planned,
        done,
        adherencePct: planned > 0 ? Math.round((done / planned) * 100) : null,
        volumeKg: vol.rows[0].volume_kg,
      },
      prev: {
        sessions: p.sessions,
        avgFeeling: p.avg_feeling,
        volumeKg: prevVol.rows[0].volume_kg,
      },
      byDiscipline: byDisc.rows,
      perDay: perDay.rows,
      topExercises: topEx.rows,
      notes: notes.rows,
      sessions: sessionsList.rows,
    })
  } catch (e) {
    console.error('Report error:', e)
    res.status(500).json({ error: 'Błąd serwera' })
  }
}
