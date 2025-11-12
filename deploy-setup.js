#!/usr/bin/env node

const crypto = require('crypto');
const fs = require('fs');
const { execSync } = require('child_process');

console.log('🚀 INICIANDO PREPARACIÓN PARA DEPLOY EN WINDOWS...\n');

// Generar JWT secret seguro
const generateSecureSecret = () => {
  return crypto.randomBytes(64).toString('hex');
};

// Verificar estructura de proyecto
const checkProjectStructure = () => {
  const requiredDirs = ['config', 'controllers', 'middleware', 'routes', 'scripts'];
  const missingDirs = requiredDirs.filter(dir => !fs.existsSync(dir));
  
  if (missingDirs.length > 0) {
    console.error('❌ Directorios faltantes:', missingDirs);
    return false;
  }
  
  console.log('✅ Estructura de proyecto OK');
  return true;
};

// Verificar e instalar dependencias
const checkAndInstallDependencies = () => {
  console.log('📦 Verificando dependencias...');
  
  try {
    // Verificar si mysql2 está instalado
    require('mysql2');
    console.log('✅ mysql2 está instalado');
  } catch (error) {
    console.log('❌ mysql2 no encontrado. Instalando dependencias...');
    try {
      execSync('npm install', { stdio: 'inherit' });
      console.log('✅ Dependencias instaladas correctamente');
    } catch (installError) {
      console.error('❌ Error instalando dependencias:', installError.message);
      return false;
    }
  }
  
  return true;
};

// Verificar variables de entorno
const checkEnvironment = () => {
  if (!fs.existsSync('.env')) {
    if (fs.existsSync('.env.example')) {
      console.log('📝 Creando archivo .env desde template...');
      fs.copyFileSync('.env.example', '.env');
    } else {
      console.log('📝 Creando archivo .env básico...');
      const basicEnv = `# PRODUCTION ENVIRONMENT
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=password
DB_NAME=barberia_prod
DB_PORT=3306

JWT_SECRET=${generateSecureSecret()}

ADMIN_USERNAME=admin
ADMIN_PASSWORD=Admin123!

NODE_ENV=production
PORT=5000

ALLOWED_ORIGINS=http://localhost:3000,http://localhost:5173

RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100`;
      fs.writeFileSync('.env', basicEnv);
    }
  }
  
  // Leer y verificar .env
  const envContent = fs.readFileSync('.env', 'utf8');
  
  // Verificar JWT secret
  if (envContent.includes('tu-jwt-super-secreto') || !envContent.includes('JWT_SECRET=')) {
    const newSecret = generateSecureSecret();
    let updatedEnv = envContent;
    
    if (envContent.includes('JWT_SECRET=')) {
      updatedEnv = envContent.replace(
        /JWT_SECRET=.*/g,
        `JWT_SECRET=${newSecret}`
      );
    } else {
      updatedEnv = envContent + `\nJWT_SECRET=${newSecret}`;
    }
    
    fs.writeFileSync('.env', updatedEnv);
    console.log('✅ JWT Secret generado automáticamente');
  }
  
  console.log('✅ Variables de entorno verificadas');
  return true;
};

// Limpiar datos de desarrollo
const cleanDevelopmentData = () => {
  console.log('🧹 Limpiando datos de desarrollo...');
  
  // Limpiar logs y archivos temporales
  const cleanDirs = ['logs', 'uploads/temp'];
  cleanDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`✅ Limpiado: ${dir}`);
      } catch (error) {
        console.log(`⚠️  No se pudo limpiar: ${dir}`);
      }
    }
  });
  
  console.log('✅ Datos de desarrollo limpiados');
};

// Crear estructura de directorios necesaria
const createRequiredDirs = () => {
  const requiredDirs = [
    'logs',
    'uploads/barbers',
    'uploads/temp'
  ];
  
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`✅ Directorio creado: ${dir}`);
    }
  });
};

// Ejecutar preparación
const setupDeploy = async () => {
  try {
    console.log('=================================');
    console.log('   PREPARANDO DEPLOY PRODUCCIÓN  ');
    console.log('          (WINDOWS)              ');
    console.log('=================================\n');
    
    // 1. Crear directorios necesarios
    createRequiredDirs();
    
    // 2. Verificar estructura
    if (!checkProjectStructure()) {
      process.exit(1);
    }
    
    // 3. Verificar e instalar dependencias
    if (!checkAndInstallDependencies()) {
      process.exit(1);
    }
    
    // 4. Verificar entorno
    checkEnvironment();
    
    // 5. Limpiar datos desarrollo
    cleanDevelopmentData();
    
    console.log('\n🎉 ¡PREPARACIÓN COMPLETADA EN WINDOWS!');
    console.log('\n📋 PRÓXIMOS PASOS:');
    console.log('   1. Verificar que MySQL esté instalado y corriendo');
    console.log('   2. Ejecutar: npm run init-db');
    console.log('   3. Probar: npm run test-prod');
    console.log('   4. Configurar variables en Railway/Render');
    console.log('   5. Hacer deploy del backend');
    console.log('   6. Configurar frontend en Netlify');
    
  } catch (error) {
    console.error('❌ Error durante la preparación:', error);
    process.exit(1);
  }
};

// Ejecutar solo si es llamado directamente
if (require.main === module) {
  setupDeploy();
}

module.exports = setupDeploy;