// src/components/auctions/AuctionCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import './AuctionCard.css'; // Создадим этот файл для стилей карточки

const AuctionCard = ({ auction }) => {
    if (!auction) {
        return null;
    }

    // Форматирование даты для отображения (можно улучшить с помощью библиотек типа date-fns)
    const formatDate = (dateString) => {
        if (!dateString) return 'Дата не указана';
        try {
            const date = new Date(dateString);
            return date.toLocaleDateString('ru-RU', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
            });
        } catch (e) {
            console.error("Invalid date string:", dateString, e);
            return 'Неверная дата';
        }
    };

    return (
        <div className="auction-card card">
            <h3 className="card-title">{auction.name_specificity || 'Название аукциона отсутствует'}</h3>
            <p className="card-text"><strong>Дата проведения:</strong> {formatDate(auction.auction_date)}</p>
            <p className="card-text"><strong>Время:</strong> {auction.auction_time || 'Время не указано'}</p>
            <p className="card-text"><strong>Место:</strong> {auction.location || 'Место не указано'}</p>
            <p className="card-text"><strong>Статус:</strong> {auction.status || 'Статус не известен'}</p>
            {/* Дополнительную информацию можно добавить здесь, например, количество лотов */}
            <Link to={`/auctions/${auction.id}`} className="button">
                Подробнее
            </Link>
        </div>
    );
};

export default AuctionCard;