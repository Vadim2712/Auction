// src/pages/AuctionsListPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import AuctionCard from '../components/auctions/AuctionCard';
import { getAllAuctions } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import Alert from '../components/common/Alert';
import Button from '../components/common/Button';
import Pagination from '../components/common/Pagination';
import './AuctionsListPage.css';

const AuctionsListPage = () => {
    const [auctions, setAuctions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { isAuthenticated, user, loading: authLoading } = useAuth();
    const [pagination, setPagination] = useState({
        currentPage: 1,
        totalPages: 1,
        pageSize: 10,
        totalItems: 0
    });

    const fetchAuctions = useCallback(async (page = 1) => {
        setLoading(true);
        setError('');
        try {
            const response = await getAllAuctions({ page, pageSize: pagination.pageSize });
            if (response.data && response.data.data) {
                setAuctions(response.data.data);
                setPagination(response.data.pagination);
            } else {
                setAuctions([]);
                setPagination({ currentPage: 1, totalPages: 1, pageSize: pagination.pageSize, totalItems: 0 });
                console.warn("Ответ API getAllAuctions не содержит ожидаемой структуры data/pagination.");
            }
        } catch (err) {
            console.error("Ошибка загрузки аукционов:", err);
            const errMsg = err.response?.data?.message || err.response?.data?.error || 'Не удалось загрузить список аукционов.';
            setError(errMsg);
        } finally {
            setLoading(false);
        }
    }, [pagination.pageSize]);

    useEffect(() => {
        if (!authLoading) {
            fetchAuctions(pagination.currentPage);
        }
    }, [authLoading, fetchAuctions, pagination.currentPage]);

    const handlePageChange = (newPage) => {
        if (newPage >= 1 && newPage <= pagination.totalPages && newPage !== pagination.currentPage) {
            setPagination(prev => ({ ...prev, currentPage: newPage }));
        }
    };

    if (authLoading || (loading && auctions.length === 0 && pagination.currentPage === 1)) {
        return <Loader text="Загрузка аукционов..." />;
    }

    return (
        <div className="auctions-list-page container">
            <div className="page-header">
                <h1>Текущие и предстоящие аукционы</h1>
                {isAuthenticated && (user?.role === 'SYSTEM_ADMIN' || user?.role === 'seller' || user?.role === 'admin') && (
                    <Link to="/create-auction">
                        <Button variant="primary">
                            Создать новый аукцион
                        </Button>
                    </Link>
                )}
            </div>

            {error && <Alert message={error} type="danger" onClose={() => setError('')} />}

            {auctions.length === 0 && !loading && !error && (
                <p>В данный момент нет доступных аукционов.</p>
            )}

            {auctions.length > 0 && (
                <div className="auctions-grid">
                    {auctions.map((auction) => (
                        <AuctionCard key={auction.id} auction={auction} />
                    ))}
                </div>
            )}

            {pagination.totalPages > 1 && !loading && (
                <Pagination
                    currentPage={pagination.currentPage}
                    totalPages={pagination.totalPages}
                    onPageChange={handlePageChange}
                />
            )}
        </div>
    );
};

export default AuctionsListPage;