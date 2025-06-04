// src/pages/EditLotPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getLotByID, updateLotDetails, getAuctionById } from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
// import './EditLotPage.css'; // Если нужны специфичные стили

const EditLotPage = () => {
    const { auctionId, lotId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [lotData, setLotData] = useState({
        name: '',
        description: '',
        startPrice: '',
    });
    const [originalLotData, setOriginalLotData] = useState(null); // Для отслеживания изменений
    const [auctionName, setAuctionName] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [loadingPage, setLoadingPage] = useState(true);

    const fetchLotAndAuctionDetails = useCallback(async () => {
        setLoadingPage(true);
        setError('');
        try {
            const [lotResponse, auctionResponse] = await Promise.all([
                getLotByID(lotId),
                getAuctionById(auctionId)
            ]);

            const currentLot = lotResponse.data;
            setOriginalLotData(currentLot);
            setLotData({
                name: currentLot.name || '',
                description: currentLot.description || '',
                startPrice: currentLot.startPrice !== undefined ? String(currentLot.startPrice) : '',
            });
            setAuctionName(auctionResponse.data.nameSpecificity);

        } catch (err) {
            console.error("Ошибка загрузки данных лота или аукциона:", err);
            setError('Не удалось загрузить данные для редактирования. ' + (err.response?.data?.message || err.response?.data?.error || 'Проверьте ID лота и аукциона.'));
        } finally {
            setLoadingPage(false);
        }
    }, [auctionId, lotId]);

    useEffect(() => {
        fetchLotAndAuctionDetails();
    }, [fetchLotAndAuctionDetails]);

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

        // Собираем только измененные поля для DTO (UpdateLotInput ожидает указатели)
        const payload = {};
        if (lotData.name !== originalLotData.name) {
            payload.name = lotData.name;
        }
        if (lotData.description !== originalLotData.description) {
            payload.description = lotData.description;
        }
        if (parsedStartPrice !== originalLotData.startPrice) {
            payload.startPrice = parsedStartPrice;
        }

        if (Object.keys(payload).length === 0) {
            setSuccessMessage("Нет изменений для сохранения.");
            setSubmitting(false);
            setTimeout(() => navigate(`/auctions/${auctionId}`), 1500);
            return;
        }

        try {
            await updateLotDetails(auctionId, lotId, payload);
            setSuccessMessage('Лот успешно обновлен! Вы будете перенаправлены на страницу аукциона.');
            setTimeout(() => {
                navigate(`/auctions/${auctionId}`);
            }, 2000);
        } catch (err) {
            console.error("Ошибка обновления лота:", err);
            setError(err.response?.data?.message || err.response?.data?.error || 'Не удалось обновить лот.');
        } finally {
            setSubmitting(false);
        }
    };

    if (loadingPage) {
        return <Loader text="Загрузка данных лота для редактирования..." />;
    }
    if (error && !originalLotData) { // Если ошибка загрузки и данных нет
        return <div className="container"><Alert message={error} type="danger" onClose={() => navigate(`/auctions/${auctionId}`)} /></div>;
    }
    if (!originalLotData) { // Если нет данных после загрузки (маловероятно, если нет ошибки)
        return <div className="container"><Alert message="Не удалось загрузить данные лота." type="warning" /></div>;
    }


    return (
        <div className="edit-lot-page container">
            <h1>Редактирование лота</h1>
            <h2>Аукцион: "{auctionName || `ID: ${auctionId}`}"</h2>
            <h3>Лот: "{originalLotData?.name}" (ID: {lotId})</h3>

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

                <p className="form-hint">Продавец: {originalLotData?.User?.fullName || `ID ${originalLotData?.sellerId}`} (ID: {originalLotData?.sellerId})</p>

                <div className="form-actions">
                    <Button type="submit" variant="primary" disabled={submitting || successMessage !== ''}>
                        {submitting ? 'Сохранение...' : 'Сохранить изменения'}
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => navigate(`/auctions/${auctionId}`)} disabled={submitting}>
                        Отмена
                    </Button>
                </div>
            </form>
        </div>
    );
};

export default EditLotPage;