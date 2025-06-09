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

func (s *gormBidStore) GetBidsByLotID(lotID uint, offset, limit int) ([]models.Bid, int64, error) {
	var bids []models.Bid
	var total int64
	queryBuilder := s.db.Model(&models.Bid{}).Where("lot_id = ?", lotID)

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Order("bid_time DESC").Offset(offset).Limit(limit).
		Preload("User").
		Find(&bids).Error
	return bids, total, err
}
