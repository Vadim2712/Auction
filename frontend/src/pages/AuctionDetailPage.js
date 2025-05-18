// src/pages/AuctionDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import LotCard from '../components/lots/LotCard';
// import apiClient from '../services/apiClient'; // Раскомментируем позже
import { useAuth } from '../context/AuthContext';
import './AuctionDetailPage.css';

// Mock данные для аукционов (чтобы найти нужный аукцион по ID)
const mockAuctionsData = [
    {
        id: 1,
        name_specificity: 'Антикварная мебель XVIII века',
        auction_date: '2025-07-15T00:00:00Z',
        auction_time: '14:00',
        location: 'Выставочный зал "Эрмитаж"',
        status: 'Запланирован',
        description_full: 'Уникальная коллекция антикварной мебели эпохи Людовика XV, включая стулья, комоды и столы. Все предметы в отличном состоянии и имеют подтвержденную историю.',
        lots: [
            { id: 101, auction_id: 1, lot_number: 'A001', name_description: 'Стул "Бержер", орех, Франция, ~1760 г.', start_price: 1200, status: 'Ожидает аукциона', seller_user_id: 2 },
            { id: 102, auction_id: 1, lot_number: 'A002', name_description: 'Комод с интарсией, красное дерево, ~1750 г.', start_price: 3500, status: 'Ожидает аукциона', seller_user_id: 2 },
        ]
    },
    {
        id: 2,
        name_specificity: 'Картины русских художников XIX века (масло)',
        auction_date: '2025-08-01T00:00:00Z',
        auction_time: '11:00',
        location: 'Галерея "Авангард"',
        status: 'Активен',
        description_full: 'Работы известных русских живописцев, включая пейзажи, портреты и жанровые сцены. Представлены такие мастера как Шишкин, Репин, Айвазовский (репродукции или малоизвестные работы для примера).',
        lots: [
            { id: 201, auction_id: 2, lot_number: 'B001', name_description: 'Этюд "Утро в сосновом лесу" (копия XIX в.)', start_price: 800, status: 'На аукционе', seller_user_id: 3 },
            { id: 202, auction_id: 2, lot_number: 'B002', name_description: 'Портрет неизвестной дамы, холст, масло, ~1880 г.', start_price: 1500, status: 'На аукционе', seller_user_id: 3 },
            { id: 203, auction_id: 2, lot_number: 'B003', name_description: 'Морской пейзаж "Закат над Крымом"', start_price: 2200, status: 'Продан', final_price: 2800, buyer_user_id: 1, seller_user_id: 3 }, // buyer_user_id: 1 - для примера "вы купили"
        ]
    },
    // ... добавьте другие аукционы из mockAuctions (из AuctionsListPage) с полем lots, если нужно
];


const AuctionDetailPage = () => {
    const { id: auctionId } = useParams(); // Получаем ID из URL
    const [auction, setAuction] = useState(null);
    const [lots, setLots] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        const fetchAuctionDetails = async () => {
            setLoading(true);
            setError('');
            try {
                // ЗАГЛУШКА: Ищем аукцион и его лоты в mock данных
                const foundAuction = mockAuctionsData.find(a => a.id.toString() === auctionId);
                if (foundAuction) {
                    // const response = await apiClient.get(`/auctions/${auctionId}`);
                    // setAuction(response.data.auction_details);
                    // setLots(response.data.lots);
                    setTimeout(() => { // Имитация задержки сети
                        setAuction(foundAuction);
                        setLots(foundAuction.lots || []);
                        setLoading(false);
                    }, 500);
                } else {
                    setError('Аукцион не найден.');
                    setLoading(false);
                }
            } catch (err) {
                console.error(`Ошибка загрузки деталей аукциона ${auctionId}:`, err);
                setError('Не удалось загрузить детали аукциона.');
                setLoading(false);
            }
        };

        if (auctionId) {
            fetchAuctionDetails();
        }
    }, [auctionId]);

    const handleBid = (lotId) => {
        // TODO: Реализовать логику модального окна для подтверждения ставки
        // и отправки запроса на бэкенд
        if (!isAuthenticated) {
            alert("Пожалуйста, войдите в систему, чтобы сделать ставку.");
            return;
        }
        alert(`Заглушка: Пользователь ${user?.fullName} хочет сделать ставку на лот ID: ${lotId}`);
        // Пример:
        // showBidModal(lotId, currentHighestBid);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Дата не указана';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch (e) { return 'Неверная дата'; }
    };

    if (loading) {
        return <div className="auction-detail-loading">Загрузка деталей аукциона...</div>;
    }

    if (error) {
        return <div className="auction-detail-error text-danger">{error}</div>;
    }

    if (!auction) {
        return <div className="auction-detail-error">Аукцион не найден. <Link to="/auctions">Вернуться к списку аукционов</Link></div>;
    }

    return (
        <div className="auction-detail-page">
            <header className="auction-header">
                <h1>{auction.name_specificity}</h1>
                <div className="auction-meta">
                    <span><strong>Дата:</strong> {formatDate(auction.auction_date)}</span>
                    <span><strong>Время:</strong> {auction.auction_time}</span>
                    <span><strong>Место:</strong> {auction.location}</span>
                    <span><strong>Статус:</strong> {auction.status}</span>
                </div>
                {auction.description_full && (
                    <p className="auction-description-full">{auction.description_full}</p>
                )}
            </header>

            {isAuthenticated && (user?.role === 'seller' || user?.role === 'admin') && auction.status !== 'Завершен' && (
                <div className="add-lot-section">
                    <Link to={`/auctions/${auction.id}/add-lot`} className="button">
                        Добавить лот на этот аукцион
                    </Link>
                </div>
            )}


            <section className="lots-section">
                <h2>Лоты на аукционе</h2>
                {lots.length > 0 ? (
                    <div className="lots-grid">
                        {lots.map((lot) => (
                            <LotCard key={lot.id} lot={lot} onBid={handleBid} />
                        ))}
                    </div>
                ) : (
                    <p>На этом аукционе пока нет выставленных лотов.</p>
                )}
            </section>
        </div>
    );
};

export default AuctionDetailPage;