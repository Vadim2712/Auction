// src/components/ProtectedRoute.js
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Loader from './common/Loader';

const ProtectedRoute = ({ children, roles }) => {
    const { isAuthenticated, activeRole, loading: authLoading } = useAuth();
    const location = useLocation();

    if (authLoading) {
        return <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}><Loader text="Проверка аутентификации..." /></div>;
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    if (roles && roles.length > 0 && (!activeRole || !roles.includes(activeRole))) {
        console.warn(`Доступ запрещен: Пользователь с ролью "${activeRole}" пытался получить доступ к маршруту для ролей "${roles.join(', ')}"`);
        alert('У вас нет прав для доступа к этой странице с текущей активной ролью.');
        return <Navigate to="/" replace />;
    }

    return children;
};

export default ProtectedRoute;