// backend/internal/services/auth_service.go
package services

import (
	"auction-app/backend/config"
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"auction-app/backend/internal/utils"
	"encoding/json"
	"errors"
	"fmt"
	"log"

	"github.com/golang-jwt/jwt/v4"
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
	log.Printf("[AuthService] RegisterUser attempt for email: %s", input.Email)
	existingUser, err := s.userStore.GetUserByEmail(input.Email)
	if err != nil {
		log.Printf("[AuthService] Error checking email %s: %v", input.Email, err)
		return nil, fmt.Errorf("ошибка при проверке email: %w", err)
	}
	if existingUser != nil {
		log.Printf("[AuthService] User already exists with email: %s", input.Email)
		return nil, errors.New("пользователь с таким email уже существует")
	}

	availableRoles := []string{string(models.RoleBuyer), string(models.RoleSeller)}
	availableRolesJSON, errJSON := json.Marshal(availableRoles)
	if errJSON != nil {
		log.Printf("[AuthService] Error marshalling available roles for %s: %v", input.Email, errJSON)
		return nil, fmt.Errorf("ошибка при подготовке ролей пользователя: %w", errJSON)
	}

	user := models.User{
		FullName:               input.FullName,
		Email:                  input.Email,
		AvailableBusinessRoles: string(availableRolesJSON),
		PassportData:           input.PassportData,
		Role:                   models.RoleBuyer,
		IsActive:               true,
	}

	if err := user.SetPassword(input.Password); err != nil {
		log.Printf("[AuthService] Error hashing password for %s: %v", input.Email, err)
		return nil, fmt.Errorf("ошибка хеширования пароля: %w", err)
	}

	if err := s.userStore.CreateUser(&user); err != nil {
		log.Printf("[AuthService] Error creating user %s in DB: %v", input.Email, err)
		return nil, fmt.Errorf("ошибка создания пользователя в БД: %w", err)
	}

	log.Printf("[AuthService] User %s registered successfully with ID %d", user.Email, user.ID)
	user.PasswordHash = ""
	return &user, nil
}

// LoginUser аутентифицирует пользователя и возвращает JWT токен, данные пользователя и активную роль
func (s *AuthService) LoginUser(input models.LoginInput, chosenRole models.UserRole) (string, *models.User, models.UserRole, error) {
	log.Printf("[AuthService] Login attempt for email: %s, chosenRole: %s", input.Email, chosenRole)
	user, err := s.userStore.GetUserByEmail(input.Email)
	if err != nil {
		log.Printf("[AuthService] Error getting user by email %s: %v", input.Email, err)
		return "", nil, "", fmt.Errorf("ошибка получения пользователя по email: %w", err)
	}
	if user == nil {
		log.Printf("[AuthService] User not found for email: %s", input.Email)
		return "", nil, "", errors.New("пользователь с таким email не найден")
	}
	log.Printf("[AuthService] User found: ID %d, Main Role from DB: %s, IsActive: %t", user.ID, user.Role, user.IsActive)

	if !user.IsActive {
		log.Printf("[AuthService] Login attempt for inactive user: %s", input.Email)
		return "", nil, "", errors.New("учетная запись пользователя неактивна")
	}

	if !user.CheckPassword(input.Password) {
		log.Printf("[AuthService] Invalid password for user: %s", input.Email)
		return "", nil, "", errors.New("неверный пароль")
	}
	log.Printf("[AuthService] Password check passed for user: %s", input.Email)

	finalActiveRole := chosenRole

	if user.Role == models.RoleSystemAdmin {
		finalActiveRole = models.RoleSystemAdmin
		log.Printf("[AuthService] User %s is SYSTEM_ADMIN. Active role forced to: %s", input.Email, finalActiveRole)
	} else {
		if chosenRole == "" {
			log.Printf("[AuthService] No role chosen for non-admin user: %s", input.Email)
			return "", nil, "", errors.New("активная роль не была выбрана")
		}
		var availableRoles []string
		if errUnmarshal := json.Unmarshal([]byte(user.AvailableBusinessRoles), &availableRoles); errUnmarshal != nil {
			log.Printf("[AuthService] Error unmarshalling AvailableBusinessRoles for user %s: %v. Stored JSON: %s", user.Email, errUnmarshal, user.AvailableBusinessRoles)
			return "", nil, "", errors.New("ошибка определения доступных ролей пользователя")
		}

		isRoleAllowed := false
		for _, ar := range availableRoles {
			if ar == string(chosenRole) {
				isRoleAllowed = true
				break
			}
		}

		if !isRoleAllowed {
			log.Printf("[AuthService] Chosen role '%s' is not available for user %s. Available: %v", chosenRole, input.Email, availableRoles)
			return "", nil, "", errors.New("выбранная роль недоступна для этого пользователя")
		}
		log.Printf("[AuthService] User %s. Chosen active role: %s. Available roles: %v", input.Email, finalActiveRole, availableRoles)
	}

	token, err := utils.GenerateJWT(user.ID, string(finalActiveRole), s.cfg)
	if err != nil {
		log.Printf("[AuthService] Error generating JWT for user %s: %v", input.Email, err)
		return "", nil, "", fmt.Errorf("ошибка генерации JWT токена: %w", err)
	}
	log.Printf("[AuthService] JWT generated successfully for user: %s, activeRole in token: %s", input.Email, finalActiveRole)

	user.PasswordHash = ""
	return token, user, finalActiveRole, nil
}

func (s *AuthService) ValidateToken(tokenString string) (jwt.MapClaims, error) {
	log.Printf("[AuthService] Validating token")
	token, err := utils.ValidateJWT(tokenString, s.cfg)
	if err != nil {
		log.Printf("[AuthService] Token validation error: %v", err)
		return nil, err
	}
	if !token.Valid {
		log.Printf("[AuthService] Token is invalid")
		return nil, errors.New("невалидный токен")
	}
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		log.Printf("[AuthService] Failed to extract claims from token")
		return nil, errors.New("не удалось извлечь данные из токена")
	}
	log.Printf("[AuthService] Token validated successfully. Claims: UserID %.0f, Role %s", claims["user_id"], claims["role"])
	return claims, nil
}

func (s *AuthService) GetUserProfile(userID uint) (*models.User, error) {
	log.Printf("[AuthService] GetUserProfile for userID: %d", userID)
	user, err := s.userStore.GetUserByID(userID)
	if err != nil {
		log.Printf("[AuthService] Error getting user profile for ID %d: %v", userID, err)
		return nil, fmt.Errorf("ошибка получения профиля пользователя: %w", err)
	}
	if user == nil {
		log.Printf("[AuthService] User profile not found for ID: %d", userID)
		return nil, errors.New("профиль пользователя не найден")
	}
	user.PasswordHash = ""
	return user, nil
}
