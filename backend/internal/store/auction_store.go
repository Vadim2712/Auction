package store

import (
	"auction-app/backend/internal/models"
	"errors"
	"strings"

	"gorm.io/gorm"
)

type gormAuctionStore struct {
	db *gorm.DB
}

func NewGormAuctionStore(db *gorm.DB) AuctionStore {
	return &gormAuctionStore{db: db}
}

func (s *gormAuctionStore) FindAuctionsBySpecificity(specificityQuery string, offset, limit int) ([]models.Auction, int64, error) {
	var auctions []models.Auction
	var total int64
	query := "%" + strings.ToLower(specificityQuery) + "%"

	// Поиск по полю nameSpecificity аукциона (регистронезависимый)
	// Можно расширить поиск и по описаниям лотов, если это требуется, но это усложнит запрос.

	// Сначала считаем общее количество
	dbQueryTotal := s.db.Model(&models.Auction{}).Where("LOWER(name_specificity) LIKE ?", query)
	if err := dbQueryTotal.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Затем получаем срез данных
	dbQueryFind := s.db.Where("LOWER(name_specificity) LIKE ?", query).
		Order("auction_date DESC").Offset(offset).Limit(limit).
		Preload("Lots") // Предзагружаем лоты, чтобы можно было проверить их специфику тоже, если нужно

	if err := dbQueryFind.Find(&auctions).Error; err != nil {
		return nil, 0, err
	}
	return auctions, total, nil
}

func (s *gormAuctionStore) CreateAuction(auction *models.Auction) error {
	return s.db.Create(auction).Error
}

func (s *gormAuctionStore) GetAllAuctions(offset, limit int, filters map[string]string) ([]models.Auction, int64, error) {
	var auctions []models.Auction
	var total int64

	queryBuilder := s.db.Model(&models.Auction{})

	// Применение фильтров (пример)
	if status, ok := filters["status"]; ok && status != "" {
		queryBuilder = queryBuilder.Where("status = ?", status)
	}
	if dateFrom, ok := filters["dateFrom"]; ok && dateFrom != "" {
		queryBuilder = queryBuilder.Where("auction_date >= ?", dateFrom)
	}
	if dateTo, ok := filters["dateTo"]; ok && dateTo != "" {
		queryBuilder = queryBuilder.Where("auction_date <= ?", dateTo)
	}
	// Можно добавить поиск по nameSpecificity

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Order("auction_date DESC, created_at DESC").Offset(offset).Limit(limit).Find(&auctions).Error
	return auctions, total, err
}

func (s *gormAuctionStore) GetAuctionByID(id uint) (*models.Auction, error) {
	var auction models.Auction
	// Предзагружаем лоты и информацию о создателе
	err := s.db.Preload("Lots").Preload("User").First(&auction, id).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Не найдено
		}
		return nil, err
	}
	return &auction, nil
}

func (s *gormAuctionStore) UpdateAuction(auction *models.Auction) error {
	return s.db.Save(auction).Error
}

// UpdateAuctionStatus обновляет статус аукциона и его лотов в одной транзакции
func (s *gormAuctionStore) UpdateAuctionStatus(id uint, status models.AuctionStatus, lotsToUpdate []models.Lot) error {
	return s.db.Transaction(func(tx *gorm.DB) error {
		// 1. Обновляем статус самого аукциона
		if err := tx.Model(&models.Auction{}).Where("id = ?", id).Update("status", status).Error; err != nil {
			return err
		}

		// 2. Обновляем статусы и финальные данные для лотов (если они переданы)
		// Эта логика теперь будет в сервисе, здесь просто обновляем то, что передали
		for _, lot := range lotsToUpdate {
			if err := tx.Save(&lot).Error; err != nil { // Save обновит существующие или создаст, если PK нет (но у нас есть)
				return err // Откат транзакции, если ошибка
			}
		}
		return nil // Коммит транзакции
	})
}

func (s *gormAuctionStore) DeleteAuction(id uint) error {
	// Мягкое удаление, если в модели Auction есть DeletedAt gorm.DeletedAt
	// Если нужно жесткое: tx.Unscoped().Delete(&models.Auction{}, id).Error
	// Также нужно продумать, что происходит с лотами этого аукциона.
	// Возможно, их тоже нужно пометить как-то или удалить, или запретить удаление аукциона с активными лотами.
	// Пока простое удаление самого аукциона.
	// Сначала проверим, есть ли у аукциона активные или непроданные лоты, чтобы предотвратить удаление.
	var count int64
	s.db.Model(&models.Lot{}).Where("auction_id = ? AND status IN (?, ?)", id, models.StatusLotActive, models.StatusPending).Count(&count)
	if count > 0 {
		return errors.New("нельзя удалить аукцион, на котором есть активные или ожидающие торгов лоты")
	}
	// Или если аукцион не завершен
	var auction models.Auction
	if err := s.db.First(&auction, id).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return errors.New("аукцион не найден")
		}
		return err
	}
	if auction.Status != models.StatusCompleted && auction.Status != models.StatusScheduled { // Удалять можно только запланированные или завершенные (без активных лотов)
		return errors.New("нельзя удалить аукцион, который идет или не был корректно завершен (и имеет активные лоты)")
	}

	if err := s.db.Delete(&models.Auction{}, id).Error; err != nil {
		return err
	}
	// Возможно, здесь же нужно каскадно удалить связанные лоты или изменить их статус,
	// если бизнес-логика это предполагает. GORM может быть настроен на каскадное удаление
	// через внешние ключи с ON DELETE CASCADE, но это нужно делать на уровне БД.
	// Пока предполагаем, что удаление аукциона возможно только если он пуст или все лоты обработаны.
	return nil
}

// GetAuctionWithMostSoldLots находит аукцион с наибольшим количеством проданных лотов
func (s *gormAuctionStore) GetAuctionWithMostSoldLots() (*models.Auction, int64, error) {
	var result struct {
		AuctionID uint  `gorm:"column:auction_id"`
		SoldCount int64 `gorm:"column:sold_count"`
	}

	// SQL-запрос для подсчета проданных лотов по каждому аукциону,
	// сортировки по этому количеству и выбора первого (с наибольшим количеством)
	// Этот запрос специфичен для PostgreSQL и использует CTE (Common Table Expression) для наглядности,
	// хотя можно и без него.
	// GORM может иметь сложности с очень сложными группировками и подзапросами напрямую,
	// поэтому иногда проще использовать Raw SQL или более простые GORM конструкции.
	// Вот более простой GORM-совместимый подход:
	err := s.db.Model(&models.Lot{}).
		Select("auction_id, count(*) as sold_count").
		Where("status = ?", models.StatusSold). // Только проданные лоты
		Group("auction_id").
		Order("sold_count DESC").
		Limit(1).
		Scan(&result).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, 0, nil // Нет аукционов с проданными лотами
		}
		return nil, 0, err // Другая ошибка БД
	}

	if result.AuctionID == 0 { // Если Scan не нашел записей
		return nil, 0, nil // Нет аукционов с проданными лотами
	}

	// Теперь получаем детали самого аукциона
	var auction models.Auction
	// Предзагружаем все его лоты (или только проданные, если нужно) для полноты информации
	if err := s.db.Preload("Lots", "status = ?", models.StatusSold).Preload("User").First(&auction, result.AuctionID).Error; err != nil {
		// Если аукцион не найден по ID (что маловероятно, если предыдущий запрос сработал),
		// или другая ошибка
		return nil, 0, err
	}

	return &auction, result.SoldCount, nil
}
