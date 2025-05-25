package services

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"encoding/json" // Для работы с JSON строкой AvailableBusinessRoles
	"errors"
	"fmt" // Для strings.Join
)

type UserService struct {
	userStore store.UserStore
	// cfg *config.Config // Если нужен для чего-то
}

func NewUserService(us store.UserStore) *UserService {
	return &UserService{userStore: us}
}

func (s *UserService) GetAllUsers(page, pageSize int, roleFilter string) ([]models.User, int64, error) {
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}
	offset := (page - 1) * pageSize

	filters := make(map[string]string)
	if roleFilter != "" {
		// Если мы фильтруем по бизнес-ролям, а не по основной роли User.Role
		// То логику фильтрации нужно реализовать здесь или в store
		// Пока что передадим как есть, store.GetAllUsers будет фильтровать по User.Role
		filters["role"] = roleFilter
	}

	users, total, err := s.userStore.GetAllUsers(offset, pageSize, filters)
	if err != nil {
		return nil, 0, fmt.Errorf("ошибка получения списка пользователей: %w", err)
	}
	return users, total, nil
}

func (s *UserService) UpdateUserStatus(userID uint, newStatus bool, adminUserID uint, adminRole models.UserRole) (*models.User, error) {
	if adminRole != models.RoleSystemAdmin {
		return nil, errors.New("недостаточно прав для изменения статуса пользователя")
	}
	if userID == adminUserID {
		return nil, errors.New("системный администратор не может заблокировать сам себя")
	}

	user, err := s.userStore.GetUserByID(userID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения пользователя: %w", err)
	}
	if user == nil {
		return nil, errors.New("пользователь не найден")
	}
	if user.Role == models.RoleSystemAdmin { // Нельзя заблокировать другого системного администратора
		return nil, errors.New("нельзя изменить статус другого системного администратора")
	}

	user.IsActive = newStatus
	if err := s.userStore.UpdateUser(user); err != nil {
		return nil, fmt.Errorf("ошибка обновления статуса пользователя: %w", err)
	}
	user.PasswordHash = "" // Убираем хеш перед возвратом
	return user, nil
}

func (s *UserService) UpdateUserAvailableRoles(userID uint, roles []string, adminUserID uint, adminRole models.UserRole) (*models.User, error) {
	if adminRole != models.RoleSystemAdmin {
		return nil, errors.New("недостаточно прав для изменения ролей пользователя")
	}
	if userID == adminUserID {
		return nil, errors.New("системный администратор не может изменить свои бизнес-роли")
	}

	user, err := s.userStore.GetUserByID(userID)
	if err != nil {
		return nil, fmt.Errorf("ошибка получения пользователя: %w", err)
	}
	if user == nil {
		return nil, errors.New("пользователь не найден")
	}
	if user.Role == models.RoleSystemAdmin {
		return nil, errors.New("нельзя изменить доступные бизнес-роли системному администратору")
	}

	// Валидация ролей (убедиться, что это допустимые бизнес-роли)
	validBusinessRoles := map[models.UserRole]bool{
		models.RoleBuyer:          true,
		models.RoleSeller:         true,
		models.RoleAuctionManager: true,
	}
	for _, r := range roles {
		if !validBusinessRoles[models.UserRole(r)] {
			return nil, fmt.Errorf("недопустимая бизнес-роль: %s", r)
		}
	}

	rolesJson, err := json.Marshal(roles)
	if err != nil {
		return nil, fmt.Errorf("ошибка сериализации ролей в JSON: %w", err)
	}
	user.AvailableBusinessRoles = string(rolesJson)

	if err := s.userStore.UpdateUser(user); err != nil {
		return nil, fmt.Errorf("ошибка обновления ролей пользователя: %w", err)
	}
	user.PasswordHash = ""
	return user, nil
}
