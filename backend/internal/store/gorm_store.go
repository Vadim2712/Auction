package store

import (
	"auction-app/backend/config"
	"auction-app/backend/internal/models"
	"errors"
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

var DB *gorm.DB

func InitDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=disable TimeZone=Europe/Moscow",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info),
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
		return nil, err
	}

	log.Println("Database connection established successfully.")

	err = DB.AutoMigrate(
		&models.User{},
		&models.Auction{},
		&models.Lot{},
		&models.Bid{},
	)
	if err != nil {
		log.Fatalf("Failed to auto-migrate database schemas: %v", err)
		return nil, err
	}
	log.Println("Database migration completed successfully.")

	return DB, nil
}

func GetDB() *gorm.DB {
	if DB == nil {
		log.Fatal("Database instance is not initialized. Call InitDB first.")
	}
	return DB
}

func SeedSystemAdmin(db *gorm.DB) {
	var existingAdmin models.User
	err := db.Where("email = ?", "sysadmin@auction.app").First(&existingAdmin).Error

	if err != nil && errors.Is(err, gorm.ErrRecordNotFound) {
		adminUser := models.User{
			FullName:               "Системный Администратор",
			Email:                  "sysadmin@auction.app",
			Role:                   models.RoleSystemAdmin,
			AvailableBusinessRoles: "[]",
			PassportData:           "0000000000",
			IsActive:               true,
		}
		if err := adminUser.SetPassword("sysadminpassword"); err != nil {
			log.Fatalf("Ошибка хеширования пароля для сисадмина: %v", err)
			return
		}

		if err := db.Create(&adminUser).Error; err != nil {
			log.Fatalf("Ошибка создания системного администратора: %v", err)
		} else {
			log.Println("Системный администратор успешно создан.")
		}
	} else if err != nil {
		log.Printf("Ошибка проверки существования системного администратора: %v", err)
	} else {
		log.Println("Системный администратор уже существует.")
	}
}
