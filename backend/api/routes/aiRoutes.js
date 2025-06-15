/**
 * aiRoutes.js - Маршруты API для работы с нейронными сетями
 * 
 * Этот файл содержит маршруты для управления моделями нейронных сетей,
 * включая обучение, оценку и получение информации о моделях.
 */

const express = require('express');
const router = express.Router();
const { check, validationResult } = require('express-validator');
const auth = require('../middleware/auth');
const roles = require('../middleware/roles');
const textAnalyzer = require('../../ai/textAnalyzer');
const modelTrainer = require('../../ai/modelTrainer');

// Получение информации о модели
router.get('/model/info', auth, async (req, res) => {
  try {
    const report = await modelTrainer.generateModelReport();
    res.json(report);
  } catch (error) {
    console.error('Ошибка при получении информации о модели:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении информации о модели' });
  }
});

// Обучение модели на новых данных
router.post('/model/train', auth, roles.isAdmin, [
  check('trainingData').isArray({ min: 1 }).withMessage('Данные для обучения должны быть непустым массивом'),
  check('trainingData.*.text').notEmpty().withMessage('Текст для обучения не может быть пустым'),
  check('trainingData.*.category').isIn(textAnalyzer.CATEGORIES).withMessage('Неверная категория')
], async (req, res) => {
  // Проверяем валидацию
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { trainingData, options } = req.body;
    
    // Запускаем обучение модели
    const result = await modelTrainer.trainModel(trainingData, options);
    
    if (result.success) {
      res.json({
        message: 'Модель успешно обучена',
        result
      });
    } else {
      res.status(500).json({
        message: 'Ошибка при обучении модели',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Ошибка при обучении модели:', error);
    res.status(500).json({ message: 'Ошибка сервера при обучении модели' });
  }
});

// Оценка модели на тестовых данных
router.post('/model/evaluate', auth, roles.isAdmin, [
  check('testData').isArray({ min: 1 }).withMessage('Тестовые данные должны быть непустым массивом'),
  check('testData.*.text').notEmpty().withMessage('Текст для тестирования не может быть пустым'),
  check('testData.*.category').isIn(textAnalyzer.CATEGORIES).withMessage('Неверная категория')
], async (req, res) => {
  // Проверяем валидацию
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { testData } = req.body;
    
    // Запускаем оценку модели
    const result = await modelTrainer.evaluateModel(testData);
    
    if (result.success) {
      res.json({
        message: 'Модель успешно оценена',
        result
      });
    } else {
      res.status(500).json({
        message: 'Ошибка при оценке модели',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Ошибка при оценке модели:', error);
    res.status(500).json({ message: 'Ошибка сервера при оценке модели' });
  }
});

// Получение списка категорий для классификации
router.get('/categories', auth, (req, res) => {
  try {
    res.json({
      categories: textAnalyzer.CATEGORIES
    });
  } catch (error) {
    console.error('Ошибка при получении списка категорий:', error);
    res.status(500).json({ message: 'Ошибка сервера при получении списка категорий' });
  }
});

// Анализ текста с использованием модели
router.post('/analyze', auth, [
  check('text').notEmpty().withMessage('Текст для анализа не может быть пустым')
], async (req, res) => {
  // Проверяем валидацию
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  
  try {
    const { text } = req.body;
    
    // Анализируем текст
    const analysis = await textAnalyzer.analyzeText(text);
    
    res.json({
      message: 'Текст успешно проанализирован',
      analysis
    });
  } catch (error) {
    console.error('Ошибка при анализе текста:', error);
    res.status(500).json({ message: 'Ошибка сервера при анализе текста' });
  }
});

module.exports = router; 