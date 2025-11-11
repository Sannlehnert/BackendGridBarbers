const pool = require('../config/database');
const fs = require('fs');
const path = require('path');

// Obtener todos los barberos
const getAllBarbers = async (req, res) => {
  try {
    const [barbers] = await pool.execute(
      `SELECT id, name, email, phone, image_url, created_at 
       FROM barbers 
       ORDER BY name`
    );

    res.json(barbers);
  } catch (error) {
    console.error('Error getting barbers:', error.message);
    
    // Si la tabla no existe, devolver array vacío en lugar de error
    if (error.code === 'ER_NO_SUCH_TABLE') {
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
    
    const [barbers] = await pool.execute(
      `SELECT id, name, email, phone, image_url, created_at 
       FROM barbers 
       WHERE id = ?`,
      [id]
    );

    if (barbers.length === 0) {
      return res.status(404).json({ error: 'Barbero no encontrado' });
    }

    res.json(barbers[0]);
  } catch (error) {
    console.error('Error getting barber:', error);
    res.status(500).json({ 
      error: 'Error al obtener el barbero',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Crear un nuevo barbero CON IMAGEN
const createBarber = async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    // Validaciones básicas
    if (!name) {
      return res.status(400).json({ error: 'El nombre es obligatorio' });
    }

    // Manejar la imagen si se subió
    let image_url = null;
    if (req.file) {
      image_url = '/uploads/barbers/' + req.file.filename;
    }

    const [result] = await pool.execute(
      `INSERT INTO barbers (name, email, phone, image_url) 
       VALUES (?, ?, ?, ?)`,
      [name, email, phone, image_url]
    );

    res.status(201).json({
      id: result.insertId,
      message: 'Barbero creado exitosamente',
      barber: { name, email, phone, image_url }
    });
  } catch (error) {
    console.error('Error creating barber:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email ya está en uso' });
    }

    res.status(500).json({ 
      error: 'Error al crear el barbero',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Actualizar un barbero CON IMAGEN
const updateBarber = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    // Obtener barbero actual para eliminar imagen anterior si es necesario
    let oldImageUrl = null;
    if (req.file) {
      const [currentBarber] = await pool.execute(
        'SELECT image_url FROM barbers WHERE id = ?',
        [id]
      );
      oldImageUrl = currentBarber[0]?.image_url;
    }

    // Manejar la nueva imagen
    let image_url = null;
    if (req.file) {
      image_url = '/uploads/barbers/' + req.file.filename;
      
      // Eliminar imagen anterior si existe
      if (oldImageUrl) {
        const oldImagePath = path.join(__dirname, '..', oldImageUrl);
        if (fs.existsSync(oldImagePath)) {
          fs.unlinkSync(oldImagePath);
        }
      }
    }

    const [result] = await pool.execute(
      `UPDATE barbers 
       SET name = ?, email = ?, phone = ?, image_url = COALESCE(?, image_url)
       WHERE id = ?`,
      [name, email, phone, image_url, id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Barbero no encontrado' });
    }

    res.json({ 
      message: 'Barbero actualizado exitosamente',
      barber: { id, name, email, phone, image_url: image_url || oldImageUrl }
    });
  } catch (error) {
    console.error('Error updating barber:', error);
    
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'El email ya está en uso' });
    }

    res.status(500).json({ 
      error: 'Error al actualizar el barbero',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Eliminar un barbero Y SU IMAGEN
const deleteBarber = async (req, res) => {
  try {
    const { id } = req.params;

    // Obtener barbero para eliminar su imagen
    const [barber] = await pool.execute(
      'SELECT image_url FROM barbers WHERE id = ?',
      [id]
    );

    const [result] = await pool.execute(
      'DELETE FROM barbers WHERE id = ?',
      [id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Barbero no encontrado' });
    }

    // Eliminar imagen si existe
    if (barber[0]?.image_url) {
      const imagePath = path.join(__dirname, '..', barber[0].image_url);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
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

// Exportar todas las funciones CORREGIDAS
module.exports = {
  getAllBarbers,
  getBarberById,
  createBarber,
  updateBarber,
  deleteBarber
};