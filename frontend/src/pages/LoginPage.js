// src/pages/LoginPage.js
import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom'; // Для перенаправления после входа
// import apiClient from '../services/api'; // Ваш сервис для API запросов

const LoginPage = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    // const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError(''); // Сброс предыдущих ошибок

        if (!email || !password) {
            setError('Пожалуйста, заполните все поля.');
            return;
        }

        try {
            // ЗАГЛУШКА: Здесь будет вызов API для аутентификации
            console.log('Попытка входа с:', { email, password });
            // const response = await apiClient.post('/auth/login', { email, password });
            // console.log('Успешный вход:', response.data);
            // TODO: Сохранить токен, обновить состояние аутентификации пользователя
            // navigate('/'); // Перенаправить на главную страницу или дашборд
            alert('Заглушка: Успешный вход! (реальная логика API еще не подключена)');
        } catch (err) {
            console.error('Ошибка входа:', err);
            // setError(err.response?.data?.message || 'Ошибка входа. Пожалуйста, попробуйте снова.');
            setError('Заглушка: Ошибка входа. Проверьте консоль.');
        }
    };

    return (
        <div>
            <h2>Вход в систему</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input
                        type="email"
                        id="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </div>
                <div>
                    <label htmlFor="password">Пароль:</label>
                    <input
                        type="password"
                        id="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit">Войти</button>
            </form>
            {/* Можно добавить ссылку на страницу регистрации */}
            {/* <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p> */}
        </div>
    );
};

export default LoginPage;