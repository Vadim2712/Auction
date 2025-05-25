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

// Removed duplicate interceptor registration to avoid redundancy

// --- Mock Data ---
export let mockUsersData = [ // Используем export для возможного доступа из других mock-модулей, если понадобится
    {
        id: 100, email: 'sysadmin@auction.app', password: 'sysadminpassword', fullName: 'Системный Администратор',
        role: 'SYSTEM_ADMIN', // Уникальная роль для системного админа
        availableBusinessRoles: [], // Системный админ не выбирает бизнес-роль
        passportData: '0000000000'
    },
    {
        id: 101, email: 'manager@auction.app', password: 'managerpassword', fullName: 'Мария Менеджерова',
        role: null, // Базовой роли нет, т.к. выбирается при входе
        availableBusinessRoles: ['buyer', 'seller', 'auction_manager'],
        passportData: '1111111111'
    },
    {
        id: 103, email: 'buyer@auction.app', password: 'buyerpassword', fullName: 'Борис Покупателев',
        role: null,
        availableBusinessRoles: ['buyer'], // Может быть только покупателем
        passportData: '3333333333'
    },
    {
        id: 104, email: 'seller@auction.app', password: 'sellerpassword', fullName: 'Семен Продавцов',
        role: null,
        availableBusinessRoles: ['seller', 'buyer'], // Может быть продавцом и покупателем
        passportData: '4444444444'
    }
];
let nextUserId = 106;

// ... (mockAuctionsData, nextAuctionId, nextLotGlobalId - как в предыдущей вашей версии, но убедитесь, что seller_id и bidder_id соответствуют новым ID пользователей)
// Я скопирую вашу последнюю версию mockAuctionsData для полноты, но ID пользователей нужно будет сверить
let mockAuctionsData = [
    {
        id: 1, name_specificity: 'Весенний аукцион антиквариата', auction_date: '2025-06-15', auction_time: '14:00',
        location: 'Гранд Отель, Бальный зал', description_full: 'Редкие предметы XVIII-XIX веков...', status: 'Идет торг', created_by_user_id: 100, // sysadmin
        lots: [
            {
                id: 1, lot_number: 1, name: 'Старинные часы с боем', description: 'Напольные часы...', start_price: 75000, current_price: 78000, seller_id: 104, /* seller@auction.app */
                status: 'Идет торг', highest_bidder_id: 103, /* buyer@auction.app */ biddings: [{ userId: 103, amount: 78000, timestamp: new Date().toISOString() }], final_price: null, final_buyer_id: null,
            },
            {
                id: 2, lot_number: 2, name: 'Фарфоровая статуэтка "Балерина"', description: 'ЛФЗ, 1950-е гг...', start_price: 12000, current_price: 12000, seller_id: 100, /* sysadmin, если он может быть продавцом, или другой ID */
                status: 'Ожидает торгов', highest_bidder_id: null, biddings: [], final_price: null, final_buyer_id: null,
            }
        ]
    },
    // ... другие аукционы
];
let nextAuctionId = 3;
let nextLotGlobalId = 3;


console.log('[apiClient.js] Module loaded. Initial mockUsersData:', JSON.parse(JSON.stringify(mockUsersData)));

// --- Auth API ---
// Эта функция теперь только проверяет учетные данные и возвращает пользователя с его доступными ролями
export const validateCredentials = (email, password) => {
    console.log('[apiClient.js] validateCredentials called for:', email);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const user = mockUsersData.find(u => u.email === email && u.password === password);
            if (user) {
                console.log('[apiClient.js] Credentials valid for:', email, user);
                const { password: _userPassword, ...userToReturn } = user; // Убираем пароль
                // Генерируем временный токен, который будет заменен на реальный при "полном" логине
                const tempToken = `temp-validation-token-${user.id}-${Date.now()}`;
                resolve({ data: { user: userToReturn, token: tempToken } }); // Возвращаем пользователя и временный токен
            } else {
                console.error('[apiClient.js] Credentials invalid for:', email);
                reject({ response: { status: 401, data: { message: 'Неверный email или пароль (apiClient)' } } });
            }
        }, 300);
    });
};

// Функция регистрации теперь просто добавляет пользователя
// Логику "автоматического входа" после регистрации уберем, пользователь должен будет войти отдельно
export const registerUser = (userData) => { // userData: { fullName, email, passportData, password }
    console.log('[apiClient.js] registerUser called with:', userData);
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (mockUsersData.find(u => u.email === userData.email)) {
                return reject({ response: { status: 400, data: { message: 'Пользователь с таким email уже существует' } } });
            }
            const newUser = {
                id: nextUserId++,
                email: userData.email,
                password: userData.password,
                fullName: userData.fullName,
                role: null, // Базовая роль не устанавливается, т.к. будет выбираться при входе
                availableBusinessRoles: ['buyer', 'seller', 'auction_manager'], // По умолчанию все бизнес-роли доступны
                passportData: userData.passportData || '',
            };
            mockUsersData.push(newUser);
            console.log('[apiClient.js] registerUser success, new user added:', newUser);
            console.log('[apiClient.js] Current mockUsersData:', JSON.parse(JSON.stringify(mockUsersData)));
            resolve({ data: { message: 'Регистрация прошла успешно! Теперь вы можете войти в систему.' } });
        }, 300);
    });
};


// ... (ОСТАЛЬНЫЕ ФУНКЦИИ API: getAllAuctions, getAuctionById, createAuction, updateAuctionStatus, createLot, placeBid, getUserById, getMyActivity, getMyListings - ОСТАЮТСЯ КАК В ВАШЕЙ ПОСЛЕДНЕЙ ВЕРСИИ, НО УБЕДИТЕСЬ, ЧТО ID ПОЛЬЗОВАТЕЛЕЙ В НИХ СООТВЕТСТВУЮТ ID ИЗ ОБНОВЛЕННОГО mockUsersData)
// Я скопирую их из вашего предыдущего кода, но комментарии про заглушки оставлю, т.к. это все еще mock
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
                resolve({ data: { ...auction, lots: auction.lots ? [...auction.lots.map(l => ({ ...l }))] : [] } });
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
            const auction = { ...mockAuctionsData[auctionIndex], lots: mockAuctionsData[auctionIndex].lots.map(l => ({ ...l })) };
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
            resolve({ data: { ...auction } });
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
            if (!lot.biddings) lot.biddings = [];
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
                            myLeadingBids.push({ ...lot, auctionId: auction.id, auctionName: auction.name_specificity, auctionStatus: auction.status });
                        }
                        if (lot.status === 'Продан' && lot.final_buyer_id === currentUserId) {
                            myWonLots.push({ ...lot, auctionId: auction.id, auctionName: auction.name_specificity, auctionStatus: auction.status });
                        }
                    });
                }
            });
            resolve({ data: { leadingBids: myLeadingBids, wonLots: myWonLots } });
        }, 300);
    });
};

export const getMyListings = (sellerId) => { // Эта функция уже была, оставляем
    console.log(`[apiClient.js] getMyListings for seller ${sellerId}`);
    return new Promise((resolve) => {
        setTimeout(() => {
            const myListings = [];
            const currentSellerId = parseInt(sellerId);
            mockAuctionsData.forEach(auction => {
                if (auction.lots) {
                    auction.lots.forEach(lot => {
                        if (lot.seller_id === currentSellerId) {
                            myListings.push({ ...lot, auctionId: auction.id, auctionName: auction.name_specificity, auctionStatus: auction.status });
                        }
                    });
                }
            });
            resolve({ data: myListings });
        }, 300);
    });
};

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

export default apiClient; // Экспортируем экземпляр axios