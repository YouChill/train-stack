const API = import.meta.env.VITE_API_URL || ''

const getToken = () => localStorage.getItem('ts_token')

async function request(path, opts = {}) {
  const token = getToken()
  const res = await fetch(`${API}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...opts.headers,
    },
  })
  const text = await res.text()
  let data
  try { data = JSON.parse(text) } catch { throw new Error('Serwer zwrócił nieprawidłową odpowiedź') }
  if (!res.ok) {
    const err = new Error(data.error || 'Błąd serwera')
    err.status = res.status
    throw err
  }
  return data
}

export const auth = {
  register:      (body) => request('/api/auth?action=register',       { method: 'POST', body: JSON.stringify(body) }),
  login:         (body) => request('/api/auth?action=login',          { method: 'POST', body: JSON.stringify(body) }),
  me:            ()     => request('/api/auth?action=me'),
  requestReset:  (body) => request('/api/auth?action=request-reset',  { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body) => request('/api/auth?action=reset-password', { method: 'POST', body: JSON.stringify(body) }),
}

export const workouts = {
  list:    (weekStart) => request(`/api/workouts?week_start=${weekStart}`),
  create:  (body)     => request('/api/workouts',        { method: 'POST', body: JSON.stringify(body) }),
  update:  (id, body) => request(`/api/workouts?id=${id}`, { method: 'PUT',  body: JSON.stringify(body) }),
  remove:  (id)       => request(`/api/workouts?id=${id}`, { method: 'DELETE' }),
  removeSeries: (id)  => request(`/api/workouts?id=${id}&series=1`, { method: 'DELETE' }),
  import_: (body)     => request('/api/workouts?action=import', { method: 'POST', body: JSON.stringify(body) }),
}

export const disciplines = {
  list: ()     => request('/api/disciplines'),
  save: (list) => request('/api/disciplines', { method: 'PUT', body: JSON.stringify({ disciplines: list }) }),
}

export const logs = {
  forWorkout: (wid)    => request(`/api/logs?workout_id=${wid}`),
  all:        ()       => request('/api/logs?all=1'),
  counts:     ()       => request('/api/logs?counts=1'),
  create:     (body)   => request('/api/logs',       { method: 'POST', body: JSON.stringify(body) }),
  update:     (id, b)  => request(`/api/logs?id=${id}`, { method: 'PUT',  body: JSON.stringify(b) }),
  remove:     (id)     => request(`/api/logs?id=${id}`, { method: 'DELETE' }),
}

export const exerciseLogs = {
  forExercise: (name)     => request(`/api/exercise-logs?exercise_name=${encodeURIComponent(name)}`),
  names:       ()         => request('/api/exercise-logs?names=1'),
  save:        (body)     => request('/api/exercise-logs',          { method: 'POST', body: JSON.stringify(body) }),
  update:      (id, body) => request(`/api/exercise-logs?id=${id}`, { method: 'PUT',  body: JSON.stringify(body) }),
  remove:      (id)       => request(`/api/exercise-logs?id=${id}`, { method: 'DELETE' }),
}

export const stats = {
  get: () => request('/api/stats'),
}

export const report = {
  get: ({ from, to, tz, exercise }) =>
    request(`/api/report?from=${from}&to=${to}&tz=${encodeURIComponent(tz || '')}${
      exercise ? `&exercise=${encodeURIComponent(exercise)}` : ''}`),
}

export const ai = {
  generate: (body) => request('/api/ai', { method: 'POST', body: JSON.stringify(body) }),
}
