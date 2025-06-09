// src/components/common/Alert.js
import React from 'react';
import './Alert.css';

const Alert = ({ message, type = 'info', onClose }) => {
    if (!message) {
        return null;
    }

    const alertClasses = `alert alert-${type}`;

    return (
        <div className={alertClasses} role="alert">
            {message}
            {onClose && (
                <button
                    type="button"
                    className="alert-close-btn"
                    aria-label="Close"
                    onClick={onClose}
                >
                    <span aria-hidden="true">&times;</span>
                </button>
            )}
        </div>
    );
};

export default Alert;