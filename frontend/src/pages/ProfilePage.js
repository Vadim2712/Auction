// src/pages/ProfilePage.js
import React from 'react';
import { useAuth } from '../context/AuthContext';
// import './ProfilePage.css'; // Если нужны специфичные стили

const ProfilePage = () => {
    const { currentUser, activeRole } = useAuth();

    if (!currentUser) {
        return <div className="container"><p>Загрузка данных профиля...</p></div>;
    }

    return (
        <div className="profile-page container">
            <h1>Профиль пользователя</h1>
            <div className="card">
                <div className="card-body">
                    <h5 className="card-title">Информация о пользователе</h5>
                    <p><strong>ФИО:</strong> {currentUser.fullName}</p>
                    <p><strong>Email:</strong> {currentUser.email}</p>
                    <p><strong>Текущая активная роль:</strong> {activeRole}</p>
                    <p><strong>Паспортные данные:</strong> {currentUser.passportData || "Не указаны"}</p>
                    <p><strong>Доступные бизнес-роли:</strong>
                        {currentUser.availableBusinessRoles && JSON.parse(currentUser.availableBusinessRoles).join(', ')}
                    </p>
                    <p><strong>Статус аккаунта:</strong> {currentUser.isActive ? "Активен" : "Заблокирован"}</p>
                    <p><strong>Дата регистрации:</strong> {new Date(currentUser.registrationDate).toLocaleDateString('ru-RU')}</p>

                    {/* В будущем здесь можно добавить:
                        - Форму для изменения пароля
                        - Форму для редактирования ФИО, email (если разрешено)
                        - Возможно, управление настройками уведомлений и т.д.
                    */}
                </div>
            </div>
        </div>
    );
};

export default ProfilePage;