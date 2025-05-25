package store

import (
	"auction-app/backend/internal/models"

	"gorm.io/gorm"
)

type gormBidStore struct {
	db *gorm.DB
}

func NewGormBidStore(db *gorm.DB) BidStore {
	return &gormBidStore{db: db}
}

func (s *gormBidStore) CreateBid(bid *models.Bid) error {
	return s.db.Create(bid).Error
}

func (s *gormBidStore) GetBidsByLotID(lotID uint) ([]models.Bid, error) {
	var bids []models.Bid
	// Предзагружаем информацию о том, кто сделал ставку
	err := s.db.Preload("User").Where("lot_id = ?", lotID).Order("bid_time DESC").Find(&bids).Error
	return bids, err
}
