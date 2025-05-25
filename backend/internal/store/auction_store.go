package store

import (
	"auction-app/backend/internal/models"
	"errors"

	"gorm.io/gorm"
)

type gormAuctionStore struct {
	db *gorm.DB
}

func NewGormAuctionStore(db *gorm.DB) AuctionStore {
	return &gormAuctionStore{db: db}
}

func (s *gormAuctionStore) CreateAuction(auction *models.Auction) error {
	return s.db.Create(auction).Error
}

func (s *gormAuctionStore) GetAllAuctions(offset, limit int) ([]models.Auction, int64, error) {
	var auctions []models.Auction
	var total int64

	// Сначала считаем общее количество для пагинации
	if err := s.db.Model(&models.Auction{}).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Затем получаем срез данных с пагинацией и сортировкой
	// Сортируем по дате аукциона, например, сначала более свежие
	err := s.db.Order("auction_date DESC").Offset(offset).Limit(limit).Find(&auctions).Error
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
