/**
 * server.js - Главный файл сервера для системы Matrix AI
 * 
 * Этот файл содержит настройку и запуск Express-сервера.
 * Включает подключение к базе данных, настройку middleware и маршрутов.
 */

// Загрузка переменных окружения
require('dotenv').config();

// Импорт необходимых модулей
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');
const db = require('./models');

// Создание экземпляра Express
const app = express();
const PORT = process.env.PORT || 3000;

// Настройка middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev')); // Логирование запросов

// Статические файлы
app.use(express.static(path.join(__dirname, 'public')));

// Подключение маршрутов API
app.use('/api/auth', require('./api/routes/authRoutes'));
app.use('/api/users', require('./api/routes/userRoutes'));
app.use('/api/sources', require('./api/routes/sourceRoutes'));
app.use('/api/events', require('./api/routes/eventRoutes'));
app.use('/api/reports', require('./api/routes/reportRoutes'));

// Маршрут для проверки работоспособности сервера
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: 'Сервер Matrix AI работает' });
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Внутренняя ошибка сервера',
    error: process.env.NODE_ENV === 'production' ? {} : err
  });
});

// Запуск сервера
async function startServer() {
  try {
    // Синхронизация с базой данных
    await db.sequelize.authenticate();
    console.log('Соединение с базой данных установлено успешно.');
    
    // Запуск сервера
    app.listen(PORT, () => {
      console.log(`Сервер Matrix AI запущен на порту ${PORT}`);
      console.log(`Режим: ${process.env.NODE_ENV || 'development'}`);
    });
  } catch (error) {
    console.error('Ошибка при запуске сервера:', error);
    process.exit(1);
  }
}

// Запуск сервера
startServer(); 
module.exports = app; 