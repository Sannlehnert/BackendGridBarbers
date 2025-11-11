const express = require('express');
const cors = require('cors');
const { pool, testConnection } = require('../config/database');

const app = express();

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/barbers', require('./routes/barbers')); 
app.use('/api/services', require('./routes/services'));
app.use('/api/appointments', require('./routes/appointments'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'HEALTHY', 
    message: 'Barbería Elite API - VERCEL',
    timestamp: new Date().toISOString()
  });
});

module.exports = app;