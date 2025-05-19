// src/services/apiClient.js
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api/v1';

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

// --- Mock Data ---
// Эти данные будут храниться в памяти на время сессии клиента

let mockUsersData = [
    { id: 100, email: 'admin@example.com', password: 'adminpassword', fullName: 'Администратор Главный', role: 'admin', passportData: '0000000000' },
    { id: 101, email: 'seller1@example.com', password: 'sellerpassword', fullName: 'Продавцов Иван Петрович', role: 'seller', passportData: '1111111111' },
    { id: 102, email: 'seller2@example.com', password: 'sellerpassword', fullName: 'Продажная Анна Сидоровна', role: 'seller', passportData: '2222222222' },
    { id: 103, email: 'buyer1@example.com', password: 'buyerpassword', fullName: 'Покупайко Олег Игоревич', role: 'buyer', passportData: '3333333333' },
    { id: 104, email: 'buyer2@example.com', password: 'buyerpassword', fullName: 'Купилова Елизавета Артёмовна', role: 'buyer', passportData: '4444444444' },
    { id: 105, email: 'user@example.com', password: 'userpassword', fullName: 'Обычный Пользователь', role: 'buyer', passportData: '5555555555' }
];
let nextUserId = 106;

// Теперь можно выводить в консоль, mockUsersData инициализирована
console.log('[apiClient.js] Module loaded. Initial mockUsersData:', JSON.parse(JSON.stringify(mockUsersData)));


let mockAuctionsData = [
    {
        id: 1,
        name_specificity: 'Весенний аукцион антиквариата',
        auction_date: '2025-06-15',
        auction_time: '14:00',
        location: 'Гранд Отель, Бальный зал',
        description_full: 'Редкие предметы XVIII-XIX веков, включая мебель, картины и ювелирные изделия.',
        status: 'Идет торг',
        created_by_user_id: 100,
        lots: [
            {
                id: 1, lot_number: 1, name: 'Старинные часы с боем',
                description: 'Напольные часы, дуб, Германия, ~1880 г.',
                start_price: 75000, current_price: 78000, seller_id: 101,
                status: 'Идет торг',
                highest_bidder_id: 103,
                biddings: [
                    { userId: 103, amount: 76000, timestamp: new Date(Date.now() - 100000).toISOString() },
                    { userId: 104, amount: 78000, timestamp: new Date().toISOString() }
                ],
                final_price: null,
                final_buyer_id: null,
            },
            {
                id: 2, lot_number: 2, name: 'Фарфоровая статуэтка "Балерина"',
                description: 'ЛФЗ, 1950-е гг., отличное состояние.',
                start_price: 12000, current_price: 12000, seller_id: 100,
                status: 'Ожидает торгов',
                highest_bidder_id: null,
                biddings: [],
                final_price: null,
                final_buyer_id: null,
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
];
let nextAuctionId = 3;
let nextLotGlobalId = 3;

// --- Auth API ---
export const loginUser = (email, password) => {
    console.log('[apiClient.js] loginUser called with:', email, password);
    console.log('[apiClient.js] Current mockUsersData at loginUser start:', JSON.parse(JSON.stringify(mockUsersData)));
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const user = mockUsersData.find(u => u.email === email && u.password === password);
            if (user) {
                console.log('[apiClient.js] loginUser success for:', email, user);
                const token = `mockToken-${user.id}-${Date.now()}`;
                const { password: userPassword, ...userWithoutPassword } = user;
                resolve({ data: { token, user: userWithoutPassword } });
            } else {
                console.error('[apiClient.js] loginUser failed for:', email);
                reject({ response: { status: 401, data: { message: 'Неверный email или пароль (apiClient)' } } });
            }
        }, 300);
    });
};

export const registerUser = (userData) => {
    console.log('[apiClient.js] registerUser called with:', userData);
    console.log('[apiClient.js] Current mockUsersData at registerUser start:', JSON.parse(JSON.stringify(mockUsersData)));
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (mockUsersData.find(u => u.email === userData.email)) {
                console.warn('[apiClient.js] registerUser failed - email exists:', userData.email);
                return reject({ response: { status: 400, data: { message: 'Пользователь с таким email уже существует' } } });
            }

            const newUser = {
                id: nextUserId++,
                email: userData.email,
                password: userData.password,
                fullName: userData.fullName,
                role: userData.role || 'buyer',
                passportData: userData.passportData || '',
            };
            mockUsersData.push(newUser);
            console.log('[apiClient.js] registerUser success:', newUser);
            console.log('[apiClient.js] mockUsersData AFTER push in registerUser:', JSON.parse(JSON.stringify(mockUsersData)));

            const token = `mockToken-${newUser.id}-${Date.now()}`;
            const { password, ...userWithoutPassword } = newUser;
            resolve({ data: { token, user: userWithoutPassword, message: 'Регистрация прошла успешно! Теперь вы можете войти.' } });

        }, 300);
    });
};

// --- Auctions API ---
export const getAllAuctions = () => {
    console.log('[apiClient.js] getAllAuctions (ЗАГЛУШКА)');
    return new Promise((resolve) => {
        setTimeout(() => {
            resolve({
                data: mockAuctionsData.map(a => ({
                    id: a.id,
                    name_specificity: a.name_specificity,
                    auction_date: a.auction_date,
                    auction_time: a.auction_time,
                    location: a.location,
                    status: a.status,
                }))
            });
        }, 300);
    });
};

export const getAuctionById = (auctionId) => {
    console.log(`[apiClient.js] getAuctionById ${auctionId} (ЗАГЛУШКА)`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const auction = mockAuctionsData.find(a => a.id === parseInt(auctionId));
            if (auction) {
                resolve({ data: { ...auction, lots: auction.lots ? [...auction.lots.map(l => ({ ...l }))] : [] } }); // Глубокое копирование лотов
            } else {
                reject({ response: { status: 404, data: { message: 'Аукцион не найден (apiClient)' } } });
            }
        }, 300);
    });
};

export const createAuction = (auctionData) => {
    console.log('[apiClient.js] createAuction (ЗАГЛУШКА)', auctionData);
    return new Promise((resolve) => {
        setTimeout(() => {
            const newAuction = {
                ...auctionData,
                id: nextAuctionId++,
                lots: [],
                status: 'Запланирован'
            };
            mockAuctionsData.push(newAuction);
            resolve({ data: { ...newAuction } });
        }, 300);
    });
};

export const updateAuctionStatus = (auctionId, newStatus) => {
    console.log(`[apiClient.js] updateAuctionStatus for auction ${auctionId} to ${newStatus}`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const auctionIndex = mockAuctionsData.findIndex(a => a.id === parseInt(auctionId));
            if (auctionIndex === -1) {
                return reject({ response: { status: 404, data: { message: 'Аукцион не найден' } } });
            }

            const auction = { ...mockAuctionsData[auctionIndex], lots: mockAuctionsData[auctionIndex].lots.map(l => ({ ...l })) }; // Глубокая копия
            auction.status = newStatus;

            if (newStatus === 'Завершен') {
                auction.lots = auction.lots.map(lot => {
                    const lotCopy = { ...lot };
                    if ((lotCopy.status === 'Идет торг' || (lotCopy.status === 'Ожидает торгов' && lotCopy.biddings && lotCopy.biddings.length > 0)) && lotCopy.highest_bidder_id) {
                        lotCopy.status = 'Продан';
                        lotCopy.final_price = lotCopy.current_price;
                        lotCopy.final_buyer_id = lotCopy.highest_bidder_id;
                    } else if (lotCopy.status !== 'Продан') {
                        lotCopy.status = 'Не продан';
                    }
                    return lotCopy;
                });
            }
            mockAuctionsData[auctionIndex] = auction;
            console.log('[apiClient.js] Updated auction in mockAuctionsData:', auction);
            resolve({ data: { ...auction } }); // Возвращаем копию обновленного аукциона
        }, 300);
    });
};

// --- Lots API ---
export const createLot = (auctionId, lotData) => {
    console.log(`[apiClient.js] createLot for auction ${auctionId} (ЗАГЛУШКА)`, lotData);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const auctionIndex = mockAuctionsData.findIndex(a => a.id === parseInt(auctionId));
            if (auctionIndex === -1) {
                return reject({ response: { data: { message: 'Аукцион не найден для добавления лота' } } });
            }

            const auction = mockAuctionsData[auctionIndex];
            const newLot = {
                id: nextLotGlobalId++,
                lot_number: (auction.lots ? auction.lots.length : 0) + 1,
                name: lotData.name,
                description: lotData.description || '',
                start_price: parseFloat(lotData.start_price),
                current_price: parseFloat(lotData.start_price),
                seller_id: lotData.seller_id,
                status: 'Ожидает торгов',
                highest_bidder_id: null,
                biddings: [],
                final_price: null,
                final_buyer_id: null,
            };

            // Обновляем аукцион, добавляя новый лот
            const updatedLots = auction.lots ? [...auction.lots, newLot] : [newLot];
            mockAuctionsData[auctionIndex] = { ...auction, lots: updatedLots };

            resolve({ data: { ...newLot } });
        }, 300);
    });
};

export const placeBid = (auctionId, lotId, amount, userId) => {
    console.log(`[apiClient.js] placeBid on auction ${auctionId}, lot ${lotId} for amount ${amount} by user ${userId}`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const auctionIndex = mockAuctionsData.findIndex(a => a.id === parseInt(auctionId));
            if (auctionIndex === -1) return reject({ response: { status: 404, data: { message: 'Аукцион не найден' } } });

            const auction = mockAuctionsData[auctionIndex];
            if (auction.status !== 'Идет торг') return reject({ response: { status: 400, data: { message: 'Торги по этому аукциону неактивны' } } });

            const lotIndex = auction.lots.findIndex(l => l.id === parseInt(lotId));
            if (lotIndex === -1) return reject({ response: { status: 404, data: { message: 'Лот не найден' } } });

            const lot = { ...auction.lots[lotIndex] };

            if (lot.status !== 'Идет торг' && lot.status !== 'Ожидает торгов') {
                return reject({ response: { status: 400, data: { message: 'Ставки на этот лот не принимаются (статус лота)' } } });
            }
            if (lot.seller_id === parseInt(userId)) {
                return reject({ response: { status: 403, data: { message: 'Вы не можете делать ставки на собственный лот' } } });
            }
            const bidAmount = parseFloat(amount);
            if (isNaN(bidAmount) || bidAmount <= lot.current_price) {
                return reject({ response: { status: 400, data: { message: `Ставка должна быть выше текущей цены (${lot.current_price} руб.)` } } });
            }

            lot.current_price = bidAmount;
            lot.highest_bidder_id = parseInt(userId);
            if (!lot.biddings) lot.biddings = []; // На всякий случай
            lot.biddings.push({ userId: parseInt(userId), amount: bidAmount, timestamp: new Date().toISOString() });
            if (lot.status === 'Ожидает торгов') lot.status = 'Идет торг';

            const updatedLots = [...auction.lots];
            updatedLots[lotIndex] = lot;
            mockAuctionsData[auctionIndex] = { ...auction, lots: updatedLots };

            console.log('[apiClient.js] Updated lot after bid:', lot);
            resolve({ data: { ...lot } });
        }, 300);
    });
};

// --- User/Activity API ---
export const getUserById = (userId) => {
    console.log(`[apiClient.js] getUserById for user ${userId}`);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const user = mockUsersData.find(u => u.id === parseInt(userId));
            if (user) {
                const { password, ...safeUser } = user;
                resolve({ data: safeUser });
            } else {
                reject({ response: { status: 404, data: { message: 'Пользователь не найден (apiClient)' } } });
            }
        }, 100);
    });
};

export const getMyActivity = (userId) => {
    console.log(`[apiClient.js] getMyActivity for user ${userId}`);
    return new Promise((resolve) => {
        setTimeout(() => {
            const myLeadingBids = [];
            const myWonLots = [];
            const currentUserId = parseInt(userId);

            mockAuctionsData.forEach(auction => {
                if (auction.lots) {
                    auction.lots.forEach(lot => {
                        if (auction.status === 'Идет торг' && lot.highest_bidder_id === currentUserId) {
                            myLeadingBids.push({
                                ...lot,
                                auctionId: auction.id,
                                auctionName: auction.name_specificity,
                                auctionStatus: auction.status
                            });
                        }
                        if (lot.status === 'Продан' && lot.final_buyer_id === currentUserId) {
                            myWonLots.push({
                                ...lot,
                                auctionId: auction.id,
                                auctionName: auction.name_specificity,
                                auctionStatus: auction.status
                            });
                        }
                    });
                }
            });
            resolve({ data: { leadingBids: myLeadingBids, wonLots: myWonLots } });
        }, 300);
    });
};

export default apiClient; // Экспортируем экземпляр axios