// src/pages/ProfilePage.js
import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import Loader from '../components/common/Loader';
import Alert from '../components/common/Alert';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import './ProfilePage.css';

const ProfilePage = () => {
    const { currentUser, activeRole, loading: authLoading, authToken } = useAuth();

    const [pageError, setPageError] = useState('');
    const [actionFeedback, setActionFeedback] = useState({ type: '', message: '' });

    const [isEditingProfile, setIsEditingProfile] = useState(false);
    const [isChangingPassword, setIsChangingPassword] = useState(false);

    const [profileData, setProfileData] = useState({
        fullName: '',
        passportData: ''
    });
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmNewPassword: ''
    });
    const [isSubmitting, setIsSubmitting] = useState(false);

    const clearFeedback = () => {
        setPageError('');
        setActionFeedback({ type: '', message: '' });
    };

    useEffect(() => {
        if (!authLoading && !currentUser && !pageError) {
            setPageError("Не удалось загрузить данные профиля. Возможно, вы не авторизованы или сессия истекла.");
        } else if (currentUser) {
            setPageError('');
            setProfileData({
                fullName: currentUser.fullName || '',
                passportData: currentUser.passportData || ''
            });
        }
    }, [currentUser, authLoading, pageError]);


    if (authLoading || (!currentUser && !pageError)) {
        return <Loader text="Загрузка данных профиля..." />;
    }

    if (!currentUser) {
        return (
            <div className="container">
                <Alert
                    message={pageError || "Пожалуйста, войдите, чтобы просмотреть профиль."}
                    type="warning"
                    onClose={pageError ? () => setPageError('') : undefined}
                />
            </div>
        );
    }

    let displayAvailableRoles = "Не указаны";
    if (currentUser.availableBusinessRoles) {
        try {
            const rolesArray = typeof currentUser.availableBusinessRoles === 'string'
                ? JSON.parse(currentUser.availableBusinessRoles)
                : currentUser.availableBusinessRoles;

            if (Array.isArray(rolesArray) && rolesArray.length > 0) {
                displayAvailableRoles = rolesArray.map(role => {
                    if (role === 'buyer') return 'Покупатель';
                    if (role === 'seller') return 'Продавец';
                    if (role === 'auction_manager') return 'Менеджер аукциона (устар.)';
                    return role.charAt(0).toUpperCase() + role.slice(1);
                }).join(', ');
            } else if (Array.isArray(rolesArray) && rolesArray.length === 0 && (currentUser.role === 'SYSTEM_ADMIN' || activeRole === 'SYSTEM_ADMIN')) {
                displayAvailableRoles = "N/A (Системный Администратор)";
            }
        } catch (e) {
            console.error("Ошибка парсинга availableBusinessRoles в ProfilePage:", e);
            displayAvailableRoles = "Ошибка чтения доступных ролей";
        }
    }

    const handleProfileDataChange = (e) => setProfileData({ ...profileData, [e.target.name]: e.target.value });
    const handlePasswordDataChange = (e) => setPasswordData({ ...passwordData, [e.target.name]: e.target.value });

    const handleEditProfileToggle = () => {
        setIsEditingProfile(prev => !prev);
        setIsChangingPassword(false);
        clearFeedback();
        if (!isEditingProfile && currentUser) {
            setProfileData({
                fullName: currentUser.fullName || '',
                passportData: currentUser.passportData || ''
            });
        }
    };

    const handleChangePasswordToggle = () => {
        setIsChangingPassword(prev => !prev);
        setIsEditingProfile(false);
        clearFeedback();
        setPasswordData({ currentPassword: '', newPassword: '', confirmNewPassword: '' });
    };

    const handleProfileUpdateSubmit = async (e) => {
        e.preventDefault();
        clearFeedback();
        if (!profileData.fullName.trim() || !profileData.passportData.trim()) {
            setActionFeedback({ type: 'danger', message: "ФИО и Паспортные данные обязательны для заполнения." });
            return;
        }
        setIsSubmitting(true);
        console.log("Отправка данных профиля (имитация):", profileData);
        setTimeout(() => {
            setIsSubmitting(false);
            setActionFeedback({ type: 'info', message: "Функционал обновления профиля находится в разработке. Данные не были сохранены." });
        }, 1000);
    };

    const handleChangePasswordSubmit = async (e) => {
        e.preventDefault();
        clearFeedback();
        if (!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmNewPassword) {
            setActionFeedback({ type: 'danger', message: "Все поля для смены пароля обязательны." });
            return;
        }
        if (passwordData.newPassword.length < 6) {
            setActionFeedback({ type: 'danger', message: "Новый пароль должен быть не менее 6 символов." });
            return;
        }
        if (passwordData.newPassword !== passwordData.confirmNewPassword) {
            setActionFeedback({ type: 'danger', message: "Новый пароль и подтверждение не совпадают." });
            return;
        }
        setIsSubmitting(true);
        console.log("Отправка данных для смены пароля (имитация):", passwordData);
        setTimeout(() => {
            setIsSubmitting(false);
            setActionFeedback({ type: 'info', message: "Функционал смены пароля находится в разработке. Пароль не был изменен." });
        }, 1000);
    };

    return (
        <div className="profile-page container">
            <h1>Профиль пользователя</h1>
            {pageError && <Alert message={pageError} type="danger" onClose={() => setPageError('')} />}
            {actionFeedback.message && <Alert message={actionFeedback.message} type={actionFeedback.type} onClose={clearFeedback} />}

            <Card title="Основная информация" className="profile-card">
                {!isEditingProfile ? (
                    <>
                        <p><strong>ФИО:</strong> {currentUser.fullName}</p>
                        <p><strong>Email:</strong> {currentUser.email}</p>
                        <p><strong>Текущая активная роль:</strong> {activeRole ? (activeRole.charAt(0).toUpperCase() + activeRole.slice(1)) : "Не выбрана"}</p>
                        <p><strong>Паспортные данные:</strong> {currentUser.passportData || "Не указаны"}</p>
                        <p><strong>Доступные для выбора бизнес-роли:</strong> {displayAvailableRoles}</p>
                        <p><strong>Статус аккаунта:</strong> {currentUser.isActive ? "Активен" : "Заблокирован"}</p>
                        <p><strong>Дата регистрации:</strong> {new Date(currentUser.registrationDate).toLocaleDateString('ru-RU', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                        <Button variant="primary" onClick={handleEditProfileToggle} className="profile-action-btn">
                            Редактировать профиль
                        </Button>
                    </>
                ) : (
                    <form onSubmit={handleProfileUpdateSubmit} className="profile-form">
                        <Input label="ФИО*" name="fullName" value={profileData.fullName} onChange={handleProfileDataChange} required disabled={isSubmitting} />
                        <Input label="Email (нельзя изменить)" type="email" name="email" value={currentUser.email} readOnly disabled />
                        <Input label="Паспортные данные*" name="passportData" value={profileData.passportData} onChange={handleProfileDataChange} required disabled={isSubmitting} />
                        <div className="form-actions">
                            <Button type="submit" variant="success" disabled={isSubmitting}>
                                {isSubmitting ? "Сохранение..." : "Сохранить изменения"}
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleEditProfileToggle} disabled={isSubmitting}>
                                Отмена
                            </Button>
                        </div>
                    </form>
                )}
            </Card>

            <Card title="Безопасность" className="profile-card">
                {!isChangingPassword ? (
                    <Button variant="secondary" onClick={handleChangePasswordToggle} className="profile-action-btn">
                        Изменить пароль
                    </Button>
                ) : (
                    <form onSubmit={handleChangePasswordSubmit} className="profile-form">
                        <Input label="Текущий пароль*" type="password" name="currentPassword" value={passwordData.currentPassword} onChange={handlePasswordDataChange} required disabled={isSubmitting} />
                        <Input label="Новый пароль (мин. 6 символов)*" type="password" name="newPassword" value={passwordData.newPassword} onChange={handlePasswordDataChange} required disabled={isSubmitting} />
                        <Input label="Подтвердите новый пароль*" type="password" name="confirmNewPassword" value={passwordData.confirmNewPassword} onChange={handlePasswordDataChange} required disabled={isSubmitting} />
                        <div className="form-actions">
                            <Button type="submit" variant="success" disabled={isSubmitting}>
                                {isSubmitting ? "Изменение..." : "Сменить пароль"}
                            </Button>
                            <Button type="button" variant="secondary" onClick={handleChangePasswordToggle} disabled={isSubmitting}>
                                Отмена
                            </Button>
                        </div>
                    </form>
                )}
            </Card>
        </div>
    );
};

export default ProfilePage;