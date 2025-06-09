// backend/internal/services/auction_service.go
package services

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"errors"
	"fmt"
	"time"
)

// AuctionService provides business logic for auction operations.
type AuctionService struct {
	auctionStore store.AuctionStore
	lotStore     store.LotStore
}

// NewAuctionService создает новый экземпляр AuctionService.
func NewAuctionService(as store.AuctionStore, ls store.LotStore) *AuctionService {
	return &AuctionService{auctionStore: as, lotStore: ls}
}

// CreateAuction обрабатывает бизнес-логику для создания нового аукциона.
func (s *AuctionService) CreateAuction(input models.CreateAuctionInput, createdByUserID uint) (*models.Auction, error) {
	parsedDate, err := time.Parse("2006-01-02", input.AuctionDateStr)
	if err != nil {
		return nil, fmt.Errorf("некорректный формат даты (ожидается ГГГГ-ММ-ДД): %w", err)
	}
	if len(input.AuctionTime) != 5 || input.AuctionTime[2] != ':' {
		return nil, errors.New("некорректный формат времени (ожидается ЧЧ:ММ)")
	}

	auction := models.Auction{
		NameSpecificity: input.NameSpecificity,
		DescriptionFull: input.DescriptionFull,
		AuctionDate:     parsedDate,
		AuctionTime:     input.AuctionTime,
		Location:        input.Location,
		Status:          models.StatusScheduled,
		CreatedByUserID: createdByUserID,
	}

	if err := s.auctionStore.CreateAuction(&auction); err != nil {
		return nil, fmt.Errorf("ошибка создания аукциона в хранилище: %w", err)
	}
	return &auction, nil
}

// GetAllAuctions возвращает постраничный список аукционов, возможно, с фильтрацией.
func (s *AuctionService) GetAllAuctions(page, pageSize int, filters map[string]string) ([]models.Auction, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	} else if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize

	auctions, total, err := s.auctionStore.GetAllAuctions(offset, pageSize, filters)
	if err != nil {
		return nil, 0, fmt.Errorf("ошибка получения списка аукционов: %w", err)
	}
	return auctions, total, nil
}

// GetAuctionByID извлекает информацию об одном аукционе по его идентификатору, включая лоты.
func (s *AuctionService) GetAuctionByID(id uint) (*models.Auction, error) {
	auction, err := s.auctionStore.GetAuctionByID(id)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукциона ID %d: %w", id, err)
	}
	if auction == nil {
		return nil, errors.New("аукцион не найден")
	}
	return auction, nil
}

// UpdateAuction обрабатывает логику для обновления сведений о существующем аукционе.
func (s *AuctionService) UpdateAuction(auctionID uint, input models.UpdateAuctionInput, currentUserID uint, currentUserRole models.UserRole) (*models.Auction, error) {
	auction, err := s.auctionStore.GetAuctionByID(auctionID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукциона для обновления: %w", err)
	}
	if auction == nil {
		return nil, errors.New("аукцион для обновления не найден")
	}

	canUpdate := false
	if currentUserRole == models.RoleSystemAdmin {
		canUpdate = true
	} else if (currentUserRole == models.RoleSeller) && (auction.CreatedByUserID == currentUserID) {
		canUpdate = true
	}

	if !canUpdate {
		return nil, errors.New("недостаточно прав для редактирования этого аукциона")
	}

	if auction.Status != models.StatusScheduled {
		return nil, errors.New("редактировать можно только запланированные аукционы")
	}

	if input.NameSpecificity != nil {
		auction.NameSpecificity = *input.NameSpecificity
	}
	if input.DescriptionFull != nil {
		auction.DescriptionFull = *input.DescriptionFull
	}
	if input.AuctionDateStr != nil {
		parsedDate, errDate := time.Parse("2006-01-02", *input.AuctionDateStr)
		if errDate != nil {
			return nil, fmt.Errorf("некорректный формат даты для обновления: %w", errDate)
		}
		auction.AuctionDate = parsedDate
	}
	if input.AuctionTime != nil {
		if len(*input.AuctionTime) != 5 || (*input.AuctionTime)[2] != ':' {
			return nil, errors.New("некорректный формат времени для обновления (ожидается ЧЧ:ММ)")
		}
		auction.AuctionTime = *input.AuctionTime
	}
	if input.Location != nil {
		auction.Location = *input.Location
	}

	if err := s.auctionStore.UpdateAuction(auction); err != nil {
		return nil, fmt.Errorf("ошибка обновления аукциона в хранилище: %w", err)
	}
	return auction, nil
}

// UpdateAuctionStatus обрабатывает логику изменения статуса аукциона.
func (s *AuctionService) UpdateAuctionStatus(auctionID uint, newStatus models.AuctionStatus, currentUserID uint, currentUserRole models.UserRole) (*models.Auction, error) {
	if currentUserRole != models.RoleSystemAdmin && currentUserRole != models.RoleSeller {
		return nil, errors.New("недостаточно прав для изменения статуса аукциона")
	}

	auction, err := s.auctionStore.GetAuctionByID(auctionID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукциона для смены статуса: %w", err)
	}
	if auction == nil {
		return nil, errors.New("аукцион для смены статуса не найден")
	}

	if auction.Status == newStatus {
		return auction, nil
	}
	if auction.Status == models.StatusCompleted && newStatus != models.StatusCompleted {
		return nil, errors.New("нельзя изменить статус уже завершенного аукциона (кроме как на 'Завершен' повторно)")
	}
	if auction.Status == models.StatusActive && newStatus == models.StatusScheduled {
		return nil, errors.New("нельзя вернуть активный аукцион в статус 'Запланирован'")
	}

	var lotsToUpdateInStore []models.Lot

	if newStatus == models.StatusCompleted && auction.Status == models.StatusActive {
		lotsWonByUsersOnThisAuction := make(map[uint]uint)
		currentLots := make([]models.Lot, len(auction.Lots))
		copy(currentLots, auction.Lots)

		for i := range currentLots {
			lot := &currentLots[i]

			if (lot.Status == models.StatusLotActive || lot.Status == models.StatusPending) && lot.HighestBidderID != nil {
				buyerID := *lot.HighestBidderID
				if _, alreadyWon := lotsWonByUsersOnThisAuction[buyerID]; alreadyWon {
					if lot.Status != models.StatusUnsold {
						lot.Status = models.StatusUnsold
						lot.HighestBidderID = nil
						lot.FinalBuyerID = nil
						lot.FinalPrice = nil
						lotsToUpdateInStore = append(lotsToUpdateInStore, *lot)
					}
				} else {
					lot.Status = models.StatusSold
					lot.FinalPrice = &lot.CurrentPrice
					lot.FinalBuyerID = lot.HighestBidderID
					lotsWonByUsersOnThisAuction[buyerID] = lot.ID
					lotsToUpdateInStore = append(lotsToUpdateInStore, *lot)
				}
			} else if lot.Status != models.StatusSold && lot.Status != models.StatusUnsold {
				lot.Status = models.StatusUnsold
				lot.HighestBidderID = nil
				lot.FinalBuyerID = nil
				lot.FinalPrice = nil
				lotsToUpdateInStore = append(lotsToUpdateInStore, *lot)
			}
		}
	} else if newStatus == models.StatusActive && auction.Status == models.StatusScheduled {
		currentLots := make([]models.Lot, len(auction.Lots))
		copy(currentLots, auction.Lots)
		for i := range currentLots {
			lot := &currentLots[i]
			if lot.Status == models.StatusPending {
				lot.Status = models.StatusLotActive
				lotsToUpdateInStore = append(lotsToUpdateInStore, *lot)
			}
		}
	}

	err = s.auctionStore.UpdateAuctionStatus(auctionID, newStatus, lotsToUpdateInStore)
	if err != nil {
		return nil, fmt.Errorf("ошибка обновления статуса аукциона и лотов в хранилище: %w", err)
	}

	updatedAuction, fetchErr := s.auctionStore.GetAuctionByID(auctionID)
	if fetchErr != nil {
		return nil, fmt.Errorf("ошибка получения обновленного аукциона: %w", fetchErr)
	}
	return updatedAuction, nil
}

// DeleteAuction управляет логикой удаления аукциона.
func (s *AuctionService) DeleteAuction(auctionID uint, currentUserID uint, currentUserRole models.UserRole) error {
	auction, err := s.auctionStore.GetAuctionByID(auctionID)
	if err != nil {
		return fmt.Errorf("ошибка получения аукциона для удаления: %w", err)
	}
	if auction == nil {
		return errors.New("аукцион для удаления не найден")
	}

	canDelete := false
	if currentUserRole == models.RoleSystemAdmin {
		canDelete = true
	} else if (currentUserRole == models.RoleSeller) && (auction.CreatedByUserID == currentUserID) {
		canDelete = true
	}
	if !canDelete {
		return errors.New("недостаточно прав для удаления этого аукциона")
	}

	if auction.Status == models.StatusActive {
		return errors.New("нельзя удалить активный аукцион. Сначала завершите его")
	}

	return s.auctionStore.DeleteAuction(auctionID)
}

// FindAuctionsBySpecificity retrieves auctions based on specificity query.
func (s *AuctionService) FindAuctionsBySpecificity(query string, page, pageSize int, filters map[string]string) ([]models.Auction, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize
	return s.auctionStore.FindAuctionsBySpecificity(query, offset, pageSize)
}
