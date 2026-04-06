import getPool from './_db.js'

export default async function handler(req, res) {
  try {
    const pool = getPool()
    const result = await pool.query('SELECT NOW() as time, current_database() as db')
    const tables = await pool.query(
      "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'"
    )
    res.json({
      status: 'ok',
      connected: true,
      time: result.rows[0].time,
      database: result.rows[0].db,
      tables: tables.rows.map(r => r.table_name),
      hasDbUrl: !!process.env.DATABASE_URL,
      hasJwt: !!process.env.JWT_SECRET,
    })
  } catch (e) {
    res.json({
      status: 'error',
      connected: false,
      error: e.message,
      hasDbUrl: !!process.env.DATABASE_URL,
      hasJwt: !!process.env.JWT_SECRET,
    })
  }
}
