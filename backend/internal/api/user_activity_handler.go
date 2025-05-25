package api

import (
	"auction-app/backend/internal/services"
	"net/http"

	"github.com/gin-gonic/gin"
)

type UserActivityHandler struct {
	activityService *services.UserActivityService
}

func NewUserActivityHandler(uas *services.UserActivityService) *UserActivityHandler {
	return &UserActivityHandler{activityService: uas}
}

func (h *UserActivityHandler) GetMyActivity(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Пользователь не аутентифицирован"})
		return
	}
	userID, _ := userIDVal.(uint)

	activity, err := h.activityService.GetMyActivity(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения активности пользователя: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, activity)
}

func (h *UserActivityHandler) GetMyListings(c *gin.Context) {
	userIDVal, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Пользователь не аутентифицирован"})
		return
	}
	userID, _ := userIDVal.(uint)
	// Проверка роли (только seller или admin могут видеть свои листинги таким образом)
	// userRoleVal, _ := c.Get("userRole")
	// currentUserRole, _ := userRoleVal.(string)
	// if models.UserRole(currentUserRole) != models.RoleSeller && models.UserRole(currentUserRole) != models.RoleSystemAdmin && models.UserRole(currentUserRole) != models.RoleAuctionManager {
	//     c.JSON(http.StatusForbidden, gin.H{"error": "Доступ запрещен для данной роли"})
	//     return
	// }

	listings, err := h.activityService.GetMyListings(userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения списка лотов пользователя: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, listings)
}
