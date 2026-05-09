import pg from 'pg'
import 'dotenv/config'

pg.types.setTypeParser(1082, (v) => v)

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('supabase') ? { rejectUnauthorized: false } : false,
})

export default pool
