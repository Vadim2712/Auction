package store

import "auction-app/backend/internal/models" // Убедитесь, что путь правильный для вашего модуля

// UserStore определяет методы для работы с пользователями в хранилище
type UserStore interface {
	CreateUser(user *models.User) error
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(id uint) (*models.User, error)
	GetAllUsers(offset, limit int, filters map[string]string) ([]models.User, int64, error) // <--- НОВЫЙ
	UpdateUser(user *models.User) error                                                     // <--- НОВЫЙ (для обновления статуса, ролей и т.д.)
	GetBuyersByAuctionSpecificity(specificity string, offset, limit int) ([]models.User, int64, error)
	GetSellersWithSalesByAuctionSpecificity(specificity string, minTotalSales float64, offset, limit int) ([]models.SellerSalesReport, int64, error)
}

// AuctionStore определяет методы для работы с аукционами
type AuctionStore interface {
	CreateAuction(auction *models.Auction) error
	GetAllAuctions(offset, limit int, filters map[string]string) ([]models.Auction, int64, error)
	GetAuctionByID(id uint) (*models.Auction, error)
	UpdateAuction(auction *models.Auction) error
	UpdateAuctionStatus(id uint, status models.AuctionStatus, lotsToUpdate []models.Lot) error
	DeleteAuction(id uint) error
	FindAuctionsBySpecificity(specificityQuery string, offset, limit int) ([]models.Auction, int64, error)
	GetAuctionWithMostSoldLots() (*models.Auction, int64, error)                   // <--- УБЕДИТЕСЬ, ЧТО ЭТА СТРОКА ЕСТЬ И СОВПАДАЕТ
	GetAuctionsWithoutSoldLots(offset, limit int) ([]models.Auction, int64, error) // <--- НОВЫЙ (или убедитесь, что есть)
}

// LotStore определяет методы для работы с лотами
type LotStore interface {
	CreateLot(lot *models.Lot) error
	GetLotsByAuctionID(auctionID uint, offset, limit int) ([]models.Lot, int64, error)
	GetLotByID(id uint) (*models.Lot, error)
	UpdateLot(lot *models.Lot) error
	DeleteLot(id uint) error
	GetLotsBySellerID(sellerID uint, offset, limit int) ([]models.Lot, int64, error)
	GetLeadingBidsByUserID(userID uint, offset, limit int) ([]models.Lot, int64, error)
	GetWonLotsByUserID(userID uint, offset, limit int) ([]models.Lot, int64, error)
	GetLotWithMaxPriceDifference() (*models.Lot, error)     // Мы его так назвали в прошлый раз, совпадает с реализацией
	GetMostExpensiveSoldLot() (*models.Lot, error)          // <--- УБЕДИТЕСЬ, ЧТО ЭТА СТРОКА ЕСТЬ И СОВПАДАЕТ
	GetTopNSoldLotsByPrice(limit int) ([]models.Lot, error) // Для отчета "топ N дорогих"
	GetActiveLotsByAuctionID(auctionID uint) ([]models.Lot, error)
	GetAllLots(offset, limit int, filters map[string]string) ([]models.Lot, int64, error)
	// GetLotsForAuctionByDateAndStatus(auctionID uint, targetDate time.Time, statuses []models.LotStatus) ([]models.Lot, error) // Для отчета
	// GetSoldLotsBySpecificity(specificity string, offset, limit int) ([]models.Lot, int64, error) // Для отчета
	// GetSoldLotsByCategoryForSellers(category string, offset, limit int) ([]LotSellerInfo, int64, error) // Для отчета (LotSellerInfo - кастомная структура)
}

// BidStore определяет методы для работы со ставками
type BidStore interface {
	CreateBid(bid *models.Bid) error
	GetBidsByLotID(lotID uint, offset, limit int) ([]models.Bid, int64, error) // Добавим пагинацию
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
