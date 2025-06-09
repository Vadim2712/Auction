// backend/cmd/main.go
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

	userStore := store.NewGormUserStore(db)
	auctionStore := store.NewGormAuctionStore(db)
	lotStore := store.NewGormLotStore(db)
	bidStore := store.NewGormBidStore(db)
	store.SeedSystemAdmin(db)

	authService := services.NewAuthService(userStore, cfg)
	auctionService := services.NewAuctionService(auctionStore, lotStore)
	lotService := services.NewLotService(lotStore, auctionStore, bidStore)
	userActivityService := services.NewUserActivityService(lotStore, auctionStore)
	reportService := services.NewReportService(auctionStore, lotStore, userStore)
	userService := services.NewUserService(userStore)

	authHandler := api.NewAuthHandler(authService)
	auctionHandler := api.NewAuctionHandler(auctionService)
	lotHandler := api.NewLotHandler(lotService)
	userActivityHandler := api.NewUserActivityHandler(userActivityService)
	reportHandler := api.NewReportHandler(reportService)
	adminHandler := api.NewAdminHandler(userService)

	router := gin.Default()
	corsConfig := cors.DefaultConfig()
	corsConfig.AllowOrigins = []string{"http://localhost:3000"}
	corsConfig.AllowMethods = []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"}
	corsConfig.AllowHeaders = []string{"Origin", "Content-Type", "Accept", "Authorization"}
	corsConfig.AllowCredentials = true
	router.Use(cors.New(corsConfig))

	v1 := router.Group("/api/v1")
	{
		// Маршруты аутентификации
		authRoutes := v1.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.GET("/me", middleware.AuthMiddleware(cfg), authHandler.Me)
		}

		// Общие маршруты для аукционов
		auctionsBaseRoutes := v1.Group("/auctions")
		{
			auctionsBaseRoutes.GET("", auctionHandler.GetAllAuctions)
			auctionsBaseRoutes.GET("/search", auctionHandler.FindAuctionsBySpecificity)
			auctionsBaseRoutes.POST("", middleware.AuthMiddleware(cfg), auctionHandler.CreateAuction)
		}

		// Маршруты для конкретного аукциона /auctions/:auctionId
		auctionSpecificRoutes := v1.Group("/auctions/:auctionId")
		{
			auctionSpecificRoutes.GET("", auctionHandler.GetAuctionByID)
			auctionSpecificRoutes.PUT("", middleware.AuthMiddleware(cfg), auctionHandler.UpdateAuction)
			auctionSpecificRoutes.PATCH("/status", middleware.AuthMiddleware(cfg), auctionHandler.UpdateAuctionStatus)
			auctionSpecificRoutes.DELETE("", middleware.AuthMiddleware(cfg), auctionHandler.DeleteAuction)

			// Вложенные маршруты для лотов этого аукциона
			lotsForAuctionRoutes := auctionSpecificRoutes.Group("/lots")
			{
				lotsForAuctionRoutes.GET("", lotHandler.GetLotsByAuctionID)
				lotsForAuctionRoutes.POST("", middleware.AuthMiddleware(cfg), lotHandler.CreateLot)

				// Маршруты для конкретного лота в рамках аукциона
				specificLotRoutes := lotsForAuctionRoutes.Group("/:lotId")
				{
					specificLotRoutes.PUT("", middleware.AuthMiddleware(cfg), lotHandler.UpdateLotDetails)
					specificLotRoutes.DELETE("", middleware.AuthMiddleware(cfg), lotHandler.DeleteLot)
					specificLotRoutes.POST("/bids", middleware.AuthMiddleware(cfg), lotHandler.PlaceBid)
				}
			}
		}

		// Отдельные маршруты для лотов (если ID лота глобально уникален)
		individualLotRoutes := v1.Group("/lots")
		{
			individualLotRoutes.GET("", lotHandler.GetAllLots)
			individualLotRoutes.GET("/:lotId", lotHandler.GetLotByID)
		}

		// Маршруты для личной активности пользователя
		myRoutes := v1.Group("/my")
		myRoutes.Use(middleware.AuthMiddleware(cfg))
		{
			myRoutes.GET("/activity", userActivityHandler.GetMyActivity)
			myRoutes.GET("/listings", userActivityHandler.GetMyListings)
		}

		// Маршруты для отчетов
		reportRoutes := v1.Group("/reports")
		reportRoutes.Use(middleware.AuthMiddleware(cfg))
		{
			reportRoutes.GET("/lot-max-price-diff", reportHandler.GetLotWithMaxPriceDifference)
			reportRoutes.GET("/auction-most-sold", reportHandler.GetAuctionWithMostSoldLots)
			reportRoutes.GET("/most-expensive-lot-info", reportHandler.GetBuyerAndSellerOfMostExpensiveLot)
			reportRoutes.GET("/auctions-no-sales", reportHandler.GetAuctionsWithNoSoldLots)
			reportRoutes.GET("/top-expensive-lots", reportHandler.GetTopNMostExpensiveSoldLots)
			reportRoutes.GET("/items-for-sale", reportHandler.GetItemsForSaleByDateAndAuction)
			reportRoutes.GET("/buyers-by-specificity", reportHandler.GetBuyersOfItemsWithSpecificity)
			reportRoutes.GET("/sellers-sales-by-specificity", reportHandler.GetSellersReportBySpecificity)
		}

		// Маршруты для управления пользователями (Админ)
		adminUserRoutes := v1.Group("/admin/users")
		adminUserRoutes.Use(middleware.AuthMiddleware(cfg))
		{
			adminUserRoutes.GET("", adminHandler.GetAllUsers)
			adminUserRoutes.PATCH("/:userId/status", adminHandler.UpdateUserStatus)
			adminUserRoutes.PUT("/:userId/roles", adminHandler.UpdateUserRoles)
		}
	}

	serverAddr := ":" + cfg.ServerPort
	log.Printf("Сервер запускается на http://localhost%s", serverAddr)
	if err := router.Run(serverAddr); err != nil {
		log.Fatalf("Ошибка запуска сервера: %v", err)
	}
}
