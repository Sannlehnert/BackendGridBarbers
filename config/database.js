const { Pool } = require('pg');

// Vercel Postgres automáticamente proporciona DATABASE_URL
const pool = new Pool({
  connectionString: process.env.POSTGRES_URL || process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

const testConnection = async () => {
  try {
    const client = await pool.connect();
    console.log('✅ Conectado a Vercel Postgres');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ Error PostgreSQL:', error.message);
    return false;
  }
};

module.exports = { pool, testConnection };