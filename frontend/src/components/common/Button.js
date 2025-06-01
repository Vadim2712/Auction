// src/components/common/Button.js
import React from 'react';
import './Button.css'; // Создадим стили для кнопки

const Button = ({ children, onClick, type = 'button', variant = 'primary', disabled = false, fullWidth = false, className = '' }) => {
    const buttonClasses = `
        btn
        btn-${variant}
        ${fullWidth ? 'btn-fullwidth' : ''}
        ${className}
    `;

    return (
        <button
            type={type}
            className={buttonClasses.trim()}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

export default Button;