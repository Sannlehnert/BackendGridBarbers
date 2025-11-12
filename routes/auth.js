const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// POST /api/auth/login - Login de administrador
router.post('/login', authController.login);

module.exports = router;