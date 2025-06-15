/**
 * Event.js - Модель события мониторинга для системы Matrix AI
 * 
 * Этот файл содержит определение модели события, обнаруженного системой мониторинга.
 * Включает в себя поля, методы и связи с другими моделями.
 */

module.exports = function(sequelize, DataTypes) {
  const Event = sequelize.define('Event', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    originalContent: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Оригинальный контент без изменений'
    },
    type: {
      type: DataTypes.ENUM('text', 'image', 'video', 'audio', 'mixed'),
      defaultValue: 'text'
    },
    category: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Категория события (например, "угроза", "информация")'
    },
    severity: {
      type: DataTypes.ENUM('low', 'medium', 'high', 'critical'),
      defaultValue: 'medium',
      comment: 'Уровень серьезности события'
    },
    confidence: {
      type: DataTypes.FLOAT,
      defaultValue: 0.0,
      comment: 'Уровень уверенности в классификации (0-1)'
    },
    sourceUrl: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'URL источника события'
    },
    metadata: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Дополнительные метаданные события'
    },
    status: {
      type: DataTypes.ENUM('new', 'processing', 'resolved', 'false_positive', 'ignored'),
      defaultValue: 'new'
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolvedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    resolvedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      comment: 'ID пользователя, разрешившего событие'
    }
  }, {
    timestamps: true,
    indexes: [
      {
        name: 'events_severity_idx',
        fields: ['severity']
      },
      {
        name: 'events_status_idx',
        fields: ['status']
      },
      {
        name: 'events_created_at_idx',
        fields: ['createdAt']
      }
    ]
  });
  
  // Определение связей с другими моделями
  Event.associate = function(models) {
    // Связь с источником данных
    Event.belongsTo(models.Source, { foreignKey: 'sourceId', as: 'source' });
    
    // Связь с пользователем, который обработал событие
    Event.belongsTo(models.User, { foreignKey: 'resolvedBy', as: 'resolver' });
    
    // Связь с отчетами (когда будет создана модель Report)
    // Event.belongsToMany(models.Report, { through: 'EventReports' });
  };
  
  return Event;
}; 