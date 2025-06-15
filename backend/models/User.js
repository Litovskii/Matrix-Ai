/**
 * User.js - Модель пользователя для системы Matrix AI
 * 
 * Этот файл содержит определение модели пользователя для работы с базой данных.
 * Включает в себя поля, методы и связи с другими моделями.
 */

const bcrypt = require('bcryptjs');

module.exports = function(sequelize, DataTypes) {
  const User = sequelize.define('User', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    username: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [3, 50]
      }
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        isEmail: true
      }
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [6, 100]
      }
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.ENUM('admin', 'analyst', 'user'),
      defaultValue: 'user'
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true
    },
    lastLogin: {
      type: DataTypes.DATE
    }
  }, {
    timestamps: true,
    hooks: {
      beforeCreate: async (user) => {
        if (user.password) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      },
      beforeUpdate: async (user) => {
        if (user.changed('password')) {
          const salt = await bcrypt.genSalt(10);
          user.password = await bcrypt.hash(user.password, salt);
        }
      }
    }
  });
  
  // Методы для работы с паролями
  User.prototype.validPassword = async function(password) {
    return await bcrypt.compare(password, this.password);
  };
  
  // Методы для работы с ролями
  User.prototype.hasRole = function(role) {
    return this.role === role;
  };
  
  User.prototype.isAdmin = function() {
    return this.role === 'admin';
  };
  
  // Определение связей с другими моделями
  User.associate = function(models) {
    // Связь с моделью событий (когда будет создана)
    // User.hasMany(models.Event, { foreignKey: 'userId', as: 'events' });
  };
  
  return User;
}; 