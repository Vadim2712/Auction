// src/pages/RegistrationPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const RegistrationPage = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [passportData, setPassportData] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false); // Локальное состояние загрузки

    const { processRegistration } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');

        if (!fullName || !email || !passportData || !password || !confirmPassword) {
            setError('Пожалуйста, заполните все поля.');
            return;
        }
        if (password.length < 6) {
            setError('Пароль должен быть не менее 6 символов.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Пароли не совпадают.');
            return;
        }

        setIsSubmitting(true);
        try {
            // На бэкенде `registerUser` ожидает объект с полями fullName, email, password, passportData
            const response = await processRegistration({
                fullName, // Имена полей совпадают
                email,
                passportData,
                password,
                // Роль не передаем, бэкенд сам назначит AvailableBusinessRoles и дефолтную
            });
            setSuccessMessage(response.message || 'Регистрация прошла успешно! Теперь вы можете войти.');
            // Очищаем форму или нет - по желанию
            // setFullName(''); setEmail(''); setPassportData(''); setPassword(''); setConfirmPassword('');
            // navigate('/login'); // Можно перенаправить или оставить на странице с сообщением
        } catch (err) {
            console.error('Ошибка регистрации на странице RegistrationPage:', err);
            setError(err.message || 'Ошибка регистрации. Пожалуйста, попробуйте снова.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="registration-page container">
            <h2>Регистрация</h2>
            <form onSubmit={handleSubmit} className="form-container">
                {error && <p className="alert alert-danger">{error}</p>}
                {successMessage && <p className="alert alert-success">{successMessage}</p>}

                <div className="form-group">
                    <label htmlFor="fullName">ФИО*</label>
                    <input type="text" id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={isSubmitting} />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email*</label>
                    <input type="email" id="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={isSubmitting} />
                </div>
                <div className="form-group">
                    <label htmlFor="passportData">Паспортные данные*</label>
                    <input type="text" id="passportData" value={passportData} onChange={(e) => setPassportData(e.target.value)} required disabled={isSubmitting} />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Пароль (минимум 6 символов)*</label>
                    <input type="password" id="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={isSubmitting} />
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Подтвердите пароль*</label>
                    <input type="password" id="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={isSubmitting} />
                </div>

                <button type="submit" className="button button-primary" disabled={isSubmitting}>
                    {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '20px' }}>
                Уже есть аккаунт? <Link to="/login">Войти</Link>
            </p>
        </div>
    );
};

export default RegistrationPage;