// src/pages/CreateAuctionPage.js
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createAuction } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Alert from '../components/common/Alert';
// import './CreateAuctionPage.css'; // Если есть специфичные стили

const CreateAuctionPage = () => {
    const navigate = useNavigate();
    const { user } = useAuth();

    const [auctionData, setAuctionData] = useState({
        nameSpecificity: '',
        auctionDate: '',
        auctionTime: '',
        location: '',
        descriptionFull: '',
    });
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setAuctionData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setSubmitting(true);

        if (!auctionData.nameSpecificity || !auctionData.auctionDate || !auctionData.auctionTime || !auctionData.location) {
            setError('Пожалуйста, заполните все обязательные поля: Название, Дата, Время, Место.');
            setSubmitting(false);
            return;
        }
        if (!/^\d{2}:\d{2}$/.test(auctionData.auctionTime)) {
            setError('Время должно быть в формате ЧЧ:ММ.');
            setSubmitting(false);
            return;
        }
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const inputDate = new Date(auctionData.auctionDate);
        if (inputDate < today) {
            setError('Дата аукциона не может быть в прошлом.');
            setSubmitting(false);
            return;
        }

        try {
            const payload = {
                nameSpecificity: auctionData.nameSpecificity,
                descriptionFull: auctionData.descriptionFull,
                auctionDate: auctionData.auctionDate,
                auctionTime: auctionData.auctionTime,
                location: auctionData.location,
            };
            const response = await createAuction(payload);
            setSuccessMessage('Аукцион успешно создан! Вы будете перенаправлены на его страницу.');
            setTimeout(() => {
                navigate(`/auctions/${response.data.id}`);
            }, 2000);
        } catch (err) {
            console.error("Ошибка создания аукциона:", err);
            setError(err.response?.data?.message || err.response?.data?.error || 'Не удалось создать аукцион.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="create-auction-page container">
            <h1>Создание нового аукциона</h1>
            <form onSubmit={handleSubmit} className="form-container">
                {error && <Alert message={error} type="danger" onClose={() => setError('')} />}
                {successMessage && <Alert message={successMessage} type="success" />}

                <Input
                    label="Название и специфика аукциона*"
                    id="nameSpecificity"
                    name="nameSpecificity"
                    value={auctionData.nameSpecificity}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                />
                <Input
                    label="Дата проведения*"
                    type="date"
                    id="auctionDate"
                    name="auctionDate"
                    value={auctionData.auctionDate}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                />
                <Input
                    label="Время проведения (ЧЧ:ММ)*"
                    type="time"
                    id="auctionTime"
                    name="auctionTime"
                    value={auctionData.auctionTime}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                />
                <Input
                    label="Место проведения*"
                    id="location"
                    name="location"
                    value={auctionData.location}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                />
                <Input
                    label="Полное описание аукциона (опционально)"
                    type="textarea"
                    id="descriptionFull"
                    name="descriptionFull"
                    value={auctionData.descriptionFull}
                    onChange={handleChange}
                    rows="4"
                    disabled={submitting}
                />
                <p className="form-hint">Создатель: {user?.fullName || user?.email} (ID: {user?.id})</p>
                <Button type="submit" variant="primary" disabled={submitting || successMessage !== ''} fullWidth>
                    {submitting ? 'Создание...' : 'Создать аукцион'}
                </Button>
            </form>
        </div>
    );
};

export default CreateAuctionPage;