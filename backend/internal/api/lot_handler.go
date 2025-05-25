package api

import (
	"auction-app/backend/internal/models"
	"auction-app/backend/internal/services"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type LotHandler struct {
	lotService *services.LotService
	// auctionService *services.AuctionService // Может понадобиться для проверок
}

func NewLotHandler(ls *services.LotService) *LotHandler {
	return &LotHandler{lotService: ls}
}

// CreateLot обрабатывает запрос на добавление лота к аукциону
func (h *LotHandler) CreateLot(c *gin.Context) {
	auctionIDStr := c.Param("auctionId") // Получаем ID аукциона из URL
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

	userID, _ := c.Get("userID")
	userRoleVal, _ := c.Get("userRole")
	currentUserID, _ := userID.(uint)
	currentUserRole, _ := userRoleVal.(string)

	// Проверка прав: только продавец или админ/менеджер могут добавлять лоты
	if currentUserRole != string(models.RoleSeller) &&
		currentUserRole != string(models.RoleSystemAdmin) &&
		currentUserRole != string(models.RoleAuctionManager) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Недостаточно прав для добавления лота"})
		return
	}

	// Если роль "seller", то sellerID = currentUserID.
	// Если "admin" или "auction_manager", они могут добавлять от своего имени или нужно будет предусмотреть выбор продавца.
	// Пока что, если это админ/менеджер, они выступают как продавцы от своего имени (ID 100 например).
	// В более сложной системе админ/менеджер могли бы указывать sellerID в input.
	// Для текущей реализации, sellerID будет currentUserID
	var sellerIDForLot uint = currentUserID

	lot, err := h.lotService.CreateLot(uint(auctionID), input, sellerIDForLot)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "лоты можно добавлять только") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка добавления лота: " + err.Error()})
		}
		return
	}
	c.JSON(http.StatusCreated, lot)
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

	userIDVal, _ := c.Get("userID")
	bidderID, _ := userIDVal.(uint)
	userRoleVal, _ := c.Get("userRole")
	bidderRole, _ := userRoleVal.(string)

	// Проверка, что ставку делает покупатель (или любая роль, которой это разрешено вашей логикой)
	if bidderRole != string(models.RoleBuyer) &&
		bidderRole != string(models.RoleSeller) && // Если продавец может быть и покупателем на других аукционах
		bidderRole != string(models.RoleAuctionManager) &&
		bidderRole != string(models.RoleSystemAdmin) { // Уточнить, кто может делать ставки
		c.JSON(http.StatusForbidden, gin.H{"error": "Текущая активная роль не позволяет делать ставки"})
		return
	}

	updatedLot, err := h.lotService.PlaceBid(uint(auctionID), uint(lotID), input, bidderID)
	if err != nil {
		// Более детальная обработка ошибок из сервиса
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "неактивны") ||
			strings.Contains(err.Error(), "не принимаются") ||
			strings.Contains(err.Error(), "собственный лот") ||
			strings.Contains(err.Error(), "выше текущей цены") {
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

// TODO: Добавить другие обработчики для лотов, если необходимо (GetLotByID, UpdateLot, DeleteLot)
