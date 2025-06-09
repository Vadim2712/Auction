// src/pages/HomePage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { getAllAuctions } from '../services/apiClient';
import AuctionCard from '../components/auctions/AuctionCard';
import Loader from '../components/common/Loader';
import Alert from '../components/common/Alert';
import Button from '../components/common/Button';
import './HomePage.css';

const HomePage = () => {
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const fetchRecentAuctions = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const response = await getAllAuctions({ page: 1, pageSize: 3 });
            if (response.data && response.data.data) {
                setAuctions(response.data.data);
            }
        } catch (err) {
            console.error("Ошибка загрузки аукционов для главной страницы:", err);
            setError("Не удалось загрузить аукционы. Пожалуйста, попробуйте обновить страницу.");
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchRecentAuctions();
    }, [fetchRecentAuctions]);

    return (
        <div className="homepage">
            <header className="hero-section">
                <div className="container">
                    <h1 className="hero-title">Добро пожаловать на "Аукцион Онлайн"!</h1>
                    <p className="hero-subtitle">Место, где встречаются история и ценители искусства. Примите участие в торгах за уникальные антикварные предметы и произведения искусства.</p>
                    <Link to="/auctions">
                        <Button variant="primary" className="hero-button">Смотреть все аукционы</Button>
                    </Link>
                </div>
            </header>

            <main className="container">
                <section className="featured-auctions">
                    <h2>Последние и предстоящие аукционы</h2>
                    {loading && <Loader text="Загрузка аукционов..." />}
                    {error && <Alert message={error} type="danger" />}

                    {!loading && !error && (
                        auctions.length > 0 ? (
                            <div className="auctions-grid">
                                {auctions.map(auction => (
                                    <AuctionCard key={auction.id} auction={auction} />
                                ))}
                            </div>
                        ) : (
                            <p>В данный момент нет запланированных аукционов. Загляните позже!</p>
                        )
                    )}
                </section>
            </main>
        </div>
    );
};

export default HomePage;