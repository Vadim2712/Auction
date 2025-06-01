// src/components/common/Loader.js
import React from 'react';
import './Loader.css';

const Loader = ({ text = "Загрузка..." }) => {
    return (
        <div className="loader-container">
            <div className="loader-spinner"></div>
            {text && <p className="loader-text">{text}</p>}
        </div>
    );
};

export default Loader;