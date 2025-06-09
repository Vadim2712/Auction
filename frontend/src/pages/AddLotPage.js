// src/pages/AddLotPage.js
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { createLot, getAuctionById } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';

const AddLotPage = () => {
    const { auctionId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [lotData, setLotData] = useState({
        name: '',
        description: '',
        startPrice: '',
    });
    const [auctionName, setAuctionName] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loadingAuction, setLoadingAuction] = useState(true);

    useEffect(() => {
        const fetchAuctionDetails = async () => {
            try {
                setLoadingAuction(true);
                setError('');
                const response = await getAuctionById(auctionId);
                setAuctionName(response.data.nameSpecificity);
            } catch (err) {
                console.error("Ошибка загрузки данных аукциона:", err);
                setError('Не удалось загрузить информацию об аукционе. ' + (err.response?.data?.message || err.response?.data?.error || 'Проверьте ID аукциона.'));
            } finally {
                setLoadingAuction(false);
            }
        };
        if (auctionId) {
            fetchAuctionDetails();
        }
    }, [auctionId]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setLotData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMessage('');
        setSubmitting(true);

        if (!lotData.name || !lotData.startPrice) {
            setError('Пожалуйста, заполните обязательные поля: Название лота и Начальная цена.');
            setSubmitting(false);
            return;
        }
        const parsedStartPrice = parseFloat(lotData.startPrice);
        if (isNaN(parsedStartPrice) || parsedStartPrice <= 0) {
            setError('Начальная цена должна быть положительным числом.');
            setSubmitting(false);
            return;
        }

        try {
            const payload = {
                name: lotData.name,
                description: lotData.description,
                startPrice: parsedStartPrice,
            };
            await createLot(auctionId, payload);
            setSuccessMessage('Лот успешно добавлен! Вы будете перенаправлены на страницу аукциона.');
            setTimeout(() => {
                navigate(`/auctions/${auctionId}`);
            }, 2000);

        } catch (err) {
            console.error("Ошибка добавления лота:", err);
            setError(err.response?.data?.message || err.response?.data?.error || 'Не удалось добавить лот. Пожалуйста, попробуйте позже.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingAuction) {
        return <Loader text="Загрузка информации об аукционе..." />;
    }
    if (error && !auctionName) {
        return <div className="container"><Alert message={error} type="danger" /></div>;
    }


    return (
        <div className="add-lot-page container">
            <h1>Добавление нового лота</h1>
            <h2>для аукциона: "{auctionName || `ID: ${auctionId}`}"</h2>
            <form onSubmit={handleSubmit} className="form-container">
                {error && <Alert message={error} type="danger" onClose={() => setError('')} />}
                {successMessage && <Alert message={successMessage} type="success" />}

                <Input
                    label="Название предмета*"
                    id="name"
                    name="name"
                    value={lotData.name}
                    onChange={handleChange}
                    required
                    disabled={submitting}
                />
                <Input
                    label="Краткое описание (опционально)"
                    type="textarea"
                    id="description"
                    name="description"
                    value={lotData.description}
                    onChange={handleChange}
                    rows="3"
                    disabled={submitting}
                />
                <Input
                    label="Начальная цена (в рублях)*"
                    type="number"
                    id="startPrice"
                    name="startPrice"
                    value={lotData.startPrice}
                    onChange={handleChange}
                    min="0.01"
                    step="0.01"
                    required
                    disabled={submitting}
                />

                <p className="form-hint">Продавец: {user?.fullName || user?.email} (ID: {user?.id})</p>

                <Button type="submit" variant="primary" disabled={submitting || successMessage !== ''} fullWidth>
                    {submitting ? 'Добавление...' : 'Добавить лот'}
                </Button>
            </form>
        </div>
    );
};

export default AddLotPage;