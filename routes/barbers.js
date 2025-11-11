const express = require('express');
const router = express.Router();
const barbersController = require('../controllers/barbersController');
const { adminAuth } = require('../controllers/authController');
const upload = require('../middleware/upload');

// GET /api/barbers - Obtener todos los barberos (público)
router.get('/', barbersController.getAllBarbers);

// GET /api/barbers/:id - Obtener un barbero por ID
router.get('/:id', barbersController.getBarberById);

// Las siguientes rutas requieren autenticación de admin
router.post('/', adminAuth, upload.single('image'), barbersController.createBarber);
router.put('/:id', adminAuth, upload.single('image'), barbersController.updateBarber);
router.delete('/:id', adminAuth, barbersController.deleteBarber);

module.exports = router;