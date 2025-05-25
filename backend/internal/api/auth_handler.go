package api

import (
	"auction-app/backend/internal/models" // Убедитесь, что путь правильный
	"auction-app/backend/internal/services"
	"net/http"
	"strings" // Для strings.Contains

	"github.com/gin-gonic/gin"
)

// AuthHandler содержит методы-обработчики для аутентификации
type AuthHandler struct {
	authService *services.AuthService
}

// NewAuthHandler создает новый экземпляр AuthHandler
func NewAuthHandler(authService *services.AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

// Register обрабатывает запрос на регистрацию нового пользователя
func (h *AuthHandler) Register(c *gin.Context) {
	var input models.RegisterUserInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные входные данные: " + err.Error()})
		return
	}

	user, err := h.authService.RegisterUser(input)
	if err != nil {
		if strings.Contains(err.Error(), "уже существует") { // Проверяем по тексту ошибки из сервиса
			c.JSON(http.StatusConflict, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка регистрации пользователя: " + err.Error()})
		}
		return
	}

	// В соответствии с новой логикой apiClient.registerUser, которая не логинит сразу,
	// мы просто возвращаем сообщение об успехе.
	// Если бы мы хотели вернуть данные пользователя (без пароля), это выглядело бы так:
	// userResponse := gin.H{
	// 	"id":                   user.ID,
	// 	"fullName":             user.FullName,
	// 	"email":                user.Email,
	//  "message":              "Пользователь успешно зарегистрирован. Пожалуйста, войдите.",
	// }
	// c.JSON(http.StatusCreated, userResponse)

	c.JSON(http.StatusCreated, gin.H{"message": "Пользователь успешно зарегистрирован. Пожалуйста, войдите."})
}

// LoginInputWithRole структура для входа с выбором роли, как мы определили ранее
// Она должна быть здесь, так как используется в Login хендлере
type LoginInputWithRole struct {
	Email    string          `json:"email" binding:"required,email"`
	Password string          `json:"password" binding:"required"`
	Role     models.UserRole `json:"role" binding:"required"` // Выбранная активная роль
}

// Login обрабатывает запрос на вход пользователя
func (h *AuthHandler) Login(c *gin.Context) {
	var input LoginInputWithRole // Используем структуру с явно указанной ролью
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные входные данные для входа: " + err.Error()})
		return
	}

	// Передаем email, password и выбранную роль в сервис
	token, user, err := h.authService.LoginUser(models.LoginInput{Email: input.Email, Password: input.Password}, input.Role)
	if err != nil {
		// AuthService.LoginUser теперь возвращает более конкретные ошибки
		if strings.Contains(err.Error(), "не найден") || strings.Contains(err.Error(), "неверный пароль") || strings.Contains(err.Error(), "роль не была выбрана") {
			c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Внутренняя ошибка сервера при попытке входа: " + err.Error()})
		}
		return
	}

	// Убедимся, что возвращаем user объект без хеша пароля (это должно делаться в сервисе, но на всякий случай)
	// user.PasswordHash = "" // AuthService уже должен был это сделать

	c.JSON(http.StatusOK, gin.H{
		"token":      token,
		"user":       user,       // Возвращаем объект пользователя (без хеша)
		"activeRole": input.Role, // Явно возвращаем активную роль, с которой вошли
	})
}

// Me (пример защищенного эндпоинта для получения данных о текущем пользователе)
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

	// Здесь можно было бы получить полные данные пользователя из userStore по userID, если нужно
	// currentUser, err := h.authService.GetUserProfile(userID) // Предположим, есть такой метод в сервисе
	// if err != nil || currentUser == nil {
	// 	c.JSON(http.StatusNotFound, gin.H{"error": "Пользователь не найден"})
	// 	return
	// }

	c.JSON(http.StatusOK, gin.H{
		"message":    "Данные текущего аутентифицированного пользователя",
		"userID":     userID,
		"activeRole": activeRole,
		// "profile": currentUser, // Если бы получали полный профиль
	})
}
