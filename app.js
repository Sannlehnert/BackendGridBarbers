const express = require('express');
const { corsOptions, helmetConfig, apiLimiter, sanitizeInput } = require('./middleware/security');
const path = require('path');
require('dotenv').config();

// Importar el script de inicialización
const initializeDatabase = require('./scripts/initDB');
const { testConnection } = require('./config/database');

const app = express();

// === MIDDLEWARES DE SEGURIDAD ===
app.use(helmetConfig);
app.use(apiLimiter);
app.use(sanitizeInput);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS para producción
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['http://localhost:5173', 'https://tu-frontend.netlify.app'];
  
  const origin = req.headers.origin;
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  next();
});

// Servir archivos estáticos
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Inicialización segura de base de datos
let dbInitialized = false;
let dbCheckAttempts = 0;
const MAX_DB_ATTEMPTS = 3;

const initializeDatabaseWithRetry = async () => {
  try {
    console.log('🔄 Inicializando base de datos PostgreSQL...');
    await initializeDatabase();
    
    const dbConnected = await testConnection();
    if (dbConnected) {
      dbInitialized = true;
      console.log('✅ Base de datos PostgreSQL lista para PRODUCCIÓN');
    } else {
      throw new Error('Falló la verificación de conexión');
    }
  } catch (error) {
    dbCheckAttempts++;
    console.error(`❌ Intento ${dbCheckAttempts} fallido:`, error.message);
    
    if (dbCheckAttempts < MAX_DB_ATTEMPTS) {
      console.log(`🔄 Reintentando en 5 segundos...`);
      setTimeout(initializeDatabaseWithRetry, 5000);
    } else {
      console.error('💥 Máximo de intentos alcanzado. La aplicación puede no funcionar correctamente.');
    }
  }
};

// Inicializar al inicio (pero no bloquear el startup)
setTimeout(initializeDatabaseWithRetry, 1000);

// Routes
app.use('/api/auth', require('./api/routes/auth'));
app.use('/api/barbers', require('./api/routes/barbers'));
app.use('/api/services', require('./api/routes/services'));
app.use('/api/appointments', require('./api/routes/appointments'));

// Analytics route
app.get('/api/analytics/dashboard', require('./controllers/analyticController').getDashboardStats);

// Ruta de salud mejorada
app.get('/api/health', (req, res) => {
  res.json({ 
    status: dbInitialized ? 'HEALTHY' : 'INITIALIZING',
    message: 'Barbería Elite API - RENDER PRODUCTION',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
    database: dbInitialized ? 'CONNECTED' : 'CONNECTING',
    uptime: process.uptime(),
    platform: 'Render.com'
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Barbería Elite API - Bienvenido a RENDER',
    version: '2.0.0',
    status: 'Operacional',
    database: dbInitialized ? 'Conectada' : 'Inicializando'
  });
});

// Test database route
app.get('/api/test-db', async (req, res) => {
  try {
    const { pool } = require('./config/database');
    const result = await pool.query('SELECT NOW() as current_time');
    res.json({ 
      database: 'PostgreSQL conectado correctamente',
      current_time: result.rows[0].current_time,
      initialized: dbInitialized
    });
  } catch (error) {
    res.status(500).json({ 
      error: 'Error conectando a PostgreSQL',
      message: error.message 
    });
  }
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo global de errores
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
  console.log('🚀 BARBERÍA ELITE - RENDER');
  console.log('=================================');
  console.log(`📍 Servidor: http://localhost:${PORT}`);
  console.log(`⚡ Entorno: ${process.env.NODE_ENV || 'development'}`);
  console.log('🛡️  Seguridad: MÁXIMA');
  console.log('🗄️  Database: PostgreSQL');
  console.log('=================================');
});