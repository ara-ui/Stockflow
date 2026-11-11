const express = require('express');
const helmet = require('helmet');
const path = require('path');
const errorHandler = require('./middleware/errorHandler');
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

app.use(helmet());
app.use(express.json({ limit: '100kb' }));
app.use(express.static(path.join(__dirname, '../public')));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use('/api', (req, res) => {
  res.status(404).json({
    error: {
      message: 'Route not found',
      code: 'NOT_FOUND',
    },
  });
});

// React SPA fallback for frontend routes
const frontendIndex = path.join(__dirname, '../public/index.html');

if (require('fs').existsSync(frontendIndex)) {
  app.get('/{*splat}', (req, res, next) => {
    res.sendFile(frontendIndex, (err) => {
      if (err) next(err);
    });
  });
}

app.use(errorHandler);

module.exports = app;