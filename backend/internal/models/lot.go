package models

import (
	"time"

	"gorm.io/gorm"
)

// LotStatus определяет возможные статусы лота
type LotStatus string

const (
	StatusPending   LotStatus = "Ожидает торгов"
	StatusLotActive LotStatus = "Идет торг" // Используем другое имя, чтобы не конфликтовало с AuctionStatus
	StatusSold      LotStatus = "Продан"
	StatusUnsold    LotStatus = "Не продан"
)

// Lot представляет модель лота (предмета) на аукционе
type Lot struct {
	ID              uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	AuctionID       uint           `gorm:"not null;index" json:"auctionId"` // Внешний ключ на Auction
	LotNumber       int            `gorm:"not null" json:"lotNumber"`       // Порядковый номер лота в рамках аукциона
	Name            string         `gorm:"size:255;not null" json:"name"`
	Description     string         `gorm:"type:text" json:"description,omitempty"`
	SellerID        uint           `gorm:"not null" json:"sellerId"`     // Внешний ключ на User (Продавец)
	User            *User          `gorm:"foreignKey:SellerID" json:"-"` // Связь для GORM (Продавец)
	StartPrice      float64        `gorm:"not null" json:"startPrice"`
	CurrentPrice    float64        `gorm:"not null" json:"currentPrice"`
	FinalPrice      *float64       `json:"finalPrice,omitempty"` // Указатель, так как может быть NULL
	Status          LotStatus      `gorm:"type:varchar(50);not null;default:'Ожидает торгов'" json:"status"`
	HighestBidderID *uint          `gorm:"index" json:"highestBidderId,omitempty"`                        // Внешний ключ на User (Покупатель), указатель
	HighestBidder   *User          `gorm:"foreignKey:HighestBidderID" json:"highestBidderInfo,omitempty"` // Для предзагрузки информации о лидере
	FinalBuyerID    *uint          `gorm:"index" json:"finalBuyerId,omitempty"`                           // Внешний ключ на User (Покупатель), указатель
	FinalBuyer      *User          `gorm:"foreignKey:FinalBuyerID" json:"finalBuyerInfo,omitempty"`       // Для предзагрузки информации о покупателе
	Biddings        []Bid          `gorm:"foreignKey:LotID" json:"-"`                                     // Если нужна полная история ставок для лота
	CreatedAt       time.Time      `gorm:"autoCreateTime" json:"createdAt"`
	UpdatedAt       time.Time      `gorm:"autoUpdateTime" json:"updatedAt"`
	DeletedAt       gorm.DeletedAt `gorm:"index" json:"-"`
}

// CreateLotInput структура для данных при создании лота
type CreateLotInput struct {
	Name        string  `json:"name" binding:"required,min=3"`
	Description string  `json:"description"`
	StartPrice  float64 `json:"startPrice" binding:"required,gt=0"`
	// SellerID будет браться из токена аутентифицированного пользователя (продавца/админа)
	// AuctionID будет браться из параметра URL
}
