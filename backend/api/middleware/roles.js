/**
 * roles.js - Middleware для проверки ролей в системе Matrix AI
 * 
 * Этот файл содержит middleware для проверки ролей пользователей.
 * Используется для ограничения доступа к определенным маршрутам API.
 */

/**
 * Middleware для проверки роли пользователя
 * @param {string|string[]} roles - Роль или массив ролей, которые имеют доступ
 * @returns {Function} Middleware-функция
 */
function checkRole(roles) {
  // Преобразование одной роли в массив
  if (typeof roles === 'string') {
    roles = [roles];
  }
  
  return function(req, res, next) {
    // Проверка наличия пользователя в запросе (должен быть добавлен auth middleware)
    if (!req.user) {
      return res.status(401).json({ message: 'Требуется аутентификация' });
    }
    
    // Проверка роли пользователя
    if (roles.includes(req.user.role)) {
      next();
    } else {
      res.status(403).json({
        message: 'Доступ запрещен. Недостаточно прав для выполнения операции.'
      });
    }
  };
}

/**
 * Middleware для проверки роли администратора
 */
function isAdmin(req, res, next) {
  return checkRole('admin')(req, res, next);
}

/**
 * Middleware для проверки роли аналитика
 */
function isAnalyst(req, res, next) {
  return checkRole(['admin', 'analyst'])(req, res, next);
}

/**
 * Middleware для проверки, является ли пользователь владельцем ресурса
 * @param {Function} getResourceOwnerId - Функция для получения ID владельца ресурса
 * @returns {Function} Middleware-функция
 */
function isOwner(getResourceOwnerId) {
  return async function(req, res, next) {
    try {
      // Проверка наличия пользователя в запросе
      if (!req.user) {
        return res.status(401).json({ message: 'Требуется аутентификация' });
      }
      
      // Если пользователь админ, разрешаем доступ
      if (req.user.role === 'admin') {
        return next();
      }
      
      // Получение ID владельца ресурса
      const ownerId = await getResourceOwnerId(req);
      
      // Проверка, является ли текущий пользователь владельцем
      if (req.user.id === ownerId) {
        next();
      } else {
        res.status(403).json({
          message: 'Доступ запрещен. Вы не являетесь владельцем этого ресурса.'
        });
      }
    } catch (error) {
      console.error('Ошибка при проверке владельца ресурса:', error);
      res.status(500).json({ message: 'Ошибка сервера при проверке доступа' });
    }
  };
}

module.exports = {
  checkRole,
  isAdmin,
  isAnalyst,
  isOwner
}; 