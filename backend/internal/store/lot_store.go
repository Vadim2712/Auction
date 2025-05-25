package store

import (
	"auction-app/backend/internal/models"
	"errors"
	"strconv" // Добавлен, если не был

	// Добавлен, если не был
	"gorm.io/gorm"
)

type gormLotStore struct {
	db *gorm.DB
}

func NewGormLotStore(db *gorm.DB) LotStore {
	return &gormLotStore{db: db}
}

func (s *gormLotStore) CreateLot(lot *models.Lot) error {
	// Перед созданием можно установить LotNumber
	var count int64
	s.db.Model(&models.Lot{}).Where("auction_id = ?", lot.AuctionID).Count(&count)
	lot.LotNumber = int(count) + 1
	return s.db.Create(lot).Error
}

func (s *gormLotStore) GetLotsByAuctionID(auctionID uint, offset, limit int) ([]models.Lot, int64, error) {
	var lots []models.Lot
	var total int64
	queryBuilder := s.db.Model(&models.Lot{}).Where("auction_id = ?", auctionID)

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Order("lot_number ASC").Offset(offset).Limit(limit).
		Preload("User").Preload("HighestBidder"). // Продавец и Лидер
		Find(&lots).Error
	return lots, total, err
}

func (s *gormLotStore) GetLotsBySellerID(sellerID uint, offset, limit int) ([]models.Lot, int64, error) {
	var lots []models.Lot
	var total int64
	queryBuilder := s.db.Model(&models.Lot{}).Where("seller_id = ?", sellerID)

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}
	// Предзагружаем аукцион, чтобы знать его название, и покупателя, если лот продан
	err := queryBuilder.Order("created_at DESC").Offset(offset).Limit(limit).
		Preload("FinalBuyer"). // Кто купил
		Find(&lots).Error      // Аукцион можно будет получить по auctionId из лота, если нужно его название
	return lots, total, err
}

func (s *gormLotStore) GetLeadingBidsByUserID(userID uint, offset, limit int) ([]models.Lot, int64, error) {
	var lots []models.Lot
	var total int64
	// Ищем лоты, где пользователь - текущий лидер, и аукцион активен
	queryBuilder := s.db.Model(&models.Lot{}).
		Joins("JOIN auctions ON auctions.id = lots.auction_id AND auctions.status = ?", models.StatusActive).
		Where("lots.highest_bidder_id = ? AND lots.status = ?", userID, models.StatusLotActive) // Лот тоже должен быть активен

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Order("lots.created_at DESC").Offset(offset).Limit(limit).
		Preload("User"). // Продавец лота
		Find(&lots).Error
	return lots, total, err
}

func (s *gormLotStore) GetWonLotsByUserID(userID uint, offset, limit int) ([]models.Lot, int64, error) {
	var lots []models.Lot
	var total int64
	queryBuilder := s.db.Model(&models.Lot{}).
		Where("final_buyer_id = ? AND status = ?", userID, models.StatusSold)

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Order("updated_at DESC").Offset(offset).Limit(limit). // Сортируем по времени обновления (когда он стал продан)
											Preload("User"). // Продавец лота
											Find(&lots).Error
	return lots, total, err
}

func (s *gormLotStore) GetLotByID(id uint) (*models.Lot, error) {
	var lot models.Lot
	// Предзагружаем нужные связи
	err := s.db.Preload("User").Preload("HighestBidder").Preload("FinalBuyer").First(&lot, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &lot, nil
}

func (s *gormLotStore) UpdateLot(lot *models.Lot) error {
	return s.db.Save(lot).Error
}

func (s *gormLotStore) DeleteLot(id uint) error {
	// Мягкое удаление, если в модели Lot есть DeletedAt gorm.DeletedAt
	// Прежде чем удалять, можно добавить проверки:
	// - есть ли активные ставки на лот?
	// - не начался ли аукцион, к которому принадлежит лот?
	// Пока что простое удаление. В сервисе будет больше логики.
	if err := s.db.Delete(&models.Lot{}, id).Error; err != nil {
		return err
	}
	return nil
}

func (s *gormLotStore) GetLotWithMaxPriceDifference() (*models.Lot, error) {
	var lot models.Lot
	// Нам нужны только проданные лоты, у которых есть final_price
	// Разница = final_price - start_price
	// В PostgreSQL можно использовать: final_price - start_price AS price_diff
	// GORM: Order("final_price - start_price DESC")
	err := s.db.Where("status = ? AND final_price IS NOT NULL", models.StatusSold).
		Order("(final_price - start_price) DESC").
		Preload("User").       // Продавец
		Preload("FinalBuyer"). // Покупатель
		First(&lot).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Нет проданных лотов или ошибка
		}
		return nil, err
	}
	return &lot, nil
}

// GetMostExpensiveSoldLot находит самый дорогой проданный лот
func (s *gormLotStore) GetMostExpensiveSoldLot() (*models.Lot, error) {
	var lot models.Lot
	// Ищем лот со статусом "Продан" и непустой final_price, сортируем по final_price по убыванию и берем первый
	err := s.db.Where("status = ? AND final_price IS NOT NULL", models.StatusSold).
		Order("final_price DESC").
		Preload("User").       // Предзагружаем Продавца (связь User по SellerID)
		Preload("FinalBuyer"). // Предзагружаем Покупателя (связь User по FinalBuyerID)
		First(&lot).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Нет проданных лотов
		}
		return nil, err // Другая ошибка БД
	}
	return &lot, nil
}

func (s *gormLotStore) GetTopNSoldLotsByPrice(limit int) ([]models.Lot, error) {
	var lots []models.Lot
	err := s.db.Where("status = ? AND final_price IS NOT NULL", models.StatusSold).
		Order("final_price DESC").
		Limit(limit).
		Preload("User").       // Продавец
		Preload("FinalBuyer"). // Покупатель
		// Preload("Auction") // Если нужно знать, на каком аукционе был продан лот
		Find(&lots).Error
	if err != nil {
		// gorm.ErrRecordNotFound не будет ошибкой, если limit > 0, но найдено 0 записей
		return nil, err
	}
	return lots, nil
}

func (s *gormLotStore) GetActiveLotsByAuctionID(auctionID uint) ([]models.Lot, error) {
	var lots []models.Lot
	// Ищем лоты со статусом "Ожидает торгов" или "Идет торг"
	err := s.db.Where("auction_id = ? AND status IN (?, ?)", auctionID, models.StatusPending, models.StatusLotActive).
		Order("lot_number ASC").
		Preload("User"). // Продавец
		Find(&lots).Error
	return lots, err
}

func (s *gormLotStore) GetAllLots(offset, limit int, filters map[string]string) ([]models.Lot, int64, error) {
	var lots []models.Lot
	var total int64

	queryBuilder := s.db.Model(&models.Lot{})

	// Присоединяем таблицу аукционов для фильтрации и предзагрузки
	// Указываем alias для lots, чтобы избежать неоднозначности имен столбцов, если auctions тоже имеет 'status' или 'created_at'
	queryBuilder = queryBuilder.Joins("JOIN auctions as auction ON auction.id = lots.auction_id") // Используем "lots.auction_id"

	if status, ok := filters["status"]; ok && status != "" {
		queryBuilder = queryBuilder.Where("lots.status = ?", status)
	} else {
		// По умолчанию показываем только те, что актуальны для продажи
		queryBuilder = queryBuilder.Where("lots.status IN (?, ?)", models.StatusPending, models.StatusLotActive)
	}

	if sellerID, ok := filters["sellerId"]; ok && sellerID != "" {
		sID, err := strconv.ParseUint(sellerID, 10, 32)
		if err == nil {
			queryBuilder = queryBuilder.Where("lots.seller_id = ?", uint(sID))
		}
	}
	if auctionID, ok := filters["auctionId"]; ok && auctionID != "" {
		aID, err := strconv.ParseUint(auctionID, 10, 32)
		if err == nil {
			queryBuilder = queryBuilder.Where("lots.auction_id = ?", uint(aID))
		}
	}

	if monthFilter, ok := filters["auctionMonth"]; ok && monthFilter != "" { // Формат "YYYY-MM"
		queryBuilder = queryBuilder.Where("to_char(auction.auction_date, 'YYYY-MM') = ?", monthFilter)
	}

	// Считаем общее количество лотов, соответствующих фильтрам
	// Важно использовать тот же queryBuilder (с JOIN'ами и WHERE) для Count
	if err := queryBuilder.Select("lots.id").Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []models.Lot{}, 0, nil
	}

	// Получаем сами лоты с пагинацией и предзагрузкой
	// Выбираем все поля из lots явно, чтобы избежать конфликтов имен с auctions
	err := queryBuilder.Select("lots.*").
		Order("lots.created_at DESC").
		Offset(offset).
		Limit(limit).
		Preload("User").          // Продавец (связан с lots.SellerID)
		Preload("HighestBidder"). // Лидер ставки (связан с lots.HighestBidderID)
		Preload("FinalBuyer").    // Финальный покупатель
		// Для информации об аукционе, GORM не сможет автоматически сделать Preload("Auction")
		// на основе JOIN'а, если в модели Lot нет явного поля Auction типа models.Auction.
		// Вместо этого, мы можем либо добавить поле Auction в Lot и настроить связь,
		// либо получать информацию об аукционе отдельно в сервисе, если она нужна для каждого лота.
		// Либо, если JOIN уже есть, выбрать нужные поля из auctions в Select.
		// Простой вариант: фронтенд будет иметь auctionId и сможет запросить детали аукциона отдельно при необходимости.
		// Если очень нужно имя аукциона для каждого лота в списке, нужно усложнять запрос или структуру ответа.
		Find(&lots).Error

	return lots, total, err
}
