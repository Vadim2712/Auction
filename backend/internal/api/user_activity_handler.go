package api

import (
	"auction-app/backend/internal/models" // Убедитесь, что путь правильный для вашего модуля
	"auction-app/backend/internal/services"
	"net/http"
	"strconv"

	// "strings" // Может понадобиться для обработки ошибок, если будете проверять текст

	"github.com/gin-gonic/gin"
)

// UserActivityHandler содержит методы-обработчики для получения данных об активности пользователя
type UserActivityHandler struct {
	activityService *services.UserActivityService
	// Если потребуются другие сервисы, их можно добавить сюда
}

// NewUserActivityHandler создает новый экземпляр UserActivityHandler
func NewUserActivityHandler(uas *services.UserActivityService) *UserActivityHandler {
	return &UserActivityHandler{activityService: uas}
}

// GetMyActivity обрабатывает запрос на получение активности текущего пользователя (ставки, выигрыши)
func (h *UserActivityHandler) GetMyActivity(c *gin.Context) {
	userIDVal, existsUserID := c.Get("userID")
	if !existsUserID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Пользователь не аутентифицирован (userID отсутствует в контексте)"})
		return
	}
	userID, okUserID := userIDVal.(uint)
	if !okUserID {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Некорректный формат userID в контексте"})
		return
	}

	// Получаем параметры пагинации из query
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 { // Ограничим максимальный размер страницы для этого запроса
		pageSize = 10
	}

	// Проверка роли не так важна здесь, так как пользователь запрашивает свои собственные данные.
	// Любой аутентифицированный пользователь может запросить свою активность.

	activity, err := h.activityService.GetMyActivity(userID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения активности пользователя: " + err.Error()})
		return
	}

	// activityService.GetMyActivity теперь возвращает UserActivityOutput, который уже содержит пагинацию, если она там реализована
	// Если пагинация не реализована в UserActivityOutput, а только данные, то можно обернуть здесь:
	// c.JSON(http.StatusOK, gin.H{
	//     "data": activity, // Если activity - это { leadingBids: [], wonLots: [] }
	//     "pagination": gin.H{ /* ... пагинация ... */ },
	// })
	// Но так как мы планировали UserActivityOutput с полем Pagination, то просто:
	c.JSON(http.StatusOK, activity)
}

// GetMyListings обрабатывает запрос на получение лотов, выставленных текущим пользователем
func (h *UserActivityHandler) GetMyListings(c *gin.Context) {
	userIDVal, existsUserID := c.Get("userID")
	userRoleVal, existsUserRole := c.Get("userRole")

	if !existsUserID || !existsUserRole {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Данные пользователя не найдены в контексте аутентификации"})
		return
	}
	currentUserID, okUserID := userIDVal.(uint)
	currentUserRoleStr, okUserRole := userRoleVal.(string)
	if !okUserID || !okUserRole {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Некорректный формат данных пользователя в контексте"})
		return
	}
	currentUserRole := models.UserRole(currentUserRoleStr)

	// Доступ к "моим лотам" имеют продавцы, менеджеры аукционов (если они тоже могут выставлять лоты от себя)
	// и системные администраторы (для просмотра лотов любого пользователя, если они запросят свои).
	// В данном случае, мы проверяем, что у пользователя есть одна из этих активных ролей для доступа к "своим" листингам.
	if currentUserRole != models.RoleSeller &&
		currentUserRole != models.RoleSystemAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Доступ к просмотру своих лотов запрещен для вашей текущей активной роли"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 50 {
		pageSize = 10
	}

	listings, total, err := h.activityService.GetMyListings(currentUserID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения списка лотов пользователя: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": listings, // listings - это []services.LotWithAuctionInfo
		"pagination": gin.H{
			"currentPage": page,
			"pageSize":    pageSize,
			"totalItems":  total,
			"totalPages":  (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}
