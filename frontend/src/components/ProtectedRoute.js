// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => { // roles - это массив требуемых АКТИВНЫХ ролей
    const { isAuthenticated, activeRole, loading } = useAuth(); // Используем activeRole
    const location = useLocation();

    if (loading) {
        return <div className="container"><p>Проверка аутентификации...</p></div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Если маршрут требует определенных ролей, проверяем activeRole
    if (roles && roles.length > 0 && (!activeRole || !roles.includes(activeRole))) {
        console.warn(`Доступ запрещен: Пользователь с ролью "${activeRole}" пытался получить доступ к маршруту для ролей "${roles.join(', ')}"`);
        alert('У вас нет прав для доступа к этой странице с текущей активной ролью.');
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;