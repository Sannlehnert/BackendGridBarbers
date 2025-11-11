const pool = require('../config/database');

// Obtener todos los servicios
const getAllServices = async (req, res) => {
  try {
    const [services] = await pool.execute(
      `SELECT id, name, description, duration, price, created_at 
       FROM services 
       ORDER BY name`
    );

    res.json(services);
  } catch (error) {
    console.error('Error getting services:', error.message);
    
    // Si la tabla no existe, devolver array vacío en lugar de error
    if (error.code === 'ER_NO_SUCH_TABLE') {
      console.log('Tabla services no existe todavía, devolviendo array vacío');
      return res.json([]);
    }
    
    res.status(500).json({ 
      error: 'Error al obtener los servicios',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener un servicio por ID
const getServiceById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const [services] = await pool.execute(
      `SELECT id, name, description, duration, price, created_at 
       FROM services 
       WHERE id = ?`,
      [id]
    );

    if (services.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json(services[0]);
  } catch (error) {
    console.error('Error getting service:', error);
    res.status(500).json({ 
      error: 'Error al obtener el servicio',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Crear un nuevo servicio
const createService = async (req, res) => {
  try {
    const { name, description, duration, price } = req.body;

    // Validaciones básicas
    if (!name || !duration || !price) {
      return res.status(400).json({ 
        error: 'Nombre, duración y precio son obligatorios' 
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO services (name, description, duration, price) 
       VALUES (?, ?, ?, ?)`,
      [name, description, duration, price]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Servicio creado exitosamente',
      service: { name, description, duration, price }
    });
  } catch (error) {
    console.error('Error creating service:', error);
    res.status(500).json({ 
      error: 'Error al crear el servicio',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Actualizar un servicio
const updateService = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, duration, price } = req.body;

    const [result] = await pool.execute(
      `UPDATE services 
       SET name = ?, description = ?, duration = ?, price = ? 
       WHERE id = ?`,
      [name, description, duration, price, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json({ 
      message: 'Servicio actualizado exitosamente',
      service: { id, name, description, duration, price }
    });
  } catch (error) {
    console.error('Error updating service:', error);
    res.status(500).json({ 
      error: 'Error al actualizar el servicio',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Eliminar un servicio
const deleteService = async (req, res) => {
  try {
    const { id } = req.params;

    const [result] = await pool.execute(
      'DELETE FROM services WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json({ message: 'Servicio eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting service:', error);
    res.status(500).json({ 
      error: 'Error al eliminar el servicio',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Exportar todas las funciones
module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};