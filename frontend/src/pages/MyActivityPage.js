// src/pages/MyActivityPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyActivity } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import './MyActivityPage.css'; // Создадим этот файл для стилей

const MyActivityPage = () => {
    const { user, loading: authLoading } = useAuth();
    const [activity, setActivity] = useState({ leadingBids: [], wonLots: [] });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchActivity = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            setError('');
            const response = await getMyActivity(user.id);
            setActivity(response.data);
        } catch (err) {
            console.error("Ошибка загрузки активности пользователя:", err);
            setError('Не удалось загрузить данные об активности. ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchActivity();
        } else if (!authLoading && !user) {
            // Пользователь не аутентифицирован, но это должно быть обработано ProtectedRoute
            setLoading(false);
            setError("Пожалуйста, войдите, чтобы просмотреть эту страницу.");
        }
    }, [user, authLoading, fetchActivity]);

    if (authLoading || loading) {
        return <div className="container"><p>Загрузка вашей активности...</p></div>;
    }

    if (error) {
        return <div className="container error-message"><p>{error}</p></div>;
    }

    if (!user) {
        // Это состояние не должно достигаться при использовании ProtectedRoute
        return <div className="container"><p>Для доступа к этой странице необходимо войти в систему.</p></div>;
    }

    const { leadingBids, wonLots } = activity;

    return (
        <div className="my-activity-page container">
            <h1>Моя активность на аукционах</h1>

            <section className="activity-section">
                <h2>Лоты, где вы лидируете</h2>
                {leadingBids.length > 0 ? (
                    <ul className="activity-list">
                        {leadingBids.map(lot => (
                            <li key={`${lot.auctionId}-${lot.id}`} className="activity-item leading-bid-item">
                                <div className="item-info">
                                    <strong>Лот:</strong> <Link to={`/auctions/${lot.auctionId}`}>{lot.name}</Link> (Аукцион: {lot.auctionName})
                                </div>
                                <div className="item-details">
                                    Ваша текущая ставка: {lot.current_price} руб.
                                    <span className={`status status-lot-${lot.status?.toLowerCase().replace(/ /g, '-')}`}>{lot.status}</span>
                                </div>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>Вы не лидируете ни на одном активном лоте.</p>
                )}
            </section>

            <section className="activity-section">
                <h2>Выигранные лоты</h2>
                {wonLots.length > 0 ? (
                    <ul className="activity-list">
                        {wonLots.map(lot => (
                            <li key={`${lot.auctionId}-${lot.id}`} className="activity-item won-lot-item">
                                <div className="item-info">
                                    <strong>Лот:</strong> <Link to={`/auctions/${lot.auctionId}`}>{lot.name}</Link> (Аукцион: {lot.auctionName})
                                </div>
                                <div className="item-details">
                                    Финальная цена: {lot.final_price} руб.
                                    <span className={`status status-lot-${lot.status?.toLowerCase().replace(/ /g, '-')}`}>{lot.status}</span>
                                </div>
                                {/* Здесь можно будет добавить кнопку "Оплатить", если такая логика планируется */}
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p>У вас пока нет выигранных лотов.</p>
                )}
            </section>
            {/* Напоминание о правиле одного предмета */}
            {wonLots.length > 0 && (
                <div className="auction-rule-reminder">
                    <p><strong>Напоминание:</strong> Согласно правилам, покупатель на одном аукционе может купить только один предмет. Если вы выиграли несколько лотов на одном аукционе, свяжитесь с администрацией для уточнения деталей.</p>
                </div>
            )}
        </div>
    );
};

export default MyActivityPage;