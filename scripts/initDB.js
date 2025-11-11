const { Client } = require('pg');
require('dotenv').config();

async function initializeDatabase() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('🔧 Conectado a PostgreSQL - Inicializando base de datos...');

    // Crear tablas
    await createTables(client);

    // Insertar datos mínimos para producción
    await insertProductionData(client);

    console.log('🎉 Base de datos PostgreSQL inicializada correctamente');

  } catch (error) {
    console.error('❌ Error durante la inicialización:', error.message);
  } finally {
    await client.end();
  }
}

async function createTables(client) {
  const tables = [
    // Tabla barbers
    `CREATE TABLE IF NOT EXISTS barbers (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      email VARCHAR(100) UNIQUE,
      phone VARCHAR(20),
      image_url VARCHAR(255),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla services
    `CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL,
      description TEXT,
      duration INTEGER NOT NULL,
      price DECIMAL(8,2),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // Tabla appointments
    `CREATE TABLE IF NOT EXISTS appointments (
      id SERIAL PRIMARY KEY,
      barber_id INTEGER REFERENCES barbers(id) ON DELETE CASCADE,
      service_id INTEGER REFERENCES services(id) ON DELETE CASCADE,
      customer_name VARCHAR(100) NOT NULL,
      customer_phone VARCHAR(20) NOT NULL,
      customer_email VARCHAR(100),
      appointment_date TIMESTAMP NOT NULL,
      duration INTEGER NOT NULL,
      status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(barber_id, appointment_date)
    )`
  ];

  for (let i = 0; i < tables.length; i++) {
    try {
      await client.query(tables[i]);
      console.log(`✅ Tabla ${i + 1} creada/verificada`);
    } catch (error) {
      console.error(`❌ Error creando tabla ${i + 1}:`, error.message);
    }
  }
}

async function insertProductionData(client) {
  console.log('🚀 Insertando datos mínimos para producción...');

  const productionData = [
    // Barberos básicos
    `INSERT INTO barbers (name, email, phone) 
     VALUES 
     ('Carlos Rodríguez', 'carlos@barberiaelite.com', '+541123456780'),
     ('Miguel Sánchez', 'miguel@barberiaelite.com', '+541123456781')
     ON CONFLICT (email) DO NOTHING`,

    // Servicios básicos
    `INSERT INTO services (name, description, duration, price) 
     VALUES 
    ('Corte Degradé', 'Corte de pelo con desvanecido perfecto', 40, 28000),
    ('Corte + Barba', 'Corte con degradé y perfilado completo de barba con navaja', 60, 38000),
    ('Perfilado de Barba', 'Diseño, recorte y delineado de barba a navaja y productos', 25, 18000),
    ('Corte Base', 'Corte uniforme sin degradé o estilo clásico definido', 30, 25000),
    ('Global (Coloración Completa)', 'Aplicación de color uniforme en toda la cabeza', 210, 120000),
    ('Mechas', 'Reflejos, mechas selectivas', 150, 65000)
     ON CONFLICT (name) DO NOTHING`
  ];

  for (let i = 0; i < productionData.length; i++) {
    try {
      const result = await client.query(productionData[i]);
      if (result.rowCount > 0) {
        console.log(`✅ Datos de producción ${i + 1} insertados`);
      } else {
        console.log(`✅ Datos de producción ${i + 1} ya existían`);
      }
    } catch (error) {
      console.error(`❌ Error insertando datos ${i + 1}:`, error.message);
    }
  }
}

if (require.main === module) {
  initializeDatabase();
}

module.exports = initializeDatabase;