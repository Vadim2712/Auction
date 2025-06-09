package middleware

import (
	"auction-app/backend/config"
	"auction-app/backend/internal/utils"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuthMiddleware проверяет JWT токен авторизации
func AuthMiddleware(cfg *config.Config) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Отсутствует заголовок авторизации"})
			return
		}

		parts := strings.Split(authHeader, " ")
		if len(parts) != 2 || strings.ToLower(parts[0]) != "bearer" {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Некорректный формат заголовка авторизации (ожидается 'Bearer token')"})
			return
		}

		tokenString := parts[1]
		token, err := utils.ValidateJWT(tokenString, cfg)

		if err != nil || !token.Valid {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Невалидный или истекший токен авторизации"})
			return
		}

		claims, err := utils.ExtractClaimsFromToken(token)
		if err != nil {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "Не удалось извлечь данные из токена"})
			return
		}

		userIDClaim, okID := claims["user_id"].(float64)
		userRoleClaim, okRole := claims["role"].(string)

		if !okID || !okRole {
			c.AbortWithStatusJSON(http.StatusInternalServerError, gin.H{"error": "Некорректные данные в токене (user_id или role)"})
			return
		}

		c.Set("userID", uint(userIDClaim))
		c.Set("userRole", userRoleClaim)

		c.Next()
	}
}
