// src/pages/AuctionDetailPage.js
import React, { useEffect, useState, useCallback } from 'react'; // Добавлен useCallback
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAuctionById, placeBid } from '../services/apiClient'; // <--- Импортируем placeBid
import LotCard from '../components/LotCard';
import { useAuth } from '../context/AuthContext';
import './AuctionDetailPage.css';

const AuctionDetailPage = () => {
    const { id: auctionId } = useParams(); // Переименовал id в auctionId для ясности
    const navigate = useNavigate();
    const { isAuthenticated, user, loading: authLoading } = useAuth(); // Добавил authLoading
    const [auction, setAuction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [bidSubmissionStatus, setBidSubmissionStatus] = useState({}); // { lotId: 'submitting' | 'success' | 'error', message: '' }

    const fetchAuction = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await getAuctionById(auctionId);
            setAuction(response.data);
        } catch (err) {
            console.error("Ошибка загрузки аукциона:", err);
            setError('Не удалось загрузить данные аукциона. ' + (err.response?.data?.message || err.message));
            if (err.response?.status === 404) {
                // Опционально: перенаправить на страницу 404, если аукцион не найден
            }
        } finally {
            setLoading(false);
        }
    }, [auctionId]);

    useEffect(() => {
        if (!authLoading) { // Загружаем аукцион только после инициализации AuthContext
            fetchAuction();
        }
    }, [auctionId, fetchAuction, authLoading]);

    const handleBid = async (lotId, bidAmount) => {
        if (!isAuthenticated || !user) {
            // Это не должно произойти, если UI правильно скрывает форму ставки, но как доп. проверка
            alert('Пожалуйста, войдите, чтобы сделать ставку.');
            navigate('/login', { state: { from: `/auctions/${auctionId}` } });
            return;
        }

        setBidSubmissionStatus({ [lotId]: { status: 'submitting', message: '' } });

        try {
            // Передаем auctionId, lotId, bidAmount, user.id
            const response = await placeBid(auctionId, lotId, bidAmount, user.id);
            const updatedLot = response.data;

            // Обновляем состояние аукциона с обновленным лотом
            setAuction(prevAuction => ({
                ...prevAuction,
                lots: prevAuction.lots.map(l => (l.id === lotId ? { ...l, ...updatedLot } : l))
            }));
            setBidSubmissionStatus({ [lotId]: { status: 'success', message: 'Ваша ставка принята!' } });
            // Очистить сообщение об успехе через некоторое время
            setTimeout(() => setBidSubmissionStatus(prev => ({ ...prev, [lotId]: undefined })), 3000);

        } catch (err) {
            console.error("Ошибка ставки:", err);
            const errorMessage = err.response?.data?.message || 'Ошибка при размещении ставки.';
            setBidSubmissionStatus({ [lotId]: { status: 'error', message: errorMessage } });
            // Не очищаем сообщение об ошибке автоматически, чтобы пользователь его увидел
        }
    };

    if (authLoading || loading) return <div className="container"><p>Загрузка деталей аукциона...</p></div>;
    if (error) return <div className="container"><p className="error-message">{error}</p></div>;
    if (!auction) return <div className="container"><p>Аукцион не найден.</p></div>;

    const canAddLot = isAuthenticated && user && (user.role === 'admin' || user.role === 'seller') && auction.status === 'Запланирован';

    return (
        <div className="auction-detail-page container">
            <header className="auction-header">
                <h1>{auction.name_specificity}</h1>
                <p><strong>Дата и время:</strong> {new Date(auction.auction_date).toLocaleDateString()} {auction.auction_time}</p>
                <p><strong>Место:</strong> {auction.location}</p>
                <p><strong>Статус:</strong> <span className={`status status-${auction.status?.toLowerCase().replace(/ /g, '-')}`}>{auction.status || 'Неизвестен'}</span></p>
                {auction.description_full && <p className="auction-description"><strong>Описание:</strong> {auction.description_full}</p>}
            </header>

            {canAddLot && (
                <div className="add-lot-action">
                    <Link to={`/auctions/${auction.id}/add-lot`} className="button button-primary">
                        Добавить лот на этот аукцион
                    </Link>
                </div>
            )}
            {auction.status === 'Идет торг' && (
                <p className="auction-in-progress-note">Аукцион активен! Делайте ваши ставки.</p>
            )}


            <section className="lots-section">
                <h2>Лоты на аукционе</h2>
                {auction.lots && auction.lots.length > 0 ? (
                    <div className="lots-grid">
                        {auction.lots.map(lot => (
                            <div key={lot.id} className="lot-wrapper">
                                <LotCard
                                    auctionId={auction.id}
                                    auctionStatus={auction.status} // <--- Передаем статус аукциона
                                    lot={lot}
                                    onBid={handleBid}
                                />
                                {bidSubmissionStatus[lot.id] && (
                                    <div className={`bid-feedback bid-${bidSubmissionStatus[lot.id].status}`}>
                                        {bidSubmissionStatus[lot.id].message}
                                    </div>
                                )}
                            </div>
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