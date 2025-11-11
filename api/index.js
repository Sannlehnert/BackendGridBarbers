const app = require('./app');

module.exports = (req, res) => {
  // Inicializar base de datos en frío
  if (!global.dbInitialized) {
    require('../scripts/initDB')();
    global.dbInitialized = true;
  }
  
  return app(req, res);
};