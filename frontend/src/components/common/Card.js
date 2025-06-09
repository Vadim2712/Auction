// src/components/common/Card.js
import React from 'react';
import './Card.css';

const Card = ({ children, className = '', title, footer }) => {
    const cardClasses = `custom-card ${className}`;

    return (
        <div className={cardClasses.trim()}>
            {title && (
                <div className="custom-card-header">
                    <h5 className="custom-card-title">{title}</h5>
                </div>
            )}
            <div className="custom-card-body">
                {children}
            </div>
            {footer && (
                <div className="custom-card-footer">
                    {footer}
                </div>
            )}
        </div>
    );
};

export default Card;