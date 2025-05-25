package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserRole определяет возможные роли пользователя в системе
type UserRole string

const (
	RoleBuyer          UserRole = "buyer"
	RoleSeller         UserRole = "seller"
	RoleAuctionManager UserRole = "auction_manager"
	RoleSystemAdmin    UserRole = "SYSTEM_ADMIN"
)

// User представляет модель пользователя в системе
type User struct {
	ID                     uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	FullName               string         `gorm:"size:255;not null" json:"fullName"`
	Email                  string         `gorm:"size:255;not null;uniqueIndex" json:"email"`
	PasswordHash           string         `gorm:"size:255;not null" json:"-"`                   // Не отправляем хеш на клиент
	Role                   UserRole       `gorm:"type:varchar(50);default:'buyer'" json:"role"` // Основная или дефолтная роль
	AvailableBusinessRoles string         `gorm:"type:text" json:"availableBusinessRoles"`      // JSON массив строк ['buyer', 'seller', 'auction_manager']
	PassportData           string         `gorm:"size:255" json:"passportData,omitempty"`
	RegistrationDate       time.Time      `gorm:"autoCreateTime" json:"registrationDate"`
	CreatedAt              time.Time      `gorm:"autoCreateTime" json:"-"`
	UpdatedAt              time.Time      `gorm:"autoUpdateTime" json:"-"`
	DeletedAt              gorm.DeletedAt `gorm:"index" json:"-"` // Для мягкого удаления
}

// SetPassword хеширует пароль и устанавливает его для пользователя
func (u *User) SetPassword(password string) error {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return err
	}
	u.PasswordHash = string(hashedPassword)
	return nil
}

// CheckPassword проверяет предоставленный пароль на соответствие хешу
func (u *User) CheckPassword(password string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(u.PasswordHash), []byte(password))
	return err == nil
}

// RegisterUserInput структура для данных при регистрации пользователя
type RegisterUserInput struct {
	FullName     string `json:"fullName" binding:"required"`
	Email        string `json:"email" binding:"required,email"`
	Password     string `json:"password" binding:"required,min=6"` // Валидация на стороне Gin
	PassportData string `json:"passportData" binding:"required"`
	// Роль при регистрации может быть установлена по умолчанию или передаваться
}

// LoginInput структура для данных при входе пользователя
type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}
