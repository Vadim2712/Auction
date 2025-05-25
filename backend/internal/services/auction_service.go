package services

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"errors"
	"fmt"
	"time"
)

type AuctionService struct {
	auctionStore store.AuctionStore
	lotStore     store.LotStore // Может понадобиться для некоторых операций
	// userStore    store.UserStore // Если нужна проверка прав создателя и т.д.
}

func NewAuctionService(as store.AuctionStore, ls store.LotStore) *AuctionService {
	return &AuctionService{auctionStore: as, lotStore: ls}
}

func (s *AuctionService) CreateAuction(input models.CreateAuctionInput, createdByUserID uint) (*models.Auction, error) {
	parsedDate, err := time.Parse("2006-01-02", input.AuctionDateStr)
	if err != nil {
		return nil, fmt.Errorf("некорректный формат даты: %w", err)
	}

	auction := models.Auction{
		NameSpecificity: input.NameSpecificity,
		DescriptionFull: input.DescriptionFull,
		AuctionDate:     parsedDate,
		AuctionTime:     input.AuctionTime,
		Location:        input.Location,
		Status:          models.StatusScheduled, // Начальный статус
		CreatedByUserID: createdByUserID,
	}

	if err := s.auctionStore.CreateAuction(&auction); err != nil {
		return nil, fmt.Errorf("ошибка создания аукциона в БД: %w", err)
	}
	return &auction, nil
}

func (s *AuctionService) GetAllAuctions(page, pageSize int) ([]models.Auction, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10 // Значение по умолчанию
	}
	offset := (page - 1) * pageSize
	return s.auctionStore.GetAllAuctions(offset, pageSize)
}

func (s *AuctionService) GetAuctionByID(id uint) (*models.Auction, error) {
	auction, err := s.auctionStore.GetAuctionByID(id)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукциона: %w", err)
	}
	if auction == nil {
		return nil, errors.New("аукцион не найден")
	}
	// Лоты уже должны быть предзагружены в store.GetAuctionByID
	return auction, nil
}

func (s *AuctionService) UpdateAuctionStatus(auctionID uint, newStatus models.AuctionStatus, userID uint, userRole models.UserRole) (*models.Auction, error) {
	// Проверка прав: только админ или назначенный менеджер аукциона может менять статус
	// (Пока упростим: предполагаем, что проверка роли сделана в middleware или хендлере)
	if userRole != models.RoleSystemAdmin && userRole != models.RoleAuctionManager {
		// Здесь нужно будет уточнить, если менеджер аукциона может менять статус только "своих" аукционов
		// return nil, errors.New("недостаточно прав для изменения статуса аукциона")
	}

	auction, err := s.auctionStore.GetAuctionByID(auctionID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукциона: %w", err)
	}
	if auction == nil {
		return nil, errors.New("аукцион не найден")
	}

	// Логика смены статусов
	// ... (можно добавить проверки на корректность переходов статусов)

	var lotsToUpdate []models.Lot
	if newStatus == models.StatusCompleted {
		for _, lot := range auction.Lots {
			updatedLot := lot // Копируем лот
			if (lot.Status == models.StatusLotActive || (lot.Status == models.StatusPending && len(lot.Biddings) > 0)) && lot.HighestBidderID != nil {
				updatedLot.Status = models.StatusSold
				updatedLot.FinalPrice = &lot.CurrentPrice
				updatedLot.FinalBuyerID = lot.HighestBidderID
			} else if lot.Status != models.StatusSold { // Не меняем статус уже проданных
				updatedLot.Status = models.StatusUnsold
			}
			lotsToUpdate = append(lotsToUpdate, updatedLot)
		}
	}
	// Обновляем статус аукциона и лоты в одной транзакции через store
	err = s.auctionStore.UpdateAuctionStatus(auctionID, newStatus, lotsToUpdate)
	if err != nil {
		return nil, fmt.Errorf("ошибка обновления статуса аукциона в БД: %w", err)
	}
	// Получаем обновленный аукцион
	updatedAuction, err := s.auctionStore.GetAuctionByID(auctionID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения обновленного аукциона: %w", err)
	}
	return updatedAuction, nil
}
