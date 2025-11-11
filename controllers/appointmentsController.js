const { pool } = require('../config/database');

// Crear nuevo turno
const createAppointment = async (req, res) => {
  const { barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date } = req.body;
  
  try {
    if (!barber_id || !service_id || !customer_name || !customer_phone || !appointment_date) {
      return res.status(400).json({ 
        error: 'Barbero, servicio, nombre, teléfono y fecha son obligatorios' 
      });
    }

    const appointmentDate = new Date(appointment_date);
    if (isNaN(appointmentDate.getTime())) {
      return res.status(400).json({ error: 'Fecha inválida' });
    }

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
    if (dayOfWeek === 0) {
      return res.status(400).json({ 
        error: 'No se pueden agendar turnos los domingos' 
      });
    }

    // Obtener duración del servicio
    const serviceResult = await pool.query(
      'SELECT duration, name FROM services WHERE id = $1',
      [service_id]
    );
    
    if (serviceResult.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }
    
    const duration = serviceResult.rows[0].duration;
    const serviceName = serviceResult.rows[0].name;

    // Obtener información del barbero
    const barberResult = await pool.query(
      'SELECT name FROM barbers WHERE id = $1',
      [barber_id]
    );

    if (barberResult.rows.length === 0) {
      return res.status(404).json({ error: 'Barbero no encontrado' });
    }

    const barberName = barberResult.rows[0].name;

    // Verificar disponibilidad - PostgreSQL
    const existingResult = await pool.query(
      `SELECT id, appointment_date, duration 
       FROM appointments 
       WHERE barber_id = $1 
       AND DATE(appointment_date) = DATE($2)
       AND status != 'cancelled'
       AND (
         (appointment_date, appointment_date + INTERVAL '1 minute' * duration) 
         OVERLAPS ($3, $3 + INTERVAL '1 minute' * $4)
       )`,
      [barber_id, appointment_date, appointment_date, duration]
    );
    
    if (existingResult.rows.length > 0) {
      const busyAppointment = existingResult.rows[0];
      const busyTime = new Date(busyAppointment.appointment_date).toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return res.status(409).json({ 
        error: `El barbero no está disponible en ese horario. Ya hay un turno a las ${busyTime}` 
      });
    }

    // Crear turno
    const result = await pool.query(
      `INSERT INTO appointments 
       (barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, duration) 
       VALUES ($1, $2, $3, $4, $5, $6, $7) 
       RETURNING *`,
      [barber_id, service_id, customer_name, customer_phone, customer_email, appointment_date, duration]
    );

    // Obtener el turno creado con información relacionada
    const newAppointment = await pool.query(
      `SELECT a.*, s.name as service_name, s.price, b.name as barber_name
       FROM appointments a
       JOIN services s ON a.service_id = s.id
       JOIN barbers b ON a.barber_id = b.id
       WHERE a.id = $1`,
      [result.rows[0].id]
    );

    res.status(201).json({
      message: 'Turno reservado exitosamente',
      appointment: newAppointment.rows[0]
    });
    
  } catch (error) {
    console.error('Error creating appointment:', error);
    
    if (error.code === '23505') {
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

    const result = await pool.query(
      `SELECT a.*, s.name as service_name, b.name as barber_name 
       FROM appointments a 
       JOIN services s ON a.service_id = s.id 
       JOIN barbers b ON a.barber_id = b.id 
       WHERE DATE(a.appointment_date) = $1 
       AND a.barber_id = $2
       AND a.status != 'cancelled'
       ORDER BY a.appointment_date`,
      [date, barber_id]
    );
    
    res.json(result.rows);
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
    let paramCount = 0;
    
    if (date) {
      query += ` WHERE DATE(a.appointment_date) = $${++paramCount}`;
      params.push(date);
      
      if (status) {
        query += ` AND a.status = $${++paramCount}`;
        params.push(status);
      }
    } else if (status) {
      query += ` WHERE a.status = $${++paramCount}`;
      params.push(status);
    }
    
    query += ` ORDER BY a.appointment_date DESC`;
    
    const result = await pool.query(query, params);
    
    res.json(result.rows);
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
    const result = await pool.query(
      'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
      ['cancelled', id]
    );

    if (result.rows.length === 0) {
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
    const result = await pool.query(
      'UPDATE appointments SET status = $1 WHERE id = $2 RETURNING *',
      ['confirmed', id]
    );

    if (result.rows.length === 0) {
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
    
    const todayResult = await pool.query(
      `SELECT COUNT(*) as count FROM appointments WHERE DATE(appointment_date) = $1 AND status != 'cancelled'`,
      [today]
    );
    
    const confirmedResult = await pool.query(
      `SELECT COUNT(*) as count FROM appointments WHERE status = 'confirmed'`
    );
    
    const cancelledResult = await pool.query(
      `SELECT COUNT(*) as count FROM appointments WHERE status = 'cancelled'`
    );
    
    res.json({
      today: parseInt(todayResult.rows[0].count),
      confirmed: parseInt(confirmedResult.rows[0].count),
      cancelled: parseInt(cancelledResult.rows[0].count),
      total: parseInt(confirmedResult.rows[0].count) + parseInt(cancelledResult.rows[0].count)
    });
  } catch (error) {
    console.error('Error getting stats:', error);
    res.status(500).json({ 
      error: 'Error al obtener estadísticas',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createAppointment,
  getAppointmentsByDate,
  getAllAppointments,
  cancelAppointment,
  confirmAppointment,
  getStats
};