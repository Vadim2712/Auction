package store

import (
	"auction-app/backend/internal/models"
	"errors"

	"gorm.io/gorm"
)

type gormLotStore struct {
	db *gorm.DB
}

func NewGormLotStore(db *gorm.DB) LotStore {
	return &gormLotStore{db: db}
}

func (s *gormLotStore) CreateLot(lot *models.Lot) error {
	// Перед созданием можно установить LotNumber
	var count int64
	s.db.Model(&models.Lot{}).Where("auction_id = ?", lot.AuctionID).Count(&count)
	lot.LotNumber = int(count) + 1
	return s.db.Create(lot).Error
}

func (s *gormLotStore) GetLotsByAuctionID(auctionID uint) ([]models.Lot, error) {
	var lots []models.Lot
	// Предзагружаем информацию о продавце и лидере ставки
	err := s.db.Preload("User").Preload("HighestBidder").Where("auction_id = ?", auctionID).Order("lot_number ASC").Find(&lots).Error
	return lots, err
}

func (s *gormLotStore) GetLotByID(id uint) (*models.Lot, error) {
	var lot models.Lot
	// Предзагружаем нужные связи
	err := s.db.Preload("User").Preload("HighestBidder").Preload("FinalBuyer").First(&lot, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &lot, nil
}

func (s *gormLotStore) UpdateLot(lot *models.Lot) error {
	return s.db.Save(lot).Error
}

func (s *gormLotStore) DeleteLot(id uint) error {
	// Мягкое удаление, если в модели Lot есть DeletedAt gorm.DeletedAt
	// Прежде чем удалять, можно добавить проверки:
	// - есть ли активные ставки на лот?
	// - не начался ли аукцион, к которому принадлежит лот?
	// Пока что простое удаление. В сервисе будет больше логики.
	if err := s.db.Delete(&models.Lot{}, id).Error; err != nil {
		return err
	}
	return nil
}
