// src/components/layout/Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext'; // Убедитесь, что путь правильный

const Navbar = () => {
    const { isAuthenticated, user, logout, loading } = useAuth();

    if (loading && !isAuthenticated) { // Можно добавить скелетон или просто не рендерить часть UI пока идет проверка
        return (
            <nav className="navbar">
                <div className="navbar-container">
                    <Link to="/" className="navbar-brand">Аукцион</Link>
                    <ul className="navbar-nav">
                        <li className="nav-item">Загрузка...</li>
                    </ul>
                </div>
            </nav>
        )
    }

    return (
        <nav className="navbar">
            <div className="navbar-container">
                <Link to="/" className="navbar-brand">Аукцион</Link>
                <ul className="navbar-nav">
                    <li className="nav-item">
                        <Link to="/auctions" className="nav-link">Аукционы</Link>
                    </li>
                    {isAuthenticated ? (
                        <>
                            <li className="nav-item">
                                {/* Предполагаем, что у user есть поле fullName или email */}
                                <span className="nav-link">Привет, {user?.fullName || user?.email || 'Пользователь'}!</span>
                            </li>
                            {/* TODO: Добавить ссылки на Профиль, Мои лоты/ставки в зависимости от user.role */}
                            {/* {user?.role === 'seller' && (
                <li className="nav-item"><Link to="/my-lots" className="nav-link">Мои лоты</Link></li>
              )}
              {user?.role === 'admin' && (
                <li className="nav-item"><Link to="/admin" className="nav-link">Админ</Link></li>
              )} */}
                            <li className="nav-item">
                                <button onClick={logout} className="nav-link" style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#007bff' }}>Выйти</button>
                            </li>
                        </>
                    ) : (
                        <>
                            <li className="nav-item">
                                <Link to="/login" className="nav-link">Войти</Link>
                            </li>
                            <li className="nav-item">
                                <Link to="/register" className="nav-link">Регистрация</Link>
                            </li>
                        </>
                    )}
                </ul>
            </div>
        </nav>
    );
};

export default Navbar;