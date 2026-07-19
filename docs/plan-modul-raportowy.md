# Plan: moduł raportowy (podsumowanie ostatnich treningów)

Cel: użytkownik wybiera okres (np. ostatnie 7/14/30 dni), dostaje wizualne
podsumowanie swoich treningów oraz może wyeksportować je jako tekst
(Markdown do schowka / plik do pobrania).

## 1. Co już mamy (stan wyjściowy)

Dane w bazie pokrywają wszystko, czego potrzebuje raport — **żadnych migracji
nie trzeba**:

| Tabela | Co daje raportowi |
|---|---|
| `workout_logs` | sesje: `logged_at`, `feeling` (1–5), `note`, `actual_exercises`, `actual_params` |
| `exercise_logs` | serie per ćwiczenie: `logged_date`, `sets` (`actual_reps`, `actual_load`, `load_unit`) — tonaż i progres |
| `workouts` | plan: `week_start`, `discipline`, `done`, `rest` — realizacja planu (plan vs wykonanie) |
| `disciplines` | ikona/kolor/nazwa do prezentacji (frontend już je ma w `discs`) |

Istniejący `api/stats.js` + `StatsModal.jsx` to statystyki „od zawsze" bez
wyboru okresu i bez eksportu. Raport to inny use-case (okresowe podsumowanie,
porównanie z poprzednim okresem, eksport), więc dostaje **osobny endpoint
i osobny modal** — ale celowo reużywa stylów `tp-stat-*`, żeby wyglądać
spójnie. (Rozważana alternatywa: trzecia zakładka w StatsModal — odrzucona,
bo selektor okresu i pasek eksportu nie pasują do tamtego układu, a modal
i tak ładowałby inne dane.)

## 2. Backend: `api/report.js` (nowy endpoint)

`GET /api/report?from=YYYY-MM-DD&to=YYYY-MM-DD&tz=Europe/Warsaw`

Wzorzec identyczny jak `api/stats.js` (cors → verifyUser → kilka zapytań →
jeden JSON). Bez odpowiednika w `server/routes/` — stats też go nie ma,
to już przyjęta konwencja.

Zwracany JSON:

```
{
  period: { from, to, days },
  kpi: {
    sessions,            // COUNT(workout_logs) w okresie
    activeDays,          // COUNT(DISTINCT dzień)
    avgFeeling,          // AVG(feeling)
    planned, done,       // workouts w okresie (rest=false): wszystkie / done=true
    adherencePct,        // done/planned
    volumeKg             // Σ actual_reps × actual_load z exercise_logs (tylko load_unit='kg')
  },
  prev: { sessions, avgFeeling, volumeKg },   // to samo okno bezpośrednio przed — do delt "▲ +20%"
  byDiscipline: [{ discipline, count, avgFeeling }],
  perDay:       [{ date, count, avgFeeling }],          // pod wykres słupkowy dni
  topExercises: [{ name, days, bestLoad, volumeKg, firstMaxLoad, lastMaxLoad }],  // top ~8, progres = last-first
  notes:        [{ date, title, discipline, feeling, note }]   // sesje z niepustą notatką
}
```

Szczegóły zapytań:

- **Strefa czasu**: `workout_logs.logged_at` to `TIMESTAMPTZ` — grupowanie
  per dzień przez `(logged_at AT TIME ZONE $tz)::date`, `tz` z frontu
  (`Intl.DateTimeFormat().resolvedOptions().timeZone`), walidowana whitelistą
  / `pg_timezone_names` fallbackiem na `Europe/Warsaw`. `exercise_logs.logged_date`
  jest już `DATE` — bez konwersji.
- **Tonaż**: `jsonb_array_elements(sets)`, sumowane tylko serie z
  `load_unit='kg'` i niepustym `actual_load`/`actual_reps` (stretch loguje
  sekundy jako load — nie może wpadać do kilogramów).
- **Plan vs wykonanie**: workouts, których `week_start + offset dnia` wpada
  w okres; prościej: `week_start BETWEEN from-6dni AND to` i filtrowanie po
  faktycznej dacie dnia (`day` → offset) — do rozstrzygnięcia w implementacji,
  wystarczy przybliżenie po `week_start` (raport tygodniowy i tak wyrówna się
  do tygodni).
- **Progres ćwiczeń**: dla top ćwiczeń (po liczbie dni) `MAX(actual_load)`
  z pierwszego i ostatniego logowanego dnia w okresie → strzałka ▲/▼/=.
- Walidacja: `to - from` max 180 dni, `from <= to`, 400 przy złych datach.

## 3. Frontend: `ReportModal.jsx` (nowy komponent)

Wejście: pozycja **„Raport"** (ikona `FileText`) w menu „⋮" w `Header.jsx`,
obok „Statystyki"; stan `reportM` w `App.jsx` — wiring 1:1 jak `statsM`.

Układ modala (`tp-modal tp-modal-w`, style reużyte z sekcji statystyk):

1. **Selektor okresu** — pigułki `7 dni / 14 dni / 30 dni / własny` (dwa
   `<input type="date">` przy „własnym"); zmiana → refetch.
2. **Karty KPI** (`tp-stats-cards`): sesje, dni aktywne, realizacja planu %,
   średnie samopoczucie (emoji jak w StatsModal), tonaż — każda z deltą vs
   poprzedni okres (mały ▲/▼ z procentem, kolor lime/czerwony).
3. **Wykres dni** — słupki per dzień okresu (reużycie `tp-stat-week*`;
   dla 30 dni słupki węższe, etykiety co ~5 dni). Zero bibliotek — repo
   świadomie nie ma lib do wykresów i raport tego nie zmienia.
4. **Podział na dyscypliny** — dokładnie wzór `tp-stat-disc` ze StatsModal.
5. **Top ćwiczenia** — lista: nazwa, liczba dni, najlepsza seria, tonaż,
   strzałka progresu obciążenia.
6. **Notatki z okresu** — lista data + tytuł + notatka (`tp-log-item`).
7. **Stopka eksportu**: `[Kopiuj tekst] [Pobierz .md] [Zamknij]`.

Stany: spinner (`tp-loading`), pusty okres („Brak treningów w tym okresie"
+ zachęta), błąd → toast (istniejący mechanizm `Toasts`).

## 4. Eksport tekstowy: `src/report-text.js` (nowy plik)

Czysta funkcja `buildReportText(report, discs)` → Markdown (testowalna,
niezależna od Reacta; używana przez oba przyciski):

```markdown
# Raport treningowy 23.06 – 19.07.2026

**12 sesji** w 10 dni aktywnych · realizacja planu 86% · tonaż 14 250 kg
Samopoczucie: 💪 (4.1/5) · vs poprzedni okres: sesje +20%, tonaż +8%

## Dyscypliny
- 🏋️ Siłownia — 6× (śr. 💪)
- 🏃 Bieganie — 4× (śr. 😐)

## Top ćwiczenia
- Bench Press — 5 dni, best 8×80 kg, progres 75→80 kg ▲

## Notatki
- 12.07 „Siłownia górna": ciężko po chorobie, zeszło z obciążenia
```

- **Kopiuj**: `navigator.clipboard.writeText(...)` + toast „Skopiowano".
- **Pobierz .md**: `Blob` + tymczasowy `<a download="raport-2026-07-19.md">`.
- Format Markdown celowo — czytelny też jako goły tekst (czat, notatki).

## 5. Zmiany w plikach (podsumowanie)

| Plik | Zmiana |
|---|---|
| `api/report.js` | **nowy** — endpoint raportu (~120 linii) |
| `src/api.js` | + `export const report = { get: (params) => ... }` |
| `src/components/ReportModal.jsx` | **nowy** (~200 linii) |
| `src/report-text.js` | **nowy** — generator Markdown (~60 linii) |
| `src/components/Header.jsx` | + pozycja menu „Raport" |
| `src/App.jsx` | + stan `reportM`, render modala |
| `src/styles.js` | + kilka klas (pigułki okresu, delty KPI); reszta reużyta |

## 6. Przypadki brzegowe

- Pusty okres / świeże konto → czytelny pusty stan, eksport zablokowany.
- `feeling` NULL (stare wpisy) → „—", pomijane w średniej.
- Serie bez `actual_load` lub z `load_unit ≠ kg` → poza tonażem, ale liczą
  się do „dni ćwiczenia".
- Delta vs poprzedni okres, gdy poprzedni pusty → pokazujemy „brak danych",
  nie „+∞%".
- Duplikaty nazw ćwiczeń — grupowanie tą samą normalizacją co
  `api/exercise-logs.js` (`NORM`: lower + btrim + zbite spacje).

## 7. Etapy wdrożenia

1. **MVP**: endpoint + modal + kopiowanie tekstu (pkt 2–4). ✅ (PR #40)
2. **Eksport plikowy**: pobieranie .md + CSV sesji (średniki i BOM pod
   polski Excel). ✅ — po uwagach z mobile eksport zebrany w jeden przycisk
   „Eksport" z menu: Udostępnij (natywny arkusz przez `navigator.share`,
   tylko gdy dostępny), Kopiuj tekst, Pobierz .md, Pobierz CSV.
3. **Raport pojedynczego ćwiczenia** (backlog, zgłoszone z użycia):
   na dole modala raportu sekcja z wyborem ćwiczenia i wykresem
   powtórzeń + ciężaru w czasie.
   - wybór: `<select>`/datalist zasilany istniejącym
     `GET /api/exercise-logs?names=1` (nazwy już znormalizowane
     i posortowane po ostatnim użyciu);
   - dane: rozszerzenie `/api/report` o `?exercise=nazwa` zwracające
     per dzień okresu `max obciążenie [kg]`, `sumę powtórzeń` i liczbę
     serii (agregacja jak w CTE `flat`/`per_day` z topExercises);
   - wykres: słupki = powtórzenia, linia/punkty = max kg (dwie osie,
     styl `tp-stat-weeks`, bez bibliotek — spójnie z resztą);
   - stan wyboru nie resetuje się przy zmianie okresu; ćwiczenie trafia
     też do eksportu tekstowego jako osobna sekcja.
4. **Opcjonalnie później** (fundamenty już są w repo):
   - podsumowanie narracyjne AI — `api/ai.js` już ma auth+rate-limit,
     wystarczy `action=summary` z payloadem raportu;
   - cotygodniowy raport e-mailem — `api/_mail.js` (nodemailer) już wysyła
     maile resetu hasła, brakuje tylko cron-triggera (Vercel cron);
   - wersja do druku / PDF przez `window.print` na widoku raportu.
