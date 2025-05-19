// src/pages/AuctionDetailPage.js
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } // <--- Добавьте useNavigate, если еще не импортирован
    from 'react-router-dom';
import { getAuctionById /*, placeBid */ } from '../services/apiClient';
import LotCard from '../components/LotCard';
import { useAuth } from '../context/AuthContext'; // <--- Импортируем useAuth
import './AuctionDetailPage.css';

const AuctionDetailPage = () => {
    const { id } = useParams();
    const navigate = useNavigate(); // Для программной навигации
    const { isAuthenticated, user } = useAuth(); // <--- Получаем данные аутентификации
    const [auction, setAuction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchAuction = async () => {
            try {
                setLoading(true);
                setError('');
                const response = await getAuctionById(id);
                setAuction(response.data);
            } catch (err) {
                console.error("Ошибка загрузки аукциона:", err);
                setError('Не удалось загрузить данные аукциона. ' + (err.response?.data?.message || err.message));
            } finally {
                setLoading(false);
            }
        };
        fetchAuction();
    }, [id]);

    const handleBid = (lotId, bidAmount) => {
        // TODO: Реализовать логику ставки (пока заглушка)
        console.log(`Ставка на лот ${lotId} в размере ${bidAmount}`);
        // apiClient.placeBid(id, lotId, bidAmount)
        //   .then(updatedLot => {
        //     // Обновить состояние лота в auction.lots
        //     setAuction(prevAuction => ({
        //       ...prevAuction,
        //       lots: prevAuction.lots.map(l => l.id === lotId ? updatedLot.data : l)
        //     }));
        //   })
        //   .catch(err => alert('Ошибка ставки: ' + err.response?.data?.message));
        alert(`Ваша ставка на лот ${lotId} в размере ${bidAmount} принята (заглушка).`);
    };

    if (loading) return <div className="container"><p>Загрузка деталей аукциона...</p></div>;
    if (error) return <div className="container"><p className="error-message">{error}</p></div>;
    if (!auction) return <div className="container"><p>Аукцион не найден.</p></div>;

    // Определяем, может ли пользователь добавлять лоты
    const canAddLot = isAuthenticated && user && (user.role === 'admin' || user.role === 'seller');
    // Можно добавить проверку статуса аукциона, например: && auction.status === 'Запланирован'

    return (
        <div className="auction-detail-page container">
            <header className="auction-header">
                <h1>{auction.name_specificity}</h1>
                <p><strong>Дата и время:</strong> {new Date(auction.auction_date).toLocaleDateString()} {auction.auction_time}</p>
                <p><strong>Место:</strong> {auction.location}</p>
                <p><strong>Статус:</strong> <span className={`status status-${auction.status?.toLowerCase().replace(' ', '-')}`}>{auction.status || 'Неизвестен'}</span></p>
                {auction.description_full && <p className="auction-description"><strong>Описание:</strong> {auction.description_full}</p>}
            </header>

            {/* Кнопка добавления лота */}
            {canAddLot && (
                <div className="add-lot-action">
                    <Link to={`/auctions/${auction.id}/add-lot`} className="button button-primary">
                        Добавить лот на этот аукцион
                    </Link>
                </div>
            )}

            <section className="lots-section">
                <h2>Лоты на аукционе</h2>
                {auction.lots && auction.lots.length > 0 ? (
                    <div className="lots-grid">
                        {auction.lots.map(lot => (
                            <LotCard key={lot.id} auctionId={auction.id} lot={lot} onBid={handleBid} />
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