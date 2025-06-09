// src/components/LotCard.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from './common/Button';
import Input from './common/Input';
import './LotCard.css';

const LotCard = ({ auctionId, auctionStatus, lot, onBid }) => {
    const { isAuthenticated, user } = useAuth();
    const [bidAmount, setBidAmount] = useState('');
    const [bidError, setBidError] = useState('');

    const isSeller = isAuthenticated && user && user.id === lot.sellerId;

    const canBidOnLot = auctionStatus === 'Идет торг' && (lot.status === 'Идет торг' || lot.status === 'Ожидает торгов');

    const handleBidSubmit = (e) => {
        e.preventDefault();
        setBidError('');
        const amount = parseFloat(bidAmount);
        if (isNaN(amount) || amount <= 0) {
            setBidError('Введите корректную сумму ставки.');
            return;
        }
        if (amount <= lot.currentPrice) {
            setBidError(`Ставка должна быть выше ${lot.currentPrice} руб.`);
            return;
        }
        onBid(lot.id, amount);
        setBidAmount('');
    };

    let sellerDisplayName = `Продавец ID: ${lot.sellerId}`;
    if (lot.User && lot.User.fullName) {
        sellerDisplayName = lot.User.fullName;
    }
    if (isSeller) {
        sellerDisplayName = "Вы (продавец)";
    }


    return (
        <div className={`lot-card status-lot-${lot.status?.toLowerCase().replace(/ /g, '-')}`}>
            <h4>{lot.name}</h4>
            <p className="lot-number">Лот №: {lot.lotNumber}</p>
            <p className="lot-description">{lot.description}</p>
            <p>Продавец: {sellerDisplayName}</p>
            <p>Начальная цена: {lot.startPrice} руб.</p>
            <p className="lot-current-price">
                Текущая цена: <strong>{lot.currentPrice} руб.</strong>
            </p>
            {lot.highestBidderId && (
                <p className="lot-highest-bidder">
                    Лидирует: {lot.highestBidderId === user?.id ? "Вы" : (lot.HighestBidder?.fullName || `Участник ID ${lot.highestBidderId}`)}
                </p>
            )}
            <p>Статус лота: <span className={`status-badge status-lot-${lot.status?.toLowerCase().replace(/ /g, '-')}`}>{lot.status}</span></p>

            {isAuthenticated && !isSeller && canBidOnLot && (
                <form onSubmit={handleBidSubmit} className="bid-form">
                    <Input
                        label="Ваша ставка (руб.):"
                        type="number"
                        value={bidAmount}
                        onChange={(e) => {
                            setBidAmount(e.target.value);
                            setBidError('');
                        }}
                        placeholder={`Больше ${lot.currentPrice}`}
                        min={(lot.currentPrice + 0.01).toFixed(2)}
                        step="0.01"
                        required
                        error={bidError}
                        name={`bidAmount-${lot.id}`}
                        id={`bidAmountInput-${lot.id}`}
                    />
                    <Button type="submit" variant="success" className="button-bid" fullWidth>Сделать ставку</Button>
                </form>
            )}
            {!isAuthenticated && canBidOnLot && (
                <p className="login-prompt">
                    <Link to={`/login?redirect=/auctions/${auctionId}`}>Войдите</Link>, чтобы сделать ставку.
                </p>
            )}
            {isSeller && (<p className="seller-note">Вы продавец этого лота.</p>)}
            {!canBidOnLot && lot.status !== 'Продан' && lot.status !== 'Не продан' && (<p className="bidding-closed-note">Торги по этому лоту сейчас неактивны.</p>)}
        </div>
    );
};

export default LotCard;