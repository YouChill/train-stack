const API = import.meta.env.VITE_API_URL || 'http://localhost:3001'

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
  const data = await res.json()
  if (!res.ok) throw new Error(data.error || 'Błąd serwera')
  return data
}

export const auth = {
  register: (body) => request('/api/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login:    (body) => request('/api/auth/login',    { method: 'POST', body: JSON.stringify(body) }),
  me:       ()     => request('/api/auth/me'),
}

export const workouts = {
  list:    (week)     => request(`/api/workouts?week=${week}`),
  create:  (body)     => request('/api/workouts',        { method: 'POST', body: JSON.stringify(body) }),
  update:  (id, body) => request(`/api/workouts/${id}`,  { method: 'PUT',  body: JSON.stringify(body) }),
  remove:  (id)       => request(`/api/workouts/${id}`,  { method: 'DELETE' }),
  import_: (body)     => request('/api/workouts/import',  { method: 'POST', body: JSON.stringify(body) }),
}

export const disciplines = {
  list: ()     => request('/api/disciplines'),
  save: (list) => request('/api/disciplines', { method: 'PUT', body: JSON.stringify({ disciplines: list }) }),
}
