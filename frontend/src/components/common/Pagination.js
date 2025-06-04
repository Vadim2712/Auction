// src/components/common/Pagination.js
import React from 'react';
import Button from './Button';
import './Pagination.css';

const Pagination = ({ currentPage, totalPages, onPageChange, totalItems }) => {
    if (totalPages <= 1) {
        return null;
    }

    const handlePrevious = () => {
        if (currentPage > 1) {
            onPageChange(currentPage - 1);
        }
    };

    const handleNext = () => {
        if (currentPage < totalPages) {
            onPageChange(currentPage + 1);
        }
    };

    // Логика для отображения ограниченного количества номеров страниц (опционально)
    // Здесь для простоты только кнопки "Назад" и "Вперед" и информация

    return (
        <div className="pagination-controls">
            <Button onClick={handlePrevious} disabled={currentPage === 1} variant="secondary">
                Назад
            </Button>
            <span className="pagination-info">
                Страница {currentPage} из {totalPages}
                {totalItems !== undefined && ` (Всего: ${totalItems})`}
            </span>
            <Button onClick={handleNext} disabled={currentPage === totalPages} variant="secondary">
                Вперед
            </Button>
        </div>
    );
};

export default Pagination;