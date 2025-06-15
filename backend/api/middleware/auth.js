/**
 * auth.js - Middleware для аутентификации в системе Matrix AI
 * 
 * Этот файл содержит middleware для проверки JWT-токена и аутентификации пользователей.
 */

const jwt = require('jsonwebtoken');
const db = require('../../models');

/**
 * Middleware для проверки JWT-токена
 * @param {Object} req - Объект запроса Express
 * @param {Object} res - Объект ответа Express
 * @param {Function} next - Функция для перехода к следующему middleware
 */
module.exports = async function(req, res, next) {
  try {
    // Получение токена из заголовка Authorization
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'Требуется аутентификация' });
    }
    
    // Проверка токена
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your_jwt_secret_key_here');
    
    // Поиск пользователя
    const user = await db.User.findByPk(decoded.id, {
      attributes: { exclude: ['password'] }
    });
    
    if (!user) {
      return res.status(401).json({ message: 'Пользователь не найден или токен недействителен' });
    }
    
    if (!user.isActive) {
      return res.status(403).json({ message: 'Аккаунт деактивирован' });
    }
    
    // Добавление данных пользователя в объект запроса
    req.user = user;
    req.token = token;
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Срок действия токена истек' });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ message: 'Недействительный токен' });
    }
    
    console.error('Ошибка аутентификации:', error);
    res.status(500).json({ message: 'Ошибка сервера при аутентификации' });
  }
}; 