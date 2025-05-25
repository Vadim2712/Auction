package store

import (
	"auction-app/backend/internal/models"
	"errors"
	"fmt"
	"strings"

	"gorm.io/gorm"
)

// gormUserStore реализует интерфейс UserStore с использованием GORM
type gormUserStore struct {
	db *gorm.DB
}

// NewGormUserStore создает новый экземпляр gormUserStore
func NewGormUserStore(db *gorm.DB) UserStore {
	return &gormUserStore{db: db}
}

func (s *gormUserStore) CreateUser(user *models.User) error {
	return s.db.Create(user).Error
}

func (s *gormUserStore) GetUserByEmail(email string) (*models.User, error) {
	var user models.User
	err := s.db.Where("email = ?", email).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil // Пользователь не найден, но это не ошибка приложения
		}
		return nil, err
	}
	return &user, nil
}

func (s *gormUserStore) GetUserByID(id uint) (*models.User, error) {
	var user models.User
	err := s.db.Where("id = ?", id).First(&user).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, err
	}
	return &user, nil
}

func (s *gormUserStore) GetAllUsers(offset, limit int, filters map[string]string) ([]models.User, int64, error) {
	var users []models.User
	var total int64

	queryBuilder := s.db.Model(&models.User{})

	// Не показываем системных администраторов в общем списке пользователей для управления
	queryBuilder = queryBuilder.Where("role <> ?", models.RoleSystemAdmin)

	if roleFilter, ok := filters["role"]; ok && roleFilter != "" {
		// Валидация значения roleFilter, чтобы избежать SQL-инъекций, если бы это была прямая вставка
		// Но GORM с плейсхолдерами безопасен.
		// Проверяем, что это одна из допустимых бизнес-ролей для фильтрации
		isValidBusinessRole := false
		switch models.UserRole(roleFilter) {
		case models.RoleBuyer, models.RoleSeller, models.RoleAuctionManager:
			isValidBusinessRole = true
		}
		if isValidBusinessRole {
			// Если мы храним availableBusinessRoles как JSON строку "[\"buyer\", \"seller\"]"
			// то фильтрация будет сложнее: WHERE available_business_roles::jsonb @> '["roleFilter"]'
			// Пока что, если поле User.Role используется для "основной" или "последней выбранной" роли,
			// то фильтр по User.Role будет работать.
			// Если же User.Role не используется, а роли только в AvailableBusinessRoles,
			// то этот фильтр нужно будет переделать.
			// Предположим, User.Role может хранить основную бизнес-роль, если она одна, или не используется.
			// Фильтр по 'роли' в запросе будет искать в поле 'role' или в 'availableBusinessRoles'
			queryBuilder = queryBuilder.Where("role = ? OR available_business_roles LIKE ?", roleFilter, "%\""+roleFilter+"\"%")
		} else if roleFilter != "" {
			// Если передана какая-то другая роль, возможно, вернуть ошибку или пустой список
			return []models.User{}, 0, errors.New("недопустимое значение для фильтра роли пользователя")
		}
	}
	if emailFilter, ok := filters["email"]; ok && emailFilter != "" {
		queryBuilder = queryBuilder.Where("LOWER(email) LIKE ?", "%"+strings.ToLower(emailFilter)+"%")
	}
	if nameFilter, ok := filters["fullName"]; ok && nameFilter != "" {
		queryBuilder = queryBuilder.Where("LOWER(full_name) LIKE ?", "%"+strings.ToLower(nameFilter)+"%")
	}

	if err := queryBuilder.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := queryBuilder.Order("id ASC").Offset(offset).Limit(limit).Find(&users).Error
	for i := range users {
		users[i].PasswordHash = ""
	}
	return users, total, err
}

func (s *gormUserStore) UpdateUser(user *models.User) error {
	// Убедимся, что не пытаемся обновить пароль через этот метод напрямую без хеширования
	// Если нужно обновление пароля, должен быть отдельный метод или проверка в сервисе.
	// PasswordHash не должен напрямую меняться через этот метод из входящих данных.
	// GORM по умолчанию обновляет только ненулевые поля, если модель передается как аргумент Update
	// но `Save` обновит все поля.
	return s.db.Save(user).Error
}

func (s *gormUserStore) GetSellersWithSalesByAuctionSpecificity(specificity string, minTotalSales float64, offset, limit int) ([]models.SellerSalesReport, int64, error) {
	var results []struct {
		SellerID   uint
		TotalSales float64
		LotsSold   int64
	}
	var totalMatchingSellers int64
	searchTerm := "%" + strings.ToLower(specificity) + "%"

	// Базовый запрос для агрегации данных о продажах по продавцам
	// Здесь важно, что JOIN с auctions используется для фильтрации по специфике
	baseAggQuery := s.db.Table("lots as l").
		Select("l.seller_id, SUM(l.final_price) as total_sales, COUNT(l.id) as lots_sold").
		Joins("JOIN auctions as a ON a.id = l.auction_id").
		Where("l.status = ? AND l.final_price IS NOT NULL AND LOWER(a.name_specificity) LIKE ?", models.StatusSold, searchTerm).
		Group("l.seller_id")

	// Для подсчета общего числа продавцов, удовлетворяющих условию minTotalSales,
	// нам нужно сначала получить агрегированные данные, а потом их отфильтровать.
	// GORM Count() с Having может быть сложным.
	// Поэтому сначала получим всех продавцов, которые что-то продали по этой специфике, а потом отфильтруем в Go.
	// Либо применим Having и сделаем отдельный Count.

	// Подсчет общего количества продавцов, подходящих под условие (до пагинации результатов)
	var allSellerAggregates []struct{ TotalSales float64 }
	if err := baseAggQuery.Having("SUM(l.final_price) >= ?", minTotalSales).Scan(&allSellerAggregates).Error; err != nil {
		return nil, 0, fmt.Errorf("ошибка подсчета продавцов: %w", err)
	}
	totalMatchingSellers = int64(len(allSellerAggregates))

	if totalMatchingSellers == 0 {
		return []models.SellerSalesReport{}, 0, nil
	}

	// Теперь основной запрос с пагинацией и сортировкой
	err := baseAggQuery.Having("SUM(l.final_price) >= ?", minTotalSales).
		Order("total_sales DESC").
		Offset(offset).
		Limit(limit).
		Scan(&results).Error

	if err != nil {
		return nil, 0, fmt.Errorf("ошибка получения агрегированных данных о продажах: %w", err)
	}
	if len(results) == 0 {
		return []models.SellerSalesReport{}, totalMatchingSellers, nil
	}

	sellerIDs := make([]uint, len(results))
	for i, r := range results {
		sellerIDs[i] = r.SellerID
	}

	var sellers []models.User
	if err := s.db.Where("id IN (?)", sellerIDs).Find(&sellers).Error; err != nil {
		return nil, 0, fmt.Errorf("ошибка получения данных продавцов: %w", err)
	}

	sellerMap := make(map[uint]models.User)
	for _, seller := range sellers {
		seller.PasswordHash = ""
		sellerMap[seller.ID] = seller
	}

	finalReport := make([]models.SellerSalesReport, 0, len(results))
	for _, r := range results {
		if seller, ok := sellerMap[r.SellerID]; ok {
			finalReport = append(finalReport, models.SellerSalesReport{
				Seller:     seller,
				TotalSales: r.TotalSales,
				LotsSold:   r.LotsSold,
			})
		}
	}
	return finalReport, totalMatchingSellers, nil
}

func (s *gormUserStore) GetBuyersByAuctionSpecificity(specificity string, offset, limit int) ([]models.User, int64, error) {
	var users []models.User
	var total int64
	searchTerm := "%" + strings.ToLower(specificity) + "%"

	// Подзапрос для получения ID аукционов с нужной спецификой
	subQueryAuctions := s.db.Model(&models.Auction{}).Select("id").Where("LOWER(name_specificity) LIKE ?", searchTerm)

	// Базовый запрос для выбора уникальных ID покупателей
	baseQuery := s.db.Model(&models.User{}).Distinct("users.id").
		Joins("JOIN lots ON lots.final_buyer_id = users.id").
		Joins("JOIN auctions ON auctions.id = lots.auction_id").
		Where("lots.status = ? AND lots.final_buyer_id IS NOT NULL AND auctions.id IN (?)", models.StatusSold, subQueryAuctions)

	// Считаем общее количество уникальных пользователей
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, 0, err
	}

	if total == 0 {
		return []models.User{}, 0, nil
	}

	// Теперь получаем самих пользователей с пагинацией
	err := baseQuery.Select("users.*"). // Убедимся, что выбираем все поля из users
						Order("users.full_name ASC").
						Offset(offset).
						Limit(limit).
						Find(&users).Error

	if err != nil {
		return nil, 0, err
	}

	// Убираем хеши паролей
	for i := range users {
		users[i].PasswordHash = ""
	}
	return users, total, nil
}
