// src/components/layout/Navbar.js
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import './Navbar.css';

const Navbar = () => {
    const { isAuthenticated, user, logout } = useAuth();
    const navigate = useNavigate();

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    return (
        <nav className="navbar">
            <div className="navbar-container container">
                <Link to="/" className="navbar-logo">
                    Аукцион Онлайн
                </Link>
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
                    {isAuthenticated && user?.role === 'admin' && (
                        <li className="navbar-item">
                            <Link to="/auctions/create" className="navbar-links">
                                Создать Аукцион
                            </Link>
                        </li>
                    )}
                    {/* Добавьте здесь другие ссылки по мере необходимости, например, Профиль */}

                    {isAuthenticated ? (
                        <>
                            <li className="navbar-item navbar-user-greeting">
                                Привет, {user?.fullName || user?.email}! ({user?.role})
                            </li>
                            <li className="navbar-item">
                                <button onClick={handleLogout} className="navbar-button button-logout">
                                    Выйти
                                </button>
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
                                <Link to="/register" className="navbar-button">
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