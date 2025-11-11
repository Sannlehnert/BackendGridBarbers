const mysql = require('mysql2');
require('dotenv').config();

async function initializeDatabase() {
  let connection;

  try {
    console.log('🔧 Inicializando base de datos para PRODUCCIÓN...');

    // Conectar sin especificar base de datos
    connection = mysql.createConnection({
      host: process.env.DB_HOST,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port: process.env.DB_PORT || 3306,
      multipleStatements: true
    });

    connection.connect(async (err) => {
      if (err) {
        console.error('❌ Error conectando al servidor MySQL:', err.message);
        return;
      }

      console.log('✅ Conectado al servidor MySQL');

      const dbName = process.env.DB_NAME || 'barberia_prod';

      try {
        // Crear base de datos si no existe
        await new Promise((resolve, reject) => {
          connection.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\``, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log(`✅ Base de datos "${dbName}" verificada`);

        // Usar la base de datos
        await new Promise((resolve, reject) => {
          connection.query(`USE \`${dbName}\``, (err) => {
            if (err) reject(err);
            else resolve();
          });
        });
        console.log(`✅ Usando base de datos "${dbName}"`);

        // Crear tablas
        await createTables(connection);

        // SOLO EN PRODUCCIÓN: Insertar datos mínimos necesarios
        if (process.env.NODE_ENV === 'production') {
          await insertProductionData(connection);
        } else {
          await insertSampleData(connection);
        }

        console.log('🎉 Base de datos inicializada correctamente para PRODUCCIÓN');

      } catch (error) {
        console.error('❌ Error durante la inicialización:', error.message);
      } finally {
        connection.end();
        console.log('🔌 Conexión cerrada');
      }
    });

  } catch (error) {
    console.error('❌ Error general:', error.message);
    if (connection) connection.end();
  }
}

async function createTables(connection) {
  const tables = [
    `CREATE TABLE IF NOT EXISTS barbers (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE,
      phone VARCHAR(20),
      image_url VARCHAR(255) DEFAULT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS services (
      id INT AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      duration INT NOT NULL,
      price DECIMAL(8,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )`,

    `CREATE TABLE IF NOT EXISTS appointments (
      id INT AUTO_INCREMENT PRIMARY KEY,
      barber_id INT,
      service_id INT,
      customer_name VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      customer_email VARCHAR(100),
      appointment_date DATETIME NOT NULL,
      duration INT NOT NULL,
      status ENUM('pending', 'confirmed', 'cancelled') DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (barber_id) REFERENCES barbers(id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES services(id) ON DELETE CASCADE,
      UNIQUE KEY unique_barber_time (barber_id, appointment_date)
    )`
  ];

  for (let i = 0; i < tables.length; i++) {
    await new Promise((resolve, reject) => {
      connection.query(tables[i], (err) => {
        if (err) reject(err);
        else resolve();
      });
    });
    console.log(`✅ Tabla ${i + 1} creada/verificada`);
  }
}

// DATOS MÍNIMOS PARA PRODUCCIÓN
async function insertProductionData(connection) {
  console.log('🚀 Insertando datos mínimos para PRODUCCIÓN...');

  const productionData = [
    // Solo barberos básicos - SIN DATOS PERSONALES REALES
    `INSERT IGNORE INTO barbers (id, name, email, phone) VALUES 
    (1, 'Barbero Principal', 'barbero@barberiaelite.com', '+541100000000')`,

    // Servicios básicos
    `INSERT IGNORE INTO services (id, name, description, duration, price) VALUES 
    (1, 'Corte Degradé', 'Corte de pelo con desvanecido perfecto', 40, 28000),
    (2, 'Corte + Barba', 'Corte con degradé y perfilado completo de barba con navaja', 60, 38000),
    (3, 'Perfilado de Barba', 'Diseño, recorte y delineado de barba a navaja y productos', 25, 18000),
    (4, 'Corte Base', 'Corte uniforme sin degradé o estilo clásico definido', 30, 25000),
    (5, 'Global (Coloración Completa)', 'Aplicación de color uniforme en toda la cabeza', 210, 120000),
    (6, 'Mechas', 'Reflejos, mechas selectivas', 150, 65000)`
  ];

  for (let i = 0; i < productionData.length; i++) {
    await new Promise((resolve, reject) => {
      connection.query(productionData[i], (err, results) => {
        if (err) {
          if (err.code === 'ER_DUP_ENTRY') resolve();
          else reject(err);
        } else {
          resolve();
        }
      });
    });
    console.log(`✅ Datos de producción ${i + 1} insertados`);
  }
}

// Mantener datos de muestra solo para desarrollo
async function insertSampleData(connection) {
  console.log('💻 Insertando datos de muestra para DESARROLLO...');
  // ... (tu código original de sample data)
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;