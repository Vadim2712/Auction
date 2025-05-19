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

// Mock Data (добавьте/обновите seller_id, highest_bidder_id, biddings, и статусы аукционов)
let mockAuctionsData = [
    {
        id: 1,
        name_specificity: 'Весенний аукцион антиквариата',
        auction_date: '2025-06-15',
        auction_time: '14:00',
        location: 'Гранд Отель, Бальный зал',
        description_full: 'Редкие предметы XVIII-XIX веков, включая мебель, картины и ювелирные изделия.',
        status: 'Идет торг', // <--- Статус аукциона
        created_by_user_id: 100, // admin
        lots: [
            {
                id: 1, lot_number: 1, name: 'Старинные часы с боем',
                description: 'Напольные часы, дуб, Германия, ~1880 г.',
                start_price: 75000, current_price: 78000, seller_id: 2, // ID продавца
                status: 'Идет торг', // <--- Статус лота
                highest_bidder_id: 1, // ID покупателя, сделавшего последнюю ставку
                biddings: [ // <--- История ставок (опционально, но полезно)
                    { userId: 1, amount: 76000, timestamp: new Date().toISOString() },
                    { userId: 3, amount: 78000, timestamp: new Date().toISOString() } // User c ID=3 пока не существует, но для примера
                ]
            },
            {
                id: 2, lot_number: 2, name: 'Фарфоровая статуэтка "Балерина"',
                description: 'ЛФЗ, 1950-е гг., отличное состояние.',
                start_price: 12000, current_price: 12000, seller_id: 100, // Продавец - админ
                status: 'Ожидает торгов',
                highest_bidder_id: null,
                biddings: []
            }
        ]
    },
    {
        id: 2,
        name_specificity: 'Нумизматика и редкие монеты',
        auction_date: '2025-07-01',
        auction_time: '11:00',
        location: 'Онлайн-платформа',
        description_full: 'Коллекция монет от античности до современности.',
        status: 'Запланирован',
        created_by_user_id: 100,
        lots: []
    }
    // ... другие аукционы
];

// Auth API
export const loginUser = (credentials) => {
    console.log('apiClient: loginUser (ЗАГЛУШКА)', credentials);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            let mockUser = null;
            let token = null;

            if (credentials.email === 'test@example.com' && credentials.password === 'password') {
                mockUser = { id: 1, fullName: "Тестовый Покупатель", email: credentials.email, role: "buyer" };
                token = 'fake-jwt-token-buyer';
            } else if (credentials.email === 'admin@example.com' && credentials.password === 'adminpass') {
                mockUser = { id: 100, fullName: "Администратор Системы", email: credentials.email, role: "admin" };
                token = 'fake-jwt-token-admin';
            } else if (credentials.email === 'seller@example.com' && credentials.password === 'sellerpass') { // <--- Новый пользователь 'seller'
                mockUser = { id: 2, fullName: "Тестовый Продавец", email: credentials.email, role: "seller" };
                token = 'fake-jwt-token-seller';
            }


            if (mockUser && token) {
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

// Lot API (NEW)
export const createLot = (auctionId, lotData) => {
    console.log(`apiClient: createLot for auction ${auctionId} (ЗАГЛУШКА)`, lotData);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const auctionIndex = mockAuctionsData.findIndex(a => a.id === parseInt(auctionId));
            if (auctionIndex === -1) {
                reject({ response: { data: { message: 'Аукцион не найден' } } });
                return;
            }

            const auction = mockAuctionsData[auctionIndex];
            if (!auction.lots) {
                auction.lots = [];
            }

            // Генерируем уникальный ID для лота (в рамках всех лотов или хотя бы в рамках аукциона)
            // Для простоты, найдем максимальный ID среди всех лотов всех аукционов
            let maxLotId = 0;
            mockAuctionsData.forEach(auc => {
                if (auc.lots) {
                    auc.lots.forEach(l => {
                        if (l.id > maxLotId) maxLotId = l.id;
                    });
                }
            });

            const newLotId = maxLotId + 1;

            const newLot = {
                id: newLotId, // Уникальный ID лота
                lot_number: auction.lots.length + 1, // Порядковый номер лота в аукционе
                name: lotData.name,
                description: lotData.description_short || lotData.description, // Используем description, если description_short нет
                start_price: parseFloat(lotData.start_price),
                current_price: parseFloat(lotData.start_price), // Начальная текущая цена равна стартовой
                seller_id: lotData.seller_id, // ID продавца
                // seller_name: lotData.seller_name, // Можно добавить, если передаем, или получать по ID
                status: 'Ожидает торгов', // Начальный статус лота
                // biddings: [], // Место для истории ставок, если нужно
                // final_buyer_id: null,
                // final_price: null,
            };

            auction.lots.push(newLot);
            mockAuctionsData[auctionIndex] = auction; // Обновляем аукцион в массиве
            resolve({ data: newLot });
        }, 500);
    });
};

export const placeBid = (auctionId, lotId, amount, userId) => {
    console.log(`apiClient: placeBid on auction ${auctionId}, lot ${lotId} for amount ${amount} by user ${userId} (ЗАГЛУШКА)`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const auction = mockAuctionsData.find(a => a.id === parseInt(auctionId));
            if (!auction) {
                return reject({ response: { status: 404, data: { message: 'Аукцион не найден' } } });
            }
            if (auction.status !== 'Идет торг') { // Проверка статуса аукциона
                return reject({ response: { status: 400, data: { message: 'Торги по этому аукциону еще не начались или уже завершены' } } });
            }

            const lot = auction.lots.find(l => l.id === parseInt(lotId));
            if (!lot) {
                return reject({ response: { status: 404, data: { message: 'Лот не найден' } } });
            }
            if (lot.status !== 'Идет торг' && lot.status !== 'Ожидает торгов') { // Лот должен быть доступен для торгов
                return reject({ response: { status: 400, data: { message: 'Ставки на этот лот не принимаются (статус лота не позволяет)' } } });
            }


            if (lot.seller_id === parseInt(userId)) {
                return reject({ response: { status: 403, data: { message: 'Вы не можете делать ставки на собственный лот' } } });
            }

            const bidAmount = parseFloat(amount);
            if (isNaN(bidAmount) || bidAmount <= lot.current_price) {
                return reject({ response: { status: 400, data: { message: `Ваша ставка должна быть выше текущей цены (${lot.current_price} руб.)` } } });
            }

            // Ограничение "Покупатель на одном аукционе может купить только один предмет"
            // Это правило сложно применить на этапе ставки, если только не считать, что пользователь не может быть highest_bidder более чем на одном активном лоте аукциона.
            // Для простоты пока пропустим это строгое ограничение на этапе ставки, оно важнее при определении победителя.
            // Или: проверяем, не является ли этот пользователь уже highest_bidder на ДРУГОМ лоте этого аукциона, который ЕЩЕ НЕ ПРОДАН.
            const alreadyLeadingAnotherLot = auction.lots.some(
                l => l.id !== parseInt(lotId) && l.highest_bidder_id === parseInt(userId) && l.status !== 'Продан'
            );
            if (alreadyLeadingAnotherLot) {
                // console.warn("Правило одного предмета: Пользователь уже лидирует на другом лоте этого аукциона.");
                // Для ТЗ, это может быть мягким предупреждением или строгим запретом.
                // return reject({ response: { status: 403, data: { message: 'Вы уже лидируете в торгах за другой предмет на этом аукционе. По правилам, можно приобрести только один предмет.' } } });
            }


            lot.current_price = bidAmount;
            lot.highest_bidder_id = parseInt(userId);
            if (!lot.biddings) {
                lot.biddings = [];
            }
            lot.biddings.push({ userId: parseInt(userId), amount: bidAmount, timestamp: new Date().toISOString() });

            // Если лот был 'Ожидает торгов', он переходит в 'Идет торг' после первой ставки
            if (lot.status === 'Ожидает торгов') {
                lot.status = 'Идет торг';
            }

            console.log('Updated lot after bid:', lot);
            resolve({ data: lot }); // Возвращаем обновленный лот
        }, 700);
    });
};
// Добавьте другие функции API по мере необходимости (updateAuction, deleteAuction, placeBid и т.д.)

export default apiClient; // Экспортируем настроенный экземпляр axios для возможных прямых вызовов