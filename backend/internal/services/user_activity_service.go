package services

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"fmt"
)

type UserActivityService struct {
	auctionStore store.AuctionStore // Для получения информации об аукционах
	lotStore     store.LotStore     // Для получения информации о лотах
	// userStore store.UserStore // Если понадобится
}

func NewUserActivityService(as store.AuctionStore, ls store.LotStore) *UserActivityService {
	return &UserActivityService{auctionStore: as, lotStore: ls}
}

// GetMyActivity возвращает ставки и выигрыши пользователя
func (s *UserActivityService) GetMyActivity(userID uint) (map[string]interface{}, error) {
	// Эта логика потребует более сложных запросов к БД, чтобы найти:
	// 1. Лоты, где userID является highest_bidder_id и аукцион активен.
	// 2. Лоты, где userID является final_buyer_id и лот продан.

	// Пока что вернем заглушку, так как реализация в GORM потребует
	// итерации по всем аукционам и лотам или более сложного SQL.
	// В GORM это можно сделать, но для краткости сейчас:

	// Здесь должна быть логика, аналогичная той, что была в apiClient.js для getMyActivity,
	// но с использованием вызовов к auctionStore и lotStore для получения данных из БД.
	// Например, получить все аукционы, затем для каждого аукциона его лоты, и отфильтровать.
	// Или сделать специфические запросы в store.

	// Примерная (упрощенная) логика, требующая доработки в store для эффективности:
	allAuctions, _, err := s.auctionStore.GetAllAuctions(0, 9999) // Получаем все аукционы (неэффективно для прода)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукционов: %w", err)
	}

	myLeadingBids := []models.Lot{}
	myWonLots := []models.Lot{}

	for _, auction := range allAuctions {
		// Нужно загрузить лоты для каждого аукциона, если они не были загружены
		// Если GetAllAuctions не грузит лоты, то нужно сделать auctionWithLots, err := s.auctionStore.GetAuctionByID(auction.ID)
		// Предположим, лоты уже есть (или мы их загружаем)
		auctionWithLots, err := s.auctionStore.GetAuctionByID(auction.ID) // Получаем аукцион с лотами
		if err != nil || auctionWithLots == nil {
			continue // Пропускаем, если не удалось загрузить
		}

		for _, lot := range auctionWithLots.Lots {
			if auctionWithLots.Status == models.StatusActive && lot.HighestBidderID != nil && *lot.HighestBidderID == userID {
				myLeadingBids = append(myLeadingBids, lot)
			}
			if lot.Status == models.StatusSold && lot.FinalBuyerID != nil && *lot.FinalBuyerID == userID {
				myWonLots = append(myWonLots, lot)
			}
		}
	}

	return map[string]interface{}{
		"leadingBids": myLeadingBids,
		"wonLots":     myWonLots,
	}, nil
}

// GetMyListings возвращает лоты, выставленные продавцом
func (s *UserActivityService) GetMyListings(sellerID uint) ([]models.Lot, error) {
	// Эта логика также потребует эффективного запроса к БД.
	// Пока что, как и выше, упрощенная логика.
	allAuctions, _, err := s.auctionStore.GetAllAuctions(0, 9999)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукционов: %w", err)
	}

	myListings := []models.Lot{}
	for _, auction := range allAuctions {
		auctionWithLots, err := s.auctionStore.GetAuctionByID(auction.ID)
		if err != nil || auctionWithLots == nil {
			continue
		}
		for _, lot := range auctionWithLots.Lots {
			if lot.SellerID == sellerID {
				myListings = append(myListings, lot)
			}
		}
	}
	return myListings, nil
}
