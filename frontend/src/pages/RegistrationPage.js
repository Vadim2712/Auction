// src/pages/RegistrationPage.js
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext'; // Импортируем useAuth для processRegistration
// import './RegistrationPage.css'; // Убедитесь, что стили есть

const RegistrationPage = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [passportData, setPassportData] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const { processRegistration } = useAuth(); // Используем processRegistration
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

        setSubmitting(true);
        try {
            const response = await processRegistration({ // Передаем объект с данными
                fullName,
                email,
                passportData,
                password,
                // role можно не передавать, т.к. apiClient присвоит availableBusinessRoles
            });
            setSuccessMessage(response.message || 'Регистрация прошла успешно! Теперь вы можете войти.');
            // Не перенаправляем сразу, даем пользователю прочитать сообщение
            // navigate('/login');
        } catch (err) {
            console.error('Ошибка регистрации на странице:', err);
            setError(err.message || 'Ошибка регистрации. Пожалуйста, попробуйте снова.');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="registration-page container"> {/* Добавьте класс для стилизации */}
            <h2>Регистрация</h2>
            <form onSubmit={handleSubmit} className="form-container">
                {error && <p className="alert alert-danger">{error}</p>}
                {successMessage && <p className="alert alert-success">{successMessage}</p>}

                {/* Поля формы как были, но добавим disabled={submitting} */}
                <div className="form-group">
                    <label htmlFor="fullName">ФИО*</label>
                    <input type="text" id="fullName" name="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group">
                    <label htmlFor="email">Email*</label>
                    <input type="email" id="email" name="email" value={email} onChange={(e) => setEmail(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group">
                    <label htmlFor="passportData">Паспортные данные*</label>
                    <input type="text" id="passportData" name="passportData" value={passportData} onChange={(e) => setPassportData(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group">
                    <label htmlFor="password">Пароль (минимум 6 символов)*</label>
                    <input type="password" id="password" name="password" value={password} onChange={(e) => setPassword(e.target.value)} required disabled={submitting} />
                </div>
                <div className="form-group">
                    <label htmlFor="confirmPassword">Подтвердите пароль*</label>
                    <input type="password" id="confirmPassword" name="confirmPassword" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required disabled={submitting} />
                </div>

                <button type="submit" className="button button-primary" disabled={submitting}>
                    {submitting ? 'Регистрация...' : 'Зарегистрироваться'}
                </button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '20px' }}>
                Уже есть аккаунт? <Link to="/login">Войти</Link>
            </p>
        </div>
    );
};

export default RegistrationPage;