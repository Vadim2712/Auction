package store

import (
	"auction-app/backend/internal/models"
	"errors"

	"gorm.io/gorm"
)

type gormAuctionStore struct {
	db *gorm.DB
}

func NewGormAuctionStore(db *gorm.DB) AuctionStore {
	return &gormAuctionStore{db: db}
}

func (s *gormAuctionStore) CreateAuction(auction *models.Auction) error {
	return s.db.Create(auction).Error
}

func (s *gormAuctionStore) GetAllAuctions(offset, limit int) ([]models.Auction, int64, error) {
	var auctions []models.Auction
	var total int64

	// Сначала считаем общее количество для пагинации
	if err := s.db.Model(&models.Auction{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Затем получаем срез данных с пагинацией и сортировкой
	// Сортируем по дате аукциона, например, сначала более свежие
	err := s.db.Order("auction_date DESC").Offset(offset).Limit(limit).Find(&auctions).Error
	return auctions, total, err
}

func (s *gormAuctionStore) GetAuctionByID(id uint) (*models.Auction, error) {
	var auction models.Auction
	// Предзагружаем лоты и информацию о создателе
	err := s.db.Preload("Lots").Preload("User").First(&auction, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Не найдено
		}
		return nil, err
	}
	return &auction, nil
}

func (s *gormAuctionStore) UpdateAuction(auction *models.Auction) error {
	return s.db.Save(auction).Error
}

// UpdateAuctionStatus обновляет статус аукциона и его лотов в одной транзакции
func (s *gormAuctionStore) UpdateAuctionStatus(id uint, status models.AuctionStatus, lotsToUpdate []models.Lot) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Обновляем статус самого аукциона
		if err := tx.Model(&models.Auction{}).Where("id = ?", id).Update("status", status).Error; err != nil {
			return err
		}

		// 2. Обновляем статусы и финальные данные для лотов (если они переданы)
		// Эта логика теперь будет в сервисе, здесь просто обновляем то, что передали
		for _, lot := range lotsToUpdate {
			if err := tx.Save(&lot).Error; err != nil { // Save обновит существующие или создаст, если PK нет (но у нас есть)
				return err // Откат транзакции, если ошибка
			}
		}
		return nil // Коммит транзакции
	})
}
