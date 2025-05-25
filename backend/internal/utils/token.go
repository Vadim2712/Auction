package utils

import (
	"auction-app/backend/config" // Путь к вашему пакету config
	"errors"
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v4" // или v5, если используете ее
)

// GenerateJWT генерирует новый JWT токен для пользователя
func GenerateJWT(userID uint, userRole string, cfg *config.Config) (string, error) {
	expirationTime := time.Now().Add(time.Duration(cfg.JWTExpiresIn) * time.Hour)

	claims := &jwt.MapClaims{
		"authorized": true,
		"user_id":    userID,
		"role":       userRole, // Добавляем роль в токен (это будет активная роль)
		"exp":        expirationTime.Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(cfg.JWTSecret))
}

// ValidateJWT проверяет валидность JWT токена
func ValidateJWT(tokenString string, cfg *config.Config) (*jwt.Token, error) {
	return jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(cfg.JWTSecret), nil
	})
}

// ExtractClaimsFromToken извлекает данные (claims) из токена
func ExtractClaimsFromToken(token *jwt.Token) (jwt.MapClaims, error) {
	if claims, ok := token.Claims.(jwt.MapClaims); ok && token.Valid {
		return claims, nil
	}
	return nil, errors.New("invalid token or claims")
}
