# 🚂 Развертывание на Railway (SQLite работает!)

## ✅ Почему Railway?

На Railway SQLite работает без изменений - НЕ НУЖНО переписывать код!

## 🚀 Быстрое развертывание

### Шаг 1: Подготовка репозитория

```bash
# Убедитесь что у вас последняя версия
git add .
git commit -m "Подготовка для Railway"
git push
```

### Шаг 2: Развертывание

1. Откройте [railway.app](https://railway.app)
2. Нажмите **"Login"** → войдите через GitHub
3. Нажмите **"New Project"** → **"Deploy from GitHub repo"**
4. Выберите репозиторий `DrevMaster`
5. Railway автоматически определит Next.js и развернет

### Шаг 3: Настройка домена

1. В панели Railway → ваш проект
2. **Settings** → **Domains**
3. **Generate Domain** - получите бесплатный домен
4. Или подключите свой домен

## 🎯 Альтернатива: Render

1. Откройте [render.com](https://render.com)
2. **New** → **Web Service**
3. Подключите GitHub репозиторий
4. **Build Command**: `npm install && npm run build`
5. **Start Command**: `npm start`

## 🔧 Если нужны переменные среды

В Railway/Render добавьте:

- `NODE_ENV=production`
- `JWT_SECRET=drevmaster-secret-key-2024`

## ✅ Преимущества Railway/Render

- ✅ SQLite работает из коробки
- ✅ Персистентное хранилище
- ✅ Автоматический HTTPS
- ✅ Бесплатный план
- ✅ НЕ НУЖНО менять код!

## 📱 После развертывания

1. Откройте ваш сайт
2. Войдите: логин `admin`, пароль `admin`
3. Всё работает!

---

**Время развертывания: 5 минут** vs **Vercel PostgreSQL: 2-3 часа переписывания кода**
