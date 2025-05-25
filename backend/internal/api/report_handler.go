package api

import (
	// Убедитесь, что путь правильный
	"auction-app/backend/internal/services"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type ReportHandler struct {
	reportService *services.ReportService
}

// NewReportHandler создает новый экземпляр ReportHandler
func NewReportHandler(rs *services.ReportService) *ReportHandler {
	return &ReportHandler{reportService: rs}
}

// GetLotWithMaxPriceDifference обрабатывает запрос на получение лота с макс. разницей цен
// Этот эндпоинт теперь будет вызывать более общую функцию из ReportService,
// которая возвращает не только сам лот, но и информацию о продавце/покупателе,
// и которая в сервисе называется GetMostExpensiveSoldLotInfo (если мы говорим о самом дорогом)
// или потребует новой функции в сервисе именно для "максимальной разницы".
// Давайте предположим, что "Предмет, имеющий максимальную разницу между начальной и конечной ценами" - это отдельный отчет.
func (h *ReportHandler) GetLotWithMaxPriceDifference(c *gin.Context) {
	// Этот метод теперь должен быть в ReportService
	// result, err := h.reportService.GetLotWithMaxPriceDifferenceDetailed() // Пример названия нового метода в сервисе

	// Пока используем существующий GetMostExpensiveSoldLotInfo, если он подходит,
	// или реализуем новый специфичный метод в ReportService
	// Для соответствия названию эндпоинта, предположим ReportService имеет такой метод:
	lot, difference, err := h.reportService.GetLotWithMaxPriceDifference() // Сервис должен вернуть лот и саму разницу
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных: " + err.Error()})
		return
	}
	if lot == nil { // Если сервис возвращает nil, когда нет данных
		c.JSON(http.StatusNotFound, gin.H{"message": "Проданные лоты для анализа разницы цен не найдены"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"lot":             lot,
		"priceDifference": difference,
	})
}

// GetAuctionWithMostSoldLots обрабатывает запрос "На каком аукционе было продано больше всего предметов."
func (h *ReportHandler) GetAuctionWithMostSoldLots(c *gin.Context) {
	result, err := h.reportService.GetAuctionWithMostSoldLots() // Сервис возвращает map[string]interface{}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных: " + err.Error()})
		return
	}
	// Проверка, если auction == nil внутри result
	if auctionData, ok := result["auction"]; !ok || auctionData == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Нет аукционов с проданными лотами"})
		return
	}
	c.JSON(http.StatusOK, result)
}

// GetBuyerAndSellerOfMostExpensiveLot обрабатывает запросы "Покупатель самого дорогого лота" и "Продавец самого дорогого лота".
// Они объединены, так как логика получения самого дорогого лота одна.
func (h *ReportHandler) GetBuyerAndSellerOfMostExpensiveLot(c *gin.Context) {
	result, err := h.reportService.GetMostExpensiveSoldLotInfo() // Сервис возвращает map[string]interface{}
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных: " + err.Error()})
		return
	}
	if lotData, ok := result["lot"]; !ok || lotData == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Проданные лоты не найдены"})
		return
	}
	c.JSON(http.StatusOK, result) // Возвращаем { lot: ..., seller: ..., buyer: ... }
}

// GetAuctionsWithNoSoldLots обрабатывает запрос "Аукционы, на которых не был продан ни один предмет."
func (h *ReportHandler) GetAuctionsWithNoSoldLots(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	auctions, total, err := h.reportService.GetAuctionsWithNoSoldLots(page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных: " + err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":       auctions,
		"pagination": gin.H{"currentPage": page, "pageSize": pageSize, "totalItems": total, "totalPages": (total + int64(pageSize) - 1) / int64(pageSize)},
	})
}

// GetTopNMostExpensiveSoldLots обрабатывает запрос "Сведения о трех самых дорогих предметах, проданных за всё время."
func (h *ReportHandler) GetTopNMostExpensiveSoldLots(c *gin.Context) {
	limitStr := c.DefaultQuery("limit", "3") // По умолчанию топ-3
	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit <= 0 {
		limit = 3
	}

	lots, err := h.reportService.GetTopNMostExpensiveSoldLots(limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных: " + err.Error()})
		return
	}
	if len(lots) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Проданные лоты не найдены"})
		return
	}
	c.JSON(http.StatusOK, lots)
}

// GetItemsForSaleByDateAndAuction обрабатывает запрос "Какие предметы на заданную дату и на заданном аукционе выставлены на продажу."
func (h *ReportHandler) GetItemsForSaleByDateAndAuction(c *gin.Context) {
	auctionIDStr := c.Query("auctionId")
	dateStr := c.Query("date") // Ожидаем дату в формате YYYY-MM-DD

	if auctionIDStr == "" || dateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Параметры 'auctionId' и 'date' обязательны"})
		return
	}

	auctionID, err := strconv.ParseUint(auctionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID аукциона"})
		return
	}

	// Валидация формата даты уже будет в сервисе при парсинге

	items, err := h.reportService.GetItemsForSaleByDateAndAuction(uint(auctionID), dateStr)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") {
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "не соответствует дате") || strings.Contains(err.Error(), "некорректный формат даты") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных: " + err.Error()})
		}
		return
	}
	if len(items) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Предметы на указанную дату и аукцион не найдены или аукцион неактивен"})
		return
	}
	c.JSON(http.StatusOK, items)
}

// GetAuctionsBySpecificity - этот эндпоинт уже есть в AuctionHandler: auctionRoutes.GET("/search", auctionHandler.FindAuctionsBySpecificity)
// Мы можем либо оставить его там, либо перенести сюда всю логику отчетов.
// Для консистентности, если это "отчет", то лучше здесь.

// GetBuyersOfItemsWithSpecificity обрабатывает "Покупатели, купившие предметы заданной специфики."
func (h *ReportHandler) GetBuyersOfItemsWithSpecificity(c *gin.Context) {
	specificity := c.Query("specificity")
	if specificity == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Параметр 'specificity' обязателен"})
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	buyers, total, err := h.reportService.GetBuyersOfItemsWithSpecificity(specificity, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных: " + err.Error()})
		return
	}
	if len(buyers) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Покупатели предметов с указанной спецификой не найдены"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":       buyers,
		"pagination": gin.H{"currentPage": page, "pageSize": pageSize, "totalItems": total, "totalPages": (total + int64(pageSize) - 1) / int64(pageSize)},
	})
}

// GetSellersByItemCategoryAndAmount обрабатывает "Продавцы, продавшие предметы заданной категории на сумму..."
// "на сумму" - пока не ясно, что это значит. Предположим, "на наибольшую общую сумму в категории".
func (h *ReportHandler) GetSellersByItemCategory(c *gin.Context) {
	category := c.Query("category") // Категория = Специфика аукциона или лота?
	if category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Параметр 'category' обязателен"})
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))

	sellers, total, err := h.reportService.GetSellersByItemCategory(category, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных: " + err.Error()})
		return
	}
	if len(sellers) == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Продавцы предметов указанной категории не найдены"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":       sellers,
		"pagination": gin.H{"currentPage": page, "pageSize": pageSize, "totalItems": total, "totalPages": (total + int64(pageSize) - 1) / int64(pageSize)},
	})
}

func (h *ReportHandler) GetSellersReportBySpecificity(c *gin.Context) {
	specificity := c.Query("specificity")
	minSalesStr := c.DefaultQuery("minSales", "0")

	if specificity == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Параметр 'specificity' (специфика аукциона) обязателен"})
		return
	}
	minSales, errMinSales := strconv.ParseFloat(minSalesStr, 64)
	if errMinSales != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректное значение для 'minSales'"})
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

	sellersReport, total, err := h.reportService.GetSellersWithSalesByAuctionSpecificity(specificity, minSales, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения отчета по продавцам: " + err.Error()})
		return
	}
	if len(sellersReport) == 0 && total == 0 { // Проверяем и total, если он был 0
		c.JSON(http.StatusNotFound, gin.H{"message": "Продавцы, соответствующие критериям, не найдены"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":       sellersReport,
		"pagination": gin.H{"currentPage": page, "pageSize": pageSize, "totalItems": total, "totalPages": (total + int64(pageSize) - 1) / int64(pageSize)},
	})
}
