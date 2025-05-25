package main

import (
	"auction-app/backend/config"
	"auction-app/backend/internal/api"
	"auction-app/backend/internal/middleware"
	"auction-app/backend/internal/services"
	"auction-app/backend/internal/store"
	"log"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	cfg, err := config.LoadConfig()
	if err != nil {
		log.Fatalf("Ошибка загрузки конфигурации: %v", err)
	}

	db, err := store.InitDB(cfg)
	if err != nil {
		log.Fatalf("Ошибка инициализации базы данных: %v", err)
	}

	// Инициализация хранилищ
	userStore := store.NewGormUserStore(db)
	auctionStore := store.NewGormAuctionStore(db)
	lotStore := store.NewGormLotStore(db)
	bidStore := store.NewGormBidStore(db) // <--- ИНИЦИАЛИЗИРУЕМ BidStore

	// Инициализация сервисов
	authService := services.NewAuthService(userStore, cfg)
	auctionService := services.NewAuctionService(auctionStore, lotStore)
	// Передаем bidStore в LotService
	lotService := services.NewLotService(lotStore, auctionStore, bidStore) // <--- ОБНОВЛЕНО

	// Инициализация обработчиков
	authHandler := api.NewAuthHandler(authService)
	auctionHandler := api.NewAuctionHandler(auctionService)
	lotHandler := api.NewLotHandler(lotService)

	router := gin.Default()
	// ... (CORS как был) ...
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:3000"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	corsConfig.AllowCredentials = true
	router.Use(cors.New(corsConfig))

	v1 := router.Group("/api/v1")
	{
		authRoutes := v1.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.GET("/me", middleware.AuthMiddleware(cfg), authHandler.Me)
		}

		auctionRoutes := v1.Group("/auctions")
		{
			auctionRoutes.GET("", auctionHandler.GetAllAuctions)
			auctionRoutes.GET("/:id", auctionHandler.GetAuctionByID)
			auctionRoutes.POST("", middleware.AuthMiddleware(cfg), auctionHandler.CreateAuction)
			auctionRoutes.PATCH("/:id/status", middleware.AuthMiddleware(cfg), auctionHandler.UpdateAuctionStatus)
		}

		lotRoutes := v1.Group("/auctions/:auctionId/lots")
		{
			lotRoutes.POST("", middleware.AuthMiddleware(cfg), lotHandler.CreateLot)
			lotRoutes.POST("/:lotId/bids", middleware.AuthMiddleware(cfg), lotHandler.PlaceBid)
		}
	}

	serverAddr := ":" + cfg.ServerPort
	log.Printf("Сервер запускается на %s", serverAddr)
	if err := router.Run(serverAddr); err != nil {
		log.Fatalf("Ошибка запуска сервера: %v", err)
	}
}
