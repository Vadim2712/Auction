// src/pages/NotFoundPage.js
import React from 'react';
import { Link } from 'react-router-dom';
// import './NotFoundPage.css'; // Если нужны специфичные стили

const NotFoundPage = () => {
    return (
        <div className="container text-center" style={{ marginTop: '50px' }}>
            <h1>404 - Страница не найдена</h1>
            <p>Извините, страница, которую вы ищете, не существует.</p>
            <p>
                <Link to="/" className="button button-primary">
                    Вернуться на главную
                </Link>
            </p>
        </div>
    );
};

export default NotFoundPage;