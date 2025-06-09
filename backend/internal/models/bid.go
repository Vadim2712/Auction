package models

import (
	"time"

	"gorm.io/gorm"
)

// Bid представляет модель ставки на лот
type Bid struct {
	ID        uint           `gorm:"primaryKey;autoIncrement" json:"id"`
	LotID     uint           `gorm:"not null;index" json:"lotId"`
	UserID    uint           `gorm:"not null;index" json:"userId"`
	User      User           `gorm:"foreignKey:UserID" json:"bidderInfo,omitempty"`
	BidAmount float64        `gorm:"not null" json:"bidAmount"`
	BidTime   time.Time      `gorm:"autoCreateTime" json:"bidTime"`
	CreatedAt time.Time      `gorm:"autoCreateTime" json:"-"`
	UpdatedAt time.Time      `gorm:"autoUpdateTime" json:"-"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"-"`
}

// PlaceBidInput структура для данных при размещении ставки
type PlaceBidInput struct {
	Amount float64 `json:"amount" binding:"required,gt=0"`
}
