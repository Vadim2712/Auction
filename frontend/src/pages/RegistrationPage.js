// src/pages/RegistrationPage.js
import React, { useState } from 'react';
import { Link } from 'react-router-dom'; // useNavigate здесь не используется, можно убрать если не планируется редирект
import { useAuth } from '../context/AuthContext';
import Input from '../components/common/Input';
import Button from '../components/common/Button';
import Alert from '../components/common/Alert';
// import './RegistrationPage.css'; // Если есть специфичные стили

const RegistrationPage = () => {
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [passportData, setPassportData] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [successMessage, setSuccessMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { processRegistration } = useAuth();
    // const navigate = useNavigate(); // Если редирект не нужен, можно убрать

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccessMessage('');
        setIsSubmitting(true);

        if (!fullName || !email || !passportData || !password || !confirmPassword) {
            setError('Пожалуйста, заполните все поля.');
            setIsSubmitting(false);
            return;
        }
        if (password.length < 6) {
            setError('Пароль должен быть не менее 6 символов.');
            setIsSubmitting(false);
            return;
        }
        if (password !== confirmPassword) {
            setError('Пароли не совпадают.');
            setIsSubmitting(false);
            return;
        }

        try {
            // Используем camelCase для payload, так как AuthContext.processRegistration
            // передает это в apiClient.registerUser, который ожидает объект,
            // соответствующий RegisterUserInput на бэкенде (с camelCase JSON тегами).
            const response = await processRegistration({
                fullName,
                email,
                passportData,
                password,
            });
            setSuccessMessage(response.message || 'Регистрация прошла успешно! Теперь вы можете войти.');
            // Очистка формы после успешной регистрации
            setFullName('');
            setEmail('');
            setPassportData('');
            setPassword('');
            setConfirmPassword('');
            // navigate('/login'); // Опциональный редирект на страницу входа
        } catch (err) {
            console.error('Ошибка регистрации на странице RegistrationPage:', err);
            setError(err.message || err.error || 'Ошибка регистрации. Пожалуйста, попробуйте снова.');
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="registration-page container">
            <h2>Регистрация</h2>
            <form onSubmit={handleSubmit} className="form-container">
                {error && <Alert message={error} type="danger" onClose={() => setError('')} />}
                {successMessage && <Alert message={successMessage} type="success" onClose={() => setSuccessMessage('')} />}

                <Input
                    label="ФИО*"
                    id="fullName"
                    name="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                    disabled={isSubmitting}
                />
                <Input
                    label="Email*"
                    type="email"
                    id="email"
                    name="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isSubmitting}
                />
                <Input
                    label="Паспортные данные*"
                    id="passportData"
                    name="passportData"
                    value={passportData}
                    onChange={(e) => setPassportData(e.target.value)}
                    required
                    disabled={isSubmitting}
                />
                <Input
                    label="Пароль (минимум 6 символов)*"
                    type="password"
                    id="password"
                    name="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                />
                <Input
                    label="Подтвердите пароль*"
                    type="password"
                    id="confirmPassword"
                    name="confirmPassword"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    disabled={isSubmitting}
                />

                <Button type="submit" variant="primary" fullWidth disabled={isSubmitting}>
                    {isSubmitting ? 'Регистрация...' : 'Зарегистрироваться'}
                </Button>
            </form>
            <p style={{ textAlign: 'center', marginTop: '20px' }}>
                Уже есть аккаунт? <Link to="/login">Войти</Link>
            </p>
        </div>
    );
};

export default RegistrationPage;