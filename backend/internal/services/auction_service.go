// backend/internal/services/auction_service.go
package services

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"errors"
	"fmt"
	"time"
	// "log" // Uncomment for debugging if needed
)

// AuctionService provides business logic for auction operations.
type AuctionService struct {
	auctionStore store.AuctionStore
	lotStore     store.LotStore // Needed for updating lot statuses when an auction completes
}

// NewAuctionService creates a new instance of AuctionService.
func NewAuctionService(as store.AuctionStore, ls store.LotStore) *AuctionService {
	return &AuctionService{auctionStore: as, lotStore: ls}
}

// CreateAuction handles the business logic for creating a new auction.
// Права на создание проверяются в обработчике (api/auction_handler.go).
// Здесь сервис просто выполняет создание, если вызван.
func (s *AuctionService) CreateAuction(input models.CreateAuctionInput, createdByUserID uint) (*models.Auction, error) {
	parsedDate, err := time.Parse("2006-01-02", input.AuctionDateStr)
	if err != nil {
		return nil, fmt.Errorf("некорректный формат даты (ожидается ГГГГ-ММ-ДД): %w", err)
	}
	if len(input.AuctionTime) != 5 || input.AuctionTime[2] != ':' {
		return nil, errors.New("некорректный формат времени (ожидается ЧЧ:ММ)")
	}
	// Дополнительная валидация (например, дата аукциона не в прошлом) может быть добавлена здесь.
	// Например: if parsedDate.Before(time.Now().Truncate(24 * time.Hour)) { return nil, errors.New("дата аукциона не может быть в прошлом") }

	auction := models.Auction{
		NameSpecificity: input.NameSpecificity,
		DescriptionFull: input.DescriptionFull,
		AuctionDate:     parsedDate,
		AuctionTime:     input.AuctionTime,
		Location:        input.Location,
		Status:          models.StatusScheduled, // Аукционы по умолчанию "Запланирован"
		CreatedByUserID: createdByUserID,
	}

	if err := s.auctionStore.CreateAuction(&auction); err != nil {
		return nil, fmt.Errorf("ошибка создания аукциона в хранилище: %w", err)
	}
	return &auction, nil
}

// GetAllAuctions retrieves a paginated list of auctions, possibly filtered.
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

// GetAuctionByID retrieves a single auction by its ID, including its lots.
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

// UpdateAuction handles logic for updating an existing auction's details.
// Only auctions in 'Scheduled' status can be updated by their creator (if Seller) or a SystemAdmin.
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
	} else if (currentUserRole == models.RoleSeller) && (auction.CreatedByUserID == currentUserID) { // Продавец (создатель) может редактировать
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

// UpdateAuctionStatus handles the logic for changing an auction's status.
// Includes logic for updating lot statuses when an auction is completed.
func (s *AuctionService) UpdateAuctionStatus(auctionID uint, newStatus models.AuctionStatus, currentUserID uint, currentUserRole models.UserRole) (*models.Auction, error) {
	if currentUserRole != models.RoleSystemAdmin && currentUserRole != models.RoleSeller { // Продавец может менять статус
		return nil, errors.New("недостаточно прав для изменения статуса аукциона")
	}

	auction, err := s.auctionStore.GetAuctionByID(auctionID) // GetAuctionByID должен предзагружать Lots
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукциона для смены статуса: %w", err)
	}
	if auction == nil {
		return nil, errors.New("аукцион для смены статуса не найден")
	}

	if auction.Status == newStatus {
		return auction, nil // Статус не изменился
	}
	if auction.Status == models.StatusCompleted && newStatus != models.StatusCompleted {
		return nil, errors.New("нельзя изменить статус уже завершенного аукциона (кроме как на 'Завершен' повторно)")
	}
	if auction.Status == models.StatusActive && newStatus == models.StatusScheduled {
		return nil, errors.New("нельзя вернуть активный аукцион в статус 'Запланирован'")
	}

	var lotsToUpdateInStore []models.Lot

	if newStatus == models.StatusCompleted && auction.Status == models.StatusActive {
		lotsWonByUsersOnThisAuction := make(map[uint]uint) // userID -> lotID (первого выигранного лота)

		// Создаем изменяемую копию лотов для обновления
		currentLots := make([]models.Lot, len(auction.Lots))
		copy(currentLots, auction.Lots) // Копируем содержимое

		for i := range currentLots {
			lot := &currentLots[i] // Работаем с указателем для модификации копии

			if (lot.Status == models.StatusLotActive || lot.Status == models.StatusPending) && lot.HighestBidderID != nil {
				buyerID := *lot.HighestBidderID
				if _, alreadyWon := lotsWonByUsersOnThisAuction[buyerID]; alreadyWon {
					// Покупатель уже выиграл другой лот (winningLotID) на этом аукционе.
					// Текущий лот (lot.ID) становится непроданным для этого покупателя.
					if lot.Status != models.StatusUnsold {
						lot.Status = models.StatusUnsold
						lot.HighestBidderID = nil // Очищаем лидера, так как он не может купить этот лот
						lot.FinalBuyerID = nil    // Убедимся, что и финальный покупатель очищен
						lot.FinalPrice = nil      // И финальная цена
						lotsToUpdateInStore = append(lotsToUpdateInStore, *lot)
					}
				} else {
					// Это первый лот, который этот покупатель выигрывает на этом аукционе
					lot.Status = models.StatusSold
					lot.FinalPrice = &lot.CurrentPrice
					lot.FinalBuyerID = lot.HighestBidderID
					lotsWonByUsersOnThisAuction[buyerID] = lot.ID // Запоминаем ID выигранного лота
					lotsToUpdateInStore = append(lotsToUpdateInStore, *lot)
				}
			} else if lot.Status != models.StatusSold && lot.Status != models.StatusUnsold {
				// Лоты без выигрышных ставок или уже обработанные становятся непроданными (если не были проданы)
				lot.Status = models.StatusUnsold
				lot.HighestBidderID = nil // Также очищаем, если не было ставок или ставка была, но лот стал непроданным
				lot.FinalBuyerID = nil
				lot.FinalPrice = nil
				lotsToUpdateInStore = append(lotsToUpdateInStore, *lot)
			}
		}
	} else if newStatus == models.StatusActive && auction.Status == models.StatusScheduled {
		// При старте аукциона, все лоты со статусом Pending переводятся в LotActive
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

// DeleteAuction handles logic for deleting an auction.
// Only auctions in 'Scheduled' or 'Completed' status
// can be deleted by their creator (if Seller) or a SystemAdmin.
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
	} else if (currentUserRole == models.RoleSeller) && (auction.CreatedByUserID == currentUserID) { // Продавец (создатель) может удалять
		canDelete = true
	}
	if !canDelete {
		return errors.New("недостаточно прав для удаления этого аукциона")
	}

	// Бизнес-правила для удаления (уже частично есть в store.DeleteAuction)
	// Здесь можно добавить более высокоуровневые проверки, если store.DeleteAuction их не делает.
	// Например, если store.DeleteAuction не проверяет статус, то проверить здесь:
	if auction.Status == models.StatusActive {
		return errors.New("нельзя удалить активный аукцион. Сначала завершите его.")
	}
	// store.DeleteAuction также содержит проверки на активные/ожидающие лоты
	// и на статус самого аукциона.

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
