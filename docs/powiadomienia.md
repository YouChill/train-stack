# Powiadomienia push o treningach

Aplikacja wysyła powiadomienie systemowe na telefon na X minut przed
zaplanowanym treningiem (domyślnie 30). Kanałem jest **Web Push** — powiadomienie
przychodzi od samej aplikacji, bez pośrednictwa maila czy zewnętrznego komunikatora.

## Jak to działa

```
cron-job.org  ──co 5 min──▶  POST /api/push?action=dispatch
                                      │
                                      ├─ SQL: week_start + dzień + start_time
                                      │       w strefie użytkownika → planned_at
                                      ├─ rezerwacja w workout_reminders
                                      └─ web-push ──▶ FCM / APNs ──▶ telefon
```

Moment treningu nie jest nigdzie zapisany wprost — wylicza go zapytanie
z `workouts.week_start` (poniedziałek tygodnia), `workouts.day` (`mon`…`sun`)
i `workouts.start_time` (`"HH:MM"`), interpretując wynik w strefie z `users.timezone`.

Rezerwacja w `workout_reminders (workout_id, planned_at)` zapisywana jest **przed**
wysyłką i to ona gwarantuje, że jeden trening dostanie jedno powiadomienie, nawet
gdy dwa przebiegi crona nałożą się na siebie.

## Konfiguracja od zera

### 1. Migracja bazy

```bash
npm run db:migrate    # wykona 010_push_notifications.sql
```

Dodaje kolumny `timezone`, `notify_enabled`, `notify_lead_min` do `users` oraz
tabele `push_subscriptions` i `workout_reminders`.

### 2. Klucze VAPID

```bash
npx web-push generate-vapid-keys --json
```

Klucze generuje się **raz**. Zmiana klucza publicznego unieważnia wszystkie
istniejące subskrypcje we wszystkich przeglądarkach — użytkownicy musieliby
włączyć powiadomienia od nowa.

### 3. Zmienne środowiskowe

W ustawieniach projektu Vercel (Production **i** Preview) oraz w `.env.local`:

| Zmienna | Opis |
|---|---|
| `VAPID_PUBLIC_KEY` | Klucz publiczny; trafia też do przeglądarki |
| `VAPID_PRIVATE_KEY` | Klucz prywatny — **nigdy do frontendu** |
| `VAPID_SUBJECT` | `mailto:twoj@email.pl` lub `https://<domena>`. Apple odrzuca inne formaty błędem `BadJwtToken` |
| `CRON_SECRET` | Sekret dyspozytora, np. `openssl rand -hex 32` |

Bez `VAPID_*` endpointy wysyłkowe zwracają 503, bez `CRON_SECRET` — 503 na `dispatch`.
Aplikacja działa wtedy normalnie, tylko bez powiadomień.

### 4. Harmonogram (cron-job.org)

Vercel Cron na planie **Hobby uruchamia zadanie tylko raz dziennie**, co jest
bezużyteczne przy 30-minutowym wyprzedzeniu. Dlatego dyspozytora odpala darmowy
zewnętrzny pinger:

- URL: `https://<twoja-domena>/api/push?action=dispatch`
- Metoda: **POST**
- Harmonogram: co 5 minut
- Nagłówek: `Authorization: Bearer <CRON_SECRET>`
- Włączyć „treat non-2xx as failure" i powiadomienia mailem o awariach

**Przejście na Vercel Pro** nie wymaga zmian w kodzie — Vercel Cron sam wysyła
`Authorization: Bearer $CRON_SECRET`. Wystarczy dopisać do `vercel.json`
i wyłączyć zadanie w cron-job.org:

```json
"crons": [{ "path": "/api/push?action=dispatch", "schedule": "*/5 * * * *" }]
```

### 5. Włączenie na telefonie

**Android (Chrome):** wejść na adres aplikacji → menu ⋮ → „Zainstaluj aplikację"
→ uruchomić z ikony → menu ⋮ w TRAINstack → **Powiadomienia** → włączyć.

**iPhone:** **Safari** (nie Chrome — Chrome na iOS nie umie dodać PWA z pushem)
→ Udostępnij → **Dodaj do ekranu początkowego** → uruchomić z nowej ikony →
Powiadomienia → włączyć.

Na iOS push wymaga **iOS 16.4+** i aplikacji uruchomionej z ekranu początkowego.
W karcie Safari nie da się nawet poprosić o zgodę — modal wykrywa ten stan
i pokazuje instrukcję zamiast przycisku.

## API

Wszystko pod jednym endpointem `/api/push`, routowane przez `?action=`
(Vercel Hobby dopuszcza 12 funkcji serverless, projekt ma ich 11).

| Akcja | Metoda | Auth | Opis |
|---|---|---|---|
| `prefs` | GET | JWT | ustawienia, lista urządzeń i klucz publiczny VAPID |
| `prefs` | PUT | JWT | `{ enabled, lead_min, timezone }` |
| `subscribe` | POST | JWT | zapis subskrypcji przeglądarki |
| `unsubscribe` | POST | JWT | odłączenie urządzenia |
| `test` | POST | JWT | natychmiastowy push testowy |
| `dispatch` | POST | `CRON_SECRET` | dyspozytor; `&dry=1` — podgląd bez wysyłki |

## Diagnostyka

**Nic nie przychodzi — od czego zacząć.** Tryb suchy pokazuje, kogo dyspozytor
w ogóle widzi, bez wysyłania i bez rezerwowania:

```bash
curl -s "https://<domena>/api/push?action=dispatch&dry=1" \
     -H "Authorization: Bearer $CRON_SECRET" | jq
```

Pusta lista `candidates` oznacza, że żaden trening nie kwalifikuje się do
przypomnienia. Trening jest pomijany, gdy:

- nie ma ustawionej godziny (`start_time` puste) — **najczęstsza przyczyna**,
- jest oznaczony jako wykonany albo jako dzień odpoczynku,
- do startu zostało więcej niż ustawione wyprzedzenie,
- trening już się zaczął (spóźnione przypomnienie nigdy nie przychodzi po starcie),
- przypomnienie już poszło (wpis w `workout_reminders`),
- użytkownik nie ma żadnej subskrypcji albo ma wyłączone powiadomienia.

Właściwe uruchomienie zwraca podsumowanie:

```bash
curl -s -X POST "https://<domena>/api/push?action=dispatch" \
     -H "Authorization: Bearer $CRON_SECRET" | jq
# {"ok":true,"due":1,"sent":1,"failed":0,"pruned":0,"released":0,"ms":412}
```

- `pruned` — subskrypcje skasowane po odpowiedzi 404/410 (odinstalowana PWA,
  wyczyszczone dane przeglądarki),
- `released` — rezerwacje zwolnione po błędzie przejściowym; następny przebieg
  spróbuje ponownie.

**Sprawdzenie plików statycznych.** SPA fallback zwraca `index.html` ze statusem
**200**, więc literówka w nazwie pliku nie da 404 — trzeba patrzeć na typ treści:

```bash
curl -sI https://<domena>/sw.js | grep -i content-type          # application/javascript
curl -sI https://<domena>/icon-192.png | grep -i content-type   # image/png, NIE text/html
```

**Powiadomienia przestały przychodzić na iPhonie.** Usunięcie i ponowne dodanie
PWA unieważnia subskrypcję. Aplikacja odświeża ją sama przy każdym otwarciu
(`syncSubscription` w `src/push.js`), więc zwykle wystarczy raz wejść do aplikacji.

## Znane ograniczenia

- **Treningi cykliczne są materializowane 12 tygodni w przód** (`src/App.jsx`,
  `expandRecurrence`). Po około trzech miesiącach seria nie ma już wierszy w bazie,
  więc przypomnienia po cichu się kończą — wygląda to jak awaria push, a nie jest.
- **Treningi bez ustawionej godziny nie dostają przypomnień.** Nie ma od czego
  odliczać wyprzedzenia.
- **Strefa czasowa jest per konto, nie per trening.** Po zmianie strefy w podróży
  aktualizuje się przy pierwszym otwarciu aplikacji; przypomnienia zaplanowane
  wcześniej liczą się według poprzedniej strefy.
- **Ikony** generuje `node scripts/gen-icons.mjs` — zmiana motywu wymaga
  ponownego uruchomienia skryptu, nie ręcznej podmiany plików.
