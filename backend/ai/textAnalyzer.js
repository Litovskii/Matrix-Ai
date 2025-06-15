/**
 * textAnalyzer.js - Модуль анализа текста для системы Matrix AI
 * 
 * Этот файл содержит функции для анализа текстового контента с использованием нейронных сетей.
 * Включает в себя классификацию текста, определение тональности и выявление потенциальных угроз.
 */

const tf = require('@tensorflow/tfjs-node');
const natural = require('natural');
const { WordTokenizer } = natural;
const tokenizer = new WordTokenizer();
const fs = require('fs');
const path = require('path');

// Пути к моделям и данным
const MODEL_PATH = path.join(__dirname, '../models/text_classifier');
const VOCAB_PATH = path.join(__dirname, '../models/vocabulary.json');

// Категории для классификации
const CATEGORIES = [
  'нейтральный',
  'угроза_безопасности',
  'финансовый_риск',
  'социальная_напряженность',
  'экстремизм',
  'информационная_атака'
];

// Максимальная длина последовательности для входных данных
const MAX_SEQUENCE_LENGTH = 100;

// Словарь для токенизации
let vocabulary = {};
let model = null;

/**
 * Загрузка модели и словаря
 */
async function loadModel() {
  try {
    // Проверяем существование директории и файлов
    if (!fs.existsSync(MODEL_PATH)) {
      console.warn('Модель не найдена. Будет использована базовая модель.');
      // В реальном проекте здесь можно загрузить модель с сервера или создать базовую
      await createBaseModel();
      return;
    }

    // Загружаем словарь
    if (fs.existsSync(VOCAB_PATH)) {
      vocabulary = JSON.parse(fs.readFileSync(VOCAB_PATH, 'utf-8'));
      console.log('Словарь загружен успешно. Размер словаря:', Object.keys(vocabulary).length);
    } else {
      console.warn('Словарь не найден. Будет создан новый словарь.');
      vocabulary = createBaseVocabulary();
      fs.writeFileSync(VOCAB_PATH, JSON.stringify(vocabulary), 'utf-8');
    }

    // Загружаем модель
    model = await tf.loadLayersModel(`file://${MODEL_PATH}/model.json`);
    console.log('Модель загружена успешно');
  } catch (error) {
    console.error('Ошибка при загрузке модели:', error);
    await createBaseModel();
  }
}

/**
 * Создание базовой модели при отсутствии предобученной
 */
async function createBaseModel() {
  console.log('Создание базовой модели...');
  
  // Создаем простую модель для классификации текста
  model = tf.sequential();
  
  // Добавляем слои
  model.add(tf.layers.embedding({
    inputDim: 10000,  // Размер словаря
    outputDim: 128,   // Размерность эмбеддинга
    inputLength: MAX_SEQUENCE_LENGTH
  }));
  
  model.add(tf.layers.dropout(0.2));
  
  model.add(tf.layers.conv1d({
    filters: 64,
    kernelSize: 5,
    padding: 'same',
    activation: 'relu'
  }));
  
  model.add(tf.layers.globalMaxPooling1d());
  model.add(tf.layers.dense({ units: 64, activation: 'relu' }));
  model.add(tf.layers.dropout(0.2));
  model.add(tf.layers.dense({ units: CATEGORIES.length, activation: 'softmax' }));
  
  // Компилируем модель
  model.compile({
    optimizer: 'adam',
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  console.log('Базовая модель создана');
  
  // Создаем директорию для сохранения модели, если она не существует
  if (!fs.existsSync(path.dirname(MODEL_PATH))) {
    fs.mkdirSync(path.dirname(MODEL_PATH), { recursive: true });
  }
  
  // Сохраняем модель
  await model.save(`file://${MODEL_PATH}`);
  console.log('Базовая модель сохранена');
  
  // Создаем базовый словарь
  vocabulary = createBaseVocabulary();
  fs.writeFileSync(VOCAB_PATH, JSON.stringify(vocabulary), 'utf-8');
}

/**
 * Создание базового словаря с наиболее распространенными русскими словами
 */
function createBaseVocabulary() {
  // В реальном проекте здесь был бы полноценный словарь
  // Для демонстрации используем небольшой набор слов
  const baseWords = [
    'угроза', 'опасность', 'безопасность', 'атака', 'защита', 'система',
    'информация', 'данные', 'пользователь', 'сеть', 'взлом', 'доступ',
    'вирус', 'уязвимость', 'риск', 'мониторинг', 'инцидент', 'событие',
    'финансы', 'деньги', 'экономика', 'кризис', 'банк', 'счет', 'перевод',
    'социальный', 'общество', 'протест', 'митинг', 'конфликт', 'напряженность',
    'экстремизм', 'терроризм', 'радикальный', 'оружие', 'насилие', 'агрессия'
  ];
  
  const vocab = {};
  baseWords.forEach((word, index) => {
    vocab[word] = index + 1; // Индексация с 1, 0 зарезервирован для padding
  });
  
  return vocab;
}

/**
 * Предобработка текста
 * @param {string} text - Исходный текст
 * @returns {string[]} - Массив токенов
 */
function preprocessText(text) {
  // Приводим к нижнему регистру
  const lowerText = text.toLowerCase();
  
  // Токенизация
  const tokens = tokenizer.tokenize(lowerText);
  
  // Удаление стоп-слов и пунктуации можно добавить при необходимости
  
  return tokens;
}

/**
 * Преобразование текста в последовательность чисел для подачи в модель
 * @param {string} text - Исходный текст
 * @returns {number[]} - Числовая последовательность
 */
function textToSequence(text) {
  const tokens = preprocessText(text);
  const sequence = [];
  
  // Преобразуем токены в числа согласно словарю
  for (let i = 0; i < tokens.length && i < MAX_SEQUENCE_LENGTH; i++) {
    const token = tokens[i];
    // Если токен есть в словаре, используем его индекс, иначе 0 (unknown)
    sequence.push(vocabulary[token] || 0);
  }
  
  // Дополняем последовательность нулями до MAX_SEQUENCE_LENGTH
  while (sequence.length < MAX_SEQUENCE_LENGTH) {
    sequence.push(0);
  }
  
  return sequence;
}

/**
 * Классификация текста
 * @param {string} text - Текст для классификации
 * @returns {Object} - Результаты классификации с вероятностями
 */
async function classifyText(text) {
  if (!model) {
    await loadModel();
  }
  
  // Преобразуем текст в последовательность
  const sequence = textToSequence(text);
  
  // Создаем тензор и делаем предсказание
  const inputTensor = tf.tensor2d([sequence], [1, MAX_SEQUENCE_LENGTH]);
  const prediction = await model.predict(inputTensor).array();
  
  // Формируем результат
  const result = {};
  CATEGORIES.forEach((category, index) => {
    result[category] = prediction[0][index];
  });
  
  // Определяем наиболее вероятную категорию
  let maxCategory = CATEGORIES[0];
  let maxProb = prediction[0][0];
  
  for (let i = 1; i < CATEGORIES.length; i++) {
    if (prediction[0][i] > maxProb) {
      maxProb = prediction[0][i];
      maxCategory = CATEGORIES[i];
    }
  }
  
  return {
    text,
    categories: result,
    topCategory: maxCategory,
    confidence: maxProb,
    isHighRisk: maxCategory !== 'нейтральный' && maxProb > 0.7
  };
}

/**
 * Анализ тональности текста
 * @param {string} text - Текст для анализа
 * @returns {Object} - Результаты анализа тональности
 */
function analyzeSentiment(text) {
  // В реальном проекте здесь был бы полноценный анализ тональности
  // Для демонстрации используем простой алгоритм на основе ключевых слов
  
  const tokens = preprocessText(text);
  
  // Словари позитивных и негативных слов
  const positiveWords = ['хорошо', 'отлично', 'успешно', 'положительно', 'безопасно'];
  const negativeWords = ['плохо', 'угроза', 'опасность', 'негативно', 'риск', 'атака'];
  
  let positiveCount = 0;
  let negativeCount = 0;
  
  tokens.forEach(token => {
    if (positiveWords.includes(token)) positiveCount++;
    if (negativeWords.includes(token)) negativeCount++;
  });
  
  const total = positiveCount + negativeCount || 1; // Избегаем деления на ноль
  const sentimentScore = (positiveCount - negativeCount) / total;
  
  let sentiment;
  if (sentimentScore > 0.3) sentiment = 'позитивный';
  else if (sentimentScore < -0.3) sentiment = 'негативный';
  else sentiment = 'нейтральный';
  
  return {
    text,
    sentiment,
    score: sentimentScore,
    positive: positiveCount,
    negative: negativeCount
  };
}

/**
 * Комплексный анализ текста
 * @param {string} text - Текст для анализа
 * @returns {Promise<Object>} - Результаты анализа
 */
async function analyzeText(text) {
  const classification = await classifyText(text);
  const sentiment = analyzeSentiment(text);
  
  // Определение общего уровня угрозы
  let threatLevel = 'низкий';
  if (classification.isHighRisk && sentiment.sentiment === 'негативный') {
    threatLevel = 'высокий';
  } else if (classification.isHighRisk || sentiment.sentiment === 'негативный') {
    threatLevel = 'средний';
  }
  
  return {
    text,
    classification,
    sentiment,
    threatLevel,
    timestamp: new Date().toISOString()
  };
}

// Загружаем модель при инициализации модуля
loadModel().catch(console.error);

module.exports = {
  analyzeText,
  classifyText,
  analyzeSentiment,
  loadModel,
  CATEGORIES
}; 