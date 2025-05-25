package store

import "auction-app/backend/internal/models" // Убедитесь, что путь правильный

// UserStore ... (как было)

// AuctionStore определяет методы для работы с аукционами
type AuctionStore interface {
	CreateAuction(auction *models.Auction) error
	GetAllAuctions(offset, limit int) ([]models.Auction, int64, error) // Возвращаем также общее количество для пагинации
	GetAuctionByID(id uint) (*models.Auction, error)
	UpdateAuction(auction *models.Auction) error
	UpdateAuctionStatus(id uint, status models.AuctionStatus, lots []models.Lot) error // Обновление статуса и связанных лотов
	// DeleteAuction(id uint) error // Если нужно жесткое удаление
}

// LotStore определяет методы для работы с лотами
type LotStore interface {
	CreateLot(lot *models.Lot) error
	GetLotsByAuctionID(auctionID uint) ([]models.Lot, error)
	GetLotByID(id uint) (*models.Lot, error)
	UpdateLot(lot *models.Lot) error // Общий метод обновления
	// DeleteLot(id uint) error
	// UpdateLotStatusAndWinner(lotID uint, status models.LotStatus, finalPrice float64, finalBuyerID uint) error // Это может быть частью UpdateAuctionStatus
}

// BidStore определяет методы для работы со ставками
type BidStore interface {
	CreateBid(bid *models.Bid) error
	GetBidsByLotID(lotID uint) ([]models.Bid, error)
}

type UserStore interface {
	CreateUser(user *models.User) error
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(id uint) (*models.User, error)
	// ... другие методы
}

// Store объединяет все интерфейсы хранилищ
type Store struct {
	UserStore    UserStore
	AuctionStore AuctionStore
	LotStore     LotStore
	BidStore     BidStore
}
