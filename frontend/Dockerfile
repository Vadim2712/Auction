# frontend/Dockerfile

# Этап сборки
FROM node:18-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
# Используйте yarn.lock если вы используете yarn
# COPY yarn.lock ./
RUN npm install
# Если используете yarn:
# RUN yarn install
COPY . .
RUN npm run build
# Если используете yarn:
# RUN yarn build

# Этап выполнения (сервировка статических файлов через Nginx)
FROM nginx:1.25-alpine
# Копируем собранные статические файлы из этапа сборки в директорию Nginx
COPY --from=builder /app/build /usr/share/nginx/html
# (Опционально) Копируем кастомную конфигурацию Nginx, если нужна
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]