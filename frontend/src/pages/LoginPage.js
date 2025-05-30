// src/pages/LoginPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/apiClient'; // Используем loginUser, который идет на бэкенд /auth/login
// import { validateCredentials } // Если бы был отдельный шаг валидации

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Локальный loading

    const [loginStep, setLoginStep] = useState(1); // 1: credentials, 2: role select
    const [availableRoles, setAvailableRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState('');

    // Для хранения данных пользователя после первого шага, если бы он был
    // const [tempUser, setTempUser] = useState(null); 
    // const [tempToken, setTempToken] = useState(null);


    const { establishSession, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, authLoading, navigate, from]);


    // Шаг 1: Ввод email/password, затем выбор роли
    const handleCredentialSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        if (!email || !password) {
            setError('Пожалуйста, заполните все поля.');
            setIsLoading(false);
            return;
        }

        // Здесь мы могли бы сначала вызывать validateCredentials, если бы он был
        // и не требовал роль, а затем на основе ответа показывать выбор роли.
        // Но наш /auth/login на бэкенде уже ожидает роль.
        // Поэтому, мы сначала должны дать пользователю выбрать роль.
        // ИЛИ, если у пользователя только одна роль (или он админ), то роль не выбирается.

        // Пока упростим: всегда показываем выбор роли после ввода логина/пароля,
        // если это не системный админ.
        // В реальном API, /auth/login мог бы сам определять доступные роли и возвращать их,
        // если выбранная роль не подходит или не указана.

        // Для нашей схемы: предполагаем, что сначала пользователь выбирает роль, потом логинимся.
        // Или, как вы предложили: сначала логин/пароль, потом выбор роли.
        // Давайте сделаем так:
        // 1. Вводим логин/пароль.
        // 2. Нажимаем "Далее".
        // 3. Появляется выпадающий список ролей (статичный для всех не-админов).
        // 4. Пользователь выбирает роль.
        // 5. Нажимает "Войти".

        // Этот хендлер теперь для первого шага - просто переход к выбору роли
        // Реальная проверка логина/пароля будет на втором шаге вместе с ролью

        // Здесь мы могли бы сделать пред-валидацию (если бы был такой эндпоинт без роли),
        // чтобы проверить, существует ли пользователь, и получить его доступные роли.
        // Поскольку наш /auth/login уже требует роль, мы сначала покажем выбор роли.

        // Допустим, у нас есть mock-список ролей для выбора
        // В реальном приложении это могло бы приходить от API после первого шага валидации credentials
        const mockAvailableRoles = ['buyer', 'seller', 'auction_manager']; // Заглушка

        if (email === "sysadmin@auction.app") { // Особый случай для системного админа
            handleFinalLogin('SYSTEM_ADMIN');
        } else {
            setAvailableRoles(mockAvailableRoles);
            if (mockAvailableRoles.length > 0) {
                setSelectedRole(mockAvailableRoles[0]); // Выбираем первую по умолчанию
            }
            setLoginStep(2); // Переходим к шагу выбора роли
        }
        setIsLoading(false);
    };


    const handleRoleSelect = (event) => {
        setSelectedRole(event.target.value);
    };

    const handleFinalLogin = async (roleToLoginWith) => {
        setError('');
        setIsLoading(true);
        try {
            const response = await loginUser({ email, password, role: roleToLoginWith });
            const { token, user: userData, activeRole: roleFromResponse } = response.data;

            establishSession(userData, token, roleFromResponse); // Используем роль из ответа API
            navigate(from, { replace: true });

        } catch (err) {
            console.error('Ошибка входа на странице LoginPage:', err.response?.data || err.message);
            setError(err.response?.data?.message || 'Ошибка входа. Проверьте данные и выбранную роль.');
            setLoginStep(1); // Возвращаемся на первый шаг при ошибке
        } finally {
            setIsLoading(false);
        }
    };

    const handleRoleSubmit = (event) => {
        event.preventDefault();
        if (!selectedRole) {
            setError('Пожалуйста, выберите роль для входа.');
            return;
        }
        handleFinalLogin(selectedRole);
    };


    if (authLoading) {
        return <div className="container"><p>Проверка сессии...</p></div>;
    }


    return (
        <div className="login-page container">
            <h2>Вход в систему</h2>
            {loginStep === 1 && (
                <form onSubmit={handleCredentialSubmit}>
                    {error && <p className="alert alert-danger">{error}</p>}
                    <div className="form-group">
                        <label htmlFor="email">Email:</label>
                        <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isLoading} />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Пароль:</label>
                        <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isLoading} />
                    </div>
                    <button type="submit" className="button button-primary" disabled={isLoading}>
                        {isLoading ? 'Проверка...' : 'Далее'}
                    </button>
                </form>
            )}

            {loginStep === 2 && (
                <form onSubmit={handleRoleSubmit}>
                    <p>Пользователь: {email}</p>
                    {error && <p className="alert alert-danger">{error}</p>}
                    <div className="form-group">
                        <label htmlFor="roleSelect">Войти как:</label>
                        <select id="roleSelect" value={selectedRole} onChange={handleRoleSelect} required className="form-control" disabled={isLoading}>
                            {availableRoles.map(role => (
                                <option key={role} value={role}>
                                    {role === 'buyer' ? 'Покупатель' :
                                        role === 'seller' ? 'Продавец' :
                                            role === 'auction_manager' ? 'Менеджер аукциона' : role}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="button button-primary" disabled={isLoading}>
                        {isLoading ? 'Вход...' : 'Войти'}
                    </button>
                    <button type="button" className="button button-secondary" onClick={() => { setLoginStep(1); setError(''); }} style={{ marginLeft: '10px' }} disabled={isLoading}>
                        Назад
                    </button>
                </form>
            )}
            <p style={{ textAlign: 'center', marginTop: '20px' }}>
                Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
            </p>
        </div>
    );
};

export default LoginPage;