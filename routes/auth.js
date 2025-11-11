const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/security');

// POST /api/auth/login - Login de administrador
router.post('/login', authLimiter, authController.login);

module.exports = router;