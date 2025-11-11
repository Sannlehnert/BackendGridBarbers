const { pool } = require('../config/database');
const fs = require('fs');
const path = require('path');

// Obtener todos los barberos
const getAllBarbers = async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, phone, image_url, created_at 
       FROM barbers 
       ORDER BY name`
    );

    res.json(result.rows);
  } catch (error) {
    console.error('Error getting barbers:', error.message);
    
    // Si la tabla no existe, devolver array vacío
    if (error.code === '42P01') { // PostgreSQL table doesn't exist
      console.log('Tabla barbers no existe todavía, devolviendo array vacío');
      return res.json([]);
    }
    
    res.status(500).json({ 
      error: 'Error al obtener los barberos',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Obtener un barbero por ID
const getBarberById = async (req, res) => {
  try {
    const { id } = req.params;
    
    const result = await pool.query(
      `SELECT id, name, email, phone, image_url, created_at 
       FROM barbers 
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barbero no encontrado' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error('Error getting barber:', error);
    res.status(500).json({ 
      error: 'Error al obtener el barbero',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Crear un nuevo barbero
const createBarber = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    let image_url = null;
    if (req.file) {
      image_url = '/uploads/barbers/' + req.file.filename;
    }

    const result = await pool.query(
      `INSERT INTO barbers (name, email, phone, image_url) 
       VALUES ($1, $2, $3, $4) 
       RETURNING *`,
      [name, email, phone, image_url]
    );

    res.status(201).json({
      message: 'Barbero creado exitosamente',
      barber: result.rows[0]
    });
  } catch (error) {
    console.error('Error creating barber:', error);
    
    if (error.code === '23505') { // Violación de unique constraint
      return res.status(409).json({ error: 'El email ya está en uso' });
    }

    res.status(500).json({ 
      error: 'Error al crear el barbero',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Actualizar un barbero
const updateBarber = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    // Manejo de imagen (simplificado para Render - usar Cloudinary después)
    let image_url = null;
    if (req.file) {
      image_url = '/uploads/barbers/' + req.file.filename;
    }

    const result = await pool.query(
      `UPDATE barbers 
       SET name = $1, email = $2, phone = $3, 
           image_url = COALESCE($4, image_url),
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $5 
       RETURNING *`,
      [name, email, phone, image_url, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barbero no encontrado' });
    }

    res.json({ 
      message: 'Barbero actualizado exitosamente',
      barber: result.rows[0]
    });
  } catch (error) {
    console.error('Error updating barber:', error);
    
    if (error.code === '23505') {
      return res.status(409).json({ error: 'El email ya está en uso' });
    }

    res.status(500).json({ 
      error: 'Error al actualizar el barbero',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Eliminar un barbero
const deleteBarber = async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      'DELETE FROM barbers WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Barbero no encontrado' });
    }

    res.json({ message: 'Barbero eliminado exitosamente' });
  } catch (error) {
    console.error('Error deleting barber:', error);
    res.status(500).json({ 
      error: 'Error al eliminar el barbero',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllBarbers,
  getBarberById,
  createBarber,
  updateBarber,
  deleteBarber
};