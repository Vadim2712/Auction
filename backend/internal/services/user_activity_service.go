package services

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"fmt"
)

type UserActivityService struct {
	lotStore     store.LotStore
	auctionStore store.AuctionStore // Может понадобиться для получения названий аукционов, если не предзагружено
}

func NewUserActivityService(ls store.LotStore, as store.AuctionStore) *UserActivityService {
	return &UserActivityService{lotStore: ls, auctionStore: as}
}

type UserActivityOutput struct {
	LeadingBids []LotWithAuctionInfo `json:"leadingBids"`
	WonLots     []LotWithAuctionInfo `json:"wonLots"`
	Pagination  map[string]int64     `json:"pagination,omitempty"` // Для возможной пагинации в будущем
}

type LotWithAuctionInfo struct {
	models.Lot           // Встраиваем структуру лота
	AuctionID     uint   `json:"auctionId"` // Дублируем для удобства, если не встроено
	AuctionName   string `json:"auctionName"`
	AuctionStatus string `json:"auctionStatus"`
}

func (s *UserActivityService) GetMyActivity(userID uint, page, pageSize int) (*UserActivityOutput, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	leadingLotsModels, totalLeading, errLead := s.lotStore.GetLeadingBidsByUserID(userID, offset, pageSize)
	if errLead != nil {
		return nil, fmt.Errorf("ошибка получения лотов, где пользователь лидирует: %w", errLead)
	}

	wonLotsModels, totalWon, errWon := s.lotStore.GetWonLotsByUserID(userID, offset, pageSize)
	if errWon != nil {
		return nil, fmt.Errorf("ошибка получения выигранных лотов: %w", errWon)
	}

	// Преобразуем в LotWithAuctionInfo, если нужно добавить имя аукциона
	// Это можно сделать либо здесь, либо store методы будут возвращать более богатую структуру
	// Для простоты, пока LotStore возвращает models.Lot, а имя аукциона можно получить отдельно, если надо

	output := &UserActivityOutput{
		LeadingBids: []LotWithAuctionInfo{}, // Будет заполнено ниже
		WonLots:     []LotWithAuctionInfo{}, // Будет заполнено ниже
		// Можно добавить логику для общей пагинации, если требуется
	}

	for _, lot := range leadingLotsModels {
		auction, _ := s.auctionStore.GetAuctionByID(lot.AuctionID) // Неэффективно, лучше JOIN в SQL или предзагрузка
		output.LeadingBids = append(output.LeadingBids, LotWithAuctionInfo{
			Lot: lot, AuctionID: lot.AuctionID,
			AuctionName: auction.NameSpecificity, AuctionStatus: string(auction.Status),
		})
	}
	_ = totalLeading // Используем, если нужна пагинация

	for _, lot := range wonLotsModels {
		auction, _ := s.auctionStore.GetAuctionByID(lot.AuctionID)
		output.WonLots = append(output.WonLots, LotWithAuctionInfo{
			Lot: lot, AuctionID: lot.AuctionID,
			AuctionName: auction.NameSpecificity, AuctionStatus: string(auction.Status),
		})
	}
	_ = totalWon // Используем, если нужна пагинация

	return output, nil
}

func (s *UserActivityService) GetMyListings(sellerID uint, page, pageSize int) ([]LotWithAuctionInfo, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	lotsModels, total, err := s.lotStore.GetLotsBySellerID(sellerID, offset, pageSize)
	if err != nil {
		return nil, 0, fmt.Errorf("ошибка получения лотов продавца: %w", err)
	}

	var resultListings []LotWithAuctionInfo
	for _, lot := range lotsModels {
		auction, _ := s.auctionStore.GetAuctionByID(lot.AuctionID)
		resultListings = append(resultListings, LotWithAuctionInfo{
			Lot: lot, AuctionID: lot.AuctionID,
			AuctionName: auction.NameSpecificity, AuctionStatus: string(auction.Status),
		})
	}

	return resultListings, total, nil
}
