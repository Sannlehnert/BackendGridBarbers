const pool = require('../config/database');

// Crear nuevo turno
const createAppointment = async (req, res) => {
  const { barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date } = req.body;
  
  try {
    // Validaciones básicas
    if (!barber_id || !service_id || !customer_name || !customer_phone || !appointment_date) {
      return res.status(400).json({ 
        error: 'Barbero, servicio, nombre, teléfono y fecha son obligatorios' 
      });
    }

    // Validar formato de fecha
    const appointmentDate = new Date(appointment_date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ error: 'Fecha inválida' });
    }

    // Validar que la fecha no sea en el pasado
    const now = new Date();
    if (appointmentDate < now) {
      return res.status(400).json({ error: 'No se pueden agendar turnos en el pasado' });
    }

    // Validar horario comercial (9:00 - 18:00)
    const hour = appointmentDate.getHours();
    const minutes = appointmentDate.getMinutes();
    if (hour < 9 || hour >= 18 || (hour === 17 && minutes > 30)) {
      return res.status(400).json({ 
        error: 'Los turnos deben ser entre 9:00 y 18:00' 
      });
    }

    // Validar que sea día laboral (lunes a sábado)
    const dayOfWeek = appointmentDate.getDay();
    if (dayOfWeek === 0) { // 0 es domingo
      return res.status(400).json({ 
        error: 'No se pueden agendar turnos los domingos' 
      });
    }

    // Obtener duración del servicio
    const [service] = await pool.execute(
      'SELECT duration, name FROM services WHERE id = ?',
      [service_id]
    );
    
    if (service.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    const duration = service[0].duration;
    const serviceName = service[0].name;

    // Obtener información del barbero
    const [barber] = await pool.execute(
      'SELECT name FROM barbers WHERE id = ?',
      [barber_id]
    );

    if (barber.length === 0) {
      return res.status(404).json({ error: 'Barbero no encontrado' });
    }

    const barberName = barber[0].name;

    // Verificar disponibilidad - evitar solapamiento
    const [existingAppointments] = await pool.execute(
      `SELECT id, appointment_date, duration 
       FROM appointments 
       WHERE barber_id = ? 
       AND DATE(appointment_date) = DATE(?)
       AND status != 'cancelled'
       AND (
         (appointment_date BETWEEN ? AND DATE_ADD(?, INTERVAL ? MINUTE)) OR
         (DATE_ADD(appointment_date, INTERVAL duration MINUTE) BETWEEN ? AND DATE_ADD(?, INTERVAL ? MINUTE)) OR
         (? BETWEEN appointment_date AND DATE_ADD(appointment_date, INTERVAL duration MINUTE))
       )`,
      [
        barber_id, 
        appointment_date,
        appointment_date, appointment_date, duration,
        appointment_date, appointment_date, duration,
        appointment_date
      ]
    );
    
    if (existingAppointments.length > 0) {
      const busyAppointment = existingAppointments[0];
      const busyTime = new Date(busyAppointment.appointment_date).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return res.status(409).json({ 
        error: `El barbero no está disponible en ese horario. 
               Ya hay un turno a las ${busyTime}` 
      });
    }

    // Crear turno
    const [result] = await pool.execute(
      `INSERT INTO appointments 
       (barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, duration) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, duration]
    );

    // Obtener el turno creado con información relacionada
    const [newAppointment] = await pool.execute(
      `SELECT a.*, s.name as service_name, s.price, b.name as barber_name
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       JOIN barbers b ON a.barber_id = b.id
       WHERE a.id = ?`,
      [result.insertId]
    );

    res.status(201).json({
      message: 'Turno reservado exitosamente',
      appointment: newAppointment[0]
    });
    
  } catch (error) {
    console.error('Error creating appointment:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ 
        error: 'Ya existe un turno para ese barbero en ese horario' 
      });
    }

    res.status(500).json({ 
      error: 'Error al crear el turno',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener turnos por fecha y barbero
const getAppointmentsByDate = async (req, res) => {
  const { date, barber_id } = req.query;
  
  try {
    if (!date || !barber_id) {
      return res.status(400).json({ 
        error: 'Fecha y barber_id son requeridos' 
      });
    }

    const [appointments] = await pool.execute(
      `SELECT a.*, s.name as service_name, b.name as barber_name 
       FROM appointments a 
       JOIN services s ON a.service_id = s.id 
       JOIN barbers b ON a.barber_id = b.id 
       WHERE DATE(a.appointment_date) = ? 
       AND a.barber_id = ?
       AND a.status != 'cancelled'
       ORDER BY a.appointment_date`,
      [date, barber_id]
    );
    
    res.json(appointments);
  } catch (error) {
    console.error('Error getting appointments:', error);
    res.status(500).json({ 
      error: 'Error al obtener los turnos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener todos los turnos (para panel admin)
const getAllAppointments = async (req, res) => {
  try {
    const { date, status } = req.query;
    
    let query = `
      SELECT a.*, s.name as service_name, s.price, b.name as barber_name 
      FROM appointments a 
      JOIN services s ON a.service_id = s.id 
      JOIN barbers b ON a.barber_id = b.id 
    `;
    
    const params = [];
    
    if (date) {
      query += ` WHERE DATE(a.appointment_date) = ?`;
      params.push(date);
      
      if (status) {
        query += ` AND a.status = ?`;
        params.push(status);
      }
    } else if (status) {
      query += ` WHERE a.status = ?`;
      params.push(status);
    }
    
    query += ` ORDER BY a.appointment_date DESC`;
    
    const [appointments] = await pool.execute(query, params);
    
    res.json(appointments);
  } catch (error) {
    console.error('Error getting all appointments:', error);
    res.status(500).json({ 
      error: 'Error al obtener los turnos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Cancelar turno
const cancelAppointment = async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await pool.execute(
      'UPDATE appointments SET status = "cancelled" WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }
    
    res.json({ message: 'Turno cancelado exitosamente' });
  } catch (error) {
    console.error('Error canceling appointment:', error);
    res.status(500).json({ 
      error: 'Error al cancelar el turno',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Confirmar turno
const confirmAppointment = async (req, res) => {
  const { id } = req.params;
  
  try {
    const [result] = await pool.execute(
      'UPDATE appointments SET status = "confirmed" WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Turno no encontrado' });
    }
    
    res.json({ message: 'Turno confirmado exitosamente' });
  } catch (error) {
    console.error('Error confirming appointment:', error);
    res.status(500).json({ 
      error: 'Error al confirmar el turno',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener estadísticas
const getStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    const [todayAppointments] = await pool.execute(
      `SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_date) = ? AND status != 'cancelled'`,
      [today]
    );
    
    const [confirmedAppointments] = await pool.execute(
      `SELECT COUNT(*) as count FROM appointments WHERE status = 'confirmed'`
    );
    
    const [cancelledAppointments] = await pool.execute(
      `SELECT COUNT(*) as count FROM appointments WHERE status = 'cancelled'`
    );
    
    res.json({
      today: todayAppointments[0].count,
      confirmed: confirmedAppointments[0].count,
      cancelled: cancelledAppointments[0].count,
      total: confirmedAppointments[0].count + cancelledAppointments[0].count
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const sendWhatsAppNotification = async (appointment, type) => {
  // Integración con WhatsApp Business API
  // Esto es un template - implementar con servicio real como Twilio
  const messageTemplates = {
    confirmation: `✅ Tu cita en Grid Barbers está confirmada!\n📅 ${new Date(appointment.appointment_date).toLocaleString('es-ES')}\n💈 ${appointment.barber_name}\n✂️ ${appointment.service_name}`,
    reminder: `⏰ Recordatorio: Tu cita es mañana a las ${new Date(appointment.appointment_date).toLocaleTimeString('es-ES', {hour: '2-digit', minute:'2-digit'})}`
  };
  
  console.log('WhatsApp enviado:', messageTemplates[type]);
  // Implementar envío real aquí
};

// Exportar todas las funciones
module.exports = {
  createAppointment,
  getAppointmentsByDate,
  getAllAppointments,
  cancelAppointment,
  confirmAppointment,
  getStats
};