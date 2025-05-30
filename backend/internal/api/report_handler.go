// backend/internal/api/report_handler.go
package api

import (
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
func (h *ReportHandler) GetLotWithMaxPriceDifference(c *gin.Context) {
	lot, difference, err := h.reportService.GetLotWithMaxPriceDifference()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных: " + err.Error()})
		return
	}
	if lot == nil {
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
	result, err := h.reportService.GetAuctionWithMostSoldLots()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных: " + err.Error()})
		return
	}
	if auctionData, ok := result["auction"]; !ok || auctionData == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Нет аукционов с проданными лотами"})
		return
	}
	c.JSON(http.StatusOK, result)
}

// GetBuyerAndSellerOfMostExpensiveLot обрабатывает запросы "Покупатель самого дорогого лота" и "Продавец самого дорогого лота".
func (h *ReportHandler) GetBuyerAndSellerOfMostExpensiveLot(c *gin.Context) {
	result, err := h.reportService.GetMostExpensiveSoldLotInfo()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных: " + err.Error()})
		return
	}
	if lotData, ok := result["lot"]; !ok || lotData == nil {
		c.JSON(http.StatusNotFound, gin.H{"message": "Проданные лоты не найдены"})
		return
	}
	c.JSON(http.StatusOK, result)
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
	limitStr := c.DefaultQuery("limit", "3")
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
	dateStr := c.Query("date")

	if auctionIDStr == "" || dateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Параметры 'auctionId' и 'date' обязательны"})
		return
	}

	auctionID, err := strconv.ParseUint(auctionIDStr, 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Некорректный ID аукциона"})
		return
	}

	items, err := h.reportService.GetItemsForSaleByDateAndAuction(uint(auctionID), dateStr)
	if err != nil {
		if strings.Contains(err.Error(), "не найден") || strings.Contains(err.Error(), "не проводился в дату") { // Добавлена проверка на несоответствие даты
			c.JSON(http.StatusNotFound, gin.H{"error": err.Error()})
		} else if strings.Contains(err.Error(), "некорректный формат даты") {
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения данных: " + err.Error()})
		}
		return
	}
	if len(items) == 0 {
		// Сообщение из сервиса будет более точным, если аукцион завершен или отменен
		// Здесь общее сообщение, если сервис вернул пустой список без ошибки выше
		c.JSON(http.StatusNotFound, gin.H{"message": "Предметы на указанную дату и аукцион не найдены или аукцион неактивен/завершен/отменен."})
		return
	}
	c.JSON(http.StatusOK, items)
}

// GetBuyersOfItemsWithSpecificity обрабатывает "Покупатели, купившие предметы заданной специфики."
func (h *ReportHandler) GetBuyersOfItemsWithSpecificity(c *gin.Context) {
	specificity := c.Query("specificity")
	if specificity == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Параметр 'specificity' обязателен"})
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

// GetSellersByItemCategory (переименован из GetSellersReportBySpecificity в main.go и ReportService для соответствия эндпоинту)
// или это отдельный эндпоинт, тогда нужен отдельный метод в сервисе.
// Предполагаем, что это тот же отчет, что и GetSellersReportBySpecificity.
// Если это был эндпоинт /sellers-by-category, то он должен вызывать соответствующий метод сервиса.
// Для исправления ошибки компиляции, если GetSellersByItemCategory - это отдельный обработчик,
// он должен вызывать существующий метод, например, GetSellersWithSalesByAuctionSpecificity.
// Если это разные отчеты, то в ReportService должен быть метод GetSellersByItemCategory.
// Сейчас ReportService не имеет GetSellersByItemCategory.
// Изменим этот обработчик, чтобы он вызывал GetSellersWithSalesByAuctionSpecificity,
// используя "category" как "specificity" и minSales по умолчанию 0.
func (h *ReportHandler) GetSellersByItemCategory(c *gin.Context) {
	category := c.Query("category") // "category" будет использоваться как "specificity"
	if category == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Параметр 'category' (специфика) обязателен"})
		return
	}
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("pageSize", "10"))
	minSalesStr := c.DefaultQuery("minSales", "0") // Добавим возможность передать minSales
	minSales, _ := strconv.ParseFloat(minSalesStr, 64)

	if page < 1 {
		page = 1
	}
	if pageSize < 1 || pageSize > 100 {
		pageSize = 10
	}

	sellersReport, total, err := h.reportService.GetSellersWithSalesByAuctionSpecificity(category, minSales, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Ошибка получения отчета по продавцам: " + err.Error()})
		return
	}
	if len(sellersReport) == 0 && total == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Продавцы, соответствующие критериям, не найдены"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":       sellersReport,
		"pagination": gin.H{"currentPage": page, "pageSize": pageSize, "totalItems": total, "totalPages": (total + int64(pageSize) - 1) / int64(pageSize)},
	})
}

// GetSellersReportBySpecificity - этот обработчик уже есть, он маппится на /reports/sellers-sales-by-specificity
// в main.go. Если GetSellersByItemCategory - это псевдоним для него, то один из них не нужен.
// Оставим этот как основной для /reports/sellers-sales-by-specificity.
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
	if len(sellersReport) == 0 && total == 0 {
		c.JSON(http.StatusNotFound, gin.H{"message": "Продавцы, соответствующие критериям, не найдены"})
		return
	}
	c.JSON(http.StatusOK, gin.H{
		"data":       sellersReport,
		"pagination": gin.H{"currentPage": page, "pageSize": pageSize, "totalItems": total, "totalPages": (total + int64(pageSize) - 1) / int64(pageSize)},
	})
}
