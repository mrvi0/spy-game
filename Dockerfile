# --- Этап 1: Сборка зависимостей и билда (если нужно) ---
# Используем официальный образ Node.js нужной версии (например, 18) как сборщик
FROM node:22.14.0-alpine AS builder

# Устанавливаем рабочую директорию внутри контейнера
WORKDIR /app

# Копируем package.json и package-lock.json (или yarn.lock)
COPY package*.json ./
# COPY yarn.lock ./ # Если используешь yarn

# Устанавливаем зависимости
RUN npm ci --only=production # Ставим только production зависимости для уменьшения размера
# Или RUN yarn install --production --frozen-lockfile

# Копируем остальной код приложения
COPY . .

# Если у тебя есть шаг сборки фронтенда или TypeScript -> JavaScript:
# RUN npm run build # Или твоя команда сборки

# --- Этап 2: Создание финального образа ---
# Используем легковесный образ Node.js Alpine для запуска
FROM node:22.14.0-alpine

WORKDIR /app

# Копируем ТОЛЬКО необходимые файлы из этапа сборки
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
# Копируем собранный код (если был шаг сборки)
# COPY --from=builder /app/dist ./dist # Пример
# Копируем остальной исходный код (если он нужен для запуска)
COPY --from=builder /app/public ./public 
# Пример
COPY --from=builder /app/server.js ./server.js 
# Пример главного файла

# Указываем порт, который слушает твое приложение
EXPOSE 3001 
# !!! ЗАМЕНИ 3001 НА РЕАЛЬНЫЙ ПОРТ ТВОЕЙ ИГРЫ !!!

# Команда для запуска приложения при старте контейнера
ENTRYPOINT [ "node" ]
CMD [ "server.js" ] # !!! ЗАМЕНИ server.js НА ТВОЙ СТАРТОВЫЙ ФАЙЛ !!!

# Опционально: Указываем пользователя (если не нужен root)
# USER node