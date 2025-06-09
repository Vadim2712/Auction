// src/pages/AdminDashboardPage.js
import React from 'react';
import { Link } from 'react-router-dom';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import './AdminDashboardPage.css';

const AdminDashboardPage = () => {
    return (
        <div className="admin-dashboard-page container">
            <h1>Панель администратора</h1>
            <p className="lead-text">Добро пожаловать в панель управления системой "Аукцион".</p>

            <div className="admin-actions-grid">
                <Card title="Управление пользователями" className="action-card">
                    <p>Просмотр, блокировка и изменение ролей пользователей.</p>
                    <Link to="/admin/users">
                        <Button variant="primary" fullWidth>
                            Перейти к управлению
                        </Button>
                    </Link>
                </Card>

                <Card title="Просмотр отчетов" className="action-card">
                    <p>Доступ к различным системным отчетам.</p>
                    <Link to="/reports">
                        <Button variant="primary" fullWidth>
                            Смотреть отчеты
                        </Button>
                    </Link>
                </Card>
            </div>
        </div>
    );
};

export default AdminDashboardPage;