const productionConfig = {
  // Configuración de seguridad extrema
  security: {
    // Headers de seguridad
    headers: {
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
      },
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'"]
        }
      }
    },
    
    // Rate limiting más estricto
    rateLimit: {
      windowMs: 15 * 60 * 1000, // 15 minutos
      max: 100, // máximo 100 requests por IP
      message: 'Demasiadas solicitudes desde esta IP'
    },
    
    // Validación de entrada
    validation: {
      maxBodySize: '10mb',
      maxUrlSize: 2048
    }
  },
  
  // Configuración de base de datos para producción
  database: {
    connectionLimit: 10,
    acquireTimeout: 60000,
    timeout: 60000,
    reconnect: true
  },
  
  // Logging en producción
  logging: {
    level: 'warn',
    file: 'logs/production.log',
    errorFile: 'logs/errors.log'
  }
};

module.exports = productionConfig;