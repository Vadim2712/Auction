// backend/internal/models/auction.go
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
)

// Auction представляет модель аукциона
type Auction struct {
	ID              uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	NameSpecificity string         `gorm:"size:255;not null" json:"nameSpecificity"`
	DescriptionFull string         `gorm:"type:text" json:"descriptionFull,omitempty"`
	AuctionDate     time.Time      `gorm:"not null" json:"auctionDate"`
	AuctionTime     string         `gorm:"size:5;not null" json:"auctionTime"`
	Location        string         `gorm:"size:255;not null" json:"location"`
	Status          AuctionStatus  `gorm:"type:varchar(50);not null;default:'Запланирован'" json:"status"`
	CreatedByUserID uint           `gorm:"not null" json:"createdByUserId"`
	User            User           `gorm:"foreignKey:CreatedByUserID" json:"-"`
	Lots            []Lot          `gorm:"foreignKey:AuctionID" json:"lots,omitempty"`
	CreatedAt       time.Time      `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt       time.Time      `gorm:"autoUpdateTime" json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// CreateAuctionInput структура для данных при создании аукциона
type CreateAuctionInput struct {
	NameSpecificity string `json:"nameSpecificity" binding:"required,min=5"`
	DescriptionFull string `json:"descriptionFull"`
	AuctionDateStr  string `json:"auctionDate" binding:"required"`
	AuctionTime     string `json:"auctionTime" binding:"required,len=5"`
	Location        string `json:"location" binding:"required,min=3"`
}

// UpdateAuctionStatusInput структура для обновления статуса аукциона
type UpdateAuctionStatusInput struct {
	Status AuctionStatus `json:"status" binding:"required"`
}

// UpdateAuctionInput определяет поля, которые можно обновить для аукциона.
type UpdateAuctionInput struct {
	NameSpecificity *string `json:"nameSpecificity,omitempty"`
	DescriptionFull *string `json:"descriptionFull,omitempty"`
	AuctionDateStr  *string `json:"auctionDate,omitempty"`
	AuctionTime     *string `json:"auctionTime,omitempty"`
	Location        *string `json:"location,omitempty"`
}
