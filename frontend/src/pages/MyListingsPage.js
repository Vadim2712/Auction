// src/pages/MyListingsPage.js
import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getMyListings } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import './MyListingsPage.css'; // Создадим этот файл для стилей

const MyListingsPage = () => {
    const { user, loading: authLoading } = useAuth();
    const [listings, setListings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchListings = useCallback(async () => {
        if (!user) return;
        try {
            setLoading(true);
            setError('');
            const response = await getMyListings(user.id);
            setListings(response.data);
        } catch (err) {
            console.error("Ошибка загрузки списка лотов продавца:", err);
            setError('Не удалось загрузить ваши лоты. ' + (err.response?.data?.message || err.message));
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (!authLoading && user) {
            fetchListings();
        } else if (!authLoading && !user) {
            setLoading(false);
            setError("Пожалуйста, войдите, чтобы просмотреть эту страницу.");
        }
    }, [user, authLoading, fetchListings]);

    if (authLoading || loading) {
        return <div className="container"><p>Загрузка ваших лотов...</p></div>;
    }

    if (error) {
        return <div className="container error-message"><p>{error}</p></div>;
    }

    if (!user) {
        return <div className="container"><p>Для доступа к этой странице необходимо войти в систему.</p></div>;
    }

    return (
        <div className="my-listings-page container">
            <h1>Мои выставленные лоты</h1>

            {listings.length > 0 ? (
                <div className="listings-grid">
                    {listings.map(lot => (
                        <div key={`${lot.auctionId}-${lot.id}`} className={`listing-item card status-lot-${lot.status?.toLowerCase().replace(/ /g, '-')}`}>
                            <div className="card-header">
                                <h3><Link to={`/auctions/${lot.auctionId}`}>{lot.name}</Link></h3>
                                <span className={`status-badge status-lot-${lot.status?.toLowerCase().replace(/ /g, '-')}`}>{lot.status}</span>
                            </div>
                            <div className="card-body">
                                <p><strong>Аукцион:</strong> {lot.auctionName} (ID: {lot.auctionId})</p>
                                <p><strong>Стартовая цена:</strong> {lot.start_price} руб.</p>
                                <p><strong>Текущая цена:</strong> {lot.current_price} руб.</p>
                                {lot.status === 'Продан' && lot.final_price && (
                                    <p><strong>Продано за:</strong> {lot.final_price} руб. (Покупатель ID: {lot.final_buyer_id})</p>
                                )}
                                {lot.highest_bidder_id && lot.status !== 'Продан' && (
                                    <p><strong>Лидирующая ставка от:</strong> Участник ID {lot.highest_bidder_id}</p>
                                )}
                                <p><strong>Статус аукциона:</strong> {lot.auctionStatus}</p>
                            </div>
                            <div className="card-footer">
                                <Link to={`/auctions/${lot.auctionId}`} className="button button-secondary">
                                    Перейти к аукциону
                                </Link>
                                {/* В будущем здесь можно добавить кнопки "Редактировать" / "Удалить" для лотов со статусом "Ожидает торгов" */}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p>Вы еще не выставили ни одного лота.</p>
            )}
        </div>
    );
};

export default MyListingsPage;