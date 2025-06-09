package store

import (
	"auction-app/backend/internal/models"
	"errors"
	"strings"

	"gorm.io/gorm"
)

type gormAuctionStore struct {
	db *gorm.DB
}

func NewGormAuctionStore(db *gorm.DB) AuctionStore {
	return &gormAuctionStore{db: db}
}

func (s *gormAuctionStore) FindAuctionsBySpecificity(specificityQuery string, offset, limit int) ([]models.Auction, int64, error) {
	var auctions []models.Auction
	var total int64
	query := "%" + strings.ToLower(specificityQuery) + "%"

	dbQueryTotal := s.db.Model(&models.Auction{}).Where("LOWER(name_specificity) LIKE ?", query)
	if err := dbQueryTotal.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	dbQueryFind := s.db.Where("LOWER(name_specificity) LIKE ?", query).
		Order("auction_date DESC").Offset(offset).Limit(limit).
		Preload("Lots")

	if err := dbQueryFind.Find(&auctions).Error; err != nil {
		return nil, 0, err
	}
	return auctions, total, nil
}

func (s *gormAuctionStore) CreateAuction(auction *models.Auction) error {
	return s.db.Create(auction).Error
}

func (s *gormAuctionStore) GetAllAuctions(offset, limit int, filters map[string]string) ([]models.Auction, int64, error) {
	var auctions []models.Auction
	var total int64

	queryBuilder := s.db.Model(&models.Auction{})

	if status, ok := filters["status"]; ok && status != "" {
		queryBuilder = queryBuilder.Where("status = ?", status)
	}
	if dateFrom, ok := filters["dateFrom"]; ok && dateFrom != "" {
		queryBuilder = queryBuilder.Where("auction_date >= ?", dateFrom)
	}
	if dateTo, ok := filters["dateTo"]; ok && dateTo != "" {
		queryBuilder = queryBuilder.Where("auction_date <= ?", dateTo)
	}

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Order("auction_date DESC, created_at DESC").Offset(offset).Limit(limit).Find(&auctions).Error
	return auctions, total, err
}

func (s *gormAuctionStore) GetAuctionByID(id uint) (*models.Auction, error) {
	var auction models.Auction
	err := s.db.Preload("Lots").Preload("User").First(&auction, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
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
		if err := tx.Model(&models.Auction{}).Where("id = ?", id).Update("status", status).Error; err != nil {
			return err
		}

		for _, lot := range lotsToUpdate {
			if err := tx.Save(&lot).Error; err != nil {
				return err
			}
		}
		return nil
	})
}

func (s *gormAuctionStore) DeleteAuction(id uint) error {
	var count int64
	s.db.Model(&models.Lot{}).Where("auction_id = ? AND status IN (?, ?)", id, models.StatusLotActive, models.StatusPending).Count(&count)
	if count > 0 {
		return errors.New("нельзя удалить аукцион, на котором есть активные или ожидающие торгов лоты")
	}
	var auction models.Auction
	if err := s.db.First(&auction, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("аукцион не найден")
		}
		return err
	}
	if auction.Status != models.StatusCompleted && auction.Status != models.StatusScheduled {
		return errors.New("нельзя удалить аукцион, который идет или не был корректно завершен (и имеет активные лоты)")
	}

	if err := s.db.Delete(&models.Auction{}, id).Error; err != nil {
		return err
	}
	return nil
}

// GetAuctionWithMostSoldLots находит аукцион с наибольшим количеством проданных лотов
func (s *gormAuctionStore) GetAuctionWithMostSoldLots() (*models.Auction, int64, error) {
	var result struct {
		AuctionID uint  `gorm:"column:auction_id"`
		SoldCount int64 `gorm:"column:sold_count"`
	}

	err := s.db.Model(&models.Lot{}).
		Select("auction_id, count(*) as sold_count").
		Where("status = ?", models.StatusSold).
		Group("auction_id").
		Order("sold_count DESC").
		Limit(1).
		Scan(&result).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, nil
		}
		return nil, 0, err
	}

	if result.AuctionID == 0 {
		return nil, 0, nil
	}

	var auction models.Auction
	if err := s.db.Preload("Lots", "status = ?", models.StatusSold).Preload("User").First(&auction, result.AuctionID).Error; err != nil {
		return nil, 0, err
	}

	return &auction, result.SoldCount, nil
}

func (s *gormAuctionStore) GetAuctionsWithoutSoldLots(offset, limit int) ([]models.Auction, int64, error) {
	var auctions []models.Auction
	var total int64

	var subQuery = s.db.Model(&models.Lot{}).Select("DISTINCT auction_id").Where("status = ?", models.StatusSold)

	queryBuilder := s.db.Model(&models.Auction{}).
		Where("id NOT IN (?)", subQuery).
		Where("status = ?", models.StatusCompleted)

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Order("auction_date DESC").Offset(offset).Limit(limit).
		Preload("User").
		Find(&auctions).Error

	return auctions, total, err
}
