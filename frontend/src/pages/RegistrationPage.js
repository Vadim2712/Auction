// src/pages/RegistrationPage.js
import React, { useState } from 'react';
// import { useNavigate } from 'react-router-dom';
// import apiClient from '../services/api';

const RegistrationPage = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [passportData, setPassportData] = useState(''); // Подумайте о безопасности!
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    // const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!fullName || !email || !passportData || !password || !confirmPassword) {
            setError('Пожалуйста, заполните все поля.');
            return;
        }

        if (password !== confirmPassword) {
            setError('Пароли не совпадают.');
            return;
        }

        try {
            // ЗАГЛУШКА: Здесь будет вызов API для регистрации
            console.log('Попытка регистрации с:', { fullName, email, passportData, password });
            // const response = await apiClient.post('/auth/register', {
            //   full_name: fullName,
            //   email,
            //   passport_data: passportData,
            //   password
            // });
            // console.log('Успешная регистрация:', response.data);
            // TODO: Возможно, автоматический вход или перенаправление на страницу входа
            // navigate('/login');
            alert('Заглушка: Успешная регистрация! (реальная логика API еще не подключена)');
        } catch (err) {
            console.error('Ошибка регистрации:', err);
            // setError(err.response?.data?.message || 'Ошибка регистрации. Пожалуйста, попробуйте снова.');
            setError('Заглушка: Ошибка регистрации. Проверьте консоль.');
        }
    };

    return (
        <div>
            <h2>Регистрация</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="fullName">ФИО:</label>
                    <input
                        type="text"
                        id="fullName"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                    />
                </div>
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
                    <label htmlFor="passportData">Паспортные данные:</label>
                    <input
                        type="text"
                        id="passportData"
                        value={passportData}
                        onChange={(e) => setPassportData(e.target.value)}
                        required
                    />
                    {/* Примечание: Отображение и хранение паспортных данных требует особого внимания к безопасности и законодательству. */}
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
                <div>
                    <label htmlFor="confirmPassword">Подтвердите пароль:</label>
                    <input
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                    />
                </div>
                {error && <p style={{ color: 'red' }}>{error}</p>}
                <button type="submit">Зарегистрироваться</button>
            </form>
            {/* Можно добавить ссылку на страницу входа */}
            {/* <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p> */}
        </div>
    );
};

export default RegistrationPage;