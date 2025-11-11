const { pool } = require('../config/database');

// Obtener todos los servicios
const getAllServices = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, description, duration, price, created_at 
       FROM services 
       ORDER BY name`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting services:', error.message);
    
    if (error.code === '42P01') {
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
    
    const result = await pool.query(
      `SELECT id, name, description, duration, price, created_at 
       FROM services 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json(result.rows[0]);
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

    if (!name || !duration || !price) {
      return res.status(400).json({ 
        error: 'Nombre, duración y precio son obligatorios' 
      });
    }

    const result = await pool.query(
      `INSERT INTO services (name, description, duration, price) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, description, duration, price]
    );

    res.status(201).json({
      message: 'Servicio creado exitosamente',
      service: result.rows[0]
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

    const result = await pool.query(
      `UPDATE services 
       SET name = $1, description = $2, duration = $3, price = $4,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [name, description, duration, price, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Servicio no encontrado' });
    }

    res.json({ 
      message: 'Servicio actualizado exitosamente',
      service: result.rows[0]
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

    const result = await pool.query(
      'DELETE FROM services WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
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

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
};