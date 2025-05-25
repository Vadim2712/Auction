package services

import (
	"auction-app/backend/internal/models" // Убедитесь, что путь правильный
	"auction-app/backend/internal/store"
	"errors" // Для заглушек
	"fmt"
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
	// TODO: Реализовать логику в s.auctionStore.GetAuctionsWithoutSoldLots(offset, limit)
	// и вызвать ее здесь.
	return nil, 0, errors.New("метод GetAuctionsWithNoSoldLots еще не реализован в сервисе")
}

func (s *ReportService) GetTopNMostExpensiveSoldLots(limit int) ([]models.Lot, error) {
	// TODO: Реализовать логику в s.lotStore.GetTopNSoldLotsByPrice(limit)
	// и вызвать ее здесь.
	return nil, errors.New("метод GetTopNMostExpensiveSoldLots еще не реализован в сервисе")
}

func (s *ReportService) GetItemsForSaleByDateAndAuction(auctionID uint, dateStr string) ([]models.Lot, error) {
	// TODO: Реализовать логику:
	// 1. Получить аукцион по ID из s.auctionStore.
	// 2. Проверить, что дата аукциона совпадает с dateStr.
	// 3. Если совпадает, получить его лоты (s.lotStore.GetLotsByAuctionID)
	// 4. Отфильтровать лоты со статусом 'Ожидает торгов' или 'Идет торг'.
	return nil, errors.New("метод GetItemsForSaleByDateAndAuction еще не реализован в сервисе")
}

func (s *ReportService) GetBuyersOfItemsWithSpecificity(specificity string, page, pageSize int) ([]models.User, int64, error) {
	// TODO: Реализовать логику в s.userStore (или через s.lotStore/s.auctionStore с JOIN'ами)
	return nil, 0, errors.New("метод GetBuyersOfItemsWithSpecificity еще не реализован в сервисе")
}

func (s *ReportService) GetSellersByItemCategory(category string, page, pageSize int) ([]models.User, int64, error) {
	// TODO: Реализовать логику в s.userStore (или через s.lotStore/s.auctionStore с JOIN'ами)
	return nil, 0, errors.New("метод GetSellersByItemCategory еще не реализован в сервисе")
}
