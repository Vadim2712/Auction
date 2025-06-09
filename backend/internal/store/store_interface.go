package store

import "auction-app/backend/internal/models"

// UserStore определяет методы для работы с пользователями в хранилище
type UserStore interface {
	CreateUser(user *models.User) error
	GetUserByEmail(email string) (*models.User, error)
	GetUserByID(id uint) (*models.User, error)
	GetAllUsers(offset, limit int, filters map[string]string) ([]models.User, int64, error)
	UpdateUser(user *models.User) error
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
	GetAuctionWithMostSoldLots() (*models.Auction, int64, error)
	GetAuctionsWithoutSoldLots(offset, limit int) ([]models.Auction, int64, error)
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
	GetLotWithMaxPriceDifference() (*models.Lot, error)
	GetMostExpensiveSoldLot() (*models.Lot, error)
	GetTopNSoldLotsByPrice(limit int) ([]models.Lot, error)
	GetActiveLotsByAuctionID(auctionID uint) ([]models.Lot, error)
	GetAllLots(offset, limit int, filters map[string]string) ([]models.Lot, int64, error)
}

// BidStore определяет методы для работы со ставками
type BidStore interface {
	CreateBid(bid *models.Bid) error
	GetBidsByLotID(lotID uint, offset, limit int) ([]models.Bid, int64, error)
}

type Store struct {
	UserStore    UserStore
	AuctionStore AuctionStore
	LotStore     LotStore
	BidStore     BidStore
}
