/**
 * initDb.js - Скрипт инициализации базы данных для системы Matrix AI
 * 
 * Этот скрипт создает таблицы в базе данных на основе моделей Sequelize.
 * Также добавляет начальные данные для работы системы.
 */

const db = require('../models');
const bcrypt = require('bcryptjs');

async function initDatabase() {
  try {
    console.log('Начало инициализации базы данных...');
    
    // Синхронизация моделей с базой данных (создание таблиц)
    await db.sequelize.sync({ force: true });
    console.log('Таблицы базы данных созданы успешно.');
    
    // Создание администратора по умолчанию
    const adminPassword = 'admin123'; // В реальном проекте использовать более безопасный пароль
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(adminPassword, salt);
    
    const admin = await db.User.create({
      username: 'admin',
      email: 'admin@matrixai.com',
      password: hashedPassword,
      firstName: 'Администратор',
      lastName: 'Системы',
      role: 'admin',
      isActive: true
    });
    
    console.log('Администратор по умолчанию создан:', admin.username);
    
    // Создание тестового пользователя
    const userPassword = 'user123';
    const userSalt = await bcrypt.genSalt(10);
    const userHashedPassword = await bcrypt.hash(userPassword, userSalt);
    
    const user = await db.User.create({
      username: 'user',
      email: 'user@matrixai.com',
      password: userHashedPassword,
      firstName: 'Тестовый',
      lastName: 'Пользователь',
      role: 'user',
      isActive: true
    });
    
    console.log('Тестовый пользователь создан:', user.username);
    
    // Создание тестовых источников данных
    const vkSource = await db.Source.create({
      name: 'ВКонтакте - Новости',
      type: 'vkontakte',
      url: 'https://vk.com/feed',
      isActive: true,
      syncFrequency: 30,
      createdBy: admin.id,
      config: {
        groupIds: [1, 2, 3],
        keywords: ['важно', 'срочно', 'внимание']
      }
    });
    
    console.log('Тестовый источник ВКонтакте создан:', vkSource.name);
    
    const telegramSource = await db.Source.create({
      name: 'Telegram - Новости',
      type: 'telegram',
      url: 'https://t.me/news',
      isActive: true,
      syncFrequency: 15,
      createdBy: admin.id,
      config: {
        channelIds: ['news', 'breaking'],
        keywords: ['важно', 'срочно', 'внимание']
      }
    });
    
    console.log('Тестовый источник Telegram создан:', telegramSource.name);
    
    // Создание тестовых событий
    const event1 = await db.Event.create({
      title: 'Тестовое событие 1',
      content: 'Это тестовое событие для проверки работы системы',
      type: 'text',
      category: 'информация',
      severity: 'low',
      confidence: 0.95,
      sourceUrl: 'https://vk.com/wall-1_123456',
      status: 'new',
      sourceId: vkSource.id
    });
    
    console.log('Тестовое событие создано:', event1.title);
    
    const event2 = await db.Event.create({
      title: 'Тестовое событие 2',
      content: 'Это тестовое событие с высоким приоритетом',
      type: 'text',
      category: 'угроза',
      severity: 'high',
      confidence: 0.87,
      sourceUrl: 'https://t.me/news/123',
      status: 'processing',
      sourceId: telegramSource.id
    });
    
    console.log('Тестовое событие создано:', event2.title);
    
    // Создание тестового отчета
    const report = await db.Report.create({
      title: 'Ежедневный отчет',
      description: 'Автоматически сгенерированный ежедневный отчет',
      type: 'daily',
      format: 'pdf',
      status: 'completed',
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // вчера
      endDate: new Date(), // сегодня
      generatedAt: new Date(),
      isScheduled: true,
      schedule: '0 0 * * *', // каждый день в полночь
      createdBy: admin.id
    });
    
    console.log('Тестовый отчет создан:', report.title);
    
    // Связывание отчета с событиями
    await report.addEvent(event1);
    await report.addEvent(event2);
    
    console.log('События добавлены в отчет');
    
    console.log('Инициализация базы данных завершена успешно!');
    
  } catch (error) {
    console.error('Ошибка при инициализации базы данных:', error);
  } finally {
    process.exit();
  }
}

// Запуск инициализации
initDatabase(); 