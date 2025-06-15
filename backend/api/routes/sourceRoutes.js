/**
 * sourceRoutes.js - Маршруты для работы с источниками данных в системе Matrix AI
 * 
 * Этот файл содержит маршруты для управления источниками данных системы.
 */

const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const db = require('../../models');
const authMiddleware = require('../middleware/auth');
const { isAnalyst } = require('../middleware/roles');

// Получение списка источников данных
router.get('/', authMiddleware, async (req, res) => {
  try {
    const sources = await db.Source.findAll({
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });
    
    res.json({ sources });
  } catch (error) {
    console.error('Ошибка при получении списка источников:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении списка источников' });
  }
});

// Получение информации о конкретном источнике
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const source = await db.Source.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!source) {
      return res.status(404).json({ message: 'Источник не найден' });
    }
    
    res.json({ source });
  } catch (error) {
    console.error('Ошибка при получении информации об источнике:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении информации об источнике' });
  }
});

// Создание нового источника данных
router.post(
  '/',
  authMiddleware,
  isAnalyst,
  [
    body('name').notEmpty().withMessage('Имя источника обязательно'),
    body('type').isIn(['vkontakte', 'telegram', 'twitter', 'other']).withMessage('Недопустимый тип источника'),
    body('url').optional().isURL().withMessage('Введите корректный URL'),
    body('syncFrequency').optional().isInt({ min: 1 }).withMessage('Частота синхронизации должна быть положительным числом')
  ],
  async (req, res) => {
    try {
      // Проверка результатов валидации
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { name, type, url, apiKey, credentials, syncFrequency, config } = req.body;
      
      // Создание нового источника
      const source = await db.Source.create({
        name,
        type,
        url,
        apiKey,
        credentials,
        syncFrequency: syncFrequency || 60,
        config,
        isActive: true,
        createdBy: req.user.id
      });
      
      res.status(201).json({
        message: 'Источник данных успешно создан',
        source
      });
    } catch (error) {
      console.error('Ошибка при создании источника:', error);
      res.status(500).json({ message: 'Ошибка сервера при создании источника' });
    }
  }
);

// Обновление информации об источнике
router.put(
  '/:id',
  authMiddleware,
  isAnalyst,
  [
    body('name').optional().notEmpty().withMessage('Имя источника не может быть пустым'),
    body('type').optional().isIn(['vkontakte', 'telegram', 'twitter', 'other']).withMessage('Недопустимый тип источника'),
    body('url').optional().isURL().withMessage('Введите корректный URL'),
    body('syncFrequency').optional().isInt({ min: 1 }).withMessage('Частота синхронизации должна быть положительным числом')
  ],
  async (req, res) => {
    try {
      // Проверка результатов валидации
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      const { name, type, url, apiKey, credentials, syncFrequency, config } = req.body;
      
      const source = await db.Source.findByPk(id);
      
      if (!source) {
        return res.status(404).json({ message: 'Источник не найден' });
      }
      
      // Обновление информации об источнике
      await source.update({
        name: name !== undefined ? name : source.name,
        type: type !== undefined ? type : source.type,
        url: url !== undefined ? url : source.url,
        apiKey: apiKey !== undefined ? apiKey : source.apiKey,
        credentials: credentials !== undefined ? credentials : source.credentials,
        syncFrequency: syncFrequency !== undefined ? syncFrequency : source.syncFrequency,
        config: config !== undefined ? config : source.config
      });
      
      res.json({
        message: 'Информация об источнике успешно обновлена',
        source
      });
    } catch (error) {
      console.error('Ошибка при обновлении информации об источнике:', error);
      res.status(500).json({ message: 'Ошибка сервера при обновлении информации об источнике' });
    }
  }
);

// Активация/деактивация источника
router.put(
  '/:id/status',
  authMiddleware,
  isAnalyst,
  [
    body('isActive').isBoolean().withMessage('Статус должен быть логическим значением')
  ],
  async (req, res) => {
    try {
      // Проверка результатов валидации
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      const { isActive } = req.body;
      
      const source = await db.Source.findByPk(id);
      
      if (!source) {
        return res.status(404).json({ message: 'Источник не найден' });
      }
      
      // Обновление статуса источника
      await source.update({ isActive });
      
      res.json({
        message: isActive ? 'Источник активирован' : 'Источник деактивирован',
        source: {
          id: source.id,
          name: source.name,
          isActive: source.isActive
        }
      });
    } catch (error) {
      console.error('Ошибка при обновлении статуса источника:', error);
      res.status(500).json({ message: 'Ошибка сервера при обновлении статуса источника' });
    }
  }
);

// Удаление источника
router.delete('/:id', authMiddleware, isAnalyst, async (req, res) => {
  try {
    const { id } = req.params;
    
    const source = await db.Source.findByPk(id);
    
    if (!source) {
      return res.status(404).json({ message: 'Источник не найден' });
    }
    
    // Удаление источника
    await source.destroy();
    
    res.json({ message: 'Источник успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении источника:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении источника' });
  }
});

// Синхронизация данных из источника
router.post('/:id/sync', authMiddleware, isAnalyst, async (req, res) => {
  try {
    const { id } = req.params;
    
    const source = await db.Source.findByPk(id);
    
    if (!source) {
      return res.status(404).json({ message: 'Источник не найден' });
    }
    
    if (!source.isActive) {
      return res.status(400).json({ message: 'Невозможно синхронизировать неактивный источник' });
    }
    
    // Здесь будет логика синхронизации данных из источника
    // TODO: Реализовать синхронизацию с использованием соответствующего сервиса
    
    // Обновление времени последней синхронизации
    await source.update({ lastSyncDate: new Date() });
    
    res.json({
      message: 'Синхронизация запущена успешно',
      source: {
        id: source.id,
        name: source.name,
        lastSyncDate: source.lastSyncDate
      }
    });
  } catch (error) {
    console.error('Ошибка при синхронизации источника:', error);
    res.status(500).json({ message: 'Ошибка сервера при синхронизации источника' });
  }
});

module.exports = router; 