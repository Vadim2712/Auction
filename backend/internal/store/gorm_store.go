package store

import (
	"auction-app/backend/config"          // Путь к вашему пакету config
	"auction-app/backend/internal/models" // Путь к вашим моделям
	"errors"
	"fmt"
	"log"

	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// DB представляет собой экземпляр GORM базы данных
var DB *gorm.DB // Глобальная переменная для доступа к БД, можно сделать и через DI

// InitDB инициализирует подключение к базе данных и выполняет автомиграции
func InitDB(cfg *config.Config) (*gorm.DB, error) {
	dsn := fmt.Sprintf("host=%s user=%s password=%s dbname=%s port=%d sslmode=disable TimeZone=Europe/Moscow",
		cfg.DBHost, cfg.DBUser, cfg.DBPassword, cfg.DBName, cfg.DBPort)

	var err error
	DB, err = gorm.Open(postgres.Open(dsn), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Info), // Уровень логирования GORM
	})

	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
		return nil, err
	}

	log.Println("Database connection established successfully.")

	// Автоматическая миграция схем (создание таблиц на основе моделей)
	// В реальном проекте лучше использовать отдельные файлы миграций
	err = DB.AutoMigrate(
		&models.User{},
		&models.Auction{}, // Раскомментируйте, когда создадите эти модели
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

// GetDB возвращает текущий экземпляр БД (если он был инициализирован)
// Это простой способ доступа, для больших приложений лучше использовать Dependency Injection
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
		// Пользователь не найден, создаем его
		adminUser := models.User{
			FullName:               "Системный Администратор",
			Email:                  "sysadmin@auction.app",
			Role:                   models.RoleSystemAdmin,
			AvailableBusinessRoles: "[]", // Пустой, т.к. не выбирает бизнес-роль
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
		// Другая ошибка при поиске
		log.Printf("Ошибка проверки существования системного администратора: %v", err)
	} else {
		// Пользователь уже существует
		log.Println("Системный администратор уже существует.")
	}
}
