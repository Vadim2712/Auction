// src/components/layout/Navbar.js
import React from 'react';
import { Link } from 'react-router-dom';
// import { useAuth } from '../../context/AuthContext'; // Раскомментируем позже

const Navbar = () => {
    // const { isAuthenticated, user, logout } = useAuth(); // Раскомментируем позже
    const isAuthenticated = false; // ЗАГЛУШКА
    const user = null; // ЗАГЛУШКА

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
                            {/* <li className="nav-item">
                <Link to="/profile" className="nav-link">{user?.fullName || 'Профиль'}</Link>
              </li>
              <li className="nav-item">
                <button onClick={logout} className="nav-link" style={{background: 'none', border: 'none', cursor: 'pointer'}}>Выйти</button>
              </li> */}
                            {/* Добавить ссылки для продавца/администратора в зависимости от роли user.role */}
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