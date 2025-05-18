// src/pages/AuctionsListPage.js
import React, { useState, useEffect } from 'react';
import AuctionCard from '../components/auctions/AuctionCard';
// import apiClient from '../services/apiClient'; // Раскомментируем, когда будет API
import { useAuth } from '../context/AuthContext'; // Для проверки, если нужно будет что-то специфичное для авторизованных
import './AuctionsListPage.css'; // Создадим этот файл для стилей страницы

// Mock данные для аукционов (замените на вызов API позже)
const mockAuctions = [
    {
        id: 1,
        name_specificity: 'Антикварная мебель XVIII века',
        auction_date: '2025-07-15T00:00:00Z',
        auction_time: '14:00',
        location: 'Выставочный зал "Эрмитаж"',
        status: 'Запланирован',
        created_by_user_id: 1,
    },
    {
        id: 2,
        name_specificity: 'Картины русских художников XIX века (масло)',
        auction_date: '2025-08-01T00:00:00Z',
        auction_time: '11:00',
        location: 'Галерея "Авангард"',
        status: 'Активен',
        created_by_user_id: 1,
    },
    {
        id: 3,
        name_specificity: 'Редкие монеты и нумизматика',
        auction_date: '2025-06-20T00:00:00Z', // Прошедший для примера
        auction_time: '16:30',
        location: 'Клуб Нумизматов',
        status: 'Завершен',
        created_by_user_id: 1,
    },
    {
        id: 4,
        name_specificity: 'Ювелирные изделия Фаберже',
        auction_date: '2025-09-10T00:00:00Z',
        auction_time: '15:00',
        location: 'Отель "Националь"',
        status: 'Запланирован',
        created_by_user_id: 1,
    }
];

const AuctionsListPage = () => {
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { isAuthenticated, user } = useAuth(); // Если понадобится

    useEffect(() => {
        const fetchAuctions = async () => {
            setLoading(true);
            setError('');
            try {
                // ЗАГЛУШКА: Используем mock данные
                // const response = await apiClient.get('/auctions');
                // setAuctions(response.data);
                setTimeout(() => { // Имитация задержки сети
                    setAuctions(mockAuctions);
                    setLoading(false);
                }, 500);
            } catch (err) {
                console.error("Ошибка загрузки аукционов:", err);
                setError('Не удалось загрузить список аукционов. Пожалуйста, попробуйте позже.');
                setLoading(false);
            }
        };

        fetchAuctions();
    }, []);

    if (loading) {
        return <div className="auctions-list-page-loading">Загрузка аукционов...</div>;
    }

    if (error) {
        return <div className="auctions-list-page-error text-danger">{error}</div>;
    }

    return (
        <div className="auctions-list-page">
            <div className="page-header">
                <h1>Текущие и предстоящие аукционы</h1>
                {isAuthenticated && user?.role === 'admin' && (
                    <Link to="/auctions/create" className="button button-primary">
                        Создать новый аукцион
                    </Link>
                )}
            </div>
            {auctions.length === 0 ? (
                <p>В данный момент нет доступных аукционов.</p>
            ) : (
                <div className="auctions-grid">
                    {auctions.map((auction) => (
                        <AuctionCard key={auction.id} auction={auction} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AuctionsListPage;