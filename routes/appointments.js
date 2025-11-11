const express = require('express');
const router = express.Router();
const appointmentsController = require('../controllers/appointmentsController');

// GET /api/appointments - Obtener turnos por fecha y barbero
router.get('/', appointmentsController.getAppointmentsByDate);

// GET /api/appointments/all - Obtener todos los turnos (admin)
router.get('/all', appointmentsController.getAllAppointments);

// GET /api/appointments/stats - Obtener estadísticas
router.get('/stats', appointmentsController.getStats);

// POST /api/appointments - Crear nuevo turno
router.post('/', appointmentsController.createAppointment);

// PUT /api/appointments/:id/cancel - Cancelar turno
router.put('/:id/cancel', appointmentsController.cancelAppointment);

// PUT /api/appointments/:id/confirm - Confirmar turno
router.put('/:id/confirm', appointmentsController.confirmAppointment);

module.exports = router;