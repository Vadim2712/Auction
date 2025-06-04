// src/components/layout/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button'; // <<--- ДОБАВЬТЕ ЭТУ СТРОКУ
import './Navbar.css';

const Navbar = () => {
    const { isAuthenticated, user, logout, activeRole } = useAuth(); // Добавим activeRole для более явных проверок
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/');
    };

    // Используем activeRole для проверок, так как user.role может быть основной ролью из БД,
    // а activeRole - выбранной для сессии (хотя в нашем AuthContext user.role = activeRole)
    const currentRole = activeRole || user?.role;

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <ul className="navbar-menu">
                    <li className="navbar-item">
                        <Link to="/" className="navbar-links">
                            Главная
                        </Link>
                    </li>
                    <li className="navbar-item">
                        <Link to="/auctions" className="navbar-links">
                            Аукционы
                        </Link>
                    </li>
                    {/* Ссылка на создание аукциона: доступна SYSTEM_ADMIN или seller */}
                    {isAuthenticated && (currentRole === 'SYSTEM_ADMIN' || currentRole === 'seller') && (
                        <li className="navbar-item">
                            <Link to="/create-auction" className="navbar-links">
                                Создать аукцион
                            </Link>
                        </li>
                    )}
                    {/* Ссылка на "Мои лоты": доступна seller или SYSTEM_ADMIN */}
                    {isAuthenticated && (currentRole === 'seller' || currentRole === 'SYSTEM_ADMIN') && (
                        <li className="navbar-item">
                            <Link to="/my-listings" className="navbar-links">
                                Мои лоты
                            </Link>
                        </li>
                    )}
                    {/* Ссылка "Моя активность": доступна всем авторизованным */}
                    {isAuthenticated && (
                        <li className="navbar-item">
                            <Link to="/my-activity" className="navbar-links">
                                Моя активность
                            </Link>
                        </li>
                    )}
                    {/* Ссылка на админ-панель: только для SYSTEM_ADMIN */}
                    {isAuthenticated && currentRole === 'SYSTEM_ADMIN' && (
                        <li className="navbar-item">
                            <Link to="/admin/dashboard" className="navbar-links">
                                Админ-панель
                            </Link>
                        </li>
                    )}
                    {/* Ссылка на отчеты: для SYSTEM_ADMIN или seller */}
                    {isAuthenticated && (currentRole === 'SYSTEM_ADMIN' || currentRole === 'seller') && (
                        <li className="navbar-item">
                            <Link to="/reports" className="navbar-links">
                                Отчеты
                            </Link>
                        </li>
                    )}
                </ul>
                <ul className="navbar-menu navbar-user-actions">
                    {isAuthenticated ? (
                        <>
                            {/* Ссылка на профиль */}
                            <li className="navbar-item">
                                <Link to="/profile" className="navbar-links">Профиль</Link>
                            </li>
                            <li className="navbar-item">
                                {/* Используем компонент Button для выхода */}
                                <Button onClick={handleLogout} variant="secondary" className="logout-button">
                                    Выйти
                                </Button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li className="navbar-item">
                                <Link to="/login" className="navbar-links">
                                    Войти
                                </Link>
                            </li>
                            <li className="navbar-item">
                                <Link to="/register" className="navbar-links">
                                    Регистрация
                                </Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;