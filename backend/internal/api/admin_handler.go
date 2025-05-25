package api

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/services"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type AdminHandler struct {
	userService *services.UserService
	// другие сервисы, если нужны админу
}

func NewAdminHandler(us *services.UserService) *AdminHandler {
	return &AdminHandler{userService: us}
}

// GetAllUsers обрабатывает запрос на получение списка всех пользователей (для админа)
func (h *AdminHandler) GetAllUsers(c *gin.Context) {
	// Проверка, что это действительно системный администратор (хотя middleware уже должен был сделать это)
	userRoleVal, _ := c.Get("userRole")
	currentUserRole := models.UserRole(userRoleVal.(string))
	if currentUserRole != models.RoleSystemAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Доступ запрещен"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	roleFilter := c.Query("role") // Фильтр по основной роли (buyer, seller, auction_manager)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	users, total, err := h.userService.GetAllUsers(page, pageSize, roleFilter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения списка пользователей: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":       users,
		"pagination": gin.H{"currentPage": page, "pageSize": pageSize, "totalItems": total, "totalPages": (total + int64(pageSize) - 1) / int64(pageSize)},
	})
}

// UpdateUserStatus изменяет статус активности пользователя (блокировка/разблокировка)
func (h *AdminHandler) UpdateUserStatus(c *gin.Context) {
	adminUserIDVal, _ := c.Get("userID")
	adminRoleVal, _ := c.Get("userRole")
	adminUserID := adminUserIDVal.(uint)
	adminRole := models.UserRole(adminRoleVal.(string))

	targetUserIDStr := c.Param("userId")
	targetUserID, err := strconv.ParseUint(targetUserIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID целевого пользователя"})
		return
	}

	var input models.UpdateUserStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные входные данные: " + err.Error()})
		return
	}

	user, err := h.userService.UpdateUserStatus(uint(targetUserID), input.IsActive, adminUserID, adminRole)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "недостаточно прав") || strings.Contains(err.Error(), "не может заблокировать сам себя") || strings.Contains(err.Error(), "нельзя изменить статус другого системного администратора") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления статуса пользователя: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, user)
}

// UpdateUserRoles обновляет доступные бизнес-роли пользователя
func (h *AdminHandler) UpdateUserRoles(c *gin.Context) {
	adminUserIDVal, _ := c.Get("userID")
	adminRoleVal, _ := c.Get("userRole")
	adminUserID := adminUserIDVal.(uint)
	adminRole := models.UserRole(adminRoleVal.(string))

	targetUserIDStr := c.Param("userId")
	targetUserID, err := strconv.ParseUint(targetUserIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID целевого пользователя"})
		return
	}

	var input models.UpdateUserRolesInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные входные данные для ролей: " + err.Error()})
		return
	}

	user, err := h.userService.UpdateUserAvailableRoles(uint(targetUserID), input.AvailableBusinessRoles, adminUserID, adminRole)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "недостаточно прав") || strings.Contains(err.Error(), "недопустимая бизнес-роль") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления ролей пользователя: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, user)
}
