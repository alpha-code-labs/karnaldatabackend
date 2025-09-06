const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8000;

// Middleware - Updated CORS configuration for mobile access
app.use(cors({
  origin: true, // Allow all origins, or specify your mobile app's origin
  credentials: true
}));
app.use(express.json());

// Routes
app.use('/api/prices', require('./src/routes/priceRoutes'));

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'Server is running', 
    timestamp: new Date().toISOString(),
    host: req.get('host')
  });
});

// Listen on all network interfaces (0.0.0.0) instead of just localhost
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Local access: http://localhost:${PORT}`);
  console.log(`Network access: http://10.5.50.67:${PORT}`);
  console.log(`Mobile devices can access via: http://10.5.50.67:${PORT}`);
});