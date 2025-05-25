package services

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"errors"
	"fmt"
	"strings"
	// "log" // Для отладки
)

type LotService struct {
	lotStore     store.LotStore
	auctionStore store.AuctionStore
	bidStore     store.BidStore
}

func NewLotService(ls store.LotStore, as store.AuctionStore, bs store.BidStore) *LotService {
	return &LotService{lotStore: ls, auctionStore: as, bidStore: bs}
}

func (s *LotService) CreateLot(auctionID uint, input models.CreateLotInput, sellerID uint) (*models.Lot, error) {
	auction, err := s.auctionStore.GetAuctionByID(auctionID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукциона: %w", err)
	}
	if auction == nil {
		return nil, errors.New("аукцион для добавления лота не найден")
	}
	if auction.Status != models.StatusScheduled {
		return nil, errors.New("лоты можно добавлять только в запланированные аукционы")
	}
	lot := models.Lot{
		AuctionID:    auctionID,
		Name:         input.Name,
		Description:  input.Description,
		SellerID:     sellerID,
		StartPrice:   input.StartPrice,
		CurrentPrice: input.StartPrice,
		Status:       models.StatusPending,
	}
	if err := s.lotStore.CreateLot(&lot); err != nil {
		return nil, fmt.Errorf("ошибка создания лота в БД: %w", err)
	}
	return &lot, nil
}

func (s *LotService) PlaceBid(auctionID uint, lotID uint, input models.PlaceBidInput, bidderID uint) (*models.Lot, error) {
	auction, err := s.auctionStore.GetAuctionByID(auctionID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения аукциона: %w", err)
	}
	if auction == nil {
		return nil, errors.New("аукцион не найден")
	}
	if auction.Status != models.StatusActive {
		return nil, errors.New("торги по этому аукциону неактивны")
	}

	lot, err := s.lotStore.GetLotByID(lotID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения лота: %w", err)
	}
	if lot == nil {
		return nil, errors.New("лот не найден")
	}
	if lot.AuctionID != auctionID {
		return nil, errors.New("лот не принадлежит указанному аукциону")
	}

	if lot.Status != models.StatusLotActive && lot.Status != models.StatusPending {
		return nil, errors.New("ставки на данный лот не принимаются (статус лота)")
	}
	if lot.SellerID == bidderID {
		return nil, errors.New("вы не можете делать ставки на собственный лот")
	}
	if input.Amount <= lot.CurrentPrice {
		return nil, fmt.Errorf("ваша ставка должна быть выше текущей цены (%.2f)", lot.CurrentPrice)
	}

	allLotsInAuction, _, errLots := s.lotStore.GetLotsByAuctionID(auctionID, 0, 99999) // Получаем все лоты аукциона без пагинации
	if errLots == nil {                                                                // Если нет ошибки при получении лотов
		for _, otherLot := range allLotsInAuction {
			if otherLot.ID != lotID && // Это другой лот
				otherLot.HighestBidderID != nil && *otherLot.HighestBidderID == bidderID && // Пользователь лидирует
				otherLot.Status != models.StatusSold && otherLot.Status != models.StatusUnsold { // Лот еще в игре
				return nil, errors.New("вы уже лидируете в торгах за другой предмет на этом аукционе, по правилам можно приобрести только один предмет")
			}
		}
	} else {
		// Не удалось проверить правило, возможно, стоит вернуть ошибку или продолжить с осторожностью
		// log.Printf("Warning: Could not verify one-item-rule for user %d on auction %d due to: %v", bidderID, auctionID, errLots)
	}

	bid := models.Bid{
		LotID:     lotID,
		UserID:    bidderID,
		BidAmount: input.Amount,
	}
	if err := s.bidStore.CreateBid(&bid); err != nil { // <--- Используем s.bidStore
		return nil, fmt.Errorf("ошибка сохранения ставки в БД: %w", err)
	}

	lot.CurrentPrice = input.Amount
	highestBidderIDCopy := bidderID
	lot.HighestBidderID = &highestBidderIDCopy
	if lot.Status == models.StatusPending {
		lot.Status = models.StatusLotActive
	}
	if err := s.lotStore.UpdateLot(lot); err != nil {
		return nil, fmt.Errorf("ошибка обновления лота после ставки: %w", err)
	}
	return lot, nil
}

type UpdateLotInput struct {
	Name        *string  `json:"name"`
	Description *string  `json:"description"`
	StartPrice  *float64 `json:"startPrice"`
}

func (s *LotService) UpdateLotDetails(lotID uint, auctionID uint, input UpdateLotInput, currentUserID uint, currentUserRole models.UserRole) (*models.Lot, error) {
	lot, err := s.lotStore.GetLotByID(lotID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения лота: %w", err)
	}
	if lot == nil {
		return nil, errors.New("лот не найден")
	}
	if lot.AuctionID != auctionID {
		return nil, errors.New("лот не принадлежит данному аукциону")
	}

	isSeller := lot.SellerID == currentUserID
	isAdminOrManager := currentUserRole == models.RoleSystemAdmin || currentUserRole == models.RoleAuctionManager
	if !isSeller && !isAdminOrManager {
		return nil, errors.New("недостаточно прав для редактирования этого лота")
	}

	auction, err := s.auctionStore.GetAuctionByID(lot.AuctionID)
	if err != nil || auction == nil {
		return nil, errors.New("не удалось получить информацию об аукционе для лота")
	}

	// Проверяем Biddings через lot.HighestBidderID, т.к. Biddings поле может быть не заполнено в Lot без Preload
	hasBids := lot.HighestBidderID != nil

	if auction.Status != models.StatusScheduled || (lot.Status != models.StatusPending && lot.Status != "") {
		if hasBids || lot.Status == models.StatusLotActive {
			return nil, errors.New("редактировать лот можно только до начала торгов по аукциону и если по лоту не было ставок/активности")
		}
	}

	if input.Name != nil {
		lot.Name = *input.Name
	}
	if input.Description != nil {
		lot.Description = *input.Description
	}
	if input.StartPrice != nil {
		if *input.StartPrice <= 0 {
			return nil, errors.New("стартовая цена должна быть положительной")
		}
		if (lot.Status == models.StatusPending || lot.Status == "") && !hasBids {
			lot.StartPrice = *input.StartPrice
			lot.CurrentPrice = *input.StartPrice
		} else {
			return nil, errors.New("нельзя изменить стартовую цену, если уже есть ставки или торги активны")
		}
	}
	if err := s.lotStore.UpdateLot(lot); err != nil {
		return nil, fmt.Errorf("ошибка обновления лота в БД: %w", err)
	}
	return lot, nil
}

func (s *LotService) DeleteLot(lotID uint, auctionID uint, currentUserID uint, currentUserRole models.UserRole) error {
	lot, err := s.lotStore.GetLotByID(lotID)
	if err != nil {
		return fmt.Errorf("ошибка получения лота: %w", err)
	}
	if lot == nil {
		return errors.New("лот не найден")
	}
	if lot.AuctionID != auctionID {
		return errors.New("лот не принадлежит данному аукциону")
	}

	isSeller := lot.SellerID == currentUserID
	isAdminOrManager := currentUserRole == models.RoleSystemAdmin || currentUserRole == models.RoleAuctionManager
	if !isSeller && !isAdminOrManager {
		return errors.New("недостаточно прав для удаления этого лота")
	}

	auction, err := s.auctionStore.GetAuctionByID(lot.AuctionID)
	if err != nil || auction == nil {
		return errors.New("не удалось получить информацию об аукционе для лота")
	}

	hasBids := lot.HighestBidderID != nil
	if auction.Status != models.StatusScheduled || (lot.Status != models.StatusPending && lot.Status != "") {
		if hasBids || lot.Status == models.StatusLotActive {
			return errors.New("удалить лот можно только до начала торгов по аукциону и если по лоту не было ставок/активности")
		}
	}
	if lot.Status == models.StatusSold || lot.Status == models.StatusUnsold {
		return errors.New("нельзя удалить лот, который участвовал в завершенных торгах")
	}
	return s.lotStore.DeleteLot(lotID)
}

func (s *LotService) GetLotByID(lotID uint) (*models.Lot, error) {
	lot, err := s.lotStore.GetLotByID(lotID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения лота ID %d из хранилища: %w", lotID, err)
	}
	if lot == nil {
		return nil, errors.New("лот не найден")
	}
	return lot, nil
}

func (s *LotService) GetLotsByAuctionID(auctionID uint, page, pageSize int) ([]models.Lot, int64, error) {
	_, err := s.auctionStore.GetAuctionByID(auctionID)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			return nil, 0, fmt.Errorf("аукцион с ID %d не найден", auctionID)
		}
		return nil, 0, fmt.Errorf("ошибка проверки аукциона ID %d: %w", auctionID, err)
	}
	offset := (page - 1) * pageSize
	lots, total, err := s.lotStore.GetLotsByAuctionID(auctionID, offset, pageSize)
	if err != nil {
		return nil, 0, fmt.Errorf("ошибка получения лотов для аукциона ID %d: %w", auctionID, err)
	}
	return lots, total, nil
}

func (s *LotService) GetAllLots(page, pageSize int, filters map[string]string) ([]models.Lot, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	// Дополнительная валидация фильтров может быть здесь
	return s.lotStore.GetAllLots(offset, pageSize, filters)
}
