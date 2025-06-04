// src/components/auctions/AuctionCard.js
import React from 'react';
import { Link } from 'react-router-dom';
import './AuctionCard.css';

const AuctionCard = ({ auction }) => {
    if (!auction) {
        return null;
    }

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
            console.error("Invalid date string for AuctionCard:", dateString, e);
            return 'Неверная дата';
        }
    };

    return (
        <div className="auction-card card">
            {/* Используем auction.nameSpecificity вместо auction.name_specificity */}
            <h3 className="card-title">{auction.nameSpecificity || 'Название аукциона отсутствует'}</h3>
            {/* Используем auction.auctionDate вместо auction.auction_date */}
            <p className="card-text"><strong>Дата проведения:</strong> {formatDate(auction.auctionDate)}</p>
            <p className="card-text"><strong>Время:</strong> {auction.auctionTime || 'Время не указано'}</p>
            <p className="card-text"><strong>Место:</strong> {auction.location || 'Место не указано'}</p>
            <p className="card-text"><strong>Статус:</strong> {auction.status || 'Статус не известен'}</p>
            <Link to={`/auctions/${auction.id}`} className="button">
                Подробнее
            </Link>
        </div>
    );
};

export default AuctionCard;