// backend/internal/services/lot_service.go
package services

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
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

	allLotsInAuction, _, errLots := s.lotStore.GetLotsByAuctionID(auctionID, 0, 0)
	if errLots == nil {
		for _, otherLot := range allLotsInAuction {
			if otherLot.ID != lotID &&
				otherLot.HighestBidderID != nil && *otherLot.HighestBidderID == bidderID &&
				(otherLot.Status == models.StatusLotActive || otherLot.Status == models.StatusPending) {
				return nil, errors.New("вы уже лидируете в торгах за другой предмет на этом аукционе. По правилам, можно приобрести только один предмет. Сначала ваша предыдущая лидирующая ставка должна быть перебита")
			}
		}
	} else {
		return nil, fmt.Errorf("не удалось проверить правило одного предмета из-за внутренней ошибки: %w", errLots)
	}

	bid := models.Bid{
		LotID:     lotID,
		UserID:    bidderID,
		BidAmount: input.Amount,
	}
	if err := s.bidStore.CreateBid(&bid); err != nil {
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

// Используем models.UpdateLotInput вместо локального определения
func (s *LotService) UpdateLotDetails(lotID uint, auctionID uint, input models.UpdateLotInput, currentUserID uint, currentUserRole models.UserRole) (*models.Lot, error) {
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

	if currentUserRole != models.RoleSystemAdmin && currentUserRole != models.RoleSeller {
		return nil, errors.New("недостаточно прав для редактирования этого лота (требуется роль Администратора или Продавца)")
	}
	if currentUserRole == models.RoleSeller && lot.SellerID != currentUserID {
		auctionForPermCheck, auctionErr := s.auctionStore.GetAuctionByID(auctionID)
		if auctionErr != nil || auctionForPermCheck == nil {
			return nil, errors.New("не удалось проверить права менеджера аукциона")
		}
		if auctionForPermCheck.CreatedByUserID != currentUserID {
			return nil, errors.New("недостаточно прав: Продавец может редактировать только свои лоты или лоты в аукционах, которыми он управляет")
		}
	}

	auction, err := s.auctionStore.GetAuctionByID(lot.AuctionID)
	if err != nil || auction == nil {
		return nil, errors.New("не удалось получить информацию об аукционе для лота")
	}

	hasBids := lot.HighestBidderID != nil

	if auction.Status != models.StatusScheduled {
		return nil, errors.New("редактировать лот можно только в запланированном аукционе")
	}
	if lot.Status != models.StatusPending || hasBids {
		return nil, errors.New("редактировать лот можно только если он ожидает торгов и по нему нет ставок")
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
		lot.StartPrice = *input.StartPrice
		lot.CurrentPrice = *input.StartPrice
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

	if currentUserRole != models.RoleSystemAdmin && currentUserRole != models.RoleSeller {
		return errors.New("недостаточно прав для удаления этого лота (требуется роль Администратора или Продавца)")
	}
	if currentUserRole == models.RoleSeller && lot.SellerID != currentUserID {
		auctionForPermCheck, auctionErr := s.auctionStore.GetAuctionByID(auctionID)
		if auctionErr != nil || auctionForPermCheck == nil {
			return errors.New("не удалось проверить права менеджера аукциона для удаления лота")
		}
		if auctionForPermCheck.CreatedByUserID != currentUserID {
			return errors.New("недостаточно прав: Продавец может удалять только свои лоты или лоты в аукционах, которыми он управляет")
		}
	}

	auction, err := s.auctionStore.GetAuctionByID(lot.AuctionID)
	if err != nil || auction == nil {
		return errors.New("не удалось получить информацию об аукционе для лота")
	}

	hasBids := lot.HighestBidderID != nil
	if auction.Status != models.StatusScheduled {
		return errors.New("удалять лот можно только из запланированного аукциона")
	}
	if lot.Status != models.StatusPending || hasBids {
		return errors.New("удалять лот можно только если он ожидает торгов и по нему нет ставок")
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
		if strings.Contains(err.Error(), "не найден") || errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, fmt.Errorf("аукцион с ID %d не найден", auctionID)
		}
		return nil, 0, fmt.Errorf("ошибка проверки аукциона ID %d: %w", auctionID, err)
	}

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	} else if pageSize > 100 {
		pageSize = 100
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
	} else if pageSize > 100 {
		pageSize = 100
	}
	offset := (page - 1) * pageSize
	return s.lotStore.GetAllLots(offset, pageSize, filters)
}
