# Ручное обновление сервера

## 🔧 Проблема с аутентификацией на VPS

Если вы постоянно перенаправляетесь на страницу логина после успешного входа, выполните следующие шаги:

### 1. Подключение к серверу

```bash
ssh root@194.87.201.205
# Пароль: sPCTXxCd5gfR+L
```

### 2. Обновление приложения

```bash
# Переходим в директорию приложения
cd /var/www/DREVMASTER/DREVMASTER

# Получаем последние изменения
git pull origin main

# Устанавливаем зависимости
npm install

# Собираем приложение
npm run build

# Перезапускаем приложение
pm2 restart DREVMASTER
```

### 2.1 ИСПРАВЛЕНИЕ ТАБЛИЦЫ ACTIVITY_LOGS

Если в логах видите "Таблица activity_logs еще не создана", выполните:

```bash
# Остановить приложение
pm2 stop DREVMASTER

# Удалить старую базу данных (ВНИМАНИЕ: Это удалит все данные!)
rm -f drevmaster.db

# Запустить приложение заново (база создастся с нуля)
pm2 start DREVMASTER

# Проверить логи
pm2 logs DREVMASTER --lines 20
```

**АЛЬТЕРНАТИВНО** (если не хотите потерять данные):

```bash
# Подключиться к базе данных SQLite
sqlite3 DREVMASTER.db

# Создать таблицу activity_logs вручную
CREATE TABLE IF NOT EXISTS activity_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  details TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES users (id)
);

# Выйти из SQLite
.quit

# Перезапустить приложение
pm2 restart DREVMASTER
```

### 3. Проверка настроек

```bash
# Проверяем файл окружения
cat .env.local

# Должно содержать:
# JWT_SECRET=<случайная строка из openssl rand -hex 32>
# NODE_ENV=production
# PORT=3000

# Проверяем статус приложения
pm2 status

# Проверяем логи
pm2 logs DREVMASTER --lines 20
```

### 4. Проверка Nginx

```bash
# Проверяем статус Nginx
systemctl status nginx

# Проверяем конфигурацию
nginx -t

# Перезапускаем Nginx если нужно
systemctl restart nginx
```

### 5. Проверка портов

```bash
# Проверяем какие порты слушаются
netstat -tlnp | grep :80
netstat -tlnp | grep :3000
```

### 6. Очистка кэша браузера

Если проблема остается:

1. Откройте DevTools (F12)
2. Перейдите на вкладку Application/Storage
3. Очистите все cookies и localStorage
4. Попробуйте войти снова

### 7. Проверка базы данных

```bash
# Проверяем что база данных существует
ls -la *.db

# Если базы нет, перезапустите приложение
pm2 restart DREVMASTER
```

### 8. Альтернативное решение

Если проблема не решается, попробуйте:

```bash
# Остановить приложение
pm2 stop DREVMASTER

# Удалить старую базу данных
rm -f *.db

# Запустить приложение заново
pm2 start DREVMASTER

# Проверить логи
pm2 logs DREVMASTER
```

## 🔍 Диагностика

### Проверка cookie в браузере:

1. Откройте DevTools (F12)
2. Перейдите на вкладку Application/Storage
3. В разделе Cookies найдите `auth-token`
4. Убедитесь что cookie установлен и не истек

### Проверка JWT токена:

1. Скопируйте значение cookie `auth-token`
2. Перейдите на https://jwt.io/
3. Вставьте токен и проверьте его структуру
4. Убедитесь что поле `role` содержит правильное значение

## 📞 Если ничего не помогает

1. Проверьте логи приложения: `pm2 logs DREVMASTER`
2. Проверьте логи Nginx: `tail -f /var/log/nginx/error.log`
3. Убедитесь что JWT_SECRET задан в `.env.local` (без него приложение в продакшене не запустится)
4. Попробуйте перезапустить весь сервер: `reboot`

---

**Приложение должно быть доступно по адресу:** http://194.87.201.205
