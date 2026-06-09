import jwt from 'jsonwebtoken'

// Tokeny niosą `tv` (token_version użytkownika). Reset hasła inkrementuje
// wersję w bazie, przez co wszystkie wcześniej wydane tokeny stają się
// nieważne — bez tego skradziony JWT żyłby do 30 dni mimo zmiany hasła.
export function signToken(id, tokenVersion = 0) {
  return jwt.sign({ id, tv: tokenVersion }, process.env.JWT_SECRET, { expiresIn: '30d' })
}

export function verifyToken(req) {
  const h = req.headers.authorization
  if (!h?.startsWith('Bearer ')) return null
  try {
    return jwt.verify(h.slice(7), process.env.JWT_SECRET)
  } catch {
    return null
  }
}

let tokenVersionReady
export function ensureTokenVersion(pool) {
  if (!tokenVersionReady) {
    tokenVersionReady = pool
      .query('ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version INT NOT NULL DEFAULT 0')
      .catch((e) => { tokenVersionReady = undefined; throw e })
  }
  return tokenVersionReady
}

// Weryfikacja podpisu + zgodności wersji tokenu z bazą. Tokeny sprzed
// wdrożenia wersjonowania (bez `tv`) traktujemy jak tv=0, więc nikt nie
// zostaje wylogowany masowo.
export async function verifyUser(req, pool) {
  const payload = verifyToken(req)
  if (!payload) return null
  try {
    await ensureTokenVersion(pool)
    const { rows } = await pool.query('SELECT token_version FROM users WHERE id = $1', [payload.id])
    if (!rows.length) return null
    if ((payload.tv ?? 0) !== rows[0].token_version) return null
    return payload
  } catch (e) {
    console.error('verifyUser error:', e)
    return null
  }
}

export function cors(res) {
  // Frontend i API żyją na tej samej domenie (APP_URL); nie otwieramy API
  // dla dowolnych originów.
  const origin = process.env.APP_URL ? process.env.APP_URL.replace(/\/$/, '') : '*'
  res.setHeader('Access-Control-Allow-Origin', origin)
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}
