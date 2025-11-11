const { Pool } = require('pg');
require('dotenv').config();

// Configuración para PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// Función para verificar conexión
const testConnection = async () => {
  let client;
  try {
    client = await pool.connect();
    console.log('✅ Conectado a PostgreSQL en Render');
    
    // Verificar tablas
    const result = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    
    console.log(`📊 Tablas existentes: ${result.rows.length}`);
    return true;
  } catch (error) {
    console.error('❌ Error conectando a PostgreSQL:', error.message);
    return false;
  } finally {
    if (client) client.release();
  }
};

module.exports = { pool, testConnection };