package store

import (
	"auction-app/backend/internal/models"
	"errors"
	"strings"

	"gorm.io/gorm"
)

// gormUserStore реализует интерфейс UserStore с использованием GORM
type gormUserStore struct {
	db *gorm.DB
}

// NewGormUserStore создает новый экземпляр gormUserStore
func NewGormUserStore(db *gorm.DB) UserStore {
	return &gormUserStore{db: db}
}

func (s *gormUserStore) CreateUser(user *models.User) error {
	return s.db.Create(user).Error
}

func (s *gormUserStore) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := s.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Пользователь не найден, но это не ошибка приложения
		}
		return nil, err
	}
	return &user, nil
}

func (s *gormUserStore) GetUserByID(id uint) (*models.User, error) {
	var user models.User
	err := s.db.Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (s *gormUserStore) GetAllUsers(offset, limit int, filters map[string]string) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	queryBuilder := s.db.Model(&models.User{})

	if roleFilter, ok := filters["role"]; ok && roleFilter != "" {
		// Это будет искать по основной роли. Если мы хотим искать по availableBusinessRoles, запрос будет сложнее
		// Например, для PostgreSQL: queryBuilder = queryBuilder.Where("available_business_roles::jsonb @> ?", "[\""+roleFilter+"\"]")
		// Пока оставим фильтрацию по основной роли 'role' или потребуем от сервиса обрабатывать 'availableBusinessRoles'
		queryBuilder = queryBuilder.Where("role = ?", roleFilter)
	}
	if emailFilter, ok := filters["email"]; ok && emailFilter != "" {
		queryBuilder = queryBuilder.Where("LOWER(email) LIKE ?", "%"+strings.ToLower(emailFilter)+"%")
	}
	if nameFilter, ok := filters["fullName"]; ok && nameFilter != "" {
		queryBuilder = queryBuilder.Where("LOWER(full_name) LIKE ?", "%"+strings.ToLower(nameFilter)+"%")
	}

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Order("id ASC").Offset(offset).Limit(limit).Find(&users).Error
	// Важно: не возвращать хеши паролей
	for i := range users {
		users[i].PasswordHash = ""
	}
	return users, total, err
}

func (s *gormUserStore) UpdateUser(user *models.User) error {
	// Убедимся, что не пытаемся обновить пароль через этот метод напрямую без хеширования
	// Если нужно обновление пароля, должен быть отдельный метод или проверка в сервисе.
	// PasswordHash не должен напрямую меняться через этот метод из входящих данных.
	// GORM по умолчанию обновляет только ненулевые поля, если модель передается как аргумент Update
	// но `Save` обновит все поля.
	return s.db.Save(user).Error
}
