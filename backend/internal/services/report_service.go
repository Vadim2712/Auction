package services

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"fmt"
	"time"
)

// ReportService предоставляет методы для генерации отчетов и выполнения специфических запросов
type ReportService struct {
	auctionStore store.AuctionStore
	lotStore     store.LotStore
	userStore    store.UserStore
}

// NewReportService создает новый экземпляр ReportService
func NewReportService(as store.AuctionStore, ls store.LotStore, us store.UserStore) *ReportService {
	return &ReportService{auctionStore: as, lotStore: ls, userStore: us}
}

// GetLotWithMaxPriceDifference возвращает лот с максимальной разницей между начальной и конечной ценой, а также саму разницу
func (s *ReportService) GetLotWithMaxPriceDifference() (*models.Lot, float64, error) {
	lot, err := s.lotStore.GetLotWithMaxPriceDifference()
	if err != nil {
		return nil, 0, fmt.Errorf("ошибка получения лота с макс. разницей цен из хранилища: %w", err)
	}
	if lot == nil || lot.FinalPrice == nil {
		return nil, 0, nil
	}
	difference := *lot.FinalPrice - lot.StartPrice
	return lot, difference, nil
}

// GetAuctionWithMostSoldLots возвращает аукцион с наибольшим количеством проданных лотов и это количество
func (s *ReportService) GetAuctionWithMostSoldLots() (map[string]interface{}, error) {
	auction, count, err := s.auctionStore.GetAuctionWithMostSoldLots()
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукциона с макс. числом продаж: %w", err)
	}
	if auction == nil {
		return map[string]interface{}{"message": "Нет аукционов с проданными лотами"}, nil
	}
	return map[string]interface{}{
		"auction":   auction,
		"soldCount": count,
	}, nil
}

// GetMostExpensiveSoldLotInfo возвращает информацию о самом дорогом проданном лоте, его продавце и покупателе
func (s *ReportService) GetMostExpensiveSoldLotInfo() (map[string]interface{}, error) {
	lot, err := s.lotStore.GetMostExpensiveSoldLot()
	if err != nil {
		return nil, fmt.Errorf("ошибка получения самого дорогого лота: %w", err)
	}
	if lot == nil {
		return map[string]interface{}{"message": "Проданные лоты не найдены"}, nil
	}

	var sellerInfo *models.User
	if lot.User != nil {
		sellerInfo = lot.User
		sellerInfo.PasswordHash = ""
	}

	var buyerInfo *models.User
	if lot.FinalBuyer != nil {
		buyerInfo = lot.FinalBuyer
		buyerInfo.PasswordHash = ""
	}

	return map[string]interface{}{
		"lot":    lot,
		"seller": sellerInfo,
		"buyer":  buyerInfo,
	}, nil
}

// GetAuctionsWithNoSoldLots возвращает аукционы, на которых не был продан ни один предмет
func (s *ReportService) GetAuctionsWithNoSoldLots(page, pageSize int) ([]models.Auction, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize
	auctions, total, err := s.auctionStore.GetAuctionsWithoutSoldLots(offset, pageSize)
	if err != nil {
		return nil, 0, fmt.Errorf("ошибка получения аукционов без продаж: %w", err)
	}
	return auctions, total, nil
}

// GetTopNMostExpensiveSoldLots возвращает топ N самых дорогих проданных лотов
func (s *ReportService) GetTopNMostExpensiveSoldLots(limit int) ([]models.Lot, error) {
	if limit <= 0 {
		limit = 3
	}
	lots, err := s.lotStore.GetTopNSoldLotsByPrice(limit)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения топ-%d дорогих лотов: %w", limit, err)
	}
	return lots, nil
}

// GetItemsForSaleByDateAndAuction возвращает предметы, выставленные на продажу на заданную дату и аукцион
func (s *ReportService) GetItemsForSaleByDateAndAuction(auctionID uint, dateStr string) ([]models.Lot, error) {
	targetDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, fmt.Errorf("некорректный формат даты (ожидается ГГГГ-ММ-ДД): %w", err)
	}

	auction, err := s.auctionStore.GetAuctionByID(auctionID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукциона ID %d: %w", auctionID, err)
	}
	if auction == nil {
		return nil, fmt.Errorf("аукцион с ID %d не найден", auctionID)
	}

	auctionYear, auctionMonth, auctionDay := auction.AuctionDate.Date()
	targetYear, targetMonth, targetDay := targetDate.Date()

	if auctionYear != targetYear || auctionMonth != targetMonth || auctionDay != targetDay {
		return []models.Lot{}, fmt.Errorf("указанный аукцион (ID: %d) не проводился в дату %s. Фактическая дата аукциона: %s",
			auctionID, dateStr, auction.AuctionDate.Format("2006-01-02"))
	}

	var itemsForSale []models.Lot
	if auction.Status == models.StatusCompleted || auction.Status == "Отменен" {
		return itemsForSale, nil
	}

	for _, lot := range auction.Lots {
		if lot.Status == models.StatusPending || lot.Status == models.StatusLotActive {
			itemsForSale = append(itemsForSale, lot)
		}
	}
	return itemsForSale, nil
}

// GetBuyersOfItemsWithSpecificity возвращает покупателей, купивших предметы заданной специфики аукциона
func (s *ReportService) GetBuyersOfItemsWithSpecificity(specificity string, page, pageSize int) ([]models.User, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	users, total, err := s.userStore.GetBuyersByAuctionSpecificity(specificity, offset, pageSize)
	if err != nil {
		return nil, 0, fmt.Errorf("ошибка получения покупателей по специфике из хранилища: %w", err)
	}
	return users, total, nil
}

// GetSellersWithSalesByAuctionSpecificity возвращает продавцов, продавших предметы на аукционах заданной специфики, с общей суммой продаж не менее minSales, отсортированных по сумме.
func (s *ReportService) GetSellersWithSalesByAuctionSpecificity(specificity string, minSales float64, page, pageSize int) ([]models.SellerSalesReport, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	if minSales < 0 {
		minSales = 0
	}
	offset := (page - 1) * pageSize

	report, total, err := s.userStore.GetSellersWithSalesByAuctionSpecificity(specificity, minSales, offset, pageSize)
	if err != nil {
		return nil, 0, fmt.Errorf("ошибка получения отчета по продажам продавцов: %w", err)
	}
	return report, total, nil
}
