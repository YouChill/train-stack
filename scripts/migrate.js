// Runner migracji: wykonuje pliki supabase/migrations/*.sql w kolejności
// leksykograficznej i zapisuje wykonane w tabeli schema_migrations, żeby
// każda migracja poszła dokładnie raz. Uruchomienie: npm run db:migrate
// (wymaga DATABASE_URL; opcjonalnie DATABASE_CA_CERT jak w api/_db.js).
//
// Migracje 002–008 były aplikowane ręcznie przed powstaniem runnera, ale
// wszystkie są idempotentne (IF NOT EXISTS / ENABLE RLS), więc pierwsze
// uruchomienie na istniejącej bazie tylko je odnotuje, niczego nie psując.
import { readdir, readFile } from 'fs/promises'
import path from 'path'
import { fileURLToPath } from 'url'
import pg from 'pg'

const MIGRATIONS_DIR = path.join(
  path.dirname(fileURLToPath(import.meta.url)), '..', 'supabase', 'migrations'
)

// Stały klucz blokady doradczej — dwa równoległe uruchomienia (np. dwa
// deploye naraz) nie wykonają tej samej migracji podwójnie.
const LOCK_KEY = 727274

function sslConfig(url) {
  if (/localhost|127\.0\.0\.1/.test(url)) return false
  const ca = process.env.DATABASE_CA_CERT
  if (ca) return { ca: ca.replace(/\\n/g, '\n'), rejectUnauthorized: true }
  console.warn('DATABASE_CA_CERT nie jest ustawiony — połączenie z bazą bez weryfikacji certyfikatu TLS')
  return { rejectUnauthorized: false }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL nie jest ustawiony')
  process.exit(1)
}

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: sslConfig(process.env.DATABASE_URL),
})

try {
  await client.connect()
  await client.query('SELECT pg_advisory_lock($1)', [LOCK_KEY])

  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      name       TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
    ALTER TABLE schema_migrations ENABLE ROW LEVEL SECURITY;
  `)

  const applied = new Set(
    (await client.query('SELECT name FROM schema_migrations')).rows.map((r) => r.name)
  )
  const files = (await readdir(MIGRATIONS_DIR)).filter((f) => f.endsWith('.sql')).sort()

  let ran = 0
  for (const file of files) {
    if (applied.has(file)) continue
    const sql = await readFile(path.join(MIGRATIONS_DIR, file), 'utf8')
    await client.query('BEGIN')
    try {
      await client.query(sql)
      await client.query('INSERT INTO schema_migrations (name) VALUES ($1)', [file])
      await client.query('COMMIT')
    } catch (e) {
      await client.query('ROLLBACK')
      console.error(`Migracja ${file} nie powiodła się — wycofana:`, e.message)
      process.exit(1)
    }
    console.log(`Wykonano ${file}`)
    ran++
  }
  console.log(ran ? `Gotowe: ${ran} migracji.` : 'Brak nowych migracji.')
} finally {
  await client.end()
}
