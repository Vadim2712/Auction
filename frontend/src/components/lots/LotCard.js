// src/components/lots/LotCard.js
import React from 'react';
import { useAuth } from '../../context/AuthContext'; // Для отображения кнопки "Сделать ставку"
import './LotCard.css';

const LotCard = ({ lot, onBid }) => {
    const { isAuthenticated, user } = useAuth();

    if (!lot) {
        return null;
    }

    // Предполагаем, что onBid - это функция, которая будет вызываться при нажатии на кнопку ставки
    // и будет передавать ID лота. Реализуем ее позже на странице деталей аукциона.

    return (
        <div className="lot-card card">
            <h4 className="card-title lot-title">{lot.name_description || 'Описание лота отсутствует'}</h4>
            <p className="card-text"><strong>Номер лота:</strong> {lot.lot_number}</p>
            <p className="card-text"><strong>Начальная цена:</strong> ${lot.start_price?.toFixed(2) || '0.00'}</p>
            {lot.final_price && (
                <p className="card-text"><strong>Конечная цена:</strong> ${lot.final_price.toFixed(2)}</p>
            )}
            <p className="card-text"><strong>Статус:</strong> {lot.status || 'Неизвестен'}</p>
            {/* Можно добавить имя продавца, если эта информация доступна */}
            {/* <p className="card-text"><strong>Продавец:</strong> {lot.seller_full_name || 'Не указан'}</p> */}

            {isAuthenticated && lot.status === 'На аукционе' && user?.role === 'buyer' && (
                <button onClick={() => onBid(lot.id)} className="button button-primary bid-button">
                    Сделать ставку
                </button>
            )}
            {lot.status === 'Продан' && lot.buyer_user_id === user?.id && (
                <p className="card-text purchased-notice"><strong>Вы приобрели этот лот!</strong></p>
            )}
        </div>
    );
};

export default LotCard;