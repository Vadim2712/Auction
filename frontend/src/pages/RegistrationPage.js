// src/pages/RegistrationPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Импортируем хук

const RegistrationPage = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [passportData, setPassportData] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const { register, loading } = useAuth(); // Получаем функцию register
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');

        if (!fullName || !email || !passportData || !password || !confirmPassword) {
            setError('Пожалуйста, заполните все поля.');
            return;
        }
        if (password.length < 6) { // Пример простой валидации
            setError('Пароль должен быть не менее 6 символов.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Пароли не совпадают.');
            return;
        }

        try {
            await register({
                full_name: fullName, // Убедитесь, что ключи совпадают с ожидаемыми на бэкенде
                email,
                passport_data: passportData,
                password,
                // role: 'buyer' // Роль может назначаться на бэкенде по умолчанию
            });
            alert('Регистрация прошла успешно! Теперь вы можете войти.'); // Или другое сообщение
            navigate('/login');
        } catch (err) {
            console.error('Ошибка регистрации на странице:', err);
            setError(err.message || 'Ошибка регистрации. Пожалуйста, попробуйте снова.');
        }
    };

    return (
        <div>
            <h2>Регистрация</h2>
            <form onSubmit={handleSubmit}>
                <div>
                    <label htmlFor="fullName">ФИО:</label>
                    <input type="text" id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={loading} />
                </div>
                <div>
                    <label htmlFor="email">Email:</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={loading} />
                </div>
                <div>
                    <label htmlFor="passportData">Паспортные данные:</label>
                    <input type="text" id="passportData" value={passportData} onChange={(e) => setPassportData(e.target.value)} required disabled={loading} />
                </div>
                <div>
                    <label htmlFor="password">Пароль (минимум 6 символов):</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={loading} />
                </div>
                <div>
                    <label htmlFor="confirmPassword">Подтвердите пароль:</label>
                    <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={loading} />
                </div>
                {error && <p className="text-danger">{error}</p>}
                <button type="submit" disabled={loading}>
                    {loading ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '15px' }}>
                Уже есть аккаунт? <Link to="/login">Войти</Link>
            </p>
        </div>
    );
};

export default RegistrationPage;