// src/pages/CreateAuctionPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAuction } from '../services/apiClient'; // Убедитесь, что функция импортирована
import { useAuth } from '../context/AuthContext';
import './CreateAuctionPage.css'; // Создадим этот файл для стилей

const CreateAuctionPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth(); // Для возможного использования user.id при создании

    const [auctionData, setAuctionData] = useState({
        name_specificity: '',
        auction_date: '',
        auction_time: '',
        location: '',
        description_full: '',
    });
    const [error, setError] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAuctionData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSubmitting(true);

        // Простая валидация
        if (!auctionData.name_specificity || !auctionData.auction_date || !auctionData.auction_time || !auctionData.location) {
            setError('Пожалуйста, заполните все обязательные поля: Название, Дата, Время, Место.');
            setSubmitting(false);
            return;
        }

        try {
            // Добавляем ID пользователя, создавшего аукцион (если это требуется по API бэкенда)
            // В нашей заглушке createAuction это не обрабатывается, но для реального API это может быть нужно
            const payload = { ...auctionData, created_by_user_id: user?.id };
            const response = await createAuction(payload);
            alert('Аукцион успешно создан!');
            // Перенаправляем на страницу нового аукциона или на список аукционов
            navigate(`/auctions/${response.data.id}`); // Предполагаем, что API возвращает созданный аукцион с ID
        } catch (err) {
            console.error("Ошибка создания аукциона:", err);
            setError(err.response?.data?.message || 'Не удалось создать аукцион. Пожалуйста, попробуйте позже.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="create-auction-page container">
            <h1>Создание нового аукциона</h1>
            <form onSubmit={handleSubmit} className="form-container">
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="form-group">
                    <label htmlFor="name_specificity">Название и специфика аукциона*</label>
                    <input
                        type="text"
                        id="name_specificity"
                        name="name_specificity"
                        value={auctionData.name_specificity}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="auction_date">Дата проведения*</label>
                    <input
                        type="date"
                        id="auction_date"
                        name="auction_date"
                        value={auctionData.auction_date}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="auction_time">Время проведения*</label>
                    <input
                        type="time"
                        id="auction_time"
                        name="auction_time"
                        value={auctionData.auction_time}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="location">Место проведения*</label>
                    <input
                        type="text"
                        id="location"
                        name="location"
                        value={auctionData.location}
                        onChange={handleChange}
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="description_full">Полное описание аукциона (опционально)</label>
                    <textarea
                        id="description_full"
                        name="description_full"
                        value={auctionData.description_full}
                        onChange={handleChange}
                        rows="4"
                    ></textarea>
                </div>

                <button type="submit" className="button button-primary" disabled={submitting}>
                    {submitting ? 'Создание...' : 'Создать аукцион'}
                </button>
            </form>
        </div>
    );
};

export default CreateAuctionPage;