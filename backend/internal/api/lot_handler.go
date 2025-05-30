// backend/internal/api/lot_handler.go
package api

import (
	"auction-app/backend/internal/models" // Убедимся, что models импортированы
	"auction-app/backend/internal/services"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

// LotHandler содержит методы-обработчики для лотов
type LotHandler struct {
	lotService *services.LotService
}

// NewLotHandler создает новый экземпляр LotHandler
func NewLotHandler(ls *services.LotService) *LotHandler {
	return &LotHandler{lotService: ls}
}

// CreateLot обрабатывает запрос на добавление лота к аукциону
func (h *LotHandler) CreateLot(c *gin.Context) {
	auctionIDStr := c.Param("auctionId")
	auctionID, err := strconv.ParseUint(auctionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID аукциона в URL"})
		return
	}

	var input models.CreateLotInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные входные данные для лота: " + err.Error()})
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

	if currentUserRole != models.RoleSeller && currentUserRole != models.RoleSystemAdmin {
		c.JSON(http.StatusForbidden, gin.H{"error": "Недостаточно прав для добавления лота"})
		return
	}
	sellerIDForLot := currentUserID

	lot, err := h.lotService.CreateLot(uint(auctionID), input, sellerIDForLot)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "лоты можно добавлять только") || strings.Contains(err.Error(), "стартовая цена") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка добавления лота: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusCreated, lot)
}

// GetLotsByAuctionID обрабатывает запрос на получение списка лотов для конкретного аукциона
func (h *LotHandler) GetLotsByAuctionID(c *gin.Context) {
	auctionIDStr := c.Param("auctionId")
	auctionID, err := strconv.ParseUint(auctionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID аукциона в URL"})
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

	lots, total, err := h.lotService.GetLotsByAuctionID(uint(auctionID), page, pageSize)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения лотов для аукциона: " + err.Error()})
		}
		return
	}
	if lots == nil {
		lots = []models.Lot{}
	}

	c.JSON(http.StatusOK, gin.H{
		"data": lots,
		"pagination": gin.H{
			"currentPage": page,
			"pageSize":    pageSize,
			"totalItems":  total,
			"totalPages":  (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}

// GetLotByID обрабатывает запрос на получение деталей одного лота
func (h *LotHandler) GetLotByID(c *gin.Context) {
	lotIDStr := c.Param("lotId")
	lotID, err := strconv.ParseUint(lotIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID лота в URL"})
		return
	}

	lot, err := h.lotService.GetLotByID(uint(lotID))
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": "Лот не найден"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения лота: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, lot)
}

// UpdateLotDetails обрабатывает запрос на обновление деталей лота
func (h *LotHandler) UpdateLotDetails(c *gin.Context) {
	auctionIDStr := c.Param("auctionId")
	lotIDStr := c.Param("lotId")

	auctionID, errAuction := strconv.ParseUint(auctionIDStr, 10, 32)
	lotID, errLot := strconv.ParseUint(lotIDStr, 10, 32)

	if errAuction != nil || errLot != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID аукциона или лота в URL"})
		return
	}

	var input models.UpdateLotInput // Используем models.UpdateLotInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные входные данные для обновления лота: " + err.Error()})
		return
	}

	userIDVal, existsUserID := c.Get("userID")
	userRoleVal, existsUserRole := c.Get("userRole")
	if !existsUserID || !existsUserRole {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Данные пользователя не найдены в контексте"})
		return
	}
	currentUserID, _ := userIDVal.(uint)
	currentUserRoleStr, _ := userRoleVal.(string)
	currentUserRole := models.UserRole(currentUserRoleStr)

	updatedLot, err := h.lotService.UpdateLotDetails(uint(lotID), uint(auctionID), input, currentUserID, currentUserRole)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "недостаточно прав") ||
			strings.Contains(err.Error(), "лот не принадлежит данному аукциону") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "только до начала торгов") ||
			strings.Contains(err.Error(), "стартовая цена") ||
			strings.Contains(err.Error(), "уже есть ставки") ||
			strings.Contains(err.Error(), "можно только в запланированном аукционе") ||
			strings.Contains(err.Error(), "ожидает торгов и по нему нет ставок") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка обновления лота: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, updatedLot)
}

// DeleteLot обрабатывает запрос на удаление лота
func (h *LotHandler) DeleteLot(c *gin.Context) {
	auctionIDStr := c.Param("auctionId")
	lotIDStr := c.Param("lotId")

	auctionID, errAuction := strconv.ParseUint(auctionIDStr, 10, 32)
	lotID, errLot := strconv.ParseUint(lotIDStr, 10, 32)

	if errAuction != nil || errLot != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID аукциона или лота в URL"})
		return
	}

	userIDVal, existsUserID := c.Get("userID")
	userRoleVal, existsUserRole := c.Get("userRole")
	if !existsUserID || !existsUserRole {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Данные пользователя не найдены в контексте"})
		return
	}
	currentUserID, _ := userIDVal.(uint)
	currentUserRoleStr, _ := userRoleVal.(string)
	currentUserRole := models.UserRole(currentUserRoleStr)

	err := h.lotService.DeleteLot(uint(lotID), uint(auctionID), currentUserID, currentUserRole)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "недостаточно прав") ||
			strings.Contains(err.Error(), "лот не принадлежит данному аукциону") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "удалить лот можно только") ||
			strings.Contains(err.Error(), "участвовал в завершенных торгах") ||
			strings.Contains(err.Error(), "только из запланированного аукциона") ||
			strings.Contains(err.Error(), "ожидает торгов и по нему нет ставок") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка удаления лота: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, gin.H{"message": "Лот успешно удален"})
}

// PlaceBid обрабатывает запрос на размещение ставки
func (h *LotHandler) PlaceBid(c *gin.Context) {
	auctionIDStr := c.Param("auctionId")
	lotIDStr := c.Param("lotId")

	auctionID, errAuction := strconv.ParseUint(auctionIDStr, 10, 32)
	lotID, errLot := strconv.ParseUint(lotIDStr, 10, 32)

	if errAuction != nil || errLot != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID аукциона или лота в URL"})
		return
	}

	var input models.PlaceBidInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректные входные данные для ставки: " + err.Error()})
		return
	}

	userIDVal, existsUserID := c.Get("userID")
	userRoleVal, existsUserRole := c.Get("userRole")
	if !existsUserID || !existsUserRole {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Данные пользователя не найдены в контексте"})
		return
	}
	bidderID, _ := userIDVal.(uint)
	bidderRole := models.UserRole(userRoleVal.(string))

	canBid := false
	switch bidderRole {
	case models.RoleBuyer, models.RoleSeller, models.RoleSystemAdmin:
		canBid = true
	}
	if !canBid {
		c.JSON(http.StatusForbidden, gin.H{"error": "Ваша текущая активная роль не позволяет делать ставки"})
		return
	}

	updatedLot, err := h.lotService.PlaceBid(uint(auctionID), uint(lotID), input, bidderID)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "неактивны") ||
			strings.Contains(err.Error(), "не принимаются (статус лота)") ||
			strings.Contains(err.Error(), "собственный лот") ||
			strings.Contains(err.Error(), "выше текущей цены") ||
			strings.Contains(err.Error(), "уже лидируете") ||
			strings.Contains(err.Error(), "не удалось проверить правило") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "недостаточно прав") {
			c.JSON(http.StatusForbidden, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка размещения ставки: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusOK, updatedLot)
}

// GetAllLots обрабатывает запрос на получение всех лотов с фильтрами
func (h *LotHandler) GetAllLots(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	filters := make(map[string]string)
	if status := c.Query("status"); status != "" {
		filters["status"] = status
	}
	if sellerId := c.Query("sellerId"); sellerId != "" {
		filters["sellerId"] = sellerId
	}
	if auctionId := c.Query("auctionId"); auctionId != "" {
		filters["auctionId"] = auctionId
	}
	if auctionMonth := c.Query("auctionMonth"); auctionMonth != "" {
		filters["auctionMonth"] = auctionMonth
	}

	lots, total, err := h.lotService.GetAllLots(page, pageSize, filters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения списка лотов: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": lots,
		"pagination": gin.H{
			"currentPage": page,
			"pageSize":    pageSize,
			"totalItems":  total,
			"totalPages":  (total + int64(pageSize) - 1) / int64(pageSize),
		},
	})
}
