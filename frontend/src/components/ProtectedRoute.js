// src/components/auth/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ProtectedRoute = ({ children, roles }) => {
    const { isAuthenticated, user, loading } = useAuth();
    const location = useLocation();

    if (loading) {
        // Можно показать индикатор загрузки, пока проверяется статус аутентификации
        return <div className="container"><p>Проверка аутентификации...</p></div>;
    }

    if (!isAuthenticated) {
        // Если не аутентифицирован, перенаправляем на страницу входа,
        // сохраняя исходный путь для редиректа после входа
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles && roles.length > 0 && (!user || !roles.includes(user.role))) {
        // Если аутентифицирован, но роль не соответствует требуемой,
        // перенаправляем на главную страницу или страницу "Нет доступа"
        // Для простоты пока на главную
        alert('У вас нет прав для доступа к этой странице.'); // Или отобразить компонент "Нет доступа"
        return <Navigate to="/" replace />;
    }

    return children; // Если все проверки пройдены, отображаем дочерний компонент
};

export default ProtectedRoute;