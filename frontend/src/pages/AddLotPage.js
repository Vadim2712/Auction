// src/pages/AddLotPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createLot, getAuctionById } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import './AddLotPage.css'; // Создадим этот файл для стилей

const AddLotPage = () => {
    const { auctionId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [lotData, setLotData] = useState({
        name: '',
        description: '',
        start_price: '',
    });
    const [auctionName, setAuctionName] = useState('');
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loadingAuction, setLoadingAuction] = useState(true);

    useEffect(() => {
        const fetchAuctionDetails = async () => {
            try {
                setLoadingAuction(true);
                const response = await getAuctionById(auctionId);
                setAuctionName(response.data.name_specificity);
            } catch (err) {
                console.error("Ошибка загрузки данных аукциона:", err);
                setError('Не удалось загрузить информацию об аукционе.');
                // Можно перенаправить, если аукцион не найден
            } finally {
                setLoadingAuction(false);
            }
        };
        fetchAuctionDetails();
    }, [auctionId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLotData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        if (!lotData.name || !lotData.start_price) {
            setError('Пожалуйста, заполните обязательные поля: Название лота и Начальная цена.');
            setSubmitting(false);
            return;
        }
        if (isNaN(parseFloat(lotData.start_price)) || parseFloat(lotData.start_price) <= 0) {
            setError('Начальная цена должна быть положительным числом.');
            setSubmitting(false);
            return;
        }

        try {
            const payload = {
                ...lotData,
                start_price: parseFloat(lotData.start_price),
                seller_id: user?.id, // Добавляем ID текущего пользователя как продавца
            };
            await createLot(auctionId, payload);
            alert('Лот успешно добавлен!');
            navigate(`/auctions/${auctionId}`); // Возвращаемся на страницу аукциона
        } catch (err) {
            console.error("Ошибка добавления лота:", err);
            setError(err.response?.data?.message || 'Не удалось добавить лот. Пожалуйста, попробуйте позже.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingAuction) {
        return <div className="container"><p>Загрузка информации об аукционе...</p></div>;
    }

    return (
        <div className="add-lot-page container">
            <h1>Добавление нового лота</h1>
            <h2>для аукциона: "{auctionName || `ID: ${auctionId}`}"</h2>
            <form onSubmit={handleSubmit} className="form-container">
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="form-group">
                    <label htmlFor="name">Название предмета*</label>
                    <input
                        type="text"
                        id="name"
                        name="name"
                        value={lotData.name}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description">Краткое описание (опционально)</label>
                    <textarea
                        id="description"
                        name="description"
                        value={lotData.description}
                        onChange={handleChange}
                        rows="3"
                    ></textarea>
                </div>

                <div className="form-group">
                    <label htmlFor="start_price">Начальная цена (в рублях)*</label>
                    <input
                        type="number"
                        id="start_price"
                        name="start_price"
                        value={lotData.start_price}
                        onChange={handleChange}
                        min="0.01"
                        step="0.01"
                        required
                    />
                </div>

                <p className="form-hint">Продавец: {user?.fullName || user?.email} (ID: {user?.id})</p>

                <button type="submit" className="button button-primary" disabled={submitting}>
                    {submitting ? 'Добавление...' : 'Добавить лот'}
                </button>
            </form>
        </div>
    );
};

export default AddLotPage;