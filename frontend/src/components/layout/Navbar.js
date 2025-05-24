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
        navigate('/'); // Перенаправляем на главную после выхода
    };

    return (
        <nav className="navbar">
            <div className="navbar-container"> {/* Убедитесь, что этот класс есть, если используете container в CSS */}
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
                            <Link to="/create-auction" className="navbar-links"> {/* Убедитесь, что маршрут правильный */}
                                Создать аукцион
                            </Link>
                        </li>
                    )}
                    {isAuthenticated && (user?.role === 'seller' || user?.role === 'admin') && ( // <--- НОВАЯ ССЫЛКА
                        <li className="navbar-item">
                            <Link to="/my-listings" className="navbar-links">
                                Мои лоты
                            </Link>
                        </li>
                    )}
                    {isAuthenticated && ( // Ссылку "Моя активность" можно показывать всем авторизованным
                        <li className="navbar-item">
                            <Link to="/my-activity" className="navbar-links">
                                Моя активность
                            </Link>
                        </li>
                    )}
                </ul>
                <ul className="navbar-menu navbar-user-actions"> {/* Используйте один navbar-menu или разделите логически */}
                    {isAuthenticated ? (
                        <>
                            <li className="navbar-item navbar-user-greeting">
                                Привет, {user?.fullName || user?.email}! ({user?.role})
                            </li>
                            <li className="navbar-item">
                                <button onClick={handleLogout} className="navbar-button logout-button"> {/* Пример класса для кнопки выхода */}
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
                                <Link to="/register" className="navbar-links"> {/* Используем navbar-links для единообразия или navbar-button */}
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