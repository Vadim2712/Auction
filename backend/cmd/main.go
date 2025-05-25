package main

import (
	"auction-app/backend/config" // Убедитесь, что путь правильный для вашего модуля
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
	// sqlDB, _ := db.DB() // Это нужно, если вы хотите явно закрыть соединение при завершении работы сервера
	// defer sqlDB.Close() // Пока сервер работает, соединение должно быть открыто

	// 3. Инициализация зависимостей (Хранилища -> Сервисы -> Обработчики)

	// --- Хранилища (Stores/Repositories) ---
	userStore := store.NewGormUserStore(db)
	auctionStore := store.NewGormAuctionStore(db)
	lotStore := store.NewGormLotStore(db)
	bidStore := store.NewGormBidStore(db) // Убедитесь, что NewGormBidStore реализован

	// --- Сервисы ---
	authService := services.NewAuthService(userStore, cfg) // Использует UserStore и Config
	// AuctionService теперь принимает AuctionStore и LotStore
	auctionService := services.NewAuctionService(auctionStore, lotStore)
	// LotService теперь принимает LotStore, AuctionStore и BidStore
	lotService := services.NewLotService(lotStore, auctionStore, bidStore)
	// UserActivityService принимает AuctionStore и LotStore
	userActivityService := services.NewUserActivityService(auctionStore, lotStore)

	// --- Обработчики (Handlers) ---
	authHandler := api.NewAuthHandler(authService)
	auctionHandler := api.NewAuctionHandler(auctionService)
	lotHandler := api.NewLotHandler(lotService)
	userActivityHandler := api.NewUserActivityHandler(userActivityService)

	// 4. Настройка сервера Gin
	// gin.SetMode(gin.ReleaseMode) // Для продакшена
	router := gin.Default()

	// Настройка CORS
	corsConfig := cors.DefaultConfig()
	// Указываем, что разрешаем запросы с фронтенда
	corsConfig.AllowOrigins = []string{"http://localhost:3000"} // Замените на URL вашего фронтенда
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	// Указываем разрешенные заголовки
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	// Разрешаем передачу credentials (например, для кук или авторизации)
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
			// Защищенный маршрут для получения информации о себе
			authRoutes.GET("/me", middleware.AuthMiddleware(cfg), authHandler.Me)
		}

		// Маршруты для аукционов
		auctionRoutes := v1.Group("/auctions")
		{
			auctionRoutes.GET("", auctionHandler.GetAllAuctions)     // Получить все аукционы (публичный)
			auctionRoutes.GET("/:id", auctionHandler.GetAuctionByID) // Получить аукцион по ID (публичный)

			// Защищенные маршруты для аукционов (требуют AuthMiddleware и проверки ролей внутри хендлеров/сервисов)
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
		// Можно также рассмотреть отдельные маршруты для лотов, если это удобнее, например /api/v1/lots/:id
		// Но вложенность /auctions/:auctionId/lots/:lotId часто более RESTful для ресурсов, принадлежащих другим ресурсам.

		// Маршруты для личной активности пользователя
		myRoutes := v1.Group("/my")
		myRoutes.Use(middleware.AuthMiddleware(cfg)) // Все маршруты здесь требуют аутентификации
		{
			myRoutes.GET("/activity", userActivityHandler.GetMyActivity) // Ставки и выигрыши покупателя
			myRoutes.GET("/listings", userActivityHandler.GetMyListings) // Лоты продавца
		}

		// TODO: Добавить маршруты для специфических отчетов из Задания №33 (для админа)
		// reportRoutes := v1.Group("/reports")
		// reportRoutes.Use(middleware.AuthMiddleware(cfg)) // Защитить
		// {
		// 	reportRoutes.GET("/expensive-items", reportHandler.GetMostExpensiveItems)
		//  // ... другие отчеты
		// }

		// TODO: Добавить маршруты для управления пользователями (для системного администратора)
		// adminUserRoutes := v1.Group("/admin/users")
		// adminUserRoutes.Use(middleware.AuthMiddleware(cfg)) // Защитить и проверить роль SYSTEM_ADMIN
		// {
		//  adminUserRoutes.GET("", adminUserHandler.GetAllUsers)
		//  adminUserRoutes.PATCH("/:userId/status", adminUserHandler.UpdateUserStatus)
		// }
	}

	// 6. Запуск сервера
	serverAddr := ":" + cfg.ServerPort
	log.Printf("Сервер запускается на http://localhost%s", serverAddr)
	if err := router.Run(serverAddr); err != nil {
		log.Fatalf("Ошибка запуска сервера: %v", err)
	}
}
