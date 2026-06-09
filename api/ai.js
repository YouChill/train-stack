import { verifyToken, cors } from './_auth.js'

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'
const MAX_PROMPT_LEN = 2000

function buildPrompt(prompt, disciplines) {
  const dlist = disciplines.map((d) => `${d.name} (id:"${d.id}")`).join(', ')
  return `Jesteś doświadczonym trenerem sportowym. Wygeneruj tygodniowy plan treningowy w JSON.

Dostępne dyscypliny: ${dlist}
Prośba: ${prompt}

Odpowiedz TYLKO poprawnym JSON:
{
  "week": {
    "mon": [{"discipline":"run","title":"Poranny bieg","params":[{"key":"Dystans","value":"10","unit":"km"},{"key":"Czas","value":"55","unit":"min"}],"exercises":[],"notes":"","rest":false}],
    "tue": [],
    "wed": [{"discipline":"gym","title":"Siłownia górna","params":[],"exercises":[{"name":"Bench Press","sets":"4","reps":"8","load":"80","loadUnit":"kg"}],"notes":"","rest":false}],
    "thu": [],
    "fri": [{"discipline":"stretch","title":"Rozciąganie","params":[{"key":"Czas trwania","value":"20","unit":"min"}],"exercises":[{"name":"Skłon do przodu","sets":"2","reps":"1","load":"30","loadUnit":"sek"},{"name":"Pozycja gołębia","sets":"2","reps":"1","load":"45","loadUnit":"sek"}],"notes":"","rest":false}],
    "sat": [],
    "sun": [{"discipline":"run","title":"Odpoczynek","params":[],"exercises":[],"notes":"","rest":true}]
  }
}
Zasady: dni bez treningu = []. Dla biegania/pływania używaj params. Dla siłowni/boksu używaj exercises (sets/reps/load/loadUnit). Dla rozciągania (stretch) używaj exercises gdzie load = czas utrzymania pozycji a loadUnit = "sek". Dostosuj do prośby. TYLKO JSON.`
}

export default async function handler(req, res) {
  cors(res)
  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })

  const payload = verifyToken(req)
  if (!payload) return res.status(401).json({ error: 'Brak tokenu' })

  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) {
    console.error('AI error: OPENAI_API_KEY nie jest skonfigurowany')
    return res.status(503).json({ error: 'Generowanie AI nie jest skonfigurowane' })
  }

  const { prompt, disciplines } = req.body || {}
  if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
    return res.status(400).json({ error: 'Wymagany: prompt' })
  }
  if (prompt.length > MAX_PROMPT_LEN) {
    return res.status(400).json({ error: `Prompt może mieć maks. ${MAX_PROMPT_LEN} znaków` })
  }
  const discs = Array.isArray(disciplines)
    ? disciplines
        .filter((d) => d && d.id && d.name)
        .slice(0, 30)
        .map((d) => ({ id: String(d.id).slice(0, 50), name: String(d.name).slice(0, 100) }))
    : []

  try {
    const r = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
        max_tokens: 2000,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: buildPrompt(prompt.trim(), discs) }],
      }),
    })
    const data = await r.json()
    if (!r.ok) {
      console.error('OpenAI error:', data?.error?.message || `HTTP ${r.status}`)
      return res.status(502).json({ error: 'Generowanie planu nie powiodło się' })
    }

    const raw = data.choices?.[0]?.message?.content || ''
    let parsed
    try {
      parsed = JSON.parse(raw.replace(/```json\s*|\s*```/g, '').trim())
    } catch {
      console.error('AI error: nieparsowalna odpowiedź modelu')
      return res.status(502).json({ error: 'AI zwróciło nieprawidłowy JSON' })
    }
    if (!parsed.week || typeof parsed.week !== 'object') {
      return res.status(502).json({ error: 'AI zwróciło plan bez klucza "week"' })
    }
    return res.json(parsed)
  } catch (e) {
    console.error('AI error:', e)
    return res.status(500).json({ error: 'Błąd serwera' })
  }
}
