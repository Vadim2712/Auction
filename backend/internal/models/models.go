package models

import "time"

type User struct {
	ID               int       `json:"id" db:"user_id"`
	FullName         string    `json:"full_name" db:"full_name"`
	PassportData     string    `json:"passport_data" db:"passport_data"` // Будьте осторожны с хранением паспортных данных
	Role             string    `json:"role" db:"role"`                   // "seller", "buyer", "admin"
	Email            string    `json:"email" db:"email"`
	PasswordHash     string    `json:"-" db:"password_hash"` // Не отправляем хэш на клиент
	RegistrationDate time.Time `json:"registration_date" db:"registration_date"`
}

type Auction struct {
	ID              int       `json:"id" db:"auction_id"`
	NameSpecificity string    `json:"name_specificity" db:"name_specificity"`
	AuctionDate     time.Time `json:"auction_date" db:"auction_date"`
	AuctionTime     string    `json:"auction_time" db:"auction_time"` // Или time.Time, если нужно точное время
	Location        string    `json:"location" db:"location"`
	Status          string    `json:"status" db:"status"` // "scheduled", "active", "completed", "cancelled"
	CreatedByUserID int       `json:"created_by_user_id" db:"created_by_user_id"`
}

type Item struct {
	ID              int       `json:"id" db:"item_id"`
	LotNumber       string    `json:"lot_number" db:"lot_number"`
	AuctionID       int       `json:"auction_id" db:"auction_id"`
	SellerUserID    int       `json:"seller_user_id" db:"seller_user_id"`
	NameDescription string    `json:"name_description" db:"name_description"`
	StartPrice      float64   `json:"start_price" db:"start_price"`
	FinalPrice      *float64  `json:"final_price,omitempty" db:"final_price"` // omitempty, если цена еще не определена
	BuyerUserID     *int      `json:"buyer_user_id,omitempty" db:"buyer_user_id"`
	Status          string    `json:"status" db:"status"` // "pending_approval", "on_auction", "sold", "not_sold", "removed"
	CreationDate    time.Time `json:"creation_date" db:"creation_date"`
}

// Можно добавить структуру Bid, если решите ее использовать
type Bid struct {
	ID          int       `json:"id" db:"bid_id"`
	ItemID      int       `json:"item_id" db:"item_id"`
	BuyerUserID int       `json:"buyer_user_id" db:"buyer_user_id"`
	BidAmount   float64   `json:"bid_amount" db:"bid_amount"`
	BidTime     time.Time `json:"bid_time" db:"bid_time"`
}
