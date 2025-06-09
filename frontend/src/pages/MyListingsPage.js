// src/pages/MyListingsPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyListings, deleteLot } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import Alert from '../components/common/Alert';
import Button from '../components/common/Button';
import Pagination from '../components/common/Pagination';
import Card from '../components/common/Card';
import './MyListingsPage.css';

const MyListingsPage = () => {
    const { currentUser: user, isAuthenticated, loading: authLoading, activeRole } = useAuth();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [pageError, setPageError] = useState('');
    const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' });
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        pageSize: 6,
        totalItems: 0
    });

    const clearActionFeedback = () => setActionFeedback({ type: '', message: '' });

    const fetchListings = useCallback(async (page = 1) => {
        console.log('[MyListingsPage] fetchListings called for page:', page, 'User ID:', user?.id);
        if (!user?.id) {
            setLoading(false);
            console.log('[MyListingsPage] fetchListings aborted, no user or user.id.');
            return;
        }
        setLoading(true);
        setPageError('');
        clearActionFeedback();
        try {
            const response = await getMyListings({ page, pageSize: pagination.pageSize });
            console.log('[MyListingsPage] API response from getMyListings:', response.data);
            if (response.data && response.data.data) {
                setListings(response.data.data);
                setPagination(response.data.pagination);
            } else {
                setListings([]);
                setPagination({ currentPage: page, totalPages: 1, pageSize: pagination.pageSize, totalItems: 0 });
                console.warn("[MyListingsPage] API response from getMyListings did not contain expected data/pagination structure.");
            }
        } catch (err) {
            console.error("[MyListingsPage] Ошибка загрузки списка лотов продавца:", err);
            const errMsg = err.response?.data?.message || err.response?.data?.error || 'Не удалось загрузить ваши лоты.';
            setPageError(errMsg);
            setListings([]);
            setPagination({ currentPage: 1, totalPages: 1, pageSize: pagination.pageSize, totalItems: 0 });
        } finally {
            setLoading(false);
            console.log('[MyListingsPage] fetchListings finished, local loading set to false.');
        }
    }, [user, pagination.pageSize]);

    useEffect(() => {
        console.log('[MyListingsPage useEffect] Auth state change:', { authLoading, isAuthenticated, userExists: !!user });
        if (!authLoading) {
            if (isAuthenticated && user) {
                fetchListings(pagination.currentPage);
            } else {
                setLoading(false);
                if (!isAuthenticated) {
                    setPageError("Пожалуйста, войдите, чтобы просмотреть эту страницу.");
                }
            }
        }
    }, [user, isAuthenticated, authLoading, fetchListings, pagination.currentPage]);

    const handlePageChange = (newPage) => {
        console.log('[MyListingsPage] handlePageChange to:', newPage);
        if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.currentPage) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    const handleDeleteLot = async (auctionId, lotId) => {
        if (!window.confirm(`Вы уверены, что хотите удалить лот ID: ${lotId} из аукциона ID: ${auctionId}?`)) return;
        clearActionFeedback();
        try {
            await deleteLot(auctionId, lotId);
            setActionFeedback({ type: 'success', message: "Лот успешно удален." });
            if (listings.length === 1 && pagination.currentPage > 1) {
                handlePageChange(pagination.currentPage - 1);
            } else {
                fetchListings(pagination.currentPage);
            }
        } catch (err) {
            console.error("Ошибка удаления лота:", err);
            setActionFeedback({ type: 'danger', message: `Ошибка удаления лота: ${err.response?.data?.message || err.response?.data?.error || err.message}` });
        } finally {
        }
    };

    if (authLoading) {
        return <div className="container page-loader-container"><Loader text="Проверка сессии..." /></div>;
    }

    if (!isAuthenticated) {
        return (
            <div className="container">
                <Alert message={pageError || "Для доступа к этой странице необходимо войти в систему."} type="warning" />
                <Link to="/login" style={{ marginTop: '10px', display: 'inline-block' }}><Button variant='primary'>Войти</Button></Link>
            </div>
        );
    }

    if (loading && listings.length === 0 && pagination.currentPage === 1) {
        return <div className="container page-loader-container"><Loader text="Загрузка ваших лотов..." /></div>;
    }

    if (pageError && listings.length === 0) {
        return <div className="container"><Alert message={pageError} type="danger" onClose={() => setPageError('')} /></div>;
    }

    return (
        <div className="my-listings-page container">
            <h1>Мои выставленные лоты</h1>
            {pageError && listings.length > 0 && <Alert message={pageError} type="danger" onClose={() => setPageError('')} />}
            {actionFeedback.message && <Alert message={actionFeedback.message} type={actionFeedback.type} onClose={clearActionFeedback} />}

            {listings.length > 0 ? (
                <>
                    <div className="listings-grid">
                        {listings.map(lot => {
                            const canManageLot = isAuthenticated &&
                                (lot.status === 'Ожидает торгов' && lot.auctionStatus === 'Запланирован') &&
                                (user?.id === lot.sellerId || activeRole === 'SYSTEM_ADMIN');
                            return (
                                <Card
                                    key={`${lot.auctionId}-${lot.id}`}
                                    className={`listing-item status-lot-${lot.status?.toLowerCase().replace(/ /g, '-')}`}
                                    title={<Link to={`/auctions/${lot.auctionId}`}>{lot.name}</Link>}
                                >
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
                                        {canManageLot && (
                                            <>
                                                <Link to={`/auctions/${lot.auctionId}/lots/${lot.id}/edit`} style={{ marginLeft: '10px' }}>
                                                    <Button variant="info" className="button-sm">Редактировать</Button>
                                                </Link>
                                                <Button variant="danger" className="button-sm" onClick={() => handleDeleteLot(lot.auctionId, lot.id)} style={{ marginLeft: '10px' }}>
                                                    Удалить
                                                </Button>
                                            </>
                                        )}
                                    </div>
                                </Card>
                            );
                        })}
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