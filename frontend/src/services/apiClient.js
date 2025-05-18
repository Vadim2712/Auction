// src/services/apiClient.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1'; // Замените на URL вашего реального бэкенда

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Interceptor для добавления JWT токена к каждому запросу
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

// --- Заглушки для API вызовов (замените на реальные, когда бэкенд будет готов) ---

// Mock данные (те же, что мы использовали ранее)
const mockAuctionsData = [
    { id: 1, name_specificity: 'Антикварная мебель XVIII века', auction_date: '2025-07-15T00:00:00Z', auction_time: '14:00', location: 'Выставочный зал "Эрмитаж"', status: 'Запланирован', description_full: 'Уникальная коллекция антикварной мебели эпохи Людовика XV...', lots: [{ id: 101, auction_id: 1, lot_number: 'A001', name_description: 'Стул "Бержер"', start_price: 1200, status: 'Ожидает аукциона' }, { id: 102, auction_id: 1, lot_number: 'A002', name_description: 'Комод с интарсией', start_price: 3500, status: 'Ожидает аукциона' }] },
    { id: 2, name_specificity: 'Картины русских художников XIX века (масло)', auction_date: '2025-08-01T00:00:00Z', auction_time: '11:00', location: 'Галерея "Авангард"', status: 'Активен', description_full: 'Работы известных русских живописцев...', lots: [{ id: 201, auction_id: 2, lot_number: 'B001', name_description: 'Этюд "Утро в сосновом лесу"', start_price: 800, status: 'На аукционе' }, { id: 202, auction_id: 2, lot_number: 'B002', name_description: 'Портрет неизвестной дамы', start_price: 1500, status: 'На аукционе' }, { id: 203, auction_id: 2, lot_number: 'B003', name_description: 'Морской пейзаж "Закат над Крымом"', start_price: 2200, status: 'Продан', final_price: 2800, buyer_user_id: 1 }] },
    { id: 3, name_specificity: 'Редкие монеты и нумизматика', auction_date: '2025-06-20T00:00:00Z', auction_time: '16:30', location: 'Клуб Нумизматов', status: 'Завершен', description_full: 'Коллекционные монеты разных эпох.', lots: [] },
    { id: 4, name_specificity: 'Ювелирные изделия Фаберже', auction_date: '2025-09-10T00:00:00Z', auction_time: '15:00', location: 'Отель "Националь"', status: 'Запланирован', description_full: 'Эксклюзивные ювелирные изделия.', lots: [] }
];

// Auth API
export const loginUser = (credentials) => {
    // Для реального API: return apiClient.post('/auth/login', credentials);
    console.log('apiClient: loginUser (ЗАГЛУШКА)', credentials);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (credentials.email === 'test@example.com' && credentials.password === 'password') {
                const mockUser = { id: 1, fullName: "Тестовый Пользователь", email: credentials.email, role: "buyer" };
                const token = 'fake-jwt-token-from-api-client';
                resolve({ data: { token, user: mockUser } });
            } else {
                reject({ response: { data: { message: 'Неверный email или пароль (заглушка apiClient)' } } });
            }
        }, 500);
    });
};

export const registerUser = (userData) => {
    // Для реального API: return apiClient.post('/auth/register', userData);
    console.log('apiClient: registerUser (ЗАГЛУШКА)', userData);
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({ data: { message: 'Регистрация успешна (заглушка apiClient). Пожалуйста, войдите.' } });
        }, 500);
    });
};

// Auctions API
export const getAllAuctions = () => {
    // Для реального API: return apiClient.get('/auctions');
    console.log('apiClient: getAllAuctions (ЗАГЛУШКА)');
    return new Promise((resolve) => {
        setTimeout(() => {
            // Имитируем структуру ответа, которую может ожидать фронтенд, например, { data: auctionsArray }
            resolve({ data: mockAuctionsData.map(a => ({ ...a, lots: undefined, description_full: undefined })) }); // Возвращаем только основную инфу для списка
        }, 500);
    });
};

export const getAuctionById = (auctionId) => {
    // Для реального API: return apiClient.get(`/auctions/${auctionId}`);
    console.log(`apiClient: getAuctionById ${auctionId} (ЗАГЛУШКА)`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const auction = mockAuctionsData.find(a => a.id.toString() === auctionId);
            if (auction) {
                // Имитируем структуру ответа: { data: { auction_details: {...}, lots: [...] } }
                // или просто { data: auction_with_lots }
                resolve({ data: auction });
            } else {
                reject({ response: { status: 404, data: { message: 'Аукцион не найден (заглушка apiClient)' } } });
            }
        }, 500);
    });
};

export const createAuction = (auctionData) => {
    // Для реального API: return apiClient.post('/auctions', auctionData);
    console.log('apiClient: createAuction (ЗАГЛУШКА)', auctionData);
    return new Promise((resolve) => {
        setTimeout(() => {
            const newId = mockAuctionsData.length > 0 ? Math.max(...mockAuctionsData.map(a => a.id)) + 1 : 1;
            const newAuction = { ...auctionData, id: newId, lots: [], status: 'Запланирован' };
            mockAuctionsData.push(newAuction);
            resolve({ data: newAuction });
        }, 500);
    });
};

// Lots API
export const createLot = (auctionId, lotData) => {
    // Для реального API: return apiClient.post(`/auctions/${auctionId}/lots`, lotData);
    console.log(`apiClient: createLot for auction ${auctionId} (ЗАГЛУШКА)`, lotData);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const auction = mockAuctionsData.find(a => a.id.toString() === auctionId);
            if (auction) {
                const newLotId = auction.lots.length > 0 ? Math.max(...auction.lots.map(l => l.id)) + 1 : (parseInt(auctionId) * 100) + 1;
                const newLot = { ...lotData, id: newLotId, auction_id: parseInt(auctionId), status: 'Ожидает аукциона' };
                auction.lots.push(newLot);
                resolve({ data: newLot });
            } else {
                reject({ response: { status: 404, data: { message: 'Аукцион для добавления лота не найден (заглушка apiClient)' } } });
            }
        }, 500);
    });
};

// Добавьте другие функции API по мере необходимости (updateAuction, deleteAuction, placeBid и т.д.)

export default apiClient; // Экспортируем настроенный экземпляр axios для возможных прямых вызовов