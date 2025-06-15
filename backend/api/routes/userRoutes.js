/**
 * userRoutes.js - Маршруты для работы с пользователями в системе Matrix AI
 * 
 * Этот файл содержит маршруты для управления пользователями системы.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../../models');
const authMiddleware = require('../middleware/auth');
const { isAdmin } = require('../middleware/roles');

// Получение списка пользователей (только для администраторов)
router.get('/', authMiddleware, isAdmin, async (req, res) => {
  try {
    const users = await db.User.findAll({
      attributes: { exclude: ['password'] }
    });
    
    res.json({ users });
  } catch (error) {
    console.error('Ошибка при получении списка пользователей:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении списка пользователей' });
  }
});

// Получение информации о конкретном пользователе
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Проверка прав доступа (администратор или сам пользователь)
    if (req.user.role !== 'admin' && req.user.id !== id) {
      return res.status(403).json({ message: 'Доступ запрещен' });
    }
    
    const user = await db.User.findByPk(id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    res.json({ user });
  } catch (error) {
    console.error('Ошибка при получении информации о пользователе:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении информации о пользователе' });
  }
});

// Обновление информации о пользователе
router.put(
  '/:id',
  authMiddleware,
  [
    body('firstName').optional().isString().withMessage('Имя должно быть строкой'),
    body('lastName').optional().isString().withMessage('Фамилия должна быть строкой'),
    body('email').optional().isEmail().withMessage('Введите корректный email')
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      
      // Проверка прав доступа (администратор или сам пользователь)
      if (req.user.role !== 'admin' && req.user.id !== id) {
        return res.status(403).json({ message: 'Доступ запрещен' });
      }
      
      // Проверка результатов валидации
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const user = await db.User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
      
      const { firstName, lastName, email } = req.body;
      
      // Проверка уникальности email
      if (email && email !== user.email) {
        const existingUser = await db.User.findOne({ where: { email } });
        if (existingUser) {
          return res.status(400).json({ message: 'Пользователь с таким email уже существует' });
        }
      }
      
      // Обновление данных пользователя
      await user.update({
        firstName: firstName !== undefined ? firstName : user.firstName,
        lastName: lastName !== undefined ? lastName : user.lastName,
        email: email !== undefined ? email : user.email
      });
      
      res.json({
        message: 'Информация о пользователе успешно обновлена',
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
      console.error('Ошибка при обновлении информации о пользователе:', error);
      res.status(500).json({ message: 'Ошибка сервера при обновлении информации о пользователе' });
    }
  }
);

// Изменение роли пользователя (только для администраторов)
router.put(
  '/:id/role',
  authMiddleware,
  isAdmin,
  [
    body('role').isIn(['admin', 'analyst', 'user']).withMessage('Недопустимая роль')
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { role } = req.body;
      
      // Проверка результатов валидации
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const user = await db.User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
      
      // Обновление роли пользователя
      await user.update({ role });
      
      res.json({
        message: 'Роль пользователя успешно обновлена',
        user: {
          id: user.id,
          username: user.username,
          role: user.role
        }
      });
    } catch (error) {
      console.error('Ошибка при обновлении роли пользователя:', error);
      res.status(500).json({ message: 'Ошибка сервера при обновлении роли пользователя' });
    }
  }
);

// Блокировка/разблокировка пользователя (только для администраторов)
router.put(
  '/:id/status',
  authMiddleware,
  isAdmin,
  [
    body('isActive').isBoolean().withMessage('Статус должен быть логическим значением')
  ],
  async (req, res) => {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      
      // Проверка результатов валидации
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const user = await db.User.findByPk(id);
      
      if (!user) {
        return res.status(404).json({ message: 'Пользователь не найден' });
      }
      
      // Запрет на блокировку самого себя
      if (req.user.id === id) {
        return res.status(400).json({ message: 'Вы не можете заблокировать самого себя' });
      }
      
      // Обновление статуса пользователя
      await user.update({ isActive });
      
      res.json({
        message: isActive ? 'Пользователь разблокирован' : 'Пользователь заблокирован',
        user: {
          id: user.id,
          username: user.username,
          isActive: user.isActive
        }
      });
    } catch (error) {
      console.error('Ошибка при обновлении статуса пользователя:', error);
      res.status(500).json({ message: 'Ошибка сервера при обновлении статуса пользователя' });
    }
  }
);

// Удаление пользователя (только для администраторов)
router.delete('/:id', authMiddleware, isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    const user = await db.User.findByPk(id);
    
    if (!user) {
      return res.status(404).json({ message: 'Пользователь не найден' });
    }
    
    // Запрет на удаление самого себя
    if (req.user.id === id) {
      return res.status(400).json({ message: 'Вы не можете удалить самого себя' });
    }
    
    // Удаление пользователя
    await user.destroy();
    
    res.json({ message: 'Пользователь успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении пользователя:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении пользователя' });
  }
});

module.exports = router; 