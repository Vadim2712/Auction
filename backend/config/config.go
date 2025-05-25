package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config хранит все конфигурационные параметры приложения
type Config struct {
	DBHost       string
	DBPort       int
	DBUser       string
	DBPassword   string
	DBName       string
	ServerPort   string
	JWTSecret    string
	JWTExpiresIn int // в часах
}

// LoadConfig загружает конфигурацию из переменных окружения
// или из .env файла (если он есть)
func LoadConfig() (*Config, error) {
	// Загружаем .env файл, если он существует в корне бэкенд-проекта
	// Файл .env не должен попадать в систему контроля версий!
	err := godotenv.Load() // Путь по умолчанию ".env"
	if err != nil {
		log.Println("Warning: .env file not found, loading config from environment variables")
	}

	dbPort, err := strconv.Atoi(getEnv("DB_PORT", "5432"))
	if err != nil {
		return nil, fmt.Errorf("invalid DB_PORT: %w", err)
	}

	jwtExpiresIn, err := strconv.Atoi(getEnv("JWT_EXPIRES_IN_HOURS", "72"))
	if err != nil {
		return nil, fmt.Errorf("invalid JWT_EXPIRES_IN_HOURS: %w", err)
	}

	cfg := &Config{
		DBHost:       getEnv("DB_HOST", "localhost"),
		DBPort:       dbPort,
		DBUser:       getEnv("DB_USER", "auction_user"),
		DBPassword:   getEnv("DB_PASSWORD", "your_db_password"), // Замените на ваш пароль или установите через .env
		DBName:       getEnv("DB_NAME", "auction_db"),
		ServerPort:   getEnv("SERVER_PORT", "8080"),
		JWTSecret:    getEnv("JWT_SECRET", "your-very-secret-key-for-jwt"), // ОБЯЗАТЕЛЬНО измените на свой сложный ключ
		JWTExpiresIn: jwtExpiresIn,
	}

	// Проверка обязательных параметров
	if cfg.JWTSecret == "your-very-secret-key-for-jwt" {
		log.Println("Warning: JWT_SECRET is set to default. Please set a strong secret key in .env or environment variables.")
	}
	if cfg.DBPassword == "your_db_password" {
		log.Println("Warning: DB_PASSWORD is set to default. Please set your actual database password in .env or environment variables.")
	}

	return cfg, nil
}

// getEnv получает значение переменной окружения или возвращает значение по умолчанию
func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
