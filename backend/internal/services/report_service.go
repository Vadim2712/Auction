package services

import (
	"auction-app/backend/internal/models" // Убедитесь, что путь правильный
	"auction-app/backend/internal/store"
	"errors" // Для заглушек
	"fmt"
	"time"
)

type ReportService struct {
	auctionStore store.AuctionStore
	lotStore     store.LotStore
	userStore    store.UserStore // Для получения данных о продавце/покупателе
}

// NewReportService создает новый экземпляр ReportService
func NewReportService(as store.AuctionStore, ls store.LotStore, us store.UserStore) *ReportService {
	return &ReportService{auctionStore: as, lotStore: ls, userStore: us}
}

// GetLotWithMaxPriceDifference возвращает лот с максимальной разницей между начальной и конечной ценой
func (s *ReportService) GetLotWithMaxPriceDifference() (*models.Lot, float64, error) {
	lot, err := s.lotStore.GetLotWithMaxPriceDifference() // Этот метод должен быть в LotStore
	if err != nil {
		return nil, 0, fmt.Errorf("ошибка получения лота с макс. разницей цен: %w", err)
	}
	if lot == nil || lot.FinalPrice == nil { // Нет проданных лотов или нет финальной цены
		// Возвращаем nil, nil, nil чтобы указать, что данных нет, но ошибки не было
		return nil, 0, nil
	}
	difference := *lot.FinalPrice - lot.StartPrice
	return lot, difference, nil
}

// GetAuctionWithMostSoldLots ...
func (s *ReportService) GetAuctionWithMostSoldLots() (map[string]interface{}, error) {
	auction, count, err := s.auctionStore.GetAuctionWithMostSoldLots()
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукциона с макс. числом продаж: %w", err)
	}
	if auction == nil { // Если store возвращает nil, nil при отсутствии данных
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
	if lot == nil { // Если store возвращает nil при отсутствии данных
		return map[string]interface{}{"message": "Проданные лоты не найдены"}, nil
	}

	var seller *models.User // Expects a pointer
	if lot.SellerID != 0 {
		seller = lot.User // ERROR: lot.User is models.User, not *models.User
	}

	var buyer *models.User
	if lot.FinalBuyerID != nil { // GORM предзагрузка FinalBuyer в LotStore.GetMostExpensiveSoldLot
		buyer = lot.FinalBuyer // Предполагаем, что GORM заполнил это поле
	}

	// Убираем пароли из ответа, если они там есть (лучше делать это при запросе из UserStore)
	if seller != nil {
		seller.PasswordHash = ""
	}
	if buyer != nil {
		buyer.PasswordHash = ""
	}

	return map[string]interface{}{
		"lot":    lot,
		"seller": seller,
		"buyer":  buyer,
	}, nil
}

func (s *ReportService) GetAuctionsWithNoSoldLots(page, pageSize int) ([]models.Auction, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize
	return s.auctionStore.GetAuctionsWithoutSoldLots(offset, pageSize)
}

func (s *ReportService) GetTopNMostExpensiveSoldLots(limit int) ([]models.Lot, error) {
	if limit <= 0 {
		limit = 3 // Значение по умолчанию
	}
	lots, err := s.lotStore.GetTopNSoldLotsByPrice(limit)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения топ-%d дорогих лотов: %w", limit, err)
	}
	return lots, nil
}

func (s *ReportService) GetItemsForSaleByDateAndAuction(auctionID uint, dateStr string) ([]models.Lot, error) {
	targetDate, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		return nil, fmt.Errorf("некорректный формат даты: %w", err)
	}

	auction, err := s.auctionStore.GetAuctionByID(auctionID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукциона: %w", err)
	}
	if auction == nil {
		return nil, errors.New("аукцион не найден")
	}

	// Проверяем, что дата аукциона совпадает с запрошенной датой (только день, месяц, год)
	if auction.AuctionDate.Year() != targetDate.Year() ||
		auction.AuctionDate.Month() != targetDate.Month() ||
		auction.AuctionDate.Day() != targetDate.Day() {
		return nil, fmt.Errorf("указанный аукцион (ID: %d) не проводился в дату %s", auctionID, dateStr)
	}

	// Если аукцион не активен и не запланирован, то предметы не "выставлены на продажу" в контексте торгов
	if auction.Status != models.StatusActive && auction.Status != models.StatusScheduled {
		return []models.Lot{}, nil // Возвращаем пустой список, если аукцион завершен/отменен
	}

	// Получаем лоты, которые на данный момент выставлены на продажу (не проданы/не сняты)
	lots, err := s.lotStore.GetActiveLotsByAuctionID(auctionID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения лотов для аукциона ID %d: %w", auctionID, err)
	}
	return lots, nil
}

func (s *ReportService) GetBuyersOfItemsWithSpecificity(specificity string, page, pageSize int) ([]models.User, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize
	return s.userStore.GetBuyersByAuctionSpecificity(specificity, offset, pageSize)
}

func (s *ReportService) GetSellersByItemCategory(category string, page, pageSize int) ([]models.User, int64, error) {
	// TODO: Реализовать логику в s.userStore (или через s.lotStore/s.auctionStore с JOIN'ами)
	return nil, 0, errors.New("метод GetSellersByItemCategory еще не реализован в сервисе")
}

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
	return s.userStore.GetSellersWithSalesByAuctionSpecificity(specificity, minSales, offset, pageSize)
}
