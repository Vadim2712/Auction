// backend/internal/services/user_service.go
package services

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/store"
	"encoding/json"
	"errors"
	"fmt"
)

type UserService struct {
	userStore store.UserStore
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
		filters["role"] = roleFilter
	}

	users, total, err := s.userStore.GetAllUsers(offset, pageSize, filters)
	if err != nil {
		return nil, 0, fmt.Errorf("ошибка получения списка пользователей: %w", err)
	}
	// Пароли уже очищены в userStore.GetAllUsers
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
	if user.Role == models.RoleSystemAdmin {
		return nil, errors.New("нельзя изменить статус другого системного администратора")
	}

	user.IsActive = newStatus
	if err := s.userStore.UpdateUser(user); err != nil {
		return nil, fmt.Errorf("ошибка обновления статуса пользователя: %w", err)
	}
	user.PasswordHash = ""
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

	// Валидация ролей: "auction_manager" больше не является допустимой назначаемой ролью.
	validBusinessRoles := map[models.UserRole]bool{
		models.RoleBuyer:  true,
		models.RoleSeller: true,
		// models.RoleAuctionManager: true, // Убрано
	}
	for _, r := range roles {
		roleCandidate := models.UserRole(r)
		if _, isValid := validBusinessRoles[roleCandidate]; !isValid {
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
