// src/pages/LoginPage.js
import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/apiClient';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
// import './LoginPage.css'; // Если есть специфичные стили

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false); // Локальный loading для формы

    const [loginStep, setLoginStep] = useState(1);
    const [availableRoles, setAvailableRoles] = useState([]);
    const [selectedRole, setSelectedRole] = useState('');

    const { establishSession, isAuthenticated, loading: authLoading } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const from = location.state?.from?.pathname || "/";

    useEffect(() => {
        if (!authLoading && isAuthenticated) {
            navigate(from, { replace: true });
        }
    }, [isAuthenticated, authLoading, navigate, from]);

    const handleCredentialSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setIsLoading(true);

        if (!email || !password) {
            setError('Пожалуйста, заполните все поля.');
            setIsLoading(false);
            return;
        }
        // Мок ролей для не-админа. В реальном приложении бэкенд бы возвращал доступные роли
        // после проверки логина/пароля, если бы был такой эндпоинт.
        // Либо /auth/login возвращает их, если роль не указана или неверна.
        // Наш /auth/login требует роль, поэтому мы даем выбрать ее ДО вызова.
        const mockAvailableRoles = ['buyer', 'seller']; // 'auction_manager' больше не предлагаем

        if (email.toLowerCase() === "sysadmin@auction.app") {
            handleFinalLogin('SYSTEM_ADMIN');
        } else {
            setAvailableRoles(mockAvailableRoles);
            if (mockAvailableRoles.length > 0) {
                setSelectedRole(mockAvailableRoles[0]);
            }
            setLoginStep(2);
        }
        setIsLoading(false);
    };

    const handleRoleSelectChange = (event) => {
        setSelectedRole(event.target.value);
    };

    const handleFinalLogin = async (roleToLoginWith) => {
        setError('');
        setIsLoading(true);
        try {
            const response = await loginUser({ email, password, role: roleToLoginWith });
            const { token, user: userData, activeRole: roleFromResponse } = response.data;
            establishSession(userData, token, roleFromResponse);
            navigate(from, { replace: true });
        } catch (err) {
            console.error('Ошибка входа на странице LoginPage:', err.response?.data || err.message);
            setError(err.response?.data?.message || err.response?.data?.error || 'Ошибка входа. Проверьте данные и выбранную роль.');
            if (roleToLoginWith !== 'SYSTEM_ADMIN') { // Возвращаем на шаг 1 только если это был не прямой логин админа
                setLoginStep(1);
            }
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
        return <div className="container" style={{ paddingTop: '50px', textAlign: 'center' }}><Loader text="Проверка сессии..." /></div>;
    }

    return (
        <div className="login-page container">
            <h2>Вход в систему</h2>
            {error && <Alert message={error} type="danger" onClose={() => setError('')} />}

            {loginStep === 1 && (
                <form onSubmit={handleCredentialSubmit} className="form-container">
                    <Input
                        label="Email:"
                        type="email"
                        id="email"
                        name="email" // Добавлено для согласованности, хотя здесь напрямую используется setEmail
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                    <Input
                        label="Пароль:"
                        type="password"
                        id="password"
                        name="password" // Добавлено
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        disabled={isLoading}
                    />
                    <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
                        {isLoading ? 'Проверка...' : 'Далее'}
                    </Button>
                </form>
            )}

            {loginStep === 2 && (
                <form onSubmit={handleRoleSubmit} className="form-container">
                    <p>Пользователь: {email}</p>
                    <div className="form-group-common"> {/* Обертка для select */}
                        <label htmlFor="roleSelect">Войти как:</label>
                        <select
                            id="roleSelect"
                            value={selectedRole}
                            onChange={handleRoleSelectChange}
                            required
                            className="form-control" // Общий класс для полей ввода
                            disabled={isLoading}
                        >
                            {availableRoles.map(role => (
                                <option key={role} value={role}>
                                    {role === 'buyer' ? 'Покупатель' :
                                        role === 'seller' ? 'Продавец' :
                                            role}
                                </option>
                            ))}
                        </select>
                    </div>
                    <Button type="submit" variant="primary" fullWidth disabled={isLoading}>
                        {isLoading ? 'Вход...' : 'Войти'}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={() => { setLoginStep(1); setError(''); }}
                        style={{ marginTop: '10px' }}
                        fullWidth
                        disabled={isLoading}
                    >
                        Назад
                    </Button>
                </form>
            )}
            <p style={{ textAlign: 'center', marginTop: '20px' }}>
                Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
            </p>
        </div>
    );
};

export default LoginPage;