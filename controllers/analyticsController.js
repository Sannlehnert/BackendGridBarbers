const pool = require('../config/database');

const getDashboardStats = async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    
    // Estadísticas completas
    const [dailyStats] = await pool.execute(`
      SELECT 
        COUNT(*) as total_appointments,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(price) as revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE DATE(appointment_date) = ?
    `, [today]);

    // Barberos más populares
    const [popularBarbers] = await pool.execute(`
      SELECT b.name, COUNT(*) as appointment_count
      FROM appointments a
      JOIN barbers b ON a.barber_id = b.id
      WHERE DATE(a.appointment_date) >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY b.id, b.name
      ORDER BY appointment_count DESC
      LIMIT 5
    `);

    // Servicios más populares
    const [popularServices] = await pool.execute(`
      SELECT s.name, COUNT(*) as service_count, SUM(s.price) as revenue
      FROM appointments a
      JOIN services s ON a.service_id = s.id
      WHERE DATE(a.appointment_date) >= DATE_SUB(NOW(), INTERVAL 7 DAY)
      GROUP BY s.id, s.name
      ORDER BY service_count DESC
      LIMIT 5
    `);

    res.json({
      daily: dailyStats[0],
      popularBarbers,
      popularServices,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    res.status(500).json({ error: 'Error al obtener estadísticas' });
  }
};

module.exports = { getDashboardStats };