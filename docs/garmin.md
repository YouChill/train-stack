# Integracja z Garminem

Garmin wstrzymał przyjmowanie wniosków do oficjalnego Connect Developer
Program (Health/Activity/Training API), więc TrainStack nie ma bezpośredniego,
oficjalnego połączenia z kontem Garmin. Zamiast tego są dwie drogi, obie
oparte o ten sam format aktywności i ten sam kod importu po stronie serwera:

| Droga | Jak działa | Kiedy |
|---|---|---|
| **Import plików w aplikacji** | Użytkownik wgrywa pliki FIT (ZIP z „Eksportuj oryginał”) lub CSV z listy aktywności; parsowanie w przeglądarce, podgląd, import | Od ręki, bez konfiguracji, bez sekretów |
| **Skrypt `scripts/garmin-sync`** | Pobiera nowe aktywności z Garmin Connect nieoficjalną biblioteką i wysyła je przez `/api/agent` | Automatyzacja na własnym komputerze / cronie |

W obu przypadkach aktywność trafia do dziennika (`workout_logs`) z parametrami
wykonania (dystans, czas, tempo, tętno, kalorie) i:

- **jeśli w planie jest trening tego dnia w tej samej dyscyplinie** — zostaje
  do niego dopisana, a trening jest oznaczony jako wykonany (status `matched`);
- **w przeciwnym razie** powstaje nowy, wykonany trening z tytułem
  z Garmina (`created`).

Duplikaty są pomijane po `external_id` oraz po zbliżonym czasie startu
(±5 min), więc ten sam trening wgrany jako FIT i zsynchronizowany skryptem nie
pojawi się dwa razy. Ponowny import tego samego pliku jest bezpieczny.

Wpisy z importu mają `source` różne od `manual`, `feeling = NULL` (nie
zaniżają średniego samopoczucia) i notatkę ze źródłem.

## Mapowanie typów aktywności na dyscypliny

Typ z Garmina (np. `running`, `trail_running`, `training/strengthTraining`,
„Pływanie w basenie”) jest dopasowywany po słowach kluczowych do grupy
sportów, a grupa do dyscypliny użytkownika po jej `ext_id` lub nazwie:

| Grupa | Typy (fragmenty) | Dyscyplina (fragment id/nazwy) |
|---|---|---|
| run | run, bieg, jog, treadmill | run, bieg |
| swim | swim, pływ, basen, open water | swim, pływ |
| bike | cycl, bik, ride, rower, kolar, spin | bike, cycl, rower, kolar |
| box | box, boks, mma, martial, kick | box, boks |
| stretch | yoga/joga, stretch, rozciąg, pilates, mobil, medit | stretch, rozciąg, joga, mobil |
| walk | walk, hik, chód, spacer, wędrów, marsz | walk, chód, spacer, marsz |
| gym | strength, siłow, gym, fitness, cardio, hiit, crossfit, elliptical, rowing, training | gym, siłow, strength, fitness |

Brak dopasowania (np. jazda na rowerze bez dyscypliny „rower”) to status
`skipped` — w aplikacji wybiera się dyscyplinę ręcznie z listy, a w skrypcie
można podać `SYNC_DEFAULT_DISCIPLINE`. Ręczny wybór (`discipline` w
aktywności) zawsze wygrywa z automatem.

## Import w aplikacji

Menu (⋮) → **Import z Garmin**. Skąd wziąć pliki:

- **FIT** (jedna aktywność, pełne dane): connect.garmin.com → aktywność →
  ikona koła zębatego → *Eksportuj oryginał*. Pobrany ZIP wgrywa się bez
  rozpakowywania; działa też goły `.fit`.
- **CSV** (wiele aktywności, same podsumowania): connect.garmin.com →
  Aktywności → Wszystkie aktywności → *Eksportuj CSV*. Nagłówki angielskie
  i polskie są rozpoznawane; separator `,` lub `;`, liczby z przecinkiem.

Po wczytaniu plików aplikacja robi *dry run* na serwerze (identyczna ścieżka
co import, z `ROLLBACK` na końcu) i pokazuje, co się stanie z każdą
aktywnością. Zmiana dyscypliny w wierszu odświeża podgląd; duplikatów nie da
się zaznaczyć.

Parsowanie odbywa się w przeglądarce (`src/garmin/parse.js`; SDK FIT
doładowywany dopiero przy pierwszym imporcie), na serwer trafia już JSON.
Eksport z aplikacji mobilnej Garmin Connect nie jest możliwy — potrzebna jest
strona WWW.

## Skrypt synchronizacji (`scripts/garmin-sync`)

Używa nieoficjalnej biblioteki [`garmin-connect`](https://www.npmjs.com/package/garmin-connect)
(loguje się na konto Garmin jak przeglądarka). Dlatego:

- uruchamia się go **lokalnie lub na własnym cronie**, nie na Vercelu —
  hasło i tokeny Garmina zostają na Twojej maszynie, do TrainStack idą tylko
  podsumowania aktywności;
- biblioteka nie obsługuje MFA na koncie Garmin; endpointy są
  nieudokumentowane i mogą się zmienić.

```bash
cd scripts/garmin-sync
npm install
cp .env.example .env      # uzupełnij TRAINSTACK_URL, AGENT_API_KEY, TRAINSTACK_USER, GARMIN_EMAIL/PASSWORD
npm run dry-run           # pokazuje, co zostałoby zaimportowane
npm run sync              # właściwa synchronizacja
```

Pierwsze uruchomienie loguje hasłem i zapisuje tokeny w `.garmin-tokens/`
(ignorowane przez git) — potem hasło można usunąć z `.env`. Skrypt pamięta
w `.sync-state.json` datę ostatniej zaimportowanej aktywności i pobiera tylko
nowsze; pierwszy raz sięga `SYNC_DAYS` dni wstecz. Opcje:
`--dry-run`, `--since YYYY-MM-DD`, `--limit N`.

Po stronie serwera wymagany jest `AGENT_API_KEY` (patrz `docs/agent-api.md`).
Przykład crona co godzinę:

```
0 * * * * cd /ścieżka/train-stack/scripts/garmin-sync && node --env-file=.env sync.mjs >> sync.log 2>&1
```

## API

### `POST /api/activities` (JWT użytkownika)

Body:

```json
{
  "activities": [
    {
      "external_id": "gc:123456789",
      "source": "garmin-connect",
      "started_at_local": "2026-08-31T07:12:05",
      "started_at": "2026-08-31T05:12:05Z",
      "type": "running",
      "title": "Warszawa Bieganie",
      "duration_s": 3120,
      "distance_m": 10250,
      "avg_hr": 152,
      "max_hr": 178,
      "calories": 620,
      "discipline": "run"
    }
  ],
  "dry_run": false,
  "tz": "Europe/Warsaw",
  "default_discipline": "gym"
}
```

| Pole aktywności | Wymagane | Opis |
|---|---|---|
| `external_id` | tak | Unikalny identyfikator w źródle (`gc:<activityId>`, `fit:<serial>:<timeCreated>`, `gccsv:<data>:<typ>`) — klucz deduplikacji |
| `started_at_local` | tak | Start w czasie lokalnym `YYYY-MM-DDTHH:MM[:SS]` — decyduje o dniu w planie |
| `started_at` | nie | Start w UTC (ISO 8601); bez niego czas lokalny interpretowany jest w `tz` |
| `source` | nie | `garmin-fit`, `garmin-csv`, `garmin-connect` (dowolny `[a-z0-9-]`) |
| `type` | nie | Typ aktywności — podstawa automatycznego mapowania |
| `title` | nie | Tytuł; trafia do nowo tworzonego treningu |
| `duration_s`, `distance_m`, `avg_hr`, `max_hr`, `calories` | nie | Liczby; zapisywane w `actual_params` |
| `discipline` | nie | `ext_id` dyscypliny — nadpisuje mapowanie |

Parametry body: `dry_run` (podgląd bez zapisu), `tz` (strefa dla dat
lokalnych, domyślnie `Europe/Warsaw`), `default_discipline` (dla
nierozpoznanych typów). Maksymalnie 500 aktywności na żądanie, limit
30 żądań/min na użytkownika.

Odpowiedź (`200` dla dry run, `201` dla importu):

```json
{
  "dry_run": false,
  "summary": { "matched": 1, "created": 0, "duplicate": 0, "skipped": 0, "invalid": 0 },
  "results": [
    { "index": 0, "external_id": "gc:123456789", "status": "matched",
      "date": "2026-08-31", "week_start": "2026-08-31", "day": "mon",
      "discipline": "run", "discipline_auto": "run", "group": "run",
      "workout": { "id": 12, "title": "Interwały" }, "log_id": 77,
      "params": [{ "key": "Dystans", "value": "10.25", "unit": "km" }] }
  ]
}
```

Statusy: `matched` (dopisano do zaplanowanego treningu), `created` (nowy
trening), `duplicate`, `skipped` (brak dyscypliny), `invalid` (błąd
walidacji — `reason`).

### `POST /api/agent?user=<e-mail|id>&action=activities` (klucz agenta)

To samo body i odpowiedź, uwierzytelnianie kluczem `AGENT_API_KEY` jak
w `docs/agent-api.md`. Używa go skrypt synchronizacji.

## Kierunek odwrotny (plan → zegarek)

Nie jest zaimplementowany. Oficjalny Training API podlega tej samej pauzie;
możliwe ścieżki to wygenerowanie pliku FIT z treningiem (SDK FIT, import
ręczny w Garmin Connect) albo metody `addRunningWorkout`/`scheduleWorkout`
z nieoficjalnej biblioteki.
