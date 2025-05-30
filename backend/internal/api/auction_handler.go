// backend/internal/api/auction_handler.go
package api

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/services"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// AuctionHandler содержит методы-обработчики для аукционов
type AuctionHandler struct {
	auctionService *services.AuctionService
}

// NewAuctionHandler создает новый экземпляр AuctionHandler
func NewAuctionHandler(as *services.AuctionService) *AuctionHandler {
	return &AuctionHandler{auctionService: as}
}

// CreateAuction обрабатывает запрос на создание нового аукциона
func (h *AuctionHandler) CreateAuction(c *gin.Context) {
	var input models.CreateAuctionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные входные данные: " + err.Error()})
		return
	}

	userIDVal, existsUserID := c.Get("userID")
	if !existsUserID {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Пользователь не аутентифицирован (userID отсутствует в контексте)"})
		return
	}
	currentUserID, okUserID := userIDVal.(uint)
	if !okUserID {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Некорректный формат userID в контексте"})
		return
	}

	userRoleVal, existsUserRole := c.Get("userRole")
	if !existsUserRole {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Роль пользователя не определена в контексте"})
		return
	}
	currentUserRoleStr, okUserRole := userRoleVal.(string)
	if !okUserRole {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Некорректный формат userRole в контексте"})
		return
	}
	currentUserRole := models.UserRole(currentUserRoleStr)

	// Проверка прав: только системный администратор или продавец (в роли менеджера) могут создавать аукционы
	if currentUserRole != models.RoleSystemAdmin && currentUserRole != models.RoleSeller {
		c.JSON(http.StatusForbidden, gin.H{"error": "Недостаточно прав для создания аукциона"})
		return
	}

	auction, err := h.auctionService.CreateAuction(input, currentUserID)
	if err != nil {
		// Проверяем специфичные ошибки из сервиса, если они есть
		if strings.Contains(err.Error(), "некорректный формат") || strings.Contains(err.Error(), "дата аукциона не может быть в прошлом") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка создания аукциона: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusCreated, auction)
}

// GetAllAuctions обрабатывает запрос на получение списка всех аукционов с пагинацией и фильтрами
func (h *AuctionHandler) GetAllAuctions(c *gin.Context) {
	pageStr := c.DefaultQuery("page", "1")
	pageSizeStr := c.DefaultQuery("pageSize", "10")
	statusFilter := c.Query("status")
	dateFromFilter := c.Query("dateFrom")
	// dateToFilter := c.Query("dateTo")

	page, _ := strconv.Atoi(pageStr)
	pageSize, _ := strconv.Atoi(pageSizeStr)

	// Валидация page и pageSize уже есть в сервисе, но можно и здесь для быстрого ответа
	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	} else if pageSize > 100 {
		pageSize = 100
	}

	filters := make(map[string]string)
	if statusFilter != "" {
		filters["status"] = statusFilter
	}
	if dateFromFilter != "" {
		filters["dateFrom"] = dateFromFilter
	}

	auctions, total, err := h.auctionService.GetAllAuctions(page, pageSize, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения списка аукционов: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": auctions,
		"pagination": gin.H{
			"currentPage": page,
			"pageSize":    pageSize,
			"totalItems":  total,
			"totalPages":  (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

// GetAuctionByID обрабатывает запрос на получение деталей одного аукциона
func (h *AuctionHandler) GetAuctionByID(c *gin.Context) {
	idStr := c.Param("auctionId")
	id, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID аукциона в URL"})
		return
	}

	auction, err := h.auctionService.GetAuctionByID(uint(id))
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Аукцион не найден"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения аукциона: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, auction)
}

// UpdateAuctionStatus обрабатывает запрос на изменение статуса аукциона
func (h *AuctionHandler) UpdateAuctionStatus(c *gin.Context) {
	idStr := c.Param("auctionId")
	auctionID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID аукциона в URL"})
		return
	}

	var input models.UpdateAuctionStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные входные данные для статуса: " + err.Error()})
		return
	}

	isValidStatus := false
	switch input.Status {
	case models.StatusScheduled, models.StatusActive, models.StatusCompleted:
		isValidStatus = true
	}
	if !isValidStatus {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Недопустимое значение для статуса аукциона"})
		return
	}

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

	updatedAuction, err := h.auctionService.UpdateAuctionStatus(uint(auctionID), input.Status, currentUserID, currentUserRole)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "недостаточно прав") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "нельзя изменить статус") || strings.Contains(err.Error(), "нельзя вернуть активный аукцион") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления статуса аукциона: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, updatedAuction)
}

// UpdateAuction обрабатывает запрос на обновление данных аукциона
func (h *AuctionHandler) UpdateAuction(c *gin.Context) {
	idStr := c.Param("auctionId")
	auctionID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID аукциона в URL"})
		return
	}

	var input models.UpdateAuctionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные входные данные для обновления: " + err.Error()})
		return
	}

	userIDVal, existsUserID := c.Get("userID")
	userRoleVal, existsUserRole := c.Get("userRole")

	if !existsUserID || !existsUserRole {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Данные пользователя не найдены в контексте"})
		return
	}
	currentUserID, okUserID := userIDVal.(uint)
	currentUserRoleStr, okUserRole := userRoleVal.(string)
	if !okUserID || !okUserRole {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Некорректный формат данных пользователя в контексте"})
		return
	}
	currentUserRole := models.UserRole(currentUserRoleStr)

	updatedAuction, err := h.auctionService.UpdateAuction(uint(auctionID), input, currentUserID, currentUserRole)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "недостаточно прав") || strings.Contains(err.Error(), "только запланированные") || strings.Contains(err.Error(), "некорректный формат") {
			// Используем StatusBadRequest для ошибок валидации данных/формата, StatusForbidden для прав
			if strings.Contains(err.Error(), "некорректный формат") {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления аукциона: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, updatedAuction)
}

// DeleteAuction обрабатывает запрос на удаление аукциона
func (h *AuctionHandler) DeleteAuction(c *gin.Context) {
	idStr := c.Param("auctionId")
	auctionID, err := strconv.ParseUint(idStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID аукциона в URL"})
		return
	}

	userIDVal, existsUserID := c.Get("userID")
	userRoleVal, existsUserRole := c.Get("userRole")

	if !existsUserID || !existsUserRole {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Данные пользователя не найдены в контексте"})
		return
	}
	currentUserID, okUserID := userIDVal.(uint)
	currentUserRoleStr, okUserRole := userRoleVal.(string)
	if !okUserID || !okUserRole {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Некорректный формат данных пользователя в контексте"})
		return
	}
	currentUserRole := models.UserRole(currentUserRoleStr)

	err = h.auctionService.DeleteAuction(uint(auctionID), currentUserID, currentUserRole)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "недостаточно прав") || strings.Contains(err.Error(), "нельзя удалить") {
			// StatusForbidden для недостатка прав, StatusBadRequest для нарушения бизнес-правил (нельзя удалить активный)
			if strings.Contains(err.Error(), "недостаточно прав") {
				c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
			} else {
				c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
			}
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления аукциона: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Аукцион успешно удален"})
}

// FindAuctionsBySpecificity обрабатывает запрос на поиск аукционов по специфике
func (h *AuctionHandler) FindAuctionsBySpecificity(c *gin.Context) {
	query := c.Query("q")
	if query == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Параметр запроса 'q' (специфика) обязателен"})
		return
	}

	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	filters := make(map[string]string) // Для FindAuctionsBySpecificity не используем доп. фильтры из query кроме `q`

	auctions, total, err := h.auctionService.FindAuctionsBySpecificity(query, page, pageSize, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка поиска аукционов: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": auctions,
		"pagination": gin.H{
			"currentPage": page, "pageSize": pageSize, "totalItems": total,
			"totalPages": (total + int64(pageSize) - 1) / int64(pageSize)},
	})
}
