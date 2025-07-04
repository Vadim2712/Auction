package models

import (
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"
)

// UserRole определяет возможные роли пользователя в системе
type UserRole string

const (
	RoleBuyer       UserRole = "buyer"
	RoleSeller      UserRole = "seller"
	RoleSystemAdmin UserRole = "SYSTEM_ADMIN"
)

// User представляет модель пользователя в системе
type User struct {
	ID                     uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	FullName               string         `gorm:"size:255;not null" json:"fullName"`
	Email                  string         `gorm:"size:255;not null;uniqueIndex" json:"email"`
	PasswordHash           string         `gorm:"size:255;not null" json:"-"`
	Role                   UserRole       `gorm:"type:varchar(50);default:'buyer'" json:"role"`
	AvailableBusinessRoles string         `gorm:"type:text" json:"availableBusinessRoles"`
	PassportData           string         `gorm:"size:255" json:"passportData,omitempty"`
	IsActive               bool           `gorm:"not null;default:true" json:"isActive"`
	RegistrationDate       time.Time      `gorm:"autoCreateTime" json:"registrationDate"`
	CreatedAt              time.Time      `gorm:"autoCreateTime" json:"-"`
	UpdatedAt              time.Time      `gorm:"autoUpdateTime" json:"-"`
	DeletedAt              gorm.DeletedAt `gorm:"index" json:"-"`
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
	Password     string `json:"password" binding:"required,min=6"`
	PassportData string `json:"passportData" binding:"required"`
}

// LoginInput структура для данных при входе пользователя
type LoginInput struct {
	Email    string `json:"email" binding:"required,email"`
	Password string `json:"password" binding:"required"`
}

// UpdateUserStatusInput структура для обновления статуса пользователя (активен/заблокирован)
type UpdateUserStatusInput struct {
	IsActive bool `json:"isActive"`
}

// UpdateUserRolesInput структура для обновления доступных бизнес-ролей пользователя
type UpdateUserRolesInput struct {
	AvailableBusinessRoles []string `json:"availableBusinessRoles" binding:"required"`
}

type SellerSalesReport struct {
	Seller     User    `json:"seller"`
	TotalSales float64 `json:"totalSales"`
	LotsSold   int64   `json:"lotsSold"`
}
