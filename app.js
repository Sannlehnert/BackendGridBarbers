const express = require('express');
const { corsOptions, helmetConfig, apiLimiter, sanitizeInput } = require('./middleware/security');
const auditLogger = require('./middleware/audit');
require('dotenv').config();

// Importar configuración de base de datos
const { pool, testConnection } = require('./config/database');

const app = express();

// === MIDDLEWARES DE SEGURIDAD MÁXIMA ===
app.use(helmetConfig);
app.use(auditLogger);
app.use(apiLimiter);
app.use(sanitizeInput);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS mejorado para desarrollo y producción
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:5173', 'http://localhost:3000', 'http://localhost:8080'];
  
  const origin = req.headers.origin;
  
  // En desarrollo, permitir todos los orígenes
  if (process.env.NODE_ENV === 'development') {
    res.setHeader('Access-Control-Allow-Origin', origin || '*');
  } else {
    // En producción, solo orígenes permitidos
    if (origin && allowedOrigins.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
    }
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Inicialización simplificada y robusta de la base de datos
const initializeApp = async () => {
  try {
    console.log('🔄 Verificando conexión con base de datos...');
    const dbConnected = await testConnection();
    
    if (dbConnected) {
      console.log('✅ Base de datos conectada correctamente');
      
      // Intentar verificar tablas (solo para MySQL)
      if (process.env.DB_TYPE !== 'sqlite') {
        try {
          const [tables] = await pool.execute(`
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = ?
          `, [process.env.DB_NAME || 'barberia_prod']);
          
          console.log(`📊 Tablas en la base de datos: ${tables.length}`);
          
        } catch (tableError) {
          console.log('ℹ️  No se pudieron verificar las tablas, pero la conexión está activa');
        }
      }
      
    } else {
      console.log('🔧 Usando modo SQLite para desarrollo');
    }
  } catch (error) {
    console.log('🎯 Aplicación funcionando en modo desarrollo con SQLite');
  }
};

// Inicializar sin bloquear el inicio del servidor
initializeApp();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/barbers', require('./routes/barbers'));
app.use('/api/services', require('./routes/services'));
app.use('/api/appointments', require('./routes/appointments'));

// Ruta de salud mejorada
app.get('/api/health', async (req, res) => {
  try {
    const dbStatus = await testConnection();
    
    res.json({ 
      status: 'HEALTHY',
      message: 'Barbería Elite API - SISTEMA OPERATIVO',
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
      database: dbStatus ? 'CONNECTED' : 'SQLITE_FALLBACK',
      uptime: process.uptime(),
      version: '2.0.0'
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR',
      message: 'Error en el servidor'
    });
  }
});

// Ruta raíz - Información del sistema
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Barbería Elite API - Sistema de Gestión',
    version: '2.0.0',
    status: 'Operacional',
    environment: process.env.NODE_ENV || 'development',
    endpoints: {
      auth: '/api/auth',
      barbers: '/api/barbers', 
      services: '/api/services',
      appointments: '/api/appointments',
      health: '/api/health'
    }
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Ruta no encontrada',
    message: 'Verifica la URL e intenta nuevamente'
  });
});

// Manejo global de errores (NO revelar detalles en producción)
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(500).json({ 
    error: 'Error interno del servidor',
    ...(isProduction ? {} : { 
      message: error.message,
      stack: error.stack
    })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 BARBERÍA ELITE - SISTEMA ACTIVO');
  console.log('=================================');
  console.log(`📍 Servidor: http://localhost:${PORT}`);
  console.log(`⚡ Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🛡️  Seguridad: MÁXIMA`);
  console.log(`💾 Base de datos: ${process.env.DB_TYPE || 'SQLite'}`);
  console.log('=================================');
  console.log('📋 Endpoints disponibles:');
  console.log(`   GET  /api/health     - Estado del sistema`);
  console.log(`   POST /api/auth/login - Login administrador`);
  console.log(`   GET  /api/barbers    - Listar barberos`);
  console.log(`   GET  /api/services   - Listar servicios`);
  console.log(`   POST /api/appointments - Crear turno`);
  console.log('=================================');
});