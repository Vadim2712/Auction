package config

import (
	"fmt"
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

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

func LoadConfig() (*Config, error) {
	err := godotenv.Load()
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
		DBPassword:   getEnv("DB_PASSWORD", "your_db_password"),
		DBName:       getEnv("DB_NAME", "auction_db"),
		ServerPort:   getEnv("SERVER_PORT", "8080"),
		JWTSecret:    getEnv("JWT_SECRET", "your-very-secret-key-for-jwt"),
		JWTExpiresIn: jwtExpiresIn,
	}

	if cfg.JWTSecret == "your-very-secret-key-for-jwt" {
		log.Println("Warning: JWT_SECRET is set to default. Please set a strong secret key in .env or environment variables.")
	}
	if cfg.DBPassword == "your_db_password" {
		log.Println("Warning: DB_PASSWORD is set to default. Please set your actual database password in .env or environment variables.")
	}

	return cfg, nil
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists {
		return value
	}
	return fallback
}
