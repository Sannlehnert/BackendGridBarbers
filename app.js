const express = require('express');
const { corsOptions, helmetConfig, apiLimiter, sanitizeInput } = require('./middleware/security');
require('dotenv').config();

// Importar el script de inicialización
const initializeDatabase = require('./scripts/initDB');
const { testConnection } = require('./config/database');

const app = express();

// === MIDDLEWARES DE SEGURIDAD MÁXIMA ===
app.use(helmetConfig);
app.use(apiLimiter);
app.use(sanitizeInput);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// CORS para producción
app.use((req, res, next) => {
  const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
    process.env.ALLOWED_ORIGINS.split(',') : 
    ['https://tu-app-barberia.netlify.app'];
  
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

// Inicialización segura de base de datos
let dbInitialized = false;
let dbCheckAttempts = 0;
const MAX_DB_ATTEMPTS = 5;

const initializeDatabaseWithRetry = async () => {
  try {
    console.log('🔄 Inicializando base de datos...');
    await initializeDatabase();
    
    const dbConnected = await testConnection();
    if (dbConnected) {
      dbInitialized = true;
      console.log('✅ Base de datos lista para PRODUCCIÓN');
    } else {
      throw new Error('Falló la verificación de conexión');
    }
  } catch (error) {
    dbCheckAttempts++;
    console.error(`❌ Intento ${dbCheckAttempts} fallido:`, error.message);
    
    if (dbCheckAttempts < MAX_DB_ATTEMPTS) {
      console.log(`🔄 Reintentando en 10 segundos...`);
      setTimeout(initializeDatabaseWithRetry, 10000);
    } else {
      console.error('💥 Máximo de intentos alcanzado. La aplicación puede no funcionar correctamente.');
    }
  }
};

// Inicializar al inicio
initializeDatabaseWithRetry();

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/barbers', require('./routes/barbers'));
app.use('/api/services', require('./routes/services'));
app.use('/api/appointments', require('./routes/appointments'));

// Ruta de salud mejorada
app.get('/api/health', (req, res) => {
  res.json({ 
    status: dbInitialized ? 'HEALTHY' : 'INITIALIZING',
    message: 'Barbería Elite API - PRODUCCIÓN',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
    database: dbInitialized ? 'CONNECTED' : 'CONNECTING',
    uptime: process.uptime()
  });
});

// Ruta raíz
app.get('/', (req, res) => {
  res.json({ 
    message: '🚀 Barbería Elite API - Bienvenido a PRODUCCIÓN',
    version: '1.0.0',
    status: 'Operacional'
  });
});

// Manejo de rutas no encontradas
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo global de errores (NO revelar detalles en producción)
app.use((error, req, res, next) => {
  console.error('Error global:', error);
  
  const isProduction = process.env.NODE_ENV === 'production';
  
  res.status(500).json({ 
    error: 'Error interno del servidor',
    ...(isProduction ? {} : { message: error.message, stack: error.stack })
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log('=================================');
  console.log('🚀 BARBERÍA ELITE - PRODUCCIÓN');
  console.log('=================================');
  console.log(`📍 Servidor: http://localhost:${PORT}`);
  console.log(`⚡ Entorno: ${process.env.NODE_ENV}`);
  console.log('🛡️  Seguridad: MÁXIMA');
  console.log('=================================');
});