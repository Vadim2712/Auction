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

func (s *LotService) GetLotsByAuctionID(auctionID uint) ([]models.Lot, error) {
	// Дополнительная проверка, существует ли сам аукцион
	_, err := s.auctionStore.GetAuctionByID(auctionID)
	if err != nil {
		return nil, fmt.Errorf("аукцион с ID %d не найден или ошибка: %w", auctionID, err)
	}

	lots, err := s.lotStore.GetLotsByAuctionID(auctionID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения лотов для аукциона ID %d: %w", auctionID, err)
	}
	return lots, nil
}

// UpdateLotInput структура для обновления данных лота
type UpdateLotInput struct {
	Name        *string  `json:"name"`
	Description *string  `json:"description"`
	StartPrice  *float64 `json:"startPrice"`
	// Статус и другие поля обычно меняются через специфические операции (ставки, завершение аукциона)
}

func (s *LotService) UpdateLotDetails(lotID uint, auctionID uint, input UpdateLotInput, currentUserID uint, currentUserRole models.UserRole) (*models.Lot, error) {
	lot, err := s.lotStore.GetLotByID(lotID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения лота: %w", err)
	}
	if lot == nil {
		return nil, errors.New("лот не найден")
	}
	if lot.AuctionID != auctionID { // Убедимся, что лот принадлежит указанному аукциону
		return nil, errors.New("лот не принадлежит данному аукциону")
	}

	// Проверка прав: только продавец этого лота или админ/менеджер могут редактировать
	isSeller := lot.SellerID == currentUserID
	isAdminOrManager := currentUserRole == models.RoleSystemAdmin || currentUserRole == models.RoleAuctionManager

	if !isSeller && !isAdminOrManager {
		return nil, errors.New("недостаточно прав для редактирования этого лота")
	}

	// Проверка статуса аукциона и лота: редактировать можно только если торги не начались
	auction, err := s.auctionStore.GetAuctionByID(lot.AuctionID)
	if err != nil || auction == nil {
		return nil, errors.New("не удалось получить информацию об аукционе для лота")
	}
	if auction.Status != models.StatusScheduled || (lot.Status != models.StatusPending && lot.Status != "") { // "" - для случая если статус не был явно установлен при создании
		return nil, errors.New("редактировать лот можно только до начала торгов по аукциону и если по лоту не было активности")
	}

	// Обновляем поля, если они переданы
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
		// Если меняется стартовая цена до начала торгов, текущая цена тоже должна обновиться
		if lot.Status == models.StatusPending || lot.Status == "" { // И если не было ставок
			if len(lot.Biddings) == 0 { // Проверка на отсутствие ставок
				lot.CurrentPrice = *input.StartPrice
			} else {
				return nil, errors.New("нельзя изменить стартовую цену, если уже есть ставки")
			}
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
	if auction.Status != models.StatusScheduled || (lot.Status != models.StatusPending && lot.Status != "") {
		if len(lot.Biddings) > 0 || lot.Status == models.StatusLotActive {
			return errors.New("удалить лот можно только до начала торгов по аукциону и если по лоту не было ставок/активности")
		}
	}
	// Дополнительная проверка, если лот уже продан или не продан после завершения аукциона
	if lot.Status == models.StatusSold || lot.Status == models.StatusUnsold {
		return errors.New("нельзя удалить лот, который участвовал в завершенных торгах")
	}

	return s.lotStore.DeleteLot(lotID)
}
