const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// Configuración SEGURA con hash de contraseñas
const ADMIN_USERS = [
  {
    id: 1,
    username: process.env.ADMIN_USERNAME || 'admin',
    passwordHash: bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'Admin123!', 12),
    name: 'Administrador Principal'
  }
];

// Login de administrador SEGURO
const login = async (req, res) => {
  try {
    const { username, password } = req.body;

    // Validaciones de seguridad
    if (!username || !password) {
      return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });
    }

    // Prevenir fuerza bruta - delay artificial
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Buscar usuario
    const user = ADMIN_USERS.find(u => u.username === username);
    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Verificar contraseña CON HASH
    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Credenciales inválidas' });
    }

    // Generar token seguro
    const token = jwt.sign(
      { 
        userId: user.id, 
        username: user.username, 
        name: user.name,
        type: 'admin'
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: '8h',
        issuer: 'barberia-elite-api',
        audience: 'barberia-elite-app'
      }
    );

    res.json({
      message: 'Login exitoso',
      token,
      user: {
        id: user.id,
        username: user.username,
        name: user.name
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    res.status(500).json({ error: 'Error en el servidor' });
  }
};

// Middleware de verificación mejorado
const verifyToken = (req, res, next) => {
  const authHeader = req.header('Authorization');
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso denegado. Token requerido.' });
  }

  const token = authHeader.replace('Bearer ', '');

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET, {
      issuer: 'barberia-elite-api',
      audience: 'barberia-elite-app'
    });
    
    req.user = verified;
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado' });
    }
    res.status(401).json({ error: 'Token inválido' });
  }
};

module.exports = {
  login,
  verifyToken,
  adminAuth: [verifyToken]
};