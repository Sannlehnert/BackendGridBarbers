const mysql = require('mysql2/promise');
require('dotenv').config();

// Configuración ultra segura para producción
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
  
  // Configuración de seguridad
  waitForConnections: true,
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
  queueLimit: 0,
  
  // Timeouts para prevenir ataques
  acquireTimeout: 60000,
  timeout: 60000,
  
  // Reconexión automática
  reconnect: true
});

// Función mejorada para verificar conexión
const testConnection = async () => {
  let connection;
  try {
    connection = await pool.getConnection();
    console.log('✅ Conectado a la base de datos MySQL');
    
    // Verificar que tenemos los permisos necesarios
    const [tables] = await connection.execute('SHOW TABLES');
    console.log(`📊 Tablas disponibles: ${tables.length}`);
    
    return true;
  } catch (error) {
    console.error('❌ Error crítico conectando a la base de datos:', error.message);
    console.log('🔧 Solución:');
    console.log('   1. Verifica las variables de entorno en Railway');
    console.log('   2. Asegúrate de que la DB esté activa');
    console.log('   3. Revisa los logs de Railway');
    return false;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = { pool, testConnection };