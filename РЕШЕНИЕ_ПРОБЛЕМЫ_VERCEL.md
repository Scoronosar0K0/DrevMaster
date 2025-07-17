# 🔧 Решение проблемы "readonly database" на Vercel

## ❌ Проблема

```
SqliteError: attempt to write a readonly database
code: 'SQLITE_READONLY'
```

На Vercel файловая система read-only, SQLite не может записывать.

## ✅ РЕШЕНИЯ (выберите одно)

### 🥇 РЕШЕНИЕ 1: Railway (РЕКОМЕНДУЕТСЯ)

**⏱️ Время: 5 минут | 💰 Бесплатно | 🔧 Без изменений кода**

1. Запустите: `deploy.bat` (Windows) или `./deploy.sh` (Mac/Linux)
2. Откройте [railway.app](https://railway.app)
3. Login → New Project → Deploy from GitHub repo
4. Выберите DrevMaster → Готово!

### 🥈 РЕШЕНИЕ 2: Render

**⏱️ Время: 7 минут | 💰 Бесплатно | 🔧 Без изменений кода**

1. Откройте [render.com](https://render.com)
2. New → Web Service → Connect GitHub
3. Build Command: `npm install && npm run build`
4. Start Command: `npm start`

### 🥉 РЕШЕНИЕ 3: Vercel + PostgreSQL

**⏱️ Время: 2-3 часа | 💰 Бесплатно | 🔧 Нужно переписывать код**

Читайте `VERCEL_DATABASE_FIX.md` для подробной инструкции.

## 🎯 Рекомендация

**Используйте Railway** - быстро, просто, SQLite работает без изменений!

## 📱 После развертывания

- **Логин:** admin
- **Пароль:** admin
- Все функции работают!
