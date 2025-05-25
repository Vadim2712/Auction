package store

import (
	"auction-app/backend/internal/models"
	"errors"

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

// TODO: Реализовать другие методы для UserStore, если они понадобятся (UpdateUser, DeleteUser и т.д.)
