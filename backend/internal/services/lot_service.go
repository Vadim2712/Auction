package services

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"errors"
	"fmt"
	// "log" // Если будете использовать для отладки
)

type LotService struct {
	lotStore     store.LotStore
	auctionStore store.AuctionStore
	bidStore     store.BidStore // <--- ДОБАВЛЕНО
	// userStore    store.UserStore
}

// Обновляем конструктор
func NewLotService(ls store.LotStore, as store.AuctionStore, bs store.BidStore) *LotService {
	return &LotService{lotStore: ls, auctionStore: as, bidStore: bs} // <--- ДОБАВЛЕНО bs
}

// CreateLot ... (без изменений) ...
func (s *LotService) CreateLot(auctionID uint, input models.CreateLotInput, sellerID uint) (*models.Lot, error) {
	// ... (код как был)
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
	// ... (начальные проверки аукциона и лота как были) ...
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

	// Создаем запись о ставке
	bid := models.Bid{
		LotID:     lotID,
		UserID:    bidderID,
		BidAmount: input.Amount,
		// BidTime (и CreatedAt для Bid) будут установлены автоматически GORM (autoCreateTime)
	}

	// Сохраняем ставку через BidStore
	if err := s.bidStore.CreateBid(&bid); err != nil { // <--- РАСКОММЕНТИРОВАНО И ИСПОЛЬЗУЕТСЯ
		return nil, fmt.Errorf("ошибка сохранения ставки в БД: %w", err)
	}
	// log.Println("Ставка сохранена:", bid) // Для отладки

	// Обновляем лот
	lot.CurrentPrice = input.Amount
	highestBidderIDCopy := bidderID // Создаем копию, чтобы взять на нее указатель
	lot.HighestBidderID = &highestBidderIDCopy
	if lot.Status == models.StatusPending {
		lot.Status = models.StatusLotActive
	}
	// В реальном приложении, возможно, не нужно добавлять ставку в lot.Biddings здесь,
	// если BidStore уже сохранил ее, и мы будем получать историю ставок отдельным запросом.
	// Но для mock-логики в apiClient.js мы добавляли. Сейчас для GORM этого не требуется.
	// Если нужно, можно предзагрузить Biddings при получении лота.

	if err := s.lotStore.UpdateLot(lot); err != nil {
		// Здесь может возникнуть проблема, если CreateBid был успешен, а UpdateLot нет.
		// В идеале, это должно быть в одной транзакции.
		// Для упрощения пока оставляем так, но для продакшена нужна транзакция на уровне сервиса.
		return nil, fmt.Errorf("ошибка обновления лота после ставки: %w", err)
	}
	return lot, nil
}
