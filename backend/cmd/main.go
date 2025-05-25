package main

import (
	"auction-app/backend/config" // Убедитесь, что путь 'auction-app/backend' соответствует вашему go.mod
	"auction-app/backend/internal/api"
	"auction-app/backend/internal/middleware"
	"auction-app/backend/internal/services"
	"auction-app/backend/internal/store"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	// 1. Загрузка конфигурации
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Ошибка загрузки конфигурации: %v", err)
	}

	// 2. Инициализация базы данных
	// InitDB возвращает *gorm.DB, который будет использоваться для создания экземпляров хранилищ
	db, err := store.InitDB(cfg)
	if err != nil {
		log.Fatalf("Ошибка инициализации базы данных: %v", err)
	}
	// sqlDB, errDb := db.DB() // Это нужно, если вы хотите явно закрыть соединение
	// if errDb != nil {
	//  log.Fatalf("Ошибка получения *sql.DB: %v", errDb)
	// }
	// defer sqlDB.Close() // Пока сервер работает, соединение должно быть открыто

	// 3. Инициализация зависимостей (Хранилища -> Сервисы -> Обработчики)

	// --- Хранилища (Stores/Repositories) ---
	userStore := store.NewGormUserStore(db)
	auctionStore := store.NewGormAuctionStore(db)
	lotStore := store.NewGormLotStore(db)
	bidStore := store.NewGormBidStore(db)

	// --- Сервисы ---
	authService := services.NewAuthService(userStore, cfg)
	auctionService := services.NewAuctionService(auctionStore, lotStore)   // Передаем auctionStore и lotStore
	lotService := services.NewLotService(lotStore, auctionStore, bidStore) // Передаем lotStore, auctionStore и bidStore
	userActivityService := services.NewUserActivityService(lotStore, auctionStore)
	reportService := services.NewReportService(auctionStore, lotStore, userStore)
	userService := services.NewUserService(userStore) // Сервис для управления пользователями (админка)

	// --- Обработчики (Handlers) ---
	authHandler := api.NewAuthHandler(authService)
	auctionHandler := api.NewAuctionHandler(auctionService)
	lotHandler := api.NewLotHandler(lotService)
	userActivityHandler := api.NewUserActivityHandler(userActivityService)
	reportHandler := api.NewReportHandler(reportService) // Передаем ReportService
	adminHandler := api.NewAdminHandler(userService)     // Обработчик для админских функций с пользователями

	// 4. Настройка сервера Gin
	// gin.SetMode(gin.ReleaseMode) // Для продакшена, если нужно
	router := gin.Default()

	// Настройка CORS
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:3000"} // URL вашего фронтенда
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	corsConfig.AllowCredentials = true
	router.Use(cors.New(corsConfig))

	// 5. Определение маршрутов API
	// Группа v1 для всех API эндпоинтов
	v1 := router.Group("/api/v1")
	{
		// Маршруты аутентификации
		authRoutes := v1.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.GET("/me", middleware.AuthMiddleware(cfg), authHandler.Me)
		}

		// Маршруты для аукционов
		auctionRoutes := v1.Group("/auctions")
		{
			auctionRoutes.GET("", auctionHandler.GetAllAuctions)                   // Получить все аукционы (публичный)
			auctionRoutes.GET("/search", auctionHandler.FindAuctionsBySpecificity) // Поиск аукционов (публичный)
			auctionRoutes.GET("/:id", auctionHandler.GetAuctionByID)               // Получить аукцион по ID (публичный)

			// Защищенные маршруты для аукционов
			auctionRoutes.POST("", middleware.AuthMiddleware(cfg), auctionHandler.CreateAuction)                   // Создать аукцион
			auctionRoutes.PUT("/:id", middleware.AuthMiddleware(cfg), auctionHandler.UpdateAuction)                // Обновить аукцион
			auctionRoutes.PATCH("/:id/status", middleware.AuthMiddleware(cfg), auctionHandler.UpdateAuctionStatus) // Изменить статус аукциона
			auctionRoutes.DELETE("/:id", middleware.AuthMiddleware(cfg), auctionHandler.DeleteAuction)             // Удалить аукцион
		}

		// Маршруты для лотов (вложенные в аукционы)
		// /api/v1/auctions/:auctionId/lots
		lotAuctionRoutes := v1.Group("/auctions/:auctionId/lots")
		{
			lotAuctionRoutes.GET("", lotHandler.GetLotsByAuctionID)                         // Получить лоты для аукциона (публичный)
			lotAuctionRoutes.POST("", middleware.AuthMiddleware(cfg), lotHandler.CreateLot) // Добавить лот к аукциону

			// Маршруты для конкретного лота в рамках аукциона
			// /api/v1/auctions/:auctionId/lots/:lotId
			lotAuctionRoutes.PUT("/:lotId", middleware.AuthMiddleware(cfg), lotHandler.UpdateLotDetails) // Обновить лот
			lotAuctionRoutes.DELETE("/:lotId", middleware.AuthMiddleware(cfg), lotHandler.DeleteLot)     // Удалить лот

			// Маршруты для ставок на конкретный лот
			// /api/v1/auctions/:auctionId/lots/:lotId/bids
			lotAuctionRoutes.POST("/:lotId/bids", middleware.AuthMiddleware(cfg), lotHandler.PlaceBid) // Сделать ставку
			// GET /api/v1/auctions/:auctionId/lots/:lotId/bids - можно добавить для получения истории ставок по лоту
		}

		// Отдельные маршруты для лотов (если нужны)
		// Эти маршруты могут быть удобны, если ID лота глобально уникален.
		individualLotRoutes := v1.Group("/lots")
		// individualLotRoutes.Use(middleware.AuthMiddleware(cfg)) // Защитить, если операции не публичны
		{
			individualLotRoutes.GET("/:lotId", lotHandler.GetLotByID) // Получить лот по его ID (публичный)
		}

		// Маршруты для личной активности пользователя
		myRoutes := v1.Group("/my")
		myRoutes.Use(middleware.AuthMiddleware(cfg)) // Все маршруты здесь требуют аутентификации
		{
			myRoutes.GET("/activity", userActivityHandler.GetMyActivity) // Ставки и выигрыши пользователя
			myRoutes.GET("/listings", userActivityHandler.GetMyListings) // Лоты продавца
		}

		// Маршруты для отчетов (могут требовать прав админа/менеджера)
		reportRoutes := v1.Group("/reports")
		reportRoutes.Use(middleware.AuthMiddleware(cfg)) // Защищаем все отчеты
		{
			reportRoutes.GET("/lot-max-price-diff", reportHandler.GetLotWithMaxPriceDifference)
			reportRoutes.GET("/auction-most-sold", reportHandler.GetAuctionWithMostSoldLots)
			reportRoutes.GET("/most-expensive-lot-info", reportHandler.GetBuyerAndSellerOfMostExpensiveLot)
			reportRoutes.GET("/auctions-no-sales", reportHandler.GetAuctionsWithNoSoldLots)
			reportRoutes.GET("/top-expensive-lots", reportHandler.GetTopNMostExpensiveSoldLots)
			reportRoutes.GET("/items-for-sale", reportHandler.GetItemsForSaleByDateAndAuction)        // ?auctionId=X&date=YYYY-MM-DD
			reportRoutes.GET("/buyers-by-specificity", reportHandler.GetBuyersOfItemsWithSpecificity) // ?specificity=X
			reportRoutes.GET("/sellers-by-category", reportHandler.GetSellersByItemCategory)          // ?category=X
		}

		// Маршруты для управления пользователями (только для SYSTEM_ADMIN)
		adminUserRoutes := v1.Group("/admin/users")
		adminUserRoutes.Use(middleware.AuthMiddleware(cfg)) // Общая проверка токена
		// Внутри каждого хендлера AdminHandler будет дополнительная проверка на роль SYSTEM_ADMIN
		{
			adminUserRoutes.GET("", adminHandler.GetAllUsers)                       // ?role=seller&page=1&pageSize=10
			adminUserRoutes.PATCH("/:userId/status", adminHandler.UpdateUserStatus) // { "isActive": false }
			adminUserRoutes.PUT("/:userId/roles", adminHandler.UpdateUserRoles)     // { "availableBusinessRoles": ["buyer", "seller"] }
		}
	}

	// 6. Запуск сервера
	serverAddr := ":" + cfg.ServerPort
	log.Printf("Сервер запускается на http://localhost%s", serverAddr)
	if err := router.Run(serverAddr); err != nil {
		log.Fatalf("Ошибка запуска сервера: %v", err)
	}
}
