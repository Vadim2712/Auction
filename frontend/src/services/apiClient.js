// src/services/apiClient.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1'; // URL вашего Go бэкенда

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor для добавления JWT токена к каждому авторизованному запросу
apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('authToken');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

// --- Auth API ---
/**
 * Регистрирует нового пользователя.
 * @param {object} userData - Данные пользователя: { fullName, email, password, passportData }
 */
export const registerUser = (userData) => {
    return apiClient.post('/auth/register', userData);
};

/**
 * Аутентифицирует пользователя и запрашивает токен.
 * @param {object} credentials - Учетные данные: { email, password, role (выбранная активная роль) }
 */
export const loginUser = (credentials) => {
    // 'role' здесь - это та активная роль, которую пользователь выбрал на фронтенде
    // Бэкенд ожидает это в теле запроса /auth/login
    return apiClient.post('/auth/login', credentials);
};

/**
 * Получает информацию о текущем аутентифицированном пользователе (на основе токена).
 */
export const getCurrentUser = () => {
    return apiClient.get('/auth/me');
};


// --- Auctions API ---
/**
 * Получает список всех аукционов с пагинацией и фильтрами.
 * @param {object} params - Параметры запроса (page, pageSize, status, dateFrom и т.д.)
 * Пример: { page: 1, pageSize: 10, status: "Идет торг" }
 */
export const getAllAuctions = (params) => {
    return apiClient.get('/auctions', { params }); // Передаем параметры как query string
};

/**
 * Получает детали одного аукциона по ID.
 * @param {string|number} auctionId - ID аукциона.
 */
export const getAuctionById = (auctionId) => {
    return apiClient.get(`/auctions/${auctionId}`);
};

/**
 * Создает новый аукцион.
 * @param {object} auctionData - Данные аукциона (из CreateAuctionInput на бэкенде).
 */
export const createAuction = (auctionData) => {
    return apiClient.post('/auctions', auctionData);
};

/**
 * Обновляет статус аукциона.
 * @param {string|number} auctionId - ID аукциона.
 * @param {string} status - Новый статус (из AuctionStatus на бэкенде).
 */
export const updateAuctionStatus = (auctionId, status) => {
    return apiClient.patch(`/auctions/${auctionId}/status`, { status });
};

/**
 * Обновляет данные аукциона.
 * @param {string|number} auctionId - ID аукциона.
 * @param {object} auctionData - Данные для обновления (из UpdateAuctionInput на бэкенде).
 */
export const updateAuction = (auctionId, auctionData) => {
    return apiClient.put(`/auctions/${auctionId}`, auctionData);
};

/**
 * Удаляет аукцион.
 * @param {string|number} auctionId - ID аукциона.
 */
export const deleteAuction = (auctionId) => {
    return apiClient.delete(`/auctions/${auctionId}`);
};

/**
 * Ищет аукционы по специфике.
 * @param {string} query - Строка для поиска.
 * @param {object} params - Параметры пагинации (page, pageSize).
 */
export const findAuctionsBySpecificity = (query, params) => {
    return apiClient.get('/auctions/search', { params: { ...params, q: query } });
};


// --- Lots API ---
/**
 * Создает новый лот для аукциона.
 * @param {string|number} auctionId - ID аукциона.
 * @param {object} lotData - Данные лота (из CreateLotInput на бэкенде).
 */
export const createLot = (auctionId, lotData) => {
    return apiClient.post(`/auctions/${auctionId}/lots`, lotData);
};

/**
 * Получает список лотов для аукциона с пагинацией.
 * @param {string|number} auctionId - ID аукциона.
 * @param {object} params - Параметры пагинации (page, pageSize).
 */
export const getLotsByAuctionID = (auctionId, params) => {
    return apiClient.get(`/auctions/${auctionId}/lots`, { params });
};

/**
 * Получает детали одного лота по его ID.
 * @param {string|number} lotId - ID лота.
 */
export const getLotByID = (lotId) => {
    return apiClient.get(`/lots/${lotId}`); // Используем маршрут /lots/:lotId
};

/**
 * Обновляет детали лота.
 * @param {string|number} auctionId - ID аукциона, к которому принадлежит лот.
 * @param {string|number} lotId - ID лота.
 * @param {object} lotData - Данные для обновления (из UpdateLotInput на бэкенде).
 */
export const updateLotDetails = (auctionId, lotId, lotData) => {
    return apiClient.put(`/auctions/${auctionId}/lots/${lotId}`, lotData);
};

/**
 * Удаляет лот.
 * @param {string|number} auctionId - ID аукциона.
 * @param {string|number} lotId - ID лота.
 */
export const deleteLot = (auctionId, lotId) => {
    return apiClient.delete(`/auctions/${auctionId}/lots/${lotId}`);
};

/**
 * Размещает ставку на лот.
 * @param {string|number} auctionId - ID аукциона.
 * @param {string|number} lotId - ID лота.
 * @param {number} amount - Сумма ставки.
 */
export const placeBid = (auctionId, lotId, amount) => {
    return apiClient.post(`/auctions/${auctionId}/lots/${lotId}/bids`, { amount });
};

// --- User Activity API ---
/**
 * Получает активность текущего пользователя (ставки, выигрыши).
 * @param {object} params - Параметры пагинации (page, pageSize).
 */
export const getMyActivity = (params) => {
    return apiClient.get('/my/activity', { params });
};

/**
 * Получает лоты, выставленные текущим пользователем (продавцом).
 * @param {object} params - Параметры пагинации (page, pageSize).
 */
export const getMyListings = (params) => {
    return apiClient.get('/my/listings', { params });
};


// --- Reports API ---
/**
 * Получает лот с максимальной разницей между начальной и конечной ценой.
 */
export const getLotWithMaxPriceDifference = () => {
    return apiClient.get('/reports/lot-max-price-diff');
};

/**
 * Получает аукцион с наибольшим количеством проданных лотов.
 */
export const getAuctionWithMostSoldLots = () => {
    return apiClient.get('/reports/auction-most-sold');
};

/**
 * Получает информацию о самом дорогом проданном лоте, его продавце и покупателе.
 */
export const getBuyerAndSellerOfMostExpensiveLot = () => {
    return apiClient.get('/reports/most-expensive-lot-info');
};

/**
 * Получает аукционы, на которых не был продан ни один предмет.
 * @param {object} params - Параметры пагинации (page, pageSize).
 */
export const getAuctionsWithNoSoldLots = (params) => {
    return apiClient.get('/reports/auctions-no-sales', { params });
};

/**
 * Получает топ N самых дорогих предметов, проданных за всё время.
 * @param {number} limit - Количество предметов для выборки.
 */
export const getTopNMostExpensiveSoldLots = (limit = 3) => {
    return apiClient.get('/reports/top-expensive-lots', { params: { limit } });
};

/**
 * Получает предметы на заданную дату и на заданном аукционе, выставленные на продажу.
 * @param {string|number} auctionId - ID аукциона.
 * @param {string} date - Дата в формате "YYYY-MM-DD".
 */
export const getItemsForSaleByDateAndAuction = (auctionId, date) => {
    return apiClient.get('/reports/items-for-sale', { params: { auctionId, date } });
};

/**
 * Получает покупателей, купивших предметы заданной специфики.
 * @param {string} specificity - Специфика для поиска.
 * @param {object} params - Параметры пагинации (page, pageSize).
 */
export const getBuyersOfItemsWithSpecificity = (specificity, params) => {
    return apiClient.get('/reports/buyers-by-specificity', { params: { ...params, specificity } });
};

/**
 * Получает продавцов, продавших предметы по специфике аукциона на сумму не менее X.
 * @param {string} specificity - Специфика аукциона.
 * @param {number} minSales - Минимальная общая сумма продаж.
 * @param {object} params - Параметры пагинации (page, pageSize).
 */
export const getSellersReportBySpecificity = (specificity, minSales, params) => {
    return apiClient.get('/reports/sellers-sales-by-specificity', { params: { ...params, specificity, minSales } });
};


// --- Admin User Management API ---
/**
 * Получает список всех пользователей (для админа).
 * @param {object} params - Параметры (page, pageSize, role, email, fullName).
 */
export const adminGetAllUsers = (params) => {
    return apiClient.get('/admin/users', { params });
};

/**
 * Обновляет статус активности пользователя (для админа).
 * @param {string|number} userId - ID пользователя.
 * @param {boolean} isActive - Новый статус активности.
 */
export const adminUpdateUserStatus = (userId, isActive) => {
    return apiClient.patch(`/admin/users/${userId}/status`, { isActive });
};

/**
 * Обновляет доступные бизнес-роли пользователя (для админа).
 * @param {string|number} userId - ID пользователя.
 * @param {string[]} availableBusinessRoles - Массив доступных ролей.
 */
export const adminUpdateUserRoles = (userId, availableBusinessRoles) => {
    return apiClient.put(`/admin/users/${userId}/roles`, { availableBusinessRoles });
};


export default apiClient; // Экспортируем настроенный экземпляр axios