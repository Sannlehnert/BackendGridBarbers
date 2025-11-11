const express = require('express');
const router = express.Router();
const servicesController = require('../controllers/servicesController');

// GET /api/services - Obtener todos los servicios
router.get('/', servicesController.getAllServices);

// GET /api/services/:id - Obtener un servicio por ID
router.get('/:id', servicesController.getServiceById);

// POST /api/services - Crear un nuevo servicio
router.post('/', servicesController.createService);

// PUT /api/services/:id - Actualizar un servicio
router.put('/:id', servicesController.updateService);

// DELETE /api/services/:id - Eliminar un servicio
router.delete('/:id', servicesController.deleteService);

module.exports = router;