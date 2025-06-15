/**
 * eventRoutes.js - Маршруты для работы с событиями в системе Matrix AI
 * 
 * Этот файл содержит маршруты для управления событиями мониторинга.
 */

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const db = require('../../models');
const authMiddleware = require('../middleware/auth');
const { isAnalyst } = require('../middleware/roles');
const textAnalyzer = require('../../ai/textAnalyzer');

// Получение списка событий с фильтрацией и пагинацией
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      status,
      severity,
      category,
      sourceId,
      startDate,
      endDate,
      search
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Построение условий фильтрации
    const where = {};
    
    if (status) {
      where.status = status;
    }
    
    if (severity) {
      where.severity = severity;
    }
    
    if (category) {
      where.category = category;
    }
    
    if (sourceId) {
      where.sourceId = sourceId;
    }
    
    if (startDate && endDate) {
      where.createdAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.createdAt = {
        [db.Sequelize.Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      where.createdAt = {
        [db.Sequelize.Op.lte]: new Date(endDate)
      };
    }
    
    if (search) {
      where[db.Sequelize.Op.or] = [
        { title: { [db.Sequelize.Op.iLike]: `%${search}%` } },
        { content: { [db.Sequelize.Op.iLike]: `%${search}%` } }
      ];
    }
    
    // Выполнение запроса с пагинацией
    const { count, rows: events } = await db.Event.findAndCountAll({
      where,
      include: [
        {
          model: db.Source,
          as: 'source',
          attributes: ['id', 'name', 'type']
        },
        {
          model: db.User,
          as: 'resolver',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      events,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка при получении списка событий:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении списка событий' });
  }
});

// Получение информации о конкретном событии
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await db.Event.findByPk(id, {
      include: [
        {
          model: db.Source,
          as: 'source',
          attributes: ['id', 'name', 'type', 'url']
        },
        {
          model: db.User,
          as: 'resolver',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ]
    });
    
    if (!event) {
      return res.status(404).json({ message: 'Событие не найдено' });
    }
    
    res.json({ event });
  } catch (error) {
    console.error('Ошибка при получении информации о событии:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении информации о событии' });
  }
});

// Обновление статуса события
router.put(
  '/:id/status',
  authMiddleware,
  [
    body('status').isIn(['new', 'processing', 'resolved', 'false_positive', 'ignored']).withMessage('Недопустимый статус')
  ],
  async (req, res) => {
    try {
      // Проверка результатов валидации
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const { id } = req.params;
      const { status, comment } = req.body;
      
      const event = await db.Event.findByPk(id);
      
      if (!event) {
        return res.status(404).json({ message: 'Событие не найдено' });
      }
      
      // Обновление статуса события
      const updateData = { status };
      
      // Если статус изменился на "processing", устанавливаем время обработки
      if (status === 'processing' && event.status !== 'processing') {
        updateData.processedAt = new Date();
      }
      
      // Если статус изменился на "resolved" или "false_positive", устанавливаем время разрешения и ID пользователя
      if ((status === 'resolved' || status === 'false_positive') && 
          (event.status !== 'resolved' && event.status !== 'false_positive')) {
        updateData.resolvedAt = new Date();
        updateData.resolvedBy = req.user.id;
      }
      
      // Если есть комментарий, добавляем его в метаданные
      if (comment) {
        const metadata = event.metadata || {};
        metadata.comments = metadata.comments || [];
        metadata.comments.push({
          text: comment,
          userId: req.user.id,
          username: req.user.username,
          createdAt: new Date()
        });
        updateData.metadata = metadata;
      }
      
      await event.update(updateData);
      
      res.json({
        message: 'Статус события успешно обновлен',
        event: {
          id: event.id,
          title: event.title,
          status: event.status,
          processedAt: event.processedAt,
          resolvedAt: event.resolvedAt,
          resolvedBy: event.resolvedBy
        }
      });
    } catch (error) {
      console.error('Ошибка при обновлении статуса события:', error);
      res.status(500).json({ message: 'Ошибка сервера при обновлении статуса события' });
    }
  }
);

// Получение статистики по событиям
router.get('/stats/summary', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Построение условий фильтрации по дате
    const where = {};
    
    if (startDate && endDate) {
      where.createdAt = {
        [db.Sequelize.Op.between]: [new Date(startDate), new Date(endDate)]
      };
    } else if (startDate) {
      where.createdAt = {
        [db.Sequelize.Op.gte]: new Date(startDate)
      };
    } else if (endDate) {
      where.createdAt = {
        [db.Sequelize.Op.lte]: new Date(endDate)
      };
    }
    
    // Получение общего количества событий
    const totalCount = await db.Event.count({ where });
    
    // Получение количества событий по статусам
    const statusCounts = await db.Event.count({
      where,
      group: ['status']
    });
    
    // Получение количества событий по уровням серьезности
    const severityCounts = await db.Event.count({
      where,
      group: ['severity']
    });
    
    // Получение количества событий по категориям
    const categoryCounts = await db.Event.count({
      where,
      group: ['category']
    });
    
    // Получение количества событий по источникам
    const sourceCounts = await db.Event.count({
      where,
      group: ['sourceId'],
      include: [
        {
          model: db.Source,
          as: 'source',
          attributes: ['name']
        }
      ]
    });
    
    res.json({
      totalCount,
      byStatus: statusCounts,
      bySeverity: severityCounts,
      byCategory: categoryCounts,
      bySource: sourceCounts
    });
  } catch (error) {
    console.error('Ошибка при получении статистики по событиям:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении статистики по событиям' });
  }
});

// Анализ текста с использованием нейронной сети
router.post('/analyze', authMiddleware, [
  body('text').notEmpty().withMessage('Текст для анализа не может быть пустым')
], async (req, res) => {
  // Проверяем валидацию
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { text, sourceId } = req.body;
    
    // Анализируем текст с помощью нейронной сети
    const analysis = await textAnalyzer.analyzeText(text);
    
    // Если указан sourceId, создаем событие в базе данных
    if (sourceId) {
      const source = await db.Source.findByPk(sourceId);
      if (!source) {
        return res.status(404).json({ message: 'Источник не найден' });
      }
      
      // Определяем категорию и важность на основе анализа
      const category = analysis.classification.topCategory;
      let severity = 'low';
      if (analysis.threatLevel === 'высокий') severity = 'high';
      else if (analysis.threatLevel === 'средний') severity = 'medium';
      
      // Создаем событие
      const event = await db.Event.create({
        title: `Анализ текста: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
        content: text,
        type: 'text',
        category: category.replace('_', ' '),
        severity,
        confidence: analysis.classification.confidence,
        sourceUrl: '',
        status: 'new',
        sourceId,
        metadata: {
          analysis: analysis
        },
        createdBy: req.user.id
      });
      
      // Возвращаем результат анализа и созданное событие
      return res.json({
        analysis,
        event
      });
    }
    
    // Если sourceId не указан, просто возвращаем результат анализа
    res.json({ analysis });
  } catch (error) {
    console.error('Ошибка при анализе текста:', error);
    res.status(500).json({ message: 'Ошибка сервера при анализе текста' });
  }
});

module.exports = router; 