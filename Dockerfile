# Используем Node.js 18 Alpine для меньшего размера
FROM node:18-alpine

# Устанавливаем необходимые системные зависимости для better-sqlite3
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    sqlite

# Устанавливаем рабочую директорию
WORKDIR /app

# Копируем package.json и package-lock.json (если есть)
COPY package*.json ./

# Устанавливаем зависимости
RUN npm install --force --production=false

# Копируем исходный код
COPY . .

# Собираем приложение
RUN npm run build

# Экспонируем порт
EXPOSE 3000

# Устанавливаем переменную среды
ENV NODE_ENV=production

# Запускаем приложение
CMD ["npm", "start"] 