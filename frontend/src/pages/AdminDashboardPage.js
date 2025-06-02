// src/pages/AdminDashboardPage.js
import React from 'react';
import { Link } from 'react-router-dom';
// import './AdminDashboardPage.css'; // Если нужны специфичные стили

const AdminDashboardPage = () => {
    return (
        <div className="admin-dashboard-page container">
            <h1>Панель администратора</h1>
            <p>Добро пожаловать в панель управления системой "Аукцион".</p>

            <div className="admin-actions-grid">
                <div className="action-card card">
                    <div className="card-body">
                        <h5 className="card-title">Управление пользователями</h5>
                        <p className="card-text">Просмотр, блокировка и изменение ролей пользователей.</p>
                        <Link to="/admin/users" className="button button-primary">
                            Перейти к управлению
                        </Link>
                    </div>
                </div>

                <div className="action-card card">
                    <div className="card-body">
                        <h5 className="card-title">Просмотр отчетов</h5>
                        <p className="card-text">Доступ к различным системным отчетам.</p>
                        <Link to="/reports" className="button button-primary">
                            Смотреть отчеты
                        </Link>
                    </div>
                </div>

                {/* В будущем здесь можно добавить:
                    - Ссылку на создание аукционов (хотя она уже есть в Navbar и доступна продавцам)
                    - Управление глобальными настройками системы
                    - Статистику по сайту и т.д.
                */}
            </div>
        </div>
    );
};

export default AdminDashboardPage;