package store

import (
	"auction-app/backend/internal/models"
	"errors"
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

	if roleFilter, ok := filters["role"]; ok && roleFilter != "" {
		// Это будет искать по основной роли. Если мы хотим искать по availableBusinessRoles, запрос будет сложнее
		// Например, для PostgreSQL: queryBuilder = queryBuilder.Where("available_business_roles::jsonb @> ?", "[\""+roleFilter+"\"]")
		// Пока оставим фильтрацию по основной роли 'role' или потребуем от сервиса обрабатывать 'availableBusinessRoles'
		queryBuilder = queryBuilder.Where("role = ?", roleFilter)
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
	// Важно: не возвращать хеши паролей
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

func (s *gormUserStore) GetBuyersByAuctionSpecificity(specificity string, offset, limit int) ([]models.User, int64, error) {
	var users []models.User
	var total int64
	searchTerm := "%" + strings.ToLower(specificity) + "%"

	var buyerIDs []uint
	// Используем subQuery для получения ID покупателей
	queryForIDs := s.db.Distinct("l.final_buyer_id").Table("lots as l").
		Joins("JOIN auctions as a ON a.id = l.auction_id").
		Where("l.status = ? AND l.final_buyer_id IS NOT NULL AND LOWER(a.name_specificity) LIKE ?", models.StatusSold, searchTerm)

	// Выполняем запрос для получения всех ID (для подсчета total)
	if err := queryForIDs.Pluck("l.final_buyer_id", &buyerIDs).Error; err != nil {
		// GORM может не вернуть ErrRecordNotFound для Pluck, если ничего не найдено, а просто пустой слайс.
		// Но если была ошибка запроса, возвращаем ее.
		return nil, 0, err
	}
	total = int64(len(buyerIDs))

	if total == 0 {
		return []models.User{}, 0, nil
	}

	// Пагинация по полученным ID
	paginatedBuyerIDs := []uint{}
	start := offset
	end := offset + limit
	if start > len(buyerIDs) {
		start = len(buyerIDs)
	}
	if end > len(buyerIDs) {
		end = len(buyerIDs)
	}
	if start < end {
		paginatedBuyerIDs = buyerIDs[start:end]
	}

	if len(paginatedBuyerIDs) == 0 {
		// Это означает, что для текущей страницы нет данных, но total может быть > 0
		return []models.User{}, total, nil
	}

	// Теперь получаем самих пользователей по отфильтрованным и отпагинированным ID
	err := s.db.Where("id IN (?)", paginatedBuyerIDs).
		Order("full_name ASC"). // Или другая сортировка
		Find(&users).Error

	// Убираем хеши паролей
	for i := range users {
		users[i].PasswordHash = ""
	}
	return users, total, err
}

func (s *gormUserStore) GetSellersWithSalesByAuctionSpecificity(specificity string, minTotalSales float64, offset, limit int) ([]models.SellerSalesReport, int64, error) {
	var results []struct { // Промежуточная структура для сканирования агрегированных данных
		SellerID   uint
		TotalSales float64
		LotsSold   int64
	}
	var totalCount int64 // Общее количество продавцов, удовлетворяющих условию суммы

	searchTerm := "%" + strings.ToLower(specificity) + "%"

	// Запрос для агрегации данных о продажах
	// 1. Выбираем seller_id, суммируем final_price, считаем количество проданных лотов
	// 2. Группируем по seller_id
	// 3. Фильтруем по специфике аукциона через JOIN с auctions
	// 4. Фильтруем по минимальной общей сумме продаж (minTotalSales)
	// 5. Сортируем по общей сумме продаж

	// Сначала подсчитаем общее количество продавцов, подходящих под условие minTotalSales
	countQuery := s.db.Table("lots l").
		Select("l.seller_id").
		Joins("JOIN auctions a ON a.id = l.auction_id").
		Where("l.status = ? AND l.final_price IS NOT NULL AND LOWER(a.name_specificity) LIKE ?", models.StatusSold, searchTerm).
		Group("l.seller_id").
		Having("SUM(l.final_price) >= ?", minTotalSales)

	// GORM может иметь проблемы с Count() на сложных группировках с Having.
	// Проще получить все ID и посчитать, либо сделать Raw SQL для count.
	var tempResultsForCount []struct{ SellerID uint }
	if err := countQuery.Scan(&tempResultsForCount).Error; err != nil {
		return nil, 0, err
	}
	totalCount = int64(len(tempResultsForCount))

	if totalCount == 0 {
		return []models.SellerSalesReport{}, 0, nil
	}

	// Теперь основной запрос с пагинацией
	err := s.db.Table("lots l").
		Select("l.seller_id, SUM(l.final_price) as total_sales, COUNT(l.id) as lots_sold").
		Joins("JOIN auctions a ON a.id = l.auction_id").
		Where("l.status = ? AND l.final_price IS NOT NULL AND LOWER(a.name_specificity) LIKE ?", models.StatusSold, searchTerm).
		Group("l.seller_id").
		Having("SUM(l.final_price) >= ?", minTotalSales).
		Order("total_sales DESC").
		Offset(offset).
		Limit(limit).
		Scan(&results).Error

	if err != nil {
		return nil, 0, err
	}

	if len(results) == 0 {
		return []models.SellerSalesReport{}, totalCount, nil
	}

	// Получаем полную информацию о продавцах
	sellerIDs := make([]uint, len(results))
	for i, r := range results {
		sellerIDs[i] = r.SellerID
	}

	var sellers []models.User
	if err := s.db.Where("id IN (?)", sellerIDs).Find(&sellers).Error; err != nil {
		return nil, 0, err
	}

	// Сопоставляем продавцов с их статистикой продаж
	sellerMap := make(map[uint]models.User)
	for _, seller := range sellers {
		seller.PasswordHash = "" // Очищаем хеш пароля
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

	return finalReport, totalCount, nil
}
