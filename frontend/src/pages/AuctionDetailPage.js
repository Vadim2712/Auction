// src/pages/AuctionDetailPage.js
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import LotCard from '../components/lots/LotCard';
import { getAuctionById } from '../services/apiClient'; // <--- Импортируем функцию
import { useAuth } from '../context/AuthContext';
import './AuctionDetailPage.css';

const AuctionDetailPage = () => {
    const { id: auctionId } = useParams();
    const [auction, setAuction] = useState(null);
    // const [lots, setLots] = useState([]); // Лоты теперь будут внутри объекта auction
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        const fetchAuctionDetails = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await getAuctionById(auctionId); // <--- Используем apiClient
                setAuction(response.data); // Предполагаем, что API возвращает объект аукциона с полем lots
                // setLots(response.data.lots || []); // Если лоты приходят отдельно
            } catch (err) {
                console.error(`Ошибка загрузки деталей аукциона ${auctionId}:`, err.response?.data?.message || err.message);
                setError(err.response?.data?.message || 'Не удалось загрузить детали аукциона.');
            } finally {
                setLoading(false);
            }
        };

        if (auctionId) {
            fetchAuctionDetails();
        }
    }, [auctionId]);

    const handleBid = (lotId) => {
        if (!isAuthenticated) {
            alert("Пожалуйста, войдите в систему, чтобы сделать ставку.");
            return;
        }
        alert(`Заглушка: Пользователь ${user?.fullName} хочет сделать ставку на лот ID: ${lotId} аукциона ${auction?.name_specificity}`);
    };

    const formatDate = (dateString) => { /* ... (без изменений) ... */
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
        return <div className="auction-detail-error text-danger">{error} <Link to="/auctions">Вернуться к списку</Link></div>;
    }

    if (!auction) {
        return <div className="auction-detail-error">Аукцион не найден. <Link to="/auctions">Вернуться к списку аукционов</Link></div>;
    }

    const lots = auction.lots || []; // Получаем лоты из объекта аукциона

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