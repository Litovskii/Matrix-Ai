/**
 * database.js - Конфигурация базы данных для системы Matrix AI
 * 
 * Этот файл содержит настройки подключения к базе данных PostgreSQL на render.com.
 * Используется для установления соединения с базой данных из приложения.
 */

module.exports = {
  development: {
    username: process.env.DB_USERNAME || "matrix_user",
    password: process.env.DB_PASSWORD || "mVqhehVKabCp0FGf35NTSJKlRGXXLoPi",
    database: process.env.DB_NAME || "matrix_ai",
    host: process.env.DB_HOST || "dpg-d17eeoemcj7s73d45j40-a.frankfurt-postgres.render.com",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  },
  production: {
    username: process.env.DB_USERNAME || "matrix_user",
    password: process.env.DB_PASSWORD || "mVqhehVKabCp0FGf35NTSJKlRGXXLoPi",
    database: process.env.DB_NAME || "matrix_ai",
    host: process.env.DB_HOST || "dpg-d17eeoemcj7s73d45j40-a.frankfurt-postgres.render.com",
    port: process.env.DB_PORT || 5432,
    dialect: "postgres",
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    },
    logging: false
  }
}; 