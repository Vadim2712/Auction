// src/pages/AuctionDetailPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAuctionById, placeBid, updateAuctionStatus } from '../services/apiClient'; // <--- Импортируем updateAuctionStatus
import LotCard from '../components/LotCard';
import { useAuth } from '../context/AuthContext';
import './AuctionDetailPage.css';

const AuctionDetailPage = () => {
    const { id: auctionId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, user, loading: authLoading } = useAuth();
    const [auction, setAuction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [bidSubmissionStatus, setBidSubmissionStatus] = useState({});
    const [statusUpdateInProgress, setStatusUpdateInProgress] = useState(false); // Для обратной связи при смене статуса
    const [statusUpdateError, setStatusUpdateError] = useState('');

    const fetchAuction = useCallback(async () => {
        try {
            setLoading(true);
            setError('');
            const response = await getAuctionById(auctionId);
            setAuction(response.data);
        } catch (err) {
            console.error("Ошибка загрузки аукциона:", err);
            setError('Не удалось загрузить данные аукциона. ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    }, [auctionId]);

    useEffect(() => {
        if (!authLoading) {
            fetchAuction();
        }
    }, [auctionId, fetchAuction, authLoading]);

    const handleBid = async (lotId, bidAmount) => {
        if (!isAuthenticated || !user) {
            alert('Пожалуйста, войдите, чтобы сделать ставку.');
            navigate('/login', { state: { from: `/auctions/${auctionId}` } });
            return;
        }
        setBidSubmissionStatus({ ...bidSubmissionStatus, [lotId]: { status: 'submitting', message: '' } });
        try {
            const response = await placeBid(auctionId, lotId, bidAmount, user.id);
            const updatedLot = response.data;
            setAuction(prevAuction => ({
                ...prevAuction,
                lots: prevAuction.lots.map(l => (l.id === lotId ? { ...l, ...updatedLot } : l))
            }));
            setBidSubmissionStatus({ ...bidSubmissionStatus, [lotId]: { status: 'success', message: 'Ваша ставка принята!' } });
            setTimeout(() => setBidSubmissionStatus(prev => ({ ...prev, [lotId]: undefined })), 3000);
        } catch (err) {
            console.error("Ошибка ставки:", err);
            const errorMessage = err.response?.data?.message || 'Ошибка при размещении ставки.';
            setBidSubmissionStatus({ ...bidSubmissionStatus, [lotId]: { status: 'error', message: errorMessage } });
        }
    };

    const handleAuctionStatusChange = async (newStatus) => {
        if (!user || user.role !== 'admin') {
            alert('Это действие доступно только администратору.');
            return;
        }
        setStatusUpdateInProgress(true);
        setStatusUpdateError('');
        try {
            const response = await updateAuctionStatus(auctionId, newStatus);
            setAuction(response.data); // Обновляем данные аукциона с новым статусом и обработанными лотами
            alert(`Статус аукциона успешно изменен на "${newStatus}"`);
        } catch (err) {
            console.error("Ошибка изменения статуса аукциона:", err);
            const errorMessage = err.response?.data?.message || 'Не удалось изменить статус аукциона.';
            setStatusUpdateError(errorMessage);
            alert(`Ошибка: ${errorMessage}`);
        } finally {
            setStatusUpdateInProgress(false);
        }
    };


    if (authLoading || loading) return <div className="container"><p>Загрузка деталей аукциона...</p></div>;
    if (error) return <div className="container"><p className="error-message">{error}</p></div>;
    if (!auction) return <div className="container"><p>Аукцион не найден.</p></div>;

    const isAdmin = isAuthenticated && user && user.role === 'admin';
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

            {/* Блок управления статусом аукциона для администратора */}
            {isAdmin && (
                <div className="admin-actions auction-status-controls">
                    <h4>Управление аукционом (Админ)</h4>
                    {auction.status === 'Запланирован' && (
                        <button
                            onClick={() => handleAuctionStatusChange('Идет торг')}
                            disabled={statusUpdateInProgress}
                            className="button button-start"
                        >
                            {statusUpdateInProgress ? 'Запуск...' : 'Начать торги'}
                        </button>
                    )}
                    {auction.status === 'Идет торг' && (
                        <button
                            onClick={() => handleAuctionStatusChange('Завершен')}
                            disabled={statusUpdateInProgress}
                            className="button button-finish"
                        >
                            {statusUpdateInProgress ? 'Завершение...' : 'Завершить аукцион'}
                        </button>
                    )}
                    {auction.status === 'Завершен' && (
                        <p className="auction-completed-message">Аукцион завершен.</p>
                    )}
                    {statusUpdateError && <p className="error-message admin-error">{statusUpdateError}</p>}
                </div>
            )}

            {canAddLot && (
                <div className="add-lot-action">
                    <Link to={`/auctions/${auction.id}/add-lot`} className="button button-primary">
                        Добавить лот на этот аукцион
                    </Link>
                </div>
            )}
            {auction.status === 'Идет торг' && !isAdmin && ( // Сообщение для не-админов
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
                                    auctionStatus={auction.status}
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