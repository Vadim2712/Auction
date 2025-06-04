// src/pages/MyActivityPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyActivity } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import Alert from '../components/common/Alert';
import Pagination from '../components/common/Pagination';
import Card from '../components/common/Card';
import './MyActivityPage.css';

const MyActivityPage = () => {
    // Исправляем деструктуризацию: currentUser переименовываем в user
    const { currentUser: user, isAuthenticated, loading: authLoading } = useAuth();
    const [activity, setActivity] = useState({ leadingBids: [], wonLots: [] });
    const [loading, setLoading] = useState(true); // Локальный лоадер для данных активности
    const [pageError, setPageError] = useState(''); // Переименовано из error для ясности

    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        pageSize: 5,
        totalItems: 0
    });

    const fetchActivity = useCallback(async (page = 1) => {
        // Теперь user здесь будет корректным объектом currentUser
        if (!user?.id) { // Проверяем наличие user.id перед запросом
            setLoading(false);
            // setError("Данные пользователя не найдены, не удается загрузить активность."); // Можно не выводить ошибку, если ProtectedRoute уже сработал
            return;
        }
        setLoading(true);
        setPageError('');
        try {
            const response = await getMyActivity({ page, pageSize: pagination.pageSize });

            const responseData = response.data || {};
            const leadingBidsData = responseData.leadingBids || [];
            const wonLotsData = responseData.wonLots || [];

            setActivity({ leadingBids: leadingBidsData, wonLots: wonLotsData });

            if (responseData.pagination) {
                setPagination(responseData.pagination);
            } else {
                const itemsOnPage = Math.max(leadingBidsData.length, wonLotsData.length);
                const calculatedTotalItems = (page - 1) * pagination.pageSize + itemsOnPage;
                const calculatedTotalPages = (itemsOnPage < pagination.pageSize && itemsOnPage > 0 && page === 1) ? 1 : Math.ceil(calculatedTotalItems / pagination.pageSize) || 1;

                setPagination(prev => ({
                    ...prev,
                    currentPage: page,
                    totalItems: prev.totalItems > calculatedTotalItems && prev.currentPage > page ? prev.totalItems : calculatedTotalItems,
                    totalPages: prev.totalPages > calculatedTotalPages && prev.currentPage > page ? prev.totalPages : calculatedTotalPages,
                }));
            }

        } catch (err) {
            console.error("Ошибка загрузки активности пользователя:", err);
            const errMsg = err.response?.data?.message || err.response?.data?.error || 'Не удалось загрузить данные об активности.';
            setPageError(errMsg);
            setActivity({ leadingBids: [], wonLots: [] });
            setPagination(prev => ({ ...prev, currentPage: 1, totalPages: 1, totalItems: 0 }));
        } finally {
            setLoading(false);
        }
    }, [user, pagination.pageSize]); // Добавляем user в зависимости useCallback

    useEffect(() => {
        if (!authLoading) {
            if (isAuthenticated && user) {
                fetchActivity(pagination.currentPage);
            } else {
                setLoading(false);
                // Если ProtectedRoute не отработал, setPageError здесь может быть полезен
                // Но если ProtectedRoute есть, то до этого условия не должно доходить
                if (!isAuthenticated) { // Явная проверка, если вдруг ProtectedRoute не справился
                    setPageError("Пожалуйста, войдите, чтобы просмотреть эту страницу.");
                }
            }
        }
    }, [user, isAuthenticated, authLoading, fetchActivity, pagination.currentPage]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.currentPage) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
            // useEffect will react to pagination.currentPage change and call fetchActivity
        }

    };
    // 1. Сначала проверяем глобальную загрузку AuthContext
    if (authLoading) {
        return <div className="container page-loader-container"><Loader text="Проверка сессии..." /></div>;
    }

    // 2. Если AuthContext загрузился, но пользователь не аутентифицирован
    if (!isAuthenticated) {
        return <div className="container"><Alert message={pageError || "Для доступа к этой странице необходимо войти в систему."} type="warning" /></div>;
    }

    // 3. Если пользователь аутентифицирован, но данные страницы еще грузятся (и это первая загрузка)
    if (loading && pagination.currentPage === 1 && activity.leadingBids.length === 0 && activity.wonLots.length === 0) {
        return <div className="container page-loader-container"><Loader text="Загрузка вашей активности..." /></div>;
    }

    // 4. Если есть ошибка загрузки данных страницы (и нет данных для отображения)
    if (pageError && (!activity.leadingBids.length && !activity.wonLots.length)) {
        return <div className="container"><Alert message={pageError} type="danger" onClose={() => setPageError('')} /></div>;
    }

    const { leadingBids, wonLots } = activity;

    return (
        <div className="my-activity-page container">
            <h1>Моя активность на аукционах</h1>
            {/* Ошибка, не связанная с загрузкой пустого списка, может быть показана здесь, если fetchActivity ее установит */}
            {pageError && (activity.leadingBids.length > 0 || activity.wonLots.length > 0) &&
                <Alert message={pageError} type="danger" onClose={() => setPageError('')} />
            }

            <Card title={`Лоты, где вы лидируете (${leadingBids.length > 0 ? `${leadingBids.length}` : '0'})`} className="activity-card">
                {leadingBids.length > 0 ? (
                    <ul className="activity-list">
                        {leadingBids.map(item => (
                            <li key={`leading-${item.auctionId}-${item.id}`} className="activity-item leading-bid-item">
                                <div className="item-info">
                                    <strong>Лот:</strong> <Link to={`/auctions/${item.auctionId}`}>{item.name}</Link>
                                    <br />
                                    <span className="auction-context">(Аукцион: {item.auctionName}, Статус аукциона: {item.auctionStatus})</span>
                                </div>
                                <div className="item-details">
                                    Ваша текущая ставка: <strong>{item.currentPrice} руб.</strong>
                                    <span className={`status-badge status-lot-${item.status?.toLowerCase().replace(/ /g, '-')}`}>{item.status}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    !loading && <p>Вы не лидируете ни на одном активном лоте на этой странице.</p>
                )}
            </Card>

            <Card title={`Выигранные лоты (${wonLots.length > 0 ? `${wonLots.length}` : '0'})`} className="activity-card">
                {wonLots.length > 0 ? (
                    <ul className="activity-list">
                        {wonLots.map(item => (
                            <li key={`won-${item.auctionId}-${item.id}`} className="activity-item won-lot-item">
                                <div className="item-info">
                                    <strong>Лот:</strong> <Link to={`/auctions/${item.auctionId}`}>{item.name}</Link>
                                    <br />
                                    <span className="auction-context">(Аукцион: {item.auctionName}, Статус аукциона: {item.auctionStatus})</span>
                                </div>
                                <div className="item-details">
                                    Финальная цена: <strong>{item.finalPrice} руб.</strong>
                                    <span className={`status-badge status-lot-${item.status?.toLowerCase().replace(/ /g, '-')}`}>{item.status}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    !loading && <p>У вас пока нет выигранных лотов на этой странице.</p>
                )}
            </Card>

            {pagination.totalPages > 1 && !loading && (
                <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                    totalItems={pagination.totalItems}
                    disabled={loading}
                />
            )}

            {activity.wonLots.length > 0 && (
                <Alert type="info" message="Напоминание: Согласно правилам, покупатель на одном аукционе может купить только один предмет. Если вы стали победителем в нескольких лотах одного аукциона, окончательное решение было принято при завершении аукциона в соответствии с этим правилом." />
            )}
        </div>
    );
};

export default MyActivityPage;