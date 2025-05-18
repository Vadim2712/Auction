package main

import (
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	// Импортируйте здесь ваши пакеты для API, когда они будут созданы
	// "auction-app/backend/internal/api"
	// "auction-app/backend/internal/store"
)

func main() {
	// Инициализация подключения к БД (детали будут зависеть от вашей реализации в store)
	// db, err := store.NewDB("your_postgres_connection_string")
	// if err != nil {
	// 	log.Fatalf("Failed to connect to database: %v", err)
	// }
	// defer db.Close()

	router := gin.Default()

	// Простой тестовый маршрут
	router.GET("/ping", func(c *gin.Context) {
		c.JSON(http.StatusOK, gin.H{
			"message": "pong",
		})
	})

	// Здесь будут регистрироваться маршруты вашего API
	// api.RegisterRoutes(router, db) // Пример

	log.Println("Server started on :8080")
	if err := router.Run(":8080"); err != nil {
		log.Fatalf("Failed to run server: %v", err)
	}
}
