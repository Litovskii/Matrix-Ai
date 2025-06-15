/**
 * reportRoutes.js - Маршруты для работы с отчетами в системе Matrix AI
 * 
 * Этот файл содержит маршруты для управления отчетами системы мониторинга.
 */

const express = require('express');
const router = express.Router();
const { body, query, validationResult } = require('express-validator');
const db = require('../../models');
const authMiddleware = require('../middleware/auth');
const { isAnalyst } = require('../middleware/roles');

// Получение списка отчетов с фильтрацией и пагинацией
router.get('/', authMiddleware, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      type,
      status,
      startDate,
      endDate
    } = req.query;
    
    const offset = (page - 1) * limit;
    
    // Построение условий фильтрации
    const where = {};
    
    if (type) {
      where.type = type;
    }
    
    if (status) {
      where.status = status;
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
    
    // Выполнение запроса с пагинацией
    const { count, rows: reports } = await db.Report.findAndCountAll({
      where,
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'username', 'firstName', 'lastName']
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset)
    });
    
    res.json({
      reports,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Ошибка при получении списка отчетов:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении списка отчетов' });
  }
});

// Получение информации о конкретном отчете
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await db.Report.findByPk(id, {
      include: [
        {
          model: db.User,
          as: 'creator',
          attributes: ['id', 'username', 'firstName', 'lastName']
        },
        {
          model: db.Event,
          through: 'EventReports',
          attributes: ['id', 'title', 'severity', 'category', 'createdAt']
        },
        {
          model: db.Source,
          through: 'ReportSources',
          attributes: ['id', 'name', 'type']
        }
      ]
    });
    
    if (!report) {
      return res.status(404).json({ message: 'Отчет не найден' });
    }
    
    res.json({ report });
  } catch (error) {
    console.error('Ошибка при получении информации об отчете:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении информации об отчете' });
  }
});

// Создание нового отчета
router.post(
  '/',
  authMiddleware,
  isAnalyst,
  [
    body('title').notEmpty().withMessage('Название отчета обязательно'),
    body('type').isIn(['daily', 'weekly', 'monthly', 'custom']).withMessage('Недопустимый тип отчета'),
    body('format').isIn(['pdf', 'html', 'json', 'csv']).withMessage('Недопустимый формат отчета'),
    body('startDate').optional().isISO8601().withMessage('Неверный формат начальной даты'),
    body('endDate').optional().isISO8601().withMessage('Неверный формат конечной даты'),
    body('isScheduled').optional().isBoolean().withMessage('Флаг расписания должен быть логическим значением'),
    body('schedule').optional().isString().withMessage('Расписание должно быть строкой в формате cron')
  ],
  async (req, res) => {
    try {
      // Проверка результатов валидации
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      
      const {
        title,
        description,
        type,
        format,
        parameters,
        startDate,
        endDate,
        isScheduled,
        schedule,
        sourceIds,
        eventIds
      } = req.body;
      
      // Создание нового отчета
      const report = await db.Report.create({
        title,
        description,
        type,
        format,
        parameters,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        isScheduled: isScheduled || false,
        schedule,
        status: 'pending',
        createdBy: req.user.id
      });
      
      // Связывание отчета с источниками данных
      if (sourceIds && sourceIds.length > 0) {
        const sources = await db.Source.findAll({
          where: {
            id: {
              [db.Sequelize.Op.in]: sourceIds
            }
          }
        });
        
        await report.setSources(sources);
      }
      
      // Связывание отчета с событиями
      if (eventIds && eventIds.length > 0) {
        const events = await db.Event.findAll({
          where: {
            id: {
              [db.Sequelize.Op.in]: eventIds
            }
          }
        });
        
        await report.setEvents(events);
      }
      
      // Здесь можно добавить логику для запуска генерации отчета
      // TODO: Реализовать запуск генерации отчета
      
      res.status(201).json({
        message: 'Отчет успешно создан',
        report: {
          id: report.id,
          title: report.title,
          type: report.type,
          format: report.format,
          status: report.status
        }
      });
    } catch (error) {
      console.error('Ошибка при создании отчета:', error);
      res.status(500).json({ message: 'Ошибка сервера при создании отчета' });
    }
  }
);

// Запуск генерации отчета
router.post('/:id/generate', authMiddleware, isAnalyst, async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await db.Report.findByPk(id);
    
    if (!report) {
      return res.status(404).json({ message: 'Отчет не найден' });
    }
    
    if (report.status === 'generating') {
      return res.status(400).json({ message: 'Отчет уже генерируется' });
    }
    
    // Обновление статуса отчета
    await report.update({
      status: 'generating'
    });
    
    // Здесь будет логика генерации отчета
    // TODO: Реализовать генерацию отчета
    
    // В реальном проекте здесь будет асинхронный запуск генерации отчета
    
    res.json({
      message: 'Генерация отчета запущена',
      report: {
        id: report.id,
        title: report.title,
        status: report.status
      }
    });
  } catch (error) {
    console.error('Ошибка при запуске генерации отчета:', error);
    res.status(500).json({ message: 'Ошибка сервера при запуске генерации отчета' });
  }
});

// Удаление отчета
router.delete('/:id', authMiddleware, isAnalyst, async (req, res) => {
  try {
    const { id } = req.params;
    
    const report = await db.Report.findByPk(id);
    
    if (!report) {
      return res.status(404).json({ message: 'Отчет не найден' });
    }
    
    if (report.status === 'generating') {
      return res.status(400).json({ message: 'Невозможно удалить отчет, который сейчас генерируется' });
    }
    
    // Удаление отчета
    await report.destroy();
    
    res.json({ message: 'Отчет успешно удален' });
  } catch (error) {
    console.error('Ошибка при удалении отчета:', error);
    res.status(500).json({ message: 'Ошибка сервера при удалении отчета' });
  }
});

// Получение списка шаблонов отчетов
router.get('/templates/list', authMiddleware, async (req, res) => {
  try {
    // В реальном проекте здесь будет запрос к базе данных для получения шаблонов отчетов
    // Пока возвращаем фиксированный список шаблонов
    
    const templates = [
      {
        id: 'daily',
        name: 'Ежедневный отчет',
        description: 'Отчет о событиях за последние 24 часа',
        type: 'daily',
        format: 'pdf'
      },
      {
        id: 'weekly',
        name: 'Еженедельный отчет',
        description: 'Отчет о событиях за последнюю неделю',
        type: 'weekly',
        format: 'pdf'
      },
      {
        id: 'monthly',
        name: 'Ежемесячный отчет',
        description: 'Отчет о событиях за последний месяц',
        type: 'monthly',
        format: 'pdf'
      },
      {
        id: 'threats',
        name: 'Отчет по угрозам',
        description: 'Отчет по выявленным угрозам',
        type: 'custom',
        format: 'pdf'
      }
    ];
    
    res.json({ templates });
  } catch (error) {
    console.error('Ошибка при получении списка шаблонов отчетов:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении списка шаблонов отчетов' });
  }
});

module.exports = router; 