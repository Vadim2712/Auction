// src/pages/AuctionDetailPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getAuctionById, placeBid, updateAuctionStatus, deleteLot } from '../services/apiClient';
import LotCard from '../components/LotCard';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Loader from '../components/common/Loader';
import Alert from '../components/common/Alert';
import './AuctionDetailPage.css';

const AuctionDetailPage = () => {
    const { id: auctionId } = useParams();
    const navigate = useNavigate();
    const { isAuthenticated, currentUser: user, activeRole, loading: authLoading } = useAuth();
    const [auction, setAuction] = useState(null);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [bidSubmissionStatus, setBidSubmissionStatus] = useState({});
    const [actionInProgress, setActionInProgress] = useState(false);
    const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' });

    const clearActionFeedback = () => setActionFeedback({ type: '', message: '' });

    const fetchAuction = useCallback(async () => {
        try {
            setLoading(true);
            setPageError('');
            clearActionFeedback();
            const response = await getAuctionById(auctionId);
            setAuction(response.data);
        } catch (err) {
            console.error("Ошибка загрузки аукциона:", err);
            setPageError('Не удалось загрузить данные аукциона. ' + (err.response?.data?.message || err.response?.data?.error || err.message));
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
            setActionFeedback({ type: 'warning', message: 'Пожалуйста, войдите, чтобы сделать ставку.' });
            return;
        }
        setActionInProgress(true);
        setBidSubmissionStatus(prev => ({ ...prev, [lotId]: { status: 'submitting', message: 'Отправка ставки...' } }));
        clearActionFeedback();
        try {
            const response = await placeBid(auctionId, lotId, parseFloat(bidAmount));
            const updatedLotFromAPI = response.data;

            setAuction(prevAuction => ({
                ...prevAuction,
                lots: prevAuction.lots.map(l => (l.id === lotId ? { ...l, ...updatedLotFromAPI } : l))
            }));
            setBidSubmissionStatus(prev => ({ ...prev, [lotId]: { status: 'success', message: 'Ваша ставка принята!' } }));
            setTimeout(() => setBidSubmissionStatus(prev => ({ ...prev, [lotId]: undefined })), 3000);
        } catch (err) {
            console.error("Ошибка ставки:", err);
            const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Ошибка при размещении ставки.';
            setBidSubmissionStatus(prev => ({ ...prev, [lotId]: { status: 'error', message: errorMessage } }));
        } finally {
            setActionInProgress(false);
        }
    };

    const handleAuctionStatusChange = async (newStatus) => {
        if (!user || (activeRole !== 'SYSTEM_ADMIN' && activeRole !== 'seller')) {
            setActionFeedback({ type: 'danger', message: 'Это действие доступно только администратору или продавцу (менеджеру).' });
            return;
        }
        setActionInProgress(true);
        clearActionFeedback();
        try {
            const response = await updateAuctionStatus(auctionId, newStatus);
            setAuction(response.data);
            setActionFeedback({ type: 'success', message: `Статус аукциона успешно изменен на "${newStatus}"` });
        } catch (err) {
            console.error("Ошибка изменения статуса аукциона:", err);
            const errorMessage = err.response?.data?.message || err.response?.data?.error || 'Не удалось изменить статус аукциона.';
            setActionFeedback({ type: 'danger', message: errorMessage });
        } finally {
            setActionInProgress(false);
        }
    };

    const handleDeleteLot = async (currentAuctionId, lotIdToDelete) => {
        if (!window.confirm(`Вы уверены, что хотите удалить лот ID: ${lotIdToDelete} из этого аукциона?`)) return;
        clearActionFeedback();
        setActionInProgress(true);
        try {
            await deleteLot(currentAuctionId, lotIdToDelete);
            setActionFeedback({ type: 'success', message: "Лот успешно удален." });
            fetchAuction();
        } catch (err) {
            console.error("Ошибка удаления лота:", err);
            setActionFeedback({ type: 'danger', message: `Ошибка удаления лота: ${err.response?.data?.message || err.response?.data?.error || err.message}` });
        } finally {
            setActionInProgress(false);
        }
    };

    if (authLoading || (loading && !auction)) {
        return <div className="container page-loader-container"><Loader text="Загрузка деталей аукциона..." /></div>;
    }

    console.log('--- Отладка кнопки "Добавить лот" ---');
    console.log('isAuthenticated:', isAuthenticated);
    console.log('user object:', user);
    console.log('activeRole from AuthContext:', activeRole);
    console.log('auction object:', auction);
    console.log('auction?.status:', auction?.status);

    // Для управления аукционом и добавления лотов
    const isPrivilegedForAuctionManagement = isAuthenticated && user && (activeRole === 'SYSTEM_ADMIN' || activeRole === 'seller');
    const canAddLotToThisAuction = isPrivilegedForAuctionManagement && auction?.status === 'Запланирован';

    return (
        <div className="auction-detail-page container">
            {pageError && <Alert message={pageError} type="danger" onClose={() => setPageError('')} />}
            {actionFeedback.message && <Alert message={actionFeedback.message} type={actionFeedback.type} onClose={clearActionFeedback} />}

            {!auction && !loading && !pageError && (
                <Alert message="Аукцион не найден." type="warning" />
            )}

            {auction && (
                <>
                    <header className="auction-header">
                        <h1>{auction.nameSpecificity}</h1>
                        <p><strong>Дата и время:</strong> {new Date(auction.auctionDate).toLocaleDateString('ru-RU')} {auction.auctionTime}</p>
                        <p><strong>Место:</strong> {auction.location}</p>
                        <p><strong>Статус:</strong> <span className={`status-badge status-${auction.status?.toLowerCase().replace(/ /g, '-')}`}>{auction.status || 'Неизвестен'}</span></p>
                        {auction.descriptionFull && <p className="auction-description"><strong>Описание:</strong> {auction.descriptionFull}</p>}
                    </header>

                    {isPrivilegedForAuctionManagement && (
                        <div className="admin-actions auction-status-controls">
                            <h4>Управление аукционом</h4>
                            {auction.status === 'Запланирован' && (
                                <Button
                                    onClick={() => handleAuctionStatusChange('Идет торг')}
                                    disabled={actionInProgress}
                                    variant="success"
                                    className="button-start"
                                >
                                    {actionInProgress ? 'Запуск...' : 'Начать торги'}
                                </Button>
                            )}
                            {auction.status === 'Идет торг' && (
                                <Button
                                    onClick={() => handleAuctionStatusChange('Завершен')}
                                    disabled={actionInProgress}
                                    variant="danger"
                                    className="button-finish"
                                >
                                    {actionInProgress ? 'Завершение...' : 'Завершить аукцион'}
                                </Button>
                            )}
                            {auction.status === 'Завершен' && (
                                <p className="auction-completed-message">Аукцион завершен.</p>
                            )}
                        </div>
                    )}

                    {canAddLotToThisAuction && (
                        <div className="add-lot-action">
                            <Link to={`/auctions/${auction.id}/add-lot`}>
                                <Button variant="primary">
                                    Добавить лот на этот аукцион
                                </Button>
                            </Link>
                        </div>
                    )}
                    {auction.status === 'Идет торг' && !isPrivilegedForAuctionManagement && isAuthenticated && ( // Только если аутентифицирован, но не админ/менеджер
                        <p className="auction-in-progress-note">Аукцион активен! Делайте ваши ставки.</p>
                    )}

                    <section className="lots-section">
                        <h2>Лоты на аукционе</h2>
                        {auction.lots && auction.lots.length > 0 ? (
                            <div className="lots-grid">
                                {auction.lots.map(lot => {
                                    // Условия для управления КОНКРЕТНЫМ лотом
                                    const canManageThisSpecificLot = isAuthenticated &&
                                        (lot.status === 'Ожидает торгов' && auction.status === 'Запланирован') &&
                                        (activeRole === 'SYSTEM_ADMIN' || (activeRole === 'seller' && user?.id === lot.sellerId) || (activeRole === 'seller' && user?.id === auction.createdByUserId));
                                    // Админ может всегда. Продавец-владелец лота может. Продавец-создатель аукциона может.

                                    return (
                                        <div key={lot.id} className="lot-wrapper">
                                            <LotCard
                                                auctionId={auction.id}
                                                auctionStatus={auction.status}
                                                lot={lot}
                                                onBid={handleBid}
                                            />
                                            {canManageThisSpecificLot && (
                                                <div className="lot-management-actions">
                                                    <Link to={`/auctions/${auction.id}/lots/${lot.id}/edit`}>
                                                        <Button variant="info" className="button-sm">Редактировать</Button>
                                                    </Link>
                                                    <Button variant="danger" className="button-sm" onClick={() => handleDeleteLot(auction.id, lot.id)} disabled={actionInProgress}>
                                                        Удалить
                                                    </Button>
                                                </div>
                                            )}
                                            {bidSubmissionStatus[lot.id] && (
                                                <Alert
                                                    message={bidSubmissionStatus[lot.id].message}
                                                    type={bidSubmissionStatus[lot.id].status === 'submitting' ? 'info' : bidSubmissionStatus[lot.id].status}
                                                    onClose={() => setBidSubmissionStatus(prev => ({ ...prev, [lot.id]: undefined }))}
                                                />
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p>На этом аукционе пока нет выставленных лотов.</p>
                        )}
                    </section>
                </>
            )}
        </div>
    );
};

export default AuctionDetailPage;