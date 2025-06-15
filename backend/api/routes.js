/**
 * routes.js - Маршруты API для системы Matrix AI
 * 
 * Этот файл содержит определения всех маршрутов REST API.
 * Здесь регистрируются эндпоинты для работы с данными системы мониторинга.
 */

const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const sourceRoutes = require('./routes/sourceRoutes');
const eventRoutes = require('./routes/eventRoutes');
const reportRoutes = require('./routes/reportRoutes');
const aiRoutes = require('./routes/aiRoutes');

module.exports = function(app) {
  // Базовый маршрут API
  app.get('/api', (req, res) => {
    res.json({
      message: 'Добро пожаловать в API системы Matrix AI',
      version: '1.0.0',
      endpoints: [
        '/api/auth',
        '/api/users',
        '/api/sources',
        '/api/events',
        '/api/reports',
        '/api/ai'
      ]
    });
  });

  // Регистрация маршрутов
  app.use('/api/auth', authRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/sources', sourceRoutes);
  app.use('/api/events', eventRoutes);
  app.use('/api/reports', reportRoutes);
  app.use('/api/ai', aiRoutes);

  // Обработка ошибок 404 для API
  app.use('/api/*', (req, res) => {
    res.status(404).json({
      error: 'Endpoint not found',
      message: 'Запрашиваемый API-эндпоинт не существует'
    });
  });
}; 