// src/pages/LoginPage.js
import React, { useState } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { validateCredentials } from '../services/apiClient'; // Импортируем validateCredentials
// import './LoginPage.css'; // Убедитесь, что у вас есть или создайте этот файл для стилей

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false); // Локальный loading для процесса входа

    // Этап 1: проверка учетных данных. Этап 2: выбор роли.
    const [loginStep, setLoginStep] = useState(1);
    const [validatedUser, setValidatedUser] = useState(null); // Для хранения пользователя после проверки credentials
    const [validatedToken, setValidatedToken] = useState(null); // Временный токен
    const [selectedRole, setSelectedRole] = useState('');

    const { establishSession, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    // Если пользователь уже аутентифицирован, перенаправляем
    if (isAuthenticated) {
        navigate(from, { replace: true });
    }

    const handleCredentialSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setLoading(true);

        if (!email || !password) {
            setError('Пожалуйста, заполните все поля.');
            setLoading(false);
            return;
        }

        try {
            const response = await validateCredentials(email, password);
            const user = response.data.user;
            const token = response.data.token; // Это временный токен или уже финальный от бэкенда

            if (user.role === 'SYSTEM_ADMIN') { // Системный администратор входит сразу
                establishSession(user, token, 'SYSTEM_ADMIN');
                navigate(from, { replace: true });
            } else if (user.availableBusinessRoles && user.availableBusinessRoles.length > 0) {
                setValidatedUser(user);
                setValidatedToken(token); // Сохраняем токен
                if (user.availableBusinessRoles.length === 1) {
                    // Если только одна доступная роль, выбираем ее автоматически
                    setSelectedRole(user.availableBusinessRoles[0]);
                    // И можно сразу попытаться "завершить" вход, если UX позволяет
                    handleRoleSubmitFinal(user.availableBusinessRoles[0], user, token); // Передаем роль, пользователя и токен
                } else {
                    // Если ролей несколько, переходим к шагу выбора роли
                    setSelectedRole(user.availableBusinessRoles[0]); // Устанавливаем первую роль по умолчанию для select
                    setLoginStep(2);
                }
            } else {
                setError('У пользователя нет доступных ролей для входа.');
            }
        } catch (err) {
            console.error('Ошибка проверки учетных данных:', err);
            setError(err.response?.data?.message || 'Ошибка входа. Пожалуйста, попробуйте снова.');
        } finally {
            setLoading(false);
        }
    };

    const handleRoleSelect = (event) => {
        setSelectedRole(event.target.value);
    };

    const handleRoleSubmit = (event) => {
        event.preventDefault();
        if (!selectedRole) {
            setError('Пожалуйста, выберите роль для входа.');
            return;
        }
        handleRoleSubmitFinal(selectedRole, validatedUser, validatedToken);
    };

    // Вынесем финальную логику установки сессии в отдельную функцию
    const handleRoleSubmitFinal = (roleToSet, userToSet, tokenToSet) => {
        console.log(`Logging in user ${userToSet.email} with role ${roleToSet}`);
        establishSession(userToSet, tokenToSet, roleToSet);
        navigate(from, { replace: true }); // Перенаправляем на исходную страницу или главную
    }


    return (
        <div className="login-page container"> {/* Добавьте класс login-page для стилизации, если нужно */}
            <h2>Вход в систему</h2>
            {loginStep === 1 && (
                <form onSubmit={handleCredentialSubmit} className="form-container">
                    {error && <p className="alert alert-danger">{error}</p>}
                    <div className="form-group">
                        <label htmlFor="email">Email:</label>
                        <input
                            type="email" id="email" value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            required disabled={loading}
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="password">Пароль:</label>
                        <input
                            type="password" id="password" value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            required disabled={loading}
                        />
                    </div>
                    <button type="submit" className="button button-primary" disabled={loading}>
                        {loading ? 'Проверка...' : 'Далее'}
                    </button>
                </form>
            )}

            {loginStep === 2 && validatedUser && (
                <form onSubmit={handleRoleSubmit} className="form-container">
                    <p>Добро пожаловать, {validatedUser.fullName}!</p>
                    {error && <p className="alert alert-danger">{error}</p>}
                    <div className="form-group">
                        <label htmlFor="roleSelect">Выберите роль для входа:</label>
                        <select
                            id="roleSelect"
                            value={selectedRole}
                            onChange={handleRoleSelect}
                            required
                            className="form-control" // Добавьте стили для select
                        >
                            {validatedUser.availableBusinessRoles.map(role => (
                                <option key={role} value={role}>
                                    {role === 'buyer' ? 'Покупатель' :
                                        role === 'seller' ? 'Продавец' :
                                            role === 'auction_manager' ? 'Менеджер аукциона' : role}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button type="submit" className="button button-primary" disabled={loading}>
                        {loading ? 'Вход...' : 'Войти'}
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