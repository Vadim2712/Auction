package store

import (
	"auction-app/backend/internal/models"
	"errors"
	"strconv"

	"gorm.io/gorm"
)

type gormLotStore struct {
	db *gorm.DB
}

func NewGormLotStore(db *gorm.DB) LotStore {
	return &gormLotStore{db: db}
}

func (s *gormLotStore) CreateLot(lot *models.Lot) error {
	var count int64
	s.db.Model(&models.Lot{}).Where("auction_id = ?", lot.AuctionID).Count(&count)
	lot.LotNumber = int(count) + 1
	return s.db.Create(lot).Error
}

func (s *gormLotStore) GetLotsByAuctionID(auctionID uint, offset, limit int) ([]models.Lot, int64, error) {
	var lots []models.Lot
	var total int64
	queryBuilder := s.db.Model(&models.Lot{}).Where("auction_id = ?", auctionID)

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Order("lot_number ASC").Offset(offset).Limit(limit).
		Preload("User").Preload("HighestBidder").
		Find(&lots).Error
	return lots, total, err
}

func (s *gormLotStore) GetLotsBySellerID(sellerID uint, offset, limit int) ([]models.Lot, int64, error) {
	var lots []models.Lot
	var total int64
	queryBuilder := s.db.Model(&models.Lot{}).Where("seller_id = ?", sellerID)

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	err := queryBuilder.Order("created_at DESC").Offset(offset).Limit(limit).
		Preload("FinalBuyer").
		Find(&lots).Error
	return lots, total, err
}

func (s *gormLotStore) GetLeadingBidsByUserID(userID uint, offset, limit int) ([]models.Lot, int64, error) {
	var lots []models.Lot
	var total int64
	queryBuilder := s.db.Model(&models.Lot{}).
		Joins("JOIN auctions ON auctions.id = lots.auction_id AND auctions.status = ?", models.StatusActive).
		Where("lots.highest_bidder_id = ? AND lots.status = ?", userID, models.StatusLotActive)

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Order("lots.created_at DESC").Offset(offset).Limit(limit).
		Preload("User").
		Find(&lots).Error
	return lots, total, err
}

func (s *gormLotStore) GetWonLotsByUserID(userID uint, offset, limit int) ([]models.Lot, int64, error) {
	var lots []models.Lot
	var total int64
	queryBuilder := s.db.Model(&models.Lot{}).
		Where("final_buyer_id = ? AND status = ?", userID, models.StatusSold)

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Order("updated_at DESC").Offset(offset).Limit(limit).
		Preload("User").
		Find(&lots).Error
	return lots, total, err
}

func (s *gormLotStore) GetLotByID(id uint) (*models.Lot, error) {
	var lot models.Lot
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
	if err := s.db.Delete(&models.Lot{}, id).Error; err != nil {
		return err
	}
	return nil
}

func (s *gormLotStore) GetLotWithMaxPriceDifference() (*models.Lot, error) {
	var lot models.Lot
	err := s.db.Where("status = ? AND final_price IS NOT NULL", models.StatusSold).
		Order("(final_price - start_price) DESC").
		Preload("User").
		Preload("FinalBuyer").
		First(&lot).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &lot, nil
}

// GetMostExpensiveSoldLot находит самый дорогой проданный лот
func (s *gormLotStore) GetMostExpensiveSoldLot() (*models.Lot, error) {
	var lot models.Lot
	err := s.db.Where("status = ? AND final_price IS NOT NULL", models.StatusSold).
		Order("final_price DESC").
		Preload("User").
		Preload("FinalBuyer").
		First(&lot).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &lot, nil
}

func (s *gormLotStore) GetTopNSoldLotsByPrice(limit int) ([]models.Lot, error) {
	var lots []models.Lot
	err := s.db.Where("status = ? AND final_price IS NOT NULL", models.StatusSold).
		Order("final_price DESC").
		Limit(limit).
		Preload("User").
		Preload("FinalBuyer").
		Find(&lots).Error
	if err != nil {
		return nil, err
	}
	return lots, nil
}

func (s *gormLotStore) GetActiveLotsByAuctionID(auctionID uint) ([]models.Lot, error) {
	var lots []models.Lot
	err := s.db.Where("auction_id = ? AND status IN (?, ?)", auctionID, models.StatusPending, models.StatusLotActive).
		Order("lot_number ASC").
		Preload("User").
		Find(&lots).Error
	return lots, err
}

func (s *gormLotStore) GetAllLots(offset, limit int, filters map[string]string) ([]models.Lot, int64, error) {
	var lots []models.Lot
	var total int64

	queryBuilder := s.db.Model(&models.Lot{})

	queryBuilder = queryBuilder.Joins("JOIN auctions as auction ON auction.id = lots.auction_id")

	if status, ok := filters["status"]; ok && status != "" {
		queryBuilder = queryBuilder.Where("lots.status = ?", status)
	} else {
		queryBuilder = queryBuilder.Where("lots.status IN (?, ?)", models.StatusPending, models.StatusLotActive)
	}

	if sellerID, ok := filters["sellerId"]; ok && sellerID != "" {
		sID, err := strconv.ParseUint(sellerID, 10, 32)
		if err == nil {
			queryBuilder = queryBuilder.Where("lots.seller_id = ?", uint(sID))
		}
	}
	if auctionID, ok := filters["auctionId"]; ok && auctionID != "" {
		aID, err := strconv.ParseUint(auctionID, 10, 32)
		if err == nil {
			queryBuilder = queryBuilder.Where("lots.auction_id = ?", uint(aID))
		}
	}

	if monthFilter, ok := filters["auctionMonth"]; ok && monthFilter != "" {
		queryBuilder = queryBuilder.Where("to_char(auction.auction_date, 'YYYY-MM') = ?", monthFilter)
	}

	if err := queryBuilder.Select("lots.id").Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []models.Lot{}, 0, nil
	}

	err := queryBuilder.Select("lots.*").
		Order("lots.created_at DESC").
		Offset(offset).
		Limit(limit).
		Preload("User").
		Preload("HighestBidder").
		Preload("FinalBuyer").
		Find(&lots).Error

	return lots, total, err
}
