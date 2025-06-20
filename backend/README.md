# Matrix AI - Backend

Бэкенд для системы мониторинга Matrix AI на основе нейронных сетей.

## Настройка проекта

### Предварительные требования

- Node.js (версия 14 или выше)
- npm или yarn
- PostgreSQL (на Render.com)

### Установка зависимостей

```bash
cd backend
npm install
```

### Настройка переменных окружения

1. Создайте файл `.env` в корне проекта backend
2. Скопируйте содержимое из файла `env.example`
3. Замените значения на реальные данные для подключения к базе данных

### Подключение к базе данных

База данных PostgreSQL уже создана на render.com. Данные для подключения:

- Database Name: matrix_ai
- Username: matrix_user
- Password: mVqhehVKabCp0FGf35NTSJKlRGXXLoPi
- Host: dpg-d17eeoemcj7s73d45j40-a.frankfurt-postgres.render.com
- Port: 5432

Эти данные уже настроены в файле `config/database.js`.

### Инициализация базы данных

```bash
node scripts/initDb.js
```

Этот скрипт создаст все необходимые таблицы в базе данных и добавит тестовые данные:
- Администратор: admin@matrixai.com / admin123
- Пользователь: user@matrixai.com / user123
- Тестовые источники данных (ВКонтакте, Telegram)
- Тестовые события и отчеты

## Запуск сервера

### Режим разработки

```bash
npm run dev
```

### Режим production

```bash
npm start
```

## API Endpoints

### Аутентификация

- `POST /api/auth/register` - Регистрация нового пользователя
- `POST /api/auth/login` - Вход в систему
- `GET /api/auth/me` - Получение информации о текущем пользователе
- `POST /api/auth/logout` - Выход из системы
- `PUT /api/auth/change-password` - Изменение пароля

### Пользователи

- `GET /api/users` - Получение списка пользователей (только для администраторов)
- `GET /api/users/:id` - Получение информации о конкретном пользователе
- `PUT /api/users/:id` - Обновление информации о пользователе
- `PUT /api/users/:id/role` - Изменение роли пользователя (только для администраторов)
- `PUT /api/users/:id/status` - Блокировка/разблокировка пользователя (только для администраторов)
- `DELETE /api/users/:id` - Удаление пользователя (только для администраторов)

### Источники данных

- `GET /api/sources` - Получение списка источников данных
- `GET /api/sources/:id` - Получение информации о конкретном источнике
- `POST /api/sources` - Создание нового источника данных
- `PUT /api/sources/:id` - Обновление информации об источнике
- `PUT /api/sources/:id/status` - Активация/деактивация источника
- `DELETE /api/sources/:id` - Удаление источника
- `POST /api/sources/:id/sync` - Синхронизация данных из источника

### События мониторинга

- `GET /api/events` - Получение списка событий с фильтрацией и пагинацией
- `GET /api/events/:id` - Получение информации о конкретном событии
- `PUT /api/events/:id/status` - Обновление статуса события
- `GET /api/events/stats/summary` - Получение статистики по событиям

### Отчеты

- `GET /api/reports` - Получение списка отчетов с фильтрацией и пагинацией
- `GET /api/reports/:id` - Получение информации о конкретном отчете
- `POST /api/reports` - Создание нового отчета
- `POST /api/reports/:id/generate` - Запуск генерации отчета
- `DELETE /api/reports/:id` - Удаление отчета
- `GET /api/reports/templates/list` - Получение списка шаблонов отчетов 