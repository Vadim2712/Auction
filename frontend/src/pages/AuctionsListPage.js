// src/pages/AuctionsListPage.js
import React, { useState, useEffect } from 'react';
import AuctionCard from '../components/auctions/AuctionCard';
import { getAllAuctions } from '../services/apiClient'; // <--- Импортируем функцию
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import './AuctionsListPage.css';

const AuctionsListPage = () => {
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { isAuthenticated, user } = useAuth();

    useEffect(() => {
        const fetchAuctions = async () => {
            setLoading(true);
            setError('');
            try {
                const response = await getAllAuctions(); // <--- Используем apiClient
                setAuctions(response.data);
            } catch (err) {
                console.error("Ошибка загрузки аукционов:", err.response?.data?.message || err.message);
                setError(err.response?.data?.message || 'Не удалось загрузить список аукционов.');
            } finally {
                setLoading(false);
            }
        };

        fetchAuctions();
    }, []);

    // ... (остальной JSX без изменений)
    if (loading) {
        return <div className="auctions-list-page-loading">Загрузка аукционов...</div>;
    }

    if (error) {
        return <div className="auctions-list-page-error text-danger">{error}</div>;
    }

    return (
        <div className="auctions-list-page">
            <div className="page-header">
                <h1>Текущие и предстоящие аукционы</h1>
                {isAuthenticated && user?.role === 'admin' && (
                    <Link to="/auctions/create" className="button button-primary">
                        Создать новый аукцион
                    </Link>
                )}
            </div>
            {auctions.length === 0 ? (
                <p>В данный момент нет доступных аукционов.</p>
            ) : (
                <div className="auctions-grid">
                    {auctions.map((auction) => (
                        <AuctionCard key={auction.id} auction={auction} />
                    ))}
                </div>
            )}
        </div>
    );
};

export default AuctionsListPage;