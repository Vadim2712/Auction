// src/pages/MyListingsPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyListings, deleteLot } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import Alert from '../components/common/Alert';
import Button from '../components/common/Button';
import Pagination from '../components/common/Pagination';
import Card from '../components/common/Card'; // Импортируем Card
import './MyListingsPage.css';

const MyListingsPage = () => {
    const { user, loading: authLoading } = useAuth();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState(''); // Переименовано для ясности
    const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' });
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        pageSize: 6,
        totalItems: 0
    });

    const clearActionFeedback = () => setActionFeedback({ type: '', message: '' });

    const fetchListings = useCallback(async (page = 1) => {
        if (!user) return;
        setLoading(true);
        setPageError('');
        clearActionFeedback();
        try {
            const response = await getMyListings({ page, pageSize: pagination.pageSize });
            if (response.data && response.data.data) {
                // Данные (lot) внутри LotWithAuctionInfo должны быть camelCase
                setListings(response.data.data);
                setPagination(response.data.pagination);
            } else {
                setListings([]);
                setPagination({ currentPage: 1, totalPages: 1, pageSize: pagination.pageSize, totalItems: 0 });
            }
        } catch (err) {
            console.error("Ошибка загрузки списка лотов продавца:", err);
            setPageError('Не удалось загрузить ваши лоты. ' + (err.response?.data?.message || err.response?.data?.error || err.message));
        } finally {
            setLoading(false);
        }
    }, [user, pagination.pageSize]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchListings(pagination.currentPage);
        } else if (!authLoading && !user) {
            setLoading(false);
            setPageError("Пожалуйста, войдите, чтобы просмотреть эту страницу.");
        }
    }, [user, authLoading, fetchListings, pagination.currentPage]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.currentPage) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    const handleDeleteLot = async (auctionId, lotId) => {
        if (!window.confirm(`Вы уверены, что хотите удалить лот ID: ${lotId} из аукциона ID: ${auctionId}?`)) return;
        clearActionFeedback();
        // Можно добавить локальный индикатор загрузки для конкретной карточки, если потребуется
        try {
            await deleteLot(auctionId, lotId);
            setActionFeedback({ type: 'success', message: "Лот успешно удален." });
            fetchListings(pagination.currentPage); // Обновить список
        } catch (err) {
            console.error("Ошибка удаления лота:", err);
            setActionFeedback({ type: 'danger', message: `Ошибка удаления лота: ${err.response?.data?.message || err.response?.data?.error || err.message}` });
        }
    };

    if (authLoading || (loading && listings.length === 0 && pagination.currentPage === 1)) {
        return <Loader text="Загрузка ваших лотов..." />;
    }

    return (
        <div className="my-listings-page container">
            <h1>Мои выставленные лоты</h1>
            {pageError && <Alert message={pageError} type="danger" onClose={() => setPageError('')} />}
            {actionFeedback.message && <Alert message={actionFeedback.message} type={actionFeedback.type} onClose={clearActionFeedback} />}

            {listings.length > 0 ? (
                <>
                    <div className="listings-grid">
                        {listings.map(lot => ( // lot - это LotWithAuctionInfo, все поля должны быть camelCase
                            <Card
                                key={`${lot.auctionId}-${lot.id}`}
                                className={`listing-item status-lot-${lot.status?.toLowerCase().replace(/ /g, '-')}`}
                                title={<Link to={`/auctions/${lot.auctionId}`}>{lot.name}</Link>}
                            // Можно вынести значок статуса в header карточки, если Card это поддерживает или кастомизировать Card
                            // Либо оставить его внутри card-body
                            >
                                {/* Card.Header уже отрендерен через title, теперь Card.Body */}
                                <div className="listing-item-status-badge-container">
                                    <span className={`status-badge status-lot-${lot.status?.toLowerCase().replace(/ /g, '-')}`}>{lot.status}</span>
                                </div>
                                <p><strong>Аукцион:</strong> {lot.auctionName} (ID: {lot.auctionId})</p>
                                <p><strong>Стартовая цена:</strong> {lot.startPrice} руб.</p>
                                <p><strong>Текущая цена:</strong> {lot.currentPrice} руб.</p>
                                {lot.status === 'Продан' && lot.finalPrice && (
                                    <p><strong>Продано за:</strong> {lot.finalPrice} руб. (Покупатель: {lot.FinalBuyer?.fullName || `ID ${lot.finalBuyerId}`})</p>
                                )}
                                {lot.highestBidderId && lot.status !== 'Продан' && (
                                    <p><strong>Лидирующая ставка от:</strong> {lot.HighestBidder?.fullName || `Участник ID ${lot.highestBidderId}`}</p>
                                )}
                                <p><strong>Статус аукциона:</strong> {lot.auctionStatus}</p>

                                <div className="listing-item-footer">
                                    <Link to={`/auctions/${lot.auctionId}`}>
                                        <Button variant="secondary" className="button-sm">
                                            К аукциону
                                        </Button>
                                    </Link>
                                    {(lot.status === 'Ожидает торгов' && lot.auctionStatus === 'Запланирован') && (
                                        (user && (user.id === lot.sellerId || user.role === 'SYSTEM_ADMIN' || user.role === 'seller' || user.role === 'admin')) && (
                                            <>
                                                <Link to={`/auctions/${lot.auctionId}/lots/${lot.id}/edit`} style={{ marginLeft: '10px' }}>
                                                    <Button variant="info" className="button-sm">Редактировать</Button>
                                                </Link>
                                                <Button variant="danger" className="button-sm" onClick={() => handleDeleteLot(lot.auctionId, lot.id)} style={{ marginLeft: '10px' }}>
                                                    Удалить
                                                </Button>
                                            </>
                                        )
                                    )}
                                </div>
                            </Card>
                        ))}
                    </div>
                    {pagination.totalPages > 1 && !loading && (
                        <Pagination
                            currentPage={pagination.currentPage}
                            totalPages={pagination.totalPages}
                            onPageChange={handlePageChange}
                            totalItems={pagination.totalItems}
                            disabled={loading}
                        />
                    )}
                </>
            ) : (
                !loading && !pageError && <p>Вы еще не выставили ни одного лота.</p>
            )}
        </div>
    );
};

export default MyListingsPage;