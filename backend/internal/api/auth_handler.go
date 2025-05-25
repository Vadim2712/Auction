package api

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/services"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

type AuthHandler struct {
	authService *services.AuthService
}

func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (h *AuthHandler) Register(c *gin.Context) {
	var input models.RegisterUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные входные данные: " + err.Error()})
		return
	}

	user, err := h.authService.RegisterUser(input) // 'user' теперь будет использоваться
	if err != nil {
		if strings.Contains(err.Error(), "уже существует") {
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка регистрации пользователя: " + err.Error()})
		}
		return
	}

	// Возвращаем информацию о созданном пользователе (без пароля)
	userResponse := gin.H{
		"id":       user.ID, // user.ID теперь используется
		"fullName": user.FullName,
		"email":    user.Email,
		"message":  "Пользователь успешно зарегистрирован. Пожалуйста, войдите.",
		// "role": user.Role, // Основная роль, если нужно
		// "availableBusinessRoles": user.AvailableBusinessRoles, // Если нужно вернуть доступные роли
	}
	c.JSON(http.StatusCreated, userResponse) // Используем userResponse
}

type LoginInputWithRole struct {
	Email    string          `json:"email" binding:"required,email"`
	Password string          `json:"password" binding:"required"`
	Role     models.UserRole `json:"role" binding:"required"`
}

func (h *AuthHandler) Login(c *gin.Context) {
	var input LoginInputWithRole
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные входные данные для входа: " + err.Error()})
		return
	}

	token, user, err := h.authService.LoginUser(models.LoginInput{Email: input.Email, Password: input.Password}, input.Role)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") || strings.Contains(err.Error(), "неверный пароль") || strings.Contains(err.Error(), "роль не была выбрана") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера при попытке входа: " + err.Error()})
		}
		return
	}
	// user.PasswordHash уже должен быть "" из сервиса
	c.JSON(http.StatusOK, gin.H{
		"token":      token,
		"user":       user,
		"activeRole": input.Role,
	})
}

func (h *AuthHandler) Me(c *gin.Context) {
	userIDVal, existsUserID := c.Get("userID")
	userRoleVal, existsUserRole := c.Get("userRole")

	if !existsUserID || !existsUserRole {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Данные пользователя не найдены в контексте аутентификации"})
		return
	}
	userID, okUserID := userIDVal.(uint)
	activeRole, okUserRole := userRoleVal.(string)

	if !okUserID || !okUserRole {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Некорректный формат данных пользователя в контексте"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"message":    "Данные текущего аутентифицированного пользователя",
		"userID":     userID,
		"activeRole": activeRole,
	})
}
