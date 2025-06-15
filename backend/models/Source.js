/**
 * Source.js - Модель источника данных для системы Matrix AI
 * 
 * Этот файл содержит определение модели источника данных (социальной сети).
 * Включает в себя поля, методы и связи с другими моделями.
 */

module.exports = function(sequelize, DataTypes) {
  const Source = sequelize.define('Source', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false
    },
    type: {
      type: DataTypes.ENUM('vkontakte', 'telegram', 'twitter', 'other'),
      allowNull: false
    },
    url: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isUrl: true
      }
    },
    apiKey: {
      type: DataTypes.STRING,
      allowNull: true
    },
    credentials: {
      type: DataTypes.JSON,
      allowNull: true
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastSyncDate: {
      type: DataTypes.DATE
    },
    syncFrequency: {
      type: DataTypes.INTEGER,
      defaultValue: 60, // в минутах
      comment: 'Частота синхронизации в минутах'
    },
    config: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Дополнительная конфигурация источника'
    }
  }, {
    timestamps: true
  });
  
  // Определение связей с другими моделями
  Source.associate = function(models) {
    // Связь с моделью событий (когда будет создана)
    // Source.hasMany(models.Event, { foreignKey: 'sourceId', as: 'events' });
    
    // Связь с пользователями, которые создали/управляют источниками
    Source.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
  };
  
  return Source;
}; 