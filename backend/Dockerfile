# backend/Dockerfile

# Этап сборки
FROM golang:1.24-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Собираем приложение. Убедитесь, что путь к main.go правильный.
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main cmd/main.go

# Этап выполнения
FROM alpine:latest
WORKDIR /root/
# Копируем исполняемый файл из этапа сборки
COPY --from=builder /app/main .
# Копируем .env файл, если он используется для конфигурации в Docker
# COPY .env . 
# Если ваш config.go читает переменные окружения, .env файл можно не копировать,
# а задавать переменные в docker-compose.yml

# Ваш бэкенд слушает порт 8080 (согласно apiClient.js и обычному запуску Gin)
EXPOSE 8080

# Команда для запуска приложения
CMD ["./main"]