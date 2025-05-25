package store

import "auction-app/backend/internal/models" // Убедитесь, что путь правильный для вашего модуля

// UserStore определяет методы для работы с пользователями в хранилище
type UserStore interface {
	CreateUser(user *models.User) error
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(id uint) (*models.User, error)
	// GetAllUsers(offset, limit int) ([]models.User, int64, error) // Для админки, если нужно
	// UpdateUser(user *models.User) error // Для админки или профиля пользователя
}

// AuctionStore определяет методы для работы с аукционами
type AuctionStore interface {
	CreateAuction(auction *models.Auction) error
	GetAllAuctions(offset, limit int) ([]models.Auction, int64, error)
	GetAuctionByID(id uint) (*models.Auction, error) // Должен предзагружать лоты
	UpdateAuction(auction *models.Auction) error
	UpdateAuctionStatus(id uint, status models.AuctionStatus, lotsToUpdate []models.Lot) error
	DeleteAuction(id uint) error
}

// LotStore определяет методы для работы с лотами
type LotStore interface {
	CreateLot(lot *models.Lot) error
	GetLotsByAuctionID(auctionID uint) ([]models.Lot, error) // Может предзагружать User (продавца)
	GetLotByID(id uint) (*models.Lot, error)                 // Может предзагружать User (продавца, лидера, покупателя)
	UpdateLot(lot *models.Lot) error
	DeleteLot(id uint) error
	// GetLotsBySellerID(sellerID uint, offset, limit int) ([]models.Lot, int64, error) // Для кабинета продавца
	// GetLotsWithUserLeading(userID uint, offset, limit int) ([]models.Lot, int64, error) // Для кабинета покупателя - лидирующие ставки
	// GetLotsWonByUser(userID uint, offset, limit int) ([]models.Lot, int64, error) // Для кабинета покупателя - выигранные лоты
}

// BidStore определяет методы для работы со ставками
type BidStore interface {
	CreateBid(bid *models.Bid) error
	GetBidsByLotID(lotID uint) ([]models.Bid, error) // Может предзагружать User (сделавшего ставку)
}

// Store объединяет все интерфейсы хранилищ (удобно для DI)
// Это необязательная структура, но может быть полезна для передачи всех хранилищ одним объектом.
// Если вы предпочитаете передавать каждое хранилище отдельно в сервисы, то эта структура не нужна.
type Store struct {
	UserStore    UserStore
	AuctionStore AuctionStore
	LotStore     LotStore
	BidStore     BidStore
}
