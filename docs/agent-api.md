# API agenta — `/api/agent`

Endpoint dla integracji maszynowych (agent AI, skrypty, cron). W odróżnieniu od
`/api/workouts` nie wymaga JWT zalogowanego użytkownika — uwierzytelnia się
stałym kluczem `AGENT_API_KEY`, a docelowego użytkownika wskazuje parametrem
`user` (e-mail lub numeryczne id). Dzięki temu jeden agent może odczytywać
i edytować plany wielu kont.

## Konfiguracja

W Vercel (Settings → Environment Variables) ustaw:

```
AGENT_API_KEY=<długi-losowy-string>
```

Klucz wygenerujesz np. tak: `openssl rand -hex 32`. Bez ustawionej zmiennej
endpoint odpowiada `503` — jest domyślnie wyłączony.

Plik środowiskowy dla agenta (np. `.env` obok skryptu/agenta — **nie commituj go**):

```
TRAINSTACK_URL=https://twoja-domena.vercel.app
AGENT_API_KEY=<ten-sam-klucz>
```

## Uwierzytelnianie

Każde żądanie musi nieść klucz w jednym z nagłówków:

```
Authorization: Bearer $AGENT_API_KEY
# lub
X-Api-Key: $AGENT_API_KEY
```

Nieudane próby są limitowane (10 / 15 min na IP), poprawne żądania: 120 / min.

## Endpoints

Wspólny parametr: `user=<e-mail lub id>` — wymagany zawsze.
Daty (`week_start`) są automatycznie przycinane do poniedziałku swojego
tygodnia, więc można podać dowolny dzień.

### Odczyt planu tygodnia

```
GET /api/agent?user=jan@example.com[&week_start=YYYY-MM-DD]
```

Zwraca plan pogrupowany po dniach + listę dyscyplin użytkownika (przydatne,
żeby agent używał istniejących `ext_id` dyscyplin):

```json
{
  "user": { "id": 1, "email": "jan@example.com", "name": "Jan" },
  "week_start": "2026-07-20",
  "days": { "mon": [ { "id": 12, "discipline": "gym", "title": "FBW A", ... } ], "tue": [], ... },
  "disciplines": [ { "ext_id": "gym", "name": "Siłownia", "icon": "🏋️", "has_ex": true } ]
}
```

### Edycja pozycji (częściowa)

```
PUT /api/agent?user=jan@example.com&id=12
```

W body tylko pola do zmiany — reszta zostaje nietknięta:

```json
{ "title": "FBW B", "day": "wed", "done": true }
```

Dozwolone pola: `discipline`, `day`, `week_start`, `title`, `notes`, `params`,
`exercises`, `rest`, `done`, `start_time`, `recurrence`, `series_id`.

### Dodanie pojedynczego treningu

```
POST /api/agent?user=jan@example.com
{ "day": "fri", "discipline": "run", "title": "Interwały", "start_time": "18:00",
  "params": [{ "k": "dystans", "v": "8 km" }] }
```

### Dodanie całego tygodnia treningów

```
POST /api/agent?user=jan@example.com
{
  "week_start": "2026-07-27",
  "mode": "append",
  "week": {
    "mon": [{ "discipline": "gym", "title": "FBW A" }],
    "wed": [{ "discipline": "run", "title": "Tempo 6 km" }],
    "sat": [{ "rest": true }]
  }
}
```

Domyślnie (`mode: "append"`) wpisy są dokładane do istniejącego planu;
`mode: "replace"` najpierw czyści wskazany tydzień (w jednej transakcji —
błąd nie zostawi tygodnia w połowie skasowanego).

### Usunięcie pozycji

```
DELETE /api/agent?user=jan@example.com&id=12
```

## Przykłady curl (z plikiem środowiskowym)

```bash
set -a; source .env; set +a

# aktualny plan
curl -s "$TRAINSTACK_URL/api/agent?user=jan@example.com" \
  -H "Authorization: Bearer $AGENT_API_KEY" | jq

# edycja pozycji
curl -s -X PUT "$TRAINSTACK_URL/api/agent?user=jan@example.com&id=12" \
  -H "Authorization: Bearer $AGENT_API_KEY" -H "Content-Type: application/json" \
  -d '{"done": true}'

# cały tydzień dla konkretnego użytkownika
curl -s -X POST "$TRAINSTACK_URL/api/agent?user=jan@example.com" \
  -H "Authorization: Bearer $AGENT_API_KEY" -H "Content-Type: application/json" \
  -d '{"week_start":"2026-07-27","week":{"mon":[{"discipline":"gym","title":"FBW A"}]}}'
```

## Użycie z agentem (np. Claude Code)

Wystarczy, że agent ma dostęp do pliku `.env` z `TRAINSTACK_URL`
i `AGENT_API_KEY` — powyższe wywołania `curl` pokrywają pełny cykl:
odczyt planu → edycja pozycji → dodanie treningów. Przykładowa instrukcja
dla agenta:

> Wczytaj zmienne z `.env`. Pobierz plan użytkownika `jan@example.com` na
> przyszły tydzień (`GET /api/agent`), a następnie dodaj mu 3 treningi biegowe
> (`POST` z kluczem `week`), używając dyscyplin zwróconych w polu
> `disciplines`.
