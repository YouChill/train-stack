// Sanityzacja pól treningu przed zapisem do JSONB. Import i API agenta
// przyjmują JSON od użytkownika/LLM-a — bez sprowadzenia go do kształtu,
// którego oczekuje frontend ({key,value,unit} / {name,sets,reps,load,loadUnit},
// wartości tekstowe), jeden zepsuty wiersz wywala render aplikacji przy każdym
// pobraniu tygodnia.

const asText = (v) => (v == null || typeof v === 'object' ? '' : String(v))

export function sanitizeParams(params) {
  // Częsty błąd LLM-ów: params jako obiekt {"dystans": "10 km"} zamiast tablicy
  if (params && typeof params === 'object' && !Array.isArray(params)) {
    params = Object.entries(params).map(([key, value]) => ({ key, value }))
  }
  if (!Array.isArray(params)) return []
  return params
    .filter((p) => p && typeof p === 'object' && !Array.isArray(p))
    .map((p) => ({ ...p, key: asText(p.key), value: asText(p.value), unit: asText(p.unit) }))
}

export function sanitizeExercises(exercises) {
  if (!Array.isArray(exercises)) return []
  return exercises
    .map((ex) => (typeof ex === 'string' ? { name: ex } : ex))
    .filter((ex) => ex && typeof ex === 'object' && !Array.isArray(ex))
    .map((ex) => ({
      ...ex,
      name: asText(ex.name), sets: asText(ex.sets), reps: asText(ex.reps),
      load: asText(ex.load), loadUnit: asText(ex.loadUnit),
    }))
}

export const sanitizeText = asText

// Frontend dopasowuje treningi do slotów osi czasu po godzinie z "HH:MM" —
// inny format nie crashuje, ale czyni wpis niewidocznym w widoku dnia.
export function sanitizeStartTime(v) {
  const t = asText(v).trim()
  return /^\d{1,2}:\d{2}$/.test(t) ? t : ''
}
