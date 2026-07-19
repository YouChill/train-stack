# TrainStack

Tygodniowy planer treningowy z dziennikiem wykonania, statystykami i raportami.
Frontend w React (Vite), backend jako funkcje serverless na Vercel, baza
PostgreSQL (Supabase).

## Funkcje

- **Plan tygodniowy** — treningi rozpisane na dni tygodnia, z nawigacją między
  tygodniami; widok dnia i widok całego tygodnia.
- **Dyscypliny** — konfigurowalne kategorie treningów (nazwa, ikona, kolor);
  zestaw domyślny można edytować per użytkownik.
- **Treningi** — parametry (np. dystans, czas), lista ćwiczeń
  (serie/powtórzenia/obciążenie), notatki, dni odpoczynku, oznaczanie jako
  wykonane.
- **Śledzenie wykonania** — dziennik sesji (`workout_logs`: data, samopoczucie
  1–5, notatka, faktycznie wykonane ćwiczenia/parametry) oraz dziennik serii
  per ćwiczenie (`exercise_logs`) z historią obciążeń.
- **Statystyki** — łączna liczba sesji, średnie samopoczucie, rozbicie na
  dyscypliny, trend z ostatnich 8 tygodni.
- **Raporty** — podsumowanie wybranego okresu (7/14/30 dni itd.): sesje per
  dzień, realizacja planu, tonaż i progres ćwiczeń, raport pojedynczego
  ćwiczenia; eksport do Markdown (schowek / plik `.md`) i CSV sesji.
- **Generator planu AI** — generowanie tygodniowego planu przez OpenAI na
  podstawie opisu użytkownika (limitowane per użytkownik).
- **Import JSON** — wczytanie gotowego planu tygodnia z JSON (format opisany
  w modalu importu).
- **Konta użytkowników** — rejestracja, logowanie (JWT), reset hasła mailem
  (Nodemailer + Gmail).

## Stack

| Warstwa | Technologia |
|---|---|
| Frontend | React 18, Vite 5, lucide-react (style inline w `src/styles.js`) |
| API (produkcja) | Funkcje serverless Vercel w `api/` (Node, ESM) |
| API (dev, opcjonalnie) | Express w `server/` |
| Baza danych | PostgreSQL (Supabase), sterownik `pg`, RLS włączone |
| Auth | JWT (`jsonwebtoken`) + bcrypt, wersjonowanie tokenów |
| Mail | Nodemailer (Gmail, hasło aplikacji) |
| AI | OpenAI Chat Completions |

## Struktura repozytorium

```
api/                  Funkcje serverless (Vercel) — właściwy backend
  _auth.js            Weryfikacja JWT + CORS (współdzielone)
  _db.js              Pula połączeń pg (współdzielona)
  _mail.js            Wysyłka maili (reset hasła)
  _ratelimit.js       Rate limiting oparty o tabelę rate_limits
  auth/index.js       ?action=me|register|login|request-reset|reset-password
  workouts/index.js   CRUD treningów (tydzień)
  disciplines/index.js  CRUD dyscyplin
  logs/index.js       Dziennik sesji (workout_logs)
  exercise-logs.js    Dziennik serii per ćwiczenie
  stats.js            Statystyki globalne
  report.js           Raport okresowy (agregacje per dzień/dyscyplina/ćwiczenie)
  ai.js               Generowanie planu przez OpenAI
src/                  Frontend React
  App.jsx             Stan aplikacji i kompozycja widoków
  api.js              Klient HTTP do /api
  components/         Modale i widoki (Report, Stats, Tracking, AI, Import…)
  report-text.js      Budowanie tekstu raportu (Markdown/CSV) do eksportu
server/               Alternatywny lokalny backend Express (podzbiór API:
                      auth, workouts, disciplines, exercise-logs + /api/health)
supabase/migrations/  Migracje SQL (001–008)
scripts/migrate.js    Runner migracji (npm run db:migrate)
docs/                 Notatki projektowe (plan modułu raportowego)
vercel.json           Build + rewrites (SPA fallback na index.html)
```

## Uruchomienie lokalne

Wymagania: Node 18+, baza PostgreSQL (najprościej projekt na Supabase).

```bash
npm install
npm run db:migrate   # wymaga DATABASE_URL; wykonuje supabase/migrations/*.sql
npm run dev          # frontend na http://localhost:5173
```

Frontend woła `/api/*` — lokalnie potrzebny jest backend. Do wyboru:

- **`vercel dev`** w katalogu głównym — uruchamia funkcje z `api/`
  (pełne API, zalecane), albo
- **Express z `server/`** — `cd server && npm install && npm run dev`
  (port 3001; uwaga: nie zawiera endpointów `logs`, `stats`, `report`, `ai`).
  Przykładowa konfiguracja: `server/.env.example`.

### Zmienne środowiskowe

| Zmienna | Wymagana | Opis |
|---|---|---|
| `DATABASE_URL` | tak | Connection string Postgresa (Supabase: Session mode, port 5432) |
| `JWT_SECRET` | tak | Sekret do podpisywania tokenów JWT |
| `DATABASE_CA_CERT` | nie | Certyfikat CA dla TLS do bazy |
| `OPENAI_API_KEY` | dla AI | Klucz OpenAI (generator planu) |
| `OPENAI_MODEL` | nie | Model OpenAI (domyślny w `api/ai.js`) |
| `GMAIL_USER`, `GMAIL_APP_PASSWORD` | dla maili | Konto Gmail + hasło aplikacji (reset hasła) |
| `MAIL_FROM_NAME` | nie | Nazwa nadawcy maili |
| `APP_URL` / `CLIENT_URL` | nie | URL frontendu (linki w mailach / CORS) |
| `PORT` | nie | Port lokalnego serwera Express (domyślnie 3001) |

## Baza danych

Schemat żyje w `supabase/migrations/` (users, disciplines, workouts,
workout_logs, exercise_logs, rate_limits + RLS). Runner `npm run db:migrate`
wykonuje pliki w kolejności leksykograficznej i zapisuje wykonane w tabeli
`schema_migrations` — migracje są idempotentne, więc pierwsze uruchomienie na
istniejącej bazie niczego nie psuje.

## Deployment

Projekt jest skonfigurowany pod Vercel (`vercel.json`): build Vite do `dist/`,
funkcje z `api/` pod `/api/*`, reszta ścieżek z fallbackiem SPA na
`index.html`. Zmienne środowiskowe z tabeli powyżej ustawia się w ustawieniach
projektu Vercel.
