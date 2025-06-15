/**
 * modelTrainer.js - Модуль для обучения моделей нейронных сетей
 * 
 * Этот файл содержит функции для обучения и дообучения моделей нейронных сетей
 * на новых данных для улучшения точности прогнозирования.
 */

const tf = require('@tensorflow/tfjs-node');
const fs = require('fs');
const path = require('path');
const textAnalyzer = require('./textAnalyzer');

// Пути к моделям и данным
const MODEL_PATH = path.join(__dirname, '../models/text_classifier');
const VOCAB_PATH = path.join(__dirname, '../models/vocabulary.json');
const TRAINING_DATA_PATH = path.join(__dirname, '../models/training_data.json');

/**
 * Подготовка данных для обучения
 * @param {Array} trainingData - Массив объектов {text, category}
 * @returns {Object} - Подготовленные данные для обучения
 */
async function prepareTrainingData(trainingData) {
  // Загружаем словарь
  let vocabulary = {};
  if (fs.existsSync(VOCAB_PATH)) {
    vocabulary = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf-8'));
  } else {
    throw new Error('Словарь не найден. Сначала инициализируйте модель.');
  }
  
  // Преобразуем тексты в последовательности
  const sequences = [];
  const labels = [];
  
  for (const item of trainingData) {
    const tokens = textAnalyzer.preprocessText(item.text);
    const sequence = [];
    
    // Преобразуем токены в числа согласно словарю
    for (let i = 0; i < tokens.length && i < textAnalyzer.MAX_SEQUENCE_LENGTH; i++) {
      const token = tokens[i];
      // Если токен есть в словаре, используем его индекс, иначе добавляем новый
      if (vocabulary[token]) {
        sequence.push(vocabulary[token]);
      } else {
        // Добавляем новое слово в словарь
        const newIndex = Object.keys(vocabulary).length + 1;
        vocabulary[token] = newIndex;
        sequence.push(newIndex);
      }
    }
    
    // Дополняем последовательность нулями до MAX_SEQUENCE_LENGTH
    while (sequence.length < textAnalyzer.MAX_SEQUENCE_LENGTH) {
      sequence.push(0);
    }
    
    sequences.push(sequence);
    
    // Создаем one-hot вектор для метки
    const label = new Array(textAnalyzer.CATEGORIES.length).fill(0);
    const categoryIndex = textAnalyzer.CATEGORIES.indexOf(item.category);
    if (categoryIndex !== -1) {
      label[categoryIndex] = 1;
    } else {
      console.warn(`Неизвестная категория: ${item.category}`);
      continue;
    }
    
    labels.push(label);
  }
  
  // Сохраняем обновленный словарь
  fs.writeFileSync(VOCAB_PATH, JSON.stringify(vocabulary), 'utf-8');
  
  return {
    sequences: tf.tensor2d(sequences, [sequences.length, textAnalyzer.MAX_SEQUENCE_LENGTH]),
    labels: tf.tensor2d(labels, [labels.length, textAnalyzer.CATEGORIES.length]),
    vocabulary
  };
}

/**
 * Обучение модели на новых данных
 * @param {Array} trainingData - Массив объектов {text, category}
 * @param {Object} options - Параметры обучения
 * @returns {Promise<Object>} - Результаты обучения
 */
async function trainModel(trainingData, options = {}) {
  try {
    console.log('Начало обучения модели...');
    
    // Параметры обучения по умолчанию
    const defaultOptions = {
      epochs: 10,
      batchSize: 32,
      validationSplit: 0.2,
      learningRate: 0.001,
      saveModel: true
    };
    
    const trainOptions = { ...defaultOptions, ...options };
    
    // Загружаем существующую модель
    let model;
    try {
      model = await tf.loadLayersModel(`file://${MODEL_PATH}/model.json`);
      console.log('Существующая модель загружена успешно');
    } catch (error) {
      console.error('Ошибка при загрузке модели:', error);
      throw new Error('Не удалось загрузить модель. Сначала инициализируйте модель.');
    }
    
    // Подготавливаем данные для обучения
    const { sequences, labels } = await prepareTrainingData(trainingData);
    
    // Компилируем модель с новой скоростью обучения
    model.compile({
      optimizer: tf.train.adam(trainOptions.learningRate),
      loss: 'categoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    // Обучаем модель
    const history = await model.fit(sequences, labels, {
      epochs: trainOptions.epochs,
      batchSize: trainOptions.batchSize,
      validationSplit: trainOptions.validationSplit,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Эпоха ${epoch + 1}/${trainOptions.epochs} - потери: ${logs.loss.toFixed(4)}, точность: ${logs.acc.toFixed(4)}`);
        }
      }
    });
    
    // Сохраняем модель, если нужно
    if (trainOptions.saveModel) {
      await model.save(`file://${MODEL_PATH}`);
      console.log('Обновленная модель сохранена');
      
      // Сохраняем данные для обучения для истории
      let existingData = [];
      if (fs.existsSync(TRAINING_DATA_PATH)) {
        existingData = JSON.parse(fs.readFileSync(TRAINING_DATA_PATH, 'utf-8'));
      }
      
      // Добавляем новые данные и сохраняем
      const updatedData = [...existingData, ...trainingData];
      fs.writeFileSync(TRAINING_DATA_PATH, JSON.stringify(updatedData), 'utf-8');
      console.log(`Данные для обучения сохранены. Всего примеров: ${updatedData.length}`);
    }
    
    // Возвращаем результаты обучения
    return {
      success: true,
      epochs: trainOptions.epochs,
      finalLoss: history.history.loss[history.history.loss.length - 1],
      finalAccuracy: history.history.acc[history.history.acc.length - 1],
      history: history.history
    };
  } catch (error) {
    console.error('Ошибка при обучении модели:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Оценка качества модели на тестовых данных
 * @param {Array} testData - Массив объектов {text, category}
 * @returns {Promise<Object>} - Результаты оценки
 */
async function evaluateModel(testData) {
  try {
    console.log('Оценка качества модели...');
    
    // Загружаем модель
    let model;
    try {
      model = await tf.loadLayersModel(`file://${MODEL_PATH}/model.json`);
    } catch (error) {
      console.error('Ошибка при загрузке модели:', error);
      throw new Error('Не удалось загрузить модель. Сначала инициализируйте модель.');
    }
    
    // Подготавливаем данные для тестирования
    const { sequences, labels } = await prepareTrainingData(testData);
    
    // Оцениваем модель
    const evaluation = await model.evaluate(sequences, labels);
    
    // Получаем предсказания для расчета метрик по категориям
    const predictions = await model.predict(sequences).array();
    
    // Преобразуем предсказания и истинные метки в индексы категорий
    const predIndices = predictions.map(pred => {
      return pred.indexOf(Math.max(...pred));
    });
    
    const trueIndices = await labels.argMax(1).array();
    
    // Рассчитываем метрики по каждой категории
    const categoryMetrics = {};
    textAnalyzer.CATEGORIES.forEach((category, idx) => {
      const tp = predIndices.filter((pred, i) => pred === idx && trueIndices[i] === idx).length;
      const fp = predIndices.filter((pred, i) => pred === idx && trueIndices[i] !== idx).length;
      const fn = predIndices.filter((pred, i) => pred !== idx && trueIndices[i] === idx).length;
      
      const precision = tp / (tp + fp) || 0;
      const recall = tp / (tp + fn) || 0;
      const f1 = 2 * (precision * recall) / (precision + recall) || 0;
      
      categoryMetrics[category] = {
        precision: precision.toFixed(4),
        recall: recall.toFixed(4),
        f1: f1.toFixed(4),
        samples: trueIndices.filter(idx => idx === idx).length
      };
    });
    
    // Возвращаем результаты оценки
    return {
      success: true,
      loss: evaluation[0].dataSync()[0],
      accuracy: evaluation[1].dataSync()[0],
      categoryMetrics,
      samplesCount: testData.length
    };
  } catch (error) {
    console.error('Ошибка при оценке модели:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Генерация отчета о производительности модели
 * @returns {Promise<Object>} - Отчет о производительности
 */
async function generateModelReport() {
  try {
    // Проверяем наличие данных для обучения
    if (!fs.existsSync(TRAINING_DATA_PATH)) {
      return {
        success: false,
        error: 'Данные для обучения не найдены'
      };
    }
    
    const trainingData = JSON.parse(fs.readFileSync(TRAINING_DATA_PATH, 'utf-8'));
    
    // Статистика по категориям
    const categoryCounts = {};
    textAnalyzer.CATEGORIES.forEach(category => {
      categoryCounts[category] = trainingData.filter(item => item.category === category).length;
    });
    
    // Загружаем словарь
    let vocabulary = {};
    if (fs.existsSync(VOCAB_PATH)) {
      vocabulary = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf-8'));
    }
    
    // Информация о модели
    let modelInfo = {
      exists: false,
      size: 0,
      lastModified: null
    };
    
    if (fs.existsSync(`${MODEL_PATH}/model.json`)) {
      const stats = fs.statSync(`${MODEL_PATH}/model.json`);
      modelInfo = {
        exists: true,
        size: stats.size,
        lastModified: stats.mtime
      };
    }
    
    return {
      success: true,
      trainingDataCount: trainingData.length,
      categoryCounts,
      vocabularySize: Object.keys(vocabulary).length,
      modelInfo
    };
  } catch (error) {
    console.error('Ошибка при генерации отчета о модели:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  trainModel,
  evaluateModel,
  generateModelReport
}; 