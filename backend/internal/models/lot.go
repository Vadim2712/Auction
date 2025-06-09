// backend/internal/models/lot.go
package models

import (
	"time"

	"gorm.io/gorm"
)

// LotStatus определяет возможные статусы лота
type LotStatus string

const (
	StatusPending   LotStatus = "Ожидает торгов"
	StatusLotActive LotStatus = "Идет торг"
	StatusSold      LotStatus = "Продан"
	StatusUnsold    LotStatus = "Не продан"
)

// Lot представляет модель лота (предмета) на аукционе
type Lot struct {
	ID              uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	AuctionID       uint           `gorm:"not null;index" json:"auctionId"`
	LotNumber       int            `gorm:"not null" json:"lotNumber"`
	Name            string         `gorm:"size:255;not null" json:"name"`
	Description     string         `gorm:"type:text" json:"description,omitempty"`
	SellerID        uint           `gorm:"not null" json:"sellerId"`
	User            *User          `gorm:"foreignKey:SellerID" json:"-"`
	StartPrice      float64        `gorm:"not null" json:"startPrice"`
	CurrentPrice    float64        `gorm:"not null" json:"currentPrice"`
	FinalPrice      *float64       `json:"finalPrice,omitempty"`
	Status          LotStatus      `gorm:"type:varchar(50);not null;default:'Ожидает торгов'" json:"status"`
	HighestBidderID *uint          `gorm:"index" json:"highestBidderId,omitempty"`
	HighestBidder   *User          `gorm:"foreignKey:HighestBidderID" json:"highestBidderInfo,omitempty"`
	FinalBuyerID    *uint          `gorm:"index" json:"finalBuyerId,omitempty"`
	FinalBuyer      *User          `gorm:"foreignKey:FinalBuyerID" json:"finalBuyerInfo,omitempty"`
	Biddings        []Bid          `gorm:"foreignKey:LotID" json:"-"`
	CreatedAt       time.Time      `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt       time.Time      `gorm:"autoUpdateTime" json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// CreateLotInput структура для данных при создании лота
type CreateLotInput struct {
	Name        string  `json:"name" binding:"required,min=3"`
	Description string  `json:"description"`
	StartPrice  float64 `json:"startPrice" binding:"required,gt=0"`
}

// UpdateLotInput определяет поля, которые можно обновить для лота.
type UpdateLotInput struct {
	Name        *string  `json:"name,omitempty"`
	Description *string  `json:"description,omitempty"`
	StartPrice  *float64 `json:"startPrice,omitempty"`
}
