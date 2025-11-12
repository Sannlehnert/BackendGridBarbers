const pool = require('../config/database');

const auditLogger = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  // Datos de la solicitud
  const auditData = {
    ip: req.ip || req.connection.remoteAddress,
    method: req.method,
    url: req.originalUrl,
    userAgent: req.get('User-Agent'),
    timestamp: new Date()
  };
  
  // Interceptar respuesta
  res.send = function(data) {
    const duration = Date.now() - startTime;
    
    auditData.statusCode = res.statusCode;
    auditData.duration = duration;
    
    // Log solo para endpoints sensibles o errores
    if (req.originalUrl.includes('/api/auth') || 
        req.originalUrl.includes('/api/admin') ||
        res.statusCode >= 400) {
      
      console.log('🔐 AUDIT:', {
        ...auditData,
        responseSize: data?.length || 0
      });
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = auditLogger;