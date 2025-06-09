// src/pages/NotFoundPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/common/Button';

const NotFoundPage = () => {
    return (
        <div className="container text-center" style={{ marginTop: '60px', padding: '40px 0' }}>
            <h1 style={{ fontSize: '3rem', marginBottom: '20px', color: '#343a40' }}>404</h1>
            <h2 style={{ fontSize: '1.75rem', marginBottom: '25px', color: '#495057' }}>Страница не найдена</h2>
            <p style={{ fontSize: '1.1rem', color: '#6c757d', marginBottom: '30px' }}>
                Извините, страница, которую вы ищете, не существует или была перемещена.
            </p>
            <Link to="/">
                <Button variant="primary" className="button-lg">
                    Вернуться на главную
                </Button>
            </Link>
        </div>
    );
};

export default NotFoundPage;