// src/components/layout/Navbar.js
import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import Button from '../common/Button';
import './Navbar.css';

const Navbar = () => {
    const { isAuthenticated, activeRole, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const [isMenuOpen, setIsMenuOpen] = useState(false);

    useEffect(() => {
        setIsMenuOpen(false);
    }, [location]);

    const handleLogout = () => {
        closeMobileMenu();
        logout();
        navigate('/');
    };

    const closeMobileMenu = () => setIsMenuOpen(false);

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <div className="navbar-logo" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
                    <img src="https://cdn-icons-png.flaticon.com/512/433/433013.png" alt="Иконка Аукциона" className="logo-icon" />
                    <span className="logo-text">Аукцион Онлайн</span>
                </div>

                <div className="menu-icon" onClick={() => setIsMenuOpen(!isMenuOpen)}>
                    <i className={isMenuOpen ? 'fas fa-times' : 'fas fa-bars'} />
                </div>

                <ul className={isMenuOpen ? 'navbar-menu active' : 'navbar-menu'}>
                    <li className="navbar-item">
                        <Link to="/" className="navbar-links" onClick={closeMobileMenu}>
                            Главная
                        </Link>
                    </li>
                    <li className="navbar-item">
                        <Link to="/auctions" className="navbar-links" onClick={closeMobileMenu}>
                            Аукционы
                        </Link>
                    </li>
                    {isAuthenticated && (activeRole === 'SYSTEM_ADMIN' || activeRole === 'seller') && (
                        <li className="navbar-item">
                            <Link to="/create-auction" className="navbar-links" onClick={closeMobileMenu}>
                                Создать аукцион
                            </Link>
                        </li>
                    )}
                    {isAuthenticated && (activeRole === 'SYSTEM_ADMIN' || activeRole === 'seller') && (
                        <li className="navbar-item">
                            <Link to="/my-listings" className="navbar-links" onClick={closeMobileMenu}>
                                Мои лоты
                            </Link>
                        </li>
                    )}
                    {isAuthenticated && (
                        <li className="navbar-item">
                            <Link to="/my-activity" className="navbar-links" onClick={closeMobileMenu}>
                                Моя активность
                            </Link>
                        </li>
                    )}
                    {isAuthenticated && (activeRole === 'SYSTEM_ADMIN' || activeRole === 'seller') && (
                        <li className="navbar-item">
                            <Link to="/reports" className="navbar-links" onClick={closeMobileMenu}>
                                Отчеты
                            </Link>
                        </li>
                    )}
                    {isAuthenticated && (
                        <li className="navbar-item">
                            <Link to="/profile" className="navbar-links" onClick={closeMobileMenu}>Профиль</Link>
                        </li>
                    )}
                    {isAuthenticated && activeRole === 'SYSTEM_ADMIN' && (
                        <li className="navbar-item">
                            <Link to="/admin/dashboard" className="navbar-links" onClick={closeMobileMenu}>
                                Админ-панель
                            </Link>
                        </li>
                    )}

                    <li className="navbar-item-mobile">
                        {isAuthenticated && (
                            <Button onClick={handleLogout} variant="danger" fullWidth>
                                Выйти
                            </Button>
                        )}
                    </li>
                </ul>

                <div className="navbar-user-actions-desktop">
                    {isAuthenticated ? (
                        <Button onClick={handleLogout} variant="secondary" className="logout-button">
                            Выйти
                        </Button>
                    ) : (
                        <div className="login-register-desktop">
                            <Link to="/login" className="navbar-links">Войти</Link>
                            <Link to="/register">
                                <Button variant="primary">Регистрация</Button>
                            </Link>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
};

export default Navbar;