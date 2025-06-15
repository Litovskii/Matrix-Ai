/**
 * Report.js - Модель отчета для системы Matrix AI
 * 
 * Этот файл содержит определение модели отчета, генерируемого системой мониторинга.
 * Включает в себя поля, методы и связи с другими моделями.
 */

module.exports = function(sequelize, DataTypes) {
  const Report = sequelize.define('Report', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    type: {
      type: DataTypes.ENUM('daily', 'weekly', 'monthly', 'custom'),
      defaultValue: 'custom'
    },
    format: {
      type: DataTypes.ENUM('pdf', 'html', 'json', 'csv'),
      defaultValue: 'pdf'
    },
    parameters: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Параметры формирования отчета'
    },
    data: {
      type: DataTypes.JSON,
      allowNull: true,
      comment: 'Данные отчета'
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Путь к файлу отчета'
    },
    status: {
      type: DataTypes.ENUM('pending', 'generating', 'completed', 'failed'),
      defaultValue: 'pending'
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Начальная дата периода отчета'
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Конечная дата периода отчета'
    },
    generatedAt: {
      type: DataTypes.DATE,
      allowNull: true
    },
    isScheduled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Флаг для регулярных отчетов'
    },
    schedule: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Расписание генерации отчета (cron-выражение)'
    }
  }, {
    timestamps: true,
    indexes: [
      {
        name: 'reports_type_idx',
        fields: ['type']
      },
      {
        name: 'reports_status_idx',
        fields: ['status']
      },
      {
        name: 'reports_created_at_idx',
        fields: ['createdAt']
      }
    ]
  });
  
  // Определение связей с другими моделями
  Report.associate = function(models) {
    // Связь с пользователем, создавшим отчет
    Report.belongsTo(models.User, { foreignKey: 'createdBy', as: 'creator' });
    
    // Связь с событиями
    Report.belongsToMany(models.Event, { through: 'EventReports' });
    
    // Связь с источниками данных
    Report.belongsToMany(models.Source, { through: 'ReportSources' });
  };
  
  return Report;
}; 