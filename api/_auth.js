import jwt from 'jsonwebtoken'

export function signToken(id) {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' })
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

export function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization')
}
