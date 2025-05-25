package services

import (
	"auction-app/backend/config"
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"auction-app/backend/internal/utils"
	"errors"
	"fmt"

	// Для работы со строками, например, для availableBusinessRoles
	"github.com/golang-jwt/jwt/v4" // или v5
)

// AuthService предоставляет методы для аутентификации и регистрации
type AuthService struct {
	userStore store.UserStore
	cfg       *config.Config
}

// NewAuthService создает новый экземпляр AuthService
func NewAuthService(userStore store.UserStore, cfg *config.Config) *AuthService {
	return &AuthService{userStore: userStore, cfg: cfg}
}

// RegisterUser регистрирует нового пользователя
func (s *AuthService) RegisterUser(input models.RegisterUserInput) (*models.User, error) {
	existingUser, err := s.userStore.GetUserByEmail(input.Email)
	if err != nil {
		// Ошибка при запросе к БД, не "запись не найдена"
		return nil, fmt.Errorf("ошибка при проверке email: %w", err)
	}
	if existingUser != nil {
		return nil, errors.New("пользователь с таким email уже существует")
	}

	user := models.User{
		FullName: input.FullName,
		Email:    input.Email,
		// По умолчанию все бизнес-роли доступны. В реальном приложении это может быть сложнее.
		AvailableBusinessRoles: "[\"buyer\",\"seller\",\"auction_manager\"]", // Сохраняем как JSON-строку
		PassportData:           input.PassportData,
		Role:                   models.RoleBuyer, // По умолчанию роль "buyer"
	}

	if err := user.SetPassword(input.Password); err != nil {
		return nil, fmt.Errorf("ошибка хеширования пароля: %w", err)
	}

	if err := s.userStore.CreateUser(&user); err != nil {
		return nil, fmt.Errorf("ошибка создания пользователя в БД: %w", err)
	}

	// Убираем хеш пароля перед возвратом
	user.PasswordHash = ""
	return &user, nil
}

// LoginUser аутентифицирует пользователя и возвращает JWT токен и выбранную активную роль
// validateCredentials теперь будет частью логики здесь или в хендлере
// Вместо validateCredentials, сразу делаем полный логин
func (s *AuthService) LoginUser(input models.LoginInput, chosenRole models.UserRole) (string, *models.User, error) {
	user, err := s.userStore.GetUserByEmail(input.Email)
	if err != nil {
		return "", nil, fmt.Errorf("ошибка получения пользователя по email: %w", err)
	}
	if user == nil {
		return "", nil, errors.New("пользователь с таким email не найден")
	}

	if !user.CheckPassword(input.Password) {
		return "", nil, errors.New("неверный пароль")
	}

	// Проверка, доступна ли выбранная роль пользователю
	// (если chosenRole не является системной ролью администратора)
	if user.Role != models.RoleSystemAdmin {
		// Для обычных пользователей chosenRole должна быть одной из availableBusinessRoles
		// Предполагаем, что chosenRole передается и она должна быть в user.AvailableBusinessRoles
		// Эту логику нужно будет уточнить: как availableBusinessRoles хранится и проверяется
		// Пока что, если это не системный админ, то выбранная роль и будет его активной ролью
		// В будущем можно добавить проверку `chosenRole` по `user.AvailableBusinessRoles`
		if chosenRole == "" { // Если роль не выбрана, можно установить дефолтную или вернуть ошибку
			// В нашей текущей фронтенд-логике роль ОБЯЗАТЕЛЬНО выбирается
			// если это не системный админ
			return "", nil, errors.New("активная роль не была выбрана")
		}
	} else {
		// Если это системный администратор, его активная роль всегда SYSTEM_ADMIN
		chosenRole = models.RoleSystemAdmin
	}

	token, err := utils.GenerateJWT(user.ID, string(chosenRole), s.cfg) // Передаем выбранную активную роль в токен
	if err != nil {
		return "", nil, fmt.Errorf("ошибка генерации JWT токена: %w", err)
	}

	// Убираем хеш пароля перед возвратом
	user.PasswordHash = ""
	// Здесь user.Role - это его "основная" роль из БД, а chosenRole - активная для сессии
	// Фронтенд будет использовать chosenRole из токена или AuthContext
	return token, user, nil
}

// ValidateToken проверяет токен и возвращает claims (полезную нагрузку)
func (s *AuthService) ValidateToken(tokenString string) (jwt.MapClaims, error) {
	token, err := utils.ValidateJWT(tokenString, s.cfg)
	if err != nil {
		return nil, err
	}
	if !token.Valid {
		return nil, errors.New("невалидный токен")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, errors.New("не удалось извлечь claims из токена")
	}
	return claims, nil
}
