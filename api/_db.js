import pg from 'pg'

pg.types.setTypeParser(1082, (v) => v)

// Pełna weryfikacja TLS wymaga certyfikatu CA Supabase w env DATABASE_CA_CERT
// (PEM; znaki nowej linii mogą być wklejone jako literalne "\n"). Bez niego
// zostaje szyfrowanie bez weryfikacji — podatne na MITM, stąd głośny warning.
function sslConfig() {
  const ca = process.env.DATABASE_CA_CERT
  if (ca) {
    return { ca: ca.replace(/\\n/g, '\n'), rejectUnauthorized: true }
  }
  console.warn('DATABASE_CA_CERT nie jest ustawiony — połączenie z bazą bez weryfikacji certyfikatu TLS')
  return { rejectUnauthorized: false }
}

let pool

export default function getPool() {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: sslConfig(),
      max: 5,
    })
  }
  return pool
}
