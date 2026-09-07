-- Powiadomienia Web Push: przypomnienie o treningu na X minut przed startem.
--
-- Preferencje siedzą na `users`, a nie w osobnej tabeli: są 1:1 z kontem, a
-- zapytanie dyspozytora i tak joinuje `users` po strefę czasową — osobna tabela
-- dokładałaby drugi JOIN w najgorętszym zapytaniu. Precedens: migracja 007.
--
-- Strefa czasowa jest konieczna, bo workouts.start_time to goły zegar "HH:MM";
-- bez niej serwer nie wie, czy "07:30" to 07:30 w Warszawie, czy w UTC.
ALTER TABLE users ADD COLUMN IF NOT EXISTS timezone        TEXT    NOT NULL DEFAULT 'Europe/Warsaw';
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_enabled  BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS notify_lead_min INT     NOT NULL DEFAULT 30;

-- Zakres pilnowany także w bazie: wyprzedzenie przychodzi z requestu, a wartość
-- ujemna albo absurdalnie duża rozjechałaby okno dyspozytora.
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_notify_lead_min_ck;
ALTER TABLE users ADD CONSTRAINT users_notify_lead_min_ck
  CHECK (notify_lead_min BETWEEN 5 AND 240);

-- Subskrypcje muszą być osobno — jeden użytkownik ma ich wiele (telefon, laptop),
-- a każda wygasa niezależnie. `endpoint` nadaje push service przeglądarki i jest
-- globalnie unikalny, więc jest naturalnym kluczem: to samo urządzenie po
-- ponownym włączeniu powiadomień aktualizuje wpis zamiast tworzyć duplikat,
-- który wysyłałby dwa powiadomienia.
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

-- Rejestr wysłanych przypomnień = deduplikacja. Klucz zawiera planned_at, a nie
-- samo workout_id: przesunięcie treningu na inną godzinę ma dać nowe
-- przypomnienie, a nie zostać wyciszone przez stary wpis. Dyspozytor NAJPIERW
-- wstawia tu wiersz (ON CONFLICT DO NOTHING) i wysyła wyłącznie to, co
-- faktycznie wstawił — dwa nakładające się przebiegi crona nie mogą więc
-- wysłać tego samego dwa razy.
CREATE TABLE IF NOT EXISTS workout_reminders (
  workout_id INT NOT NULL REFERENCES workouts(id) ON DELETE CASCADE,
  user_id    INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  planned_at TIMESTAMPTZ NOT NULL,
  sent_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (workout_id, planned_at)
);
CREATE INDEX IF NOT EXISTS idx_workout_reminders_sent ON workout_reminders(sent_at);

-- Dyspozytor skanuje po dacie bez user_id, więc idx_workouts_user_weekstart
-- (user_id, week_start) mu nie pomaga. Indeks częściowy trzyma tylko wiersze,
-- które w ogóle mogą wygenerować przypomnienie. Predykat musi być identyczny
-- jak w zapytaniu, inaczej planer go nie użyje.
CREATE INDEX IF NOT EXISTS idx_workouts_notifiable
  ON workouts(week_start)
  WHERE rest IS NOT TRUE AND done IS NOT TRUE AND start_time <> '';

-- RLS jak w migracji 008: aplikacja łączy się rolą właściciela tabel (omija RLS),
-- więc włączenie bez polityk nie psuje zapytań serwera. Zamyka natomiast dostęp
-- anon/authenticated przez auto-generowane PostgREST Supabase — a w
-- push_subscriptions leżą klucze kryptograficzne subskrypcji.
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_reminders  ENABLE ROW LEVEL SECURITY;
