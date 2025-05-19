// src/components/LotCard.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './LotCard.css'; // Создадим этот файл для стилей

const LotCard = ({ auctionId, auctionStatus, lot, onBid }) => {
    const { isAuthenticated, user } = useAuth();
    const [bidAmount, setBidAmount] = useState('');
    const [bidError, setBidError] = useState('');

    const isSeller = isAuthenticated && user && user.id === lot.seller_id;

    // Лот доступен для ставок, если аукцион "Идет торг" И лот "Идет торг" или "Ожидает торгов"
    const canBidOnLot = auctionStatus === 'Идет торг' && (lot.status === 'Идет торг' || lot.status === 'Ожидает торгов');

    const handleBidSubmit = (e) => {
        e.preventDefault();
        setBidError('');
        const amount = parseFloat(bidAmount);
        if (isNaN(amount) || amount <= 0) {
            setBidError('Введите корректную сумму ставки.');
            return;
        }
        if (amount <= lot.current_price) {
            setBidError(`Ставка должна быть выше ${lot.current_price} руб.`);
            return;
        }
        onBid(lot.id, amount); // Вызываем onBid из AuctionDetailPage
        setBidAmount(''); // Очищаем поле после попытки ставки
    };

    // Определение имени продавца (заглушка, если у нас нет прямого доступа к списку пользователей)
    // В идеале, lot.seller_name должно приходить с бэкенда или lot.seller_id можно использовать для запроса данных продавца
    let sellerDisplayName = `Продавец ID: ${lot.seller_id}`;
    if (user && lot.seller_id === user.id) {
        sellerDisplayName = "Вы (продавец)";
    } else if (lot.seller_name) { // Если бы у нас было поле seller_name
        sellerDisplayName = lot.seller_name;
    }


    return (
        <div className={`lot-card status-${lot.status?.toLowerCase().replace(/ /g, '-')}`}>
            <h4>{lot.name}</h4>
            <p className="lot-number">Лот №: {lot.lot_number}</p>
            <p className="lot-description">{lot.description}</p>
            <p>Продавец: {sellerDisplayName}</p>
            <p>Начальная цена: {lot.start_price} руб.</p>
            <p className="lot-current-price">
                Текущая цена: <strong>{lot.current_price} руб.</strong>
            </p>
            {lot.highest_bidder_id && (
                <p className="lot-highest-bidder">
                    Лидирует: {lot.highest_bidder_id === user?.id ? "Вы" : `Участник ID ${lot.highest_bidder_id}`}
                </p>
            )}
            <p>Статус лота: <span className={`lot-status-badge status-${lot.status?.toLowerCase().replace(/ /g, '-')}`}>{lot.status}</span></p>

            {isAuthenticated && !isSeller && canBidOnLot && (
                <form onSubmit={handleBidSubmit} className="bid-form">
                    <div className="form-group">
                        <input
                            type="number"
                            value={bidAmount}
                            onChange={(e) => {
                                setBidAmount(e.target.value);
                                setBidError(''); // Сбрасываем ошибку при изменении
                            }}
                            placeholder={`Больше ${lot.current_price}`}
                            min={lot.current_price + 0.01} // Минимальная ставка
                            step="0.01" // Шаг ставки
                            required
                        />
                    </div>
                    {bidError && <p className="bid-error-message">{bidError}</p>}
                    <button type="submit" className="button button-bid">Сделать ставку</button>
                </form>
            )}
            {!isAuthenticated && canBidOnLot && (
                <p className="login-prompt">
                    <Link to={`/login?redirect=/auctions/${auctionId}`}>Войдите</Link>, чтобы сделать ставку.
                </p>
            )}
            {isSeller && (<p className="seller-note">Вы продавец этого лота.</p>)}
            {!canBidOnLot && lot.status !== 'Продан' && lot.status !== 'Не продан' && (<p className="bidding-closed-note">Торги по этому лоту сейчас неактивны.</p>)}

            {/* Ссылка на детали лота, если это карточка в общем списке, а не на странице самого лота */}
            {/* <Link to={`/auctions/${auctionId}/lots/${lot.id}`}>Детали лота</Link> */}
        </div>
    );
};

export default LotCard;