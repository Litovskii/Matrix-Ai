/**
 * authRoutes.js - Маршруты аутентификации для системы Matrix AI
 * 
 * Этот файл содержит маршруты для регистрации, входа и управления аутентификацией.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const db = require('../../models');
const authMiddleware = require('../middleware/auth');

// Маршрут для регистрации нового пользователя
router.post(
  '/register',
  [
    // Валидация входных данных
    body('username').isLength({ min: 3 }).withMessage('Имя пользователя должно содержать минимум 3 символа'),
    body('email').isEmail().withMessage('Введите корректный email'),
    body('password').isLength({ min: 6 }).withMessage('Пароль должен содержать минимум 6 символов')
  ],
  async (req, res) => {
    try {
      // Проверка результатов валидации
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, password, firstName, lastName } = req.body;

      // Проверка существования пользователя
      const existingUser = await db.User.findOne({
        where: {
          [db.Sequelize.Op.or]: [
            { username },
            { email }
          ]
        }
      });

      if (existingUser) {
        return res.status(400).json({
          message: 'Пользователь с таким именем или email уже существует'
        });
      }

      // Создание нового пользователя
      const user = await db.User.create({
        username,
        email,
        password, // Хеширование выполняется в хуке beforeCreate модели
        firstName,
        lastName,
        role: 'user'
      });

      // Создание JWT токена
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'your_jwt_secret_key_here',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.status(201).json({
        message: 'Пользователь успешно зарегистрирован',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Ошибка при регистрации:', error);
      res.status(500).json({ message: 'Ошибка сервера при регистрации' });
    }
  }
);

// Маршрут для входа пользователя
router.post(
  '/login',
  [
    // Валидация входных данных
    body('username').notEmpty().withMessage('Введите имя пользователя'),
    body('password').notEmpty().withMessage('Введите пароль')
  ],
  async (req, res) => {
    try {
      // Проверка результатов валидации
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password } = req.body;

      // Поиск пользователя
      const user = await db.User.findOne({
        where: { username }
      });

      if (!user) {
        return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
      }

      // Проверка пароля
      const isPasswordValid = await user.validPassword(password);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Неверное имя пользователя или пароль' });
      }

      // Обновление времени последнего входа
      await user.update({ lastLogin: new Date() });

      // Создание JWT токена
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        process.env.JWT_SECRET || 'your_jwt_secret_key_here',
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      res.json({
        message: 'Вход выполнен успешно',
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Ошибка при входе:', error);
      res.status(500).json({ message: 'Ошибка сервера при входе' });
    }
  }
);

// Маршрут для получения информации о текущем пользователе
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await db.User.findByPk(req.user.id, {
      attributes: { exclude: ['password'] }
    });

    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        lastLogin: user.lastLogin
      }
    });
  } catch (error) {
    console.error('Ошибка при получении данных пользователя:', error);
    res.status(500).json({ message: 'Ошибка сервера' });
  }
});

// Маршрут для выхода (на клиенте просто удаляется токен)
router.post('/logout', (req, res) => {
  res.json({ message: 'Выход выполнен успешно' });
});

// Маршрут для обновления пароля
router.put(
  '/change-password',
  authMiddleware,
  [
    body('currentPassword').notEmpty().withMessage('Введите текущий пароль'),
    body('newPassword').isLength({ min: 6 }).withMessage('Новый пароль должен содержать минимум 6 символов')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await db.User.findByPk(req.user.id);

      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }

      // Проверка текущего пароля
      const isPasswordValid = await user.validPassword(currentPassword);
      if (!isPasswordValid) {
        return res.status(401).json({ message: 'Текущий пароль неверен' });
      }

      // Обновление пароля
      user.password = newPassword;
      await user.save();

      res.json({ message: 'Пароль успешно обновлен' });
    } catch (error) {
      console.error('Ошибка при смене пароля:', error);
      res.status(500).json({ message: 'Ошибка сервера при смене пароля' });
    }
  }
);

module.exports = router; 