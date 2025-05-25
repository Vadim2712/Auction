package models

import (
	"time"

	"gorm.io/gorm"
)

// AuctionStatus определяет возможные статусы аукциона
type AuctionStatus string

const (
	StatusScheduled AuctionStatus = "Запланирован"
	StatusActive    AuctionStatus = "Идет торг"
	StatusCompleted AuctionStatus = "Завершен"
	// Можно добавить другие статусы, например, "Отменен"
)

// Auction представляет модель аукциона
type Auction struct {
	ID              uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	NameSpecificity string         `gorm:"size:255;not null" json:"nameSpecificity"`
	DescriptionFull string         `gorm:"type:text" json:"descriptionFull,omitempty"`
	AuctionDate     time.Time      `gorm:"not null" json:"auctionDate"`        // Только дата
	AuctionTime     string         `gorm:"size:5;not null" json:"auctionTime"` // Время в формате HH:MM
	Location        string         `gorm:"size:255;not null" json:"location"`
	Status          AuctionStatus  `gorm:"type:varchar(50);not null;default:'Запланирован'" json:"status"`
	CreatedByUserID uint           `gorm:"not null" json:"createdByUserId"`            // ID администратора или менеджера
	User            User           `gorm:"foreignKey:CreatedByUserID" json:"-"`        // Связь для GORM, не для JSON
	Lots            []Lot          `gorm:"foreignKey:AuctionID" json:"lots,omitempty"` // Список лотов аукциона
	CreatedAt       time.Time      `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt       time.Time      `gorm:"autoUpdateTime" json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// CreateAuctionInput структура для данных при создании аукциона
type CreateAuctionInput struct {
	NameSpecificity string `json:"nameSpecificity" binding:"required,min=5"`
	DescriptionFull string `json:"descriptionFull"`
	AuctionDateStr  string `json:"auctionDate" binding:"required"`       // Дата как строка "YYYY-MM-DD"
	AuctionTime     string `json:"auctionTime" binding:"required,len=5"` // Время "HH:MM"
	Location        string `json:"location" binding:"required,min=3"`
	// CreatedByUserID будет браться из токена аутентифицированного пользователя (админа/менеджера)
}

// UpdateAuctionStatusInput структура для обновления статуса аукциона
type UpdateAuctionStatusInput struct {
	Status AuctionStatus `json:"status" binding:"required"`
}
