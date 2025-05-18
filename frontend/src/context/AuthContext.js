// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
// import apiClient from '../services/apiClient'; // Ваш API клиент

// Создаем контекст
const AuthContext = createContext(null);

// Провайдер контекста
export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null); // Информация о пользователе
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true); // Для проверки токена при загрузке

    // Примечание: Реальная проверка токена и загрузка пользователя должна быть здесь
    // useEffect(() => {
    //   const token = localStorage.getItem('authToken');
    //   if (token) {
    //     // TODO: Верифицировать токен на бэкенде и получить данные пользователя
    //     // apiClient.get('/auth/me').then(response => {
    //     //   setUser(response.data.user);
    //     //   setIsAuthenticated(true);
    //     // }).catch(() => {
    //     //   localStorage.removeItem('authToken');
    //     //   setUser(null);
    //     //   setIsAuthenticated(false);
    //     // }).finally(() => setLoading(false));
    //     // ЗАГЛУШКА:
    //     console.log("Найден токен, но проверка не реализована");
    //     setIsAuthenticated(false); // Пока нет проверки, считаем не аутентифицированным
    //     setUser(null);
    //   }
    //   setLoading(false);
    // }, []);

    // ЗАГЛУШКА: убираем авто-проверку токена для простоты на данном этапе
    useEffect(() => {
        setLoading(false);
    }, [])


    const login = async (email, password) => {
        setLoading(true);
        try {
            // ЗАГЛУШКА:
            console.log("Попытка входа (AuthContext):", { email, password });
            // const response = await apiClient.post('/auth/login', { email, password });
            // const { token, user: userData } = response.data;
            // localStorage.setItem('authToken', token);
            // apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`; // Для последующих запросов
            // setUser(userData);
            // setIsAuthenticated(true);
            // setLoading(false);
            // return userData;

            // Имитация успешного входа для заглушки
            const mockUser = { id: 1, fullName: "Тестовый Пользователь", email: email, role: "buyer" };
            localStorage.setItem('authToken', 'fake-jwt-token'); // Имитируем сохранение токена
            setUser(mockUser);
            setIsAuthenticated(true);
            setLoading(false);
            console.log("AuthContext: Заглушка успешного входа", mockUser);
            return mockUser;

        } catch (error) {
            console.error("Ошибка входа (AuthContext):", error);
            localStorage.removeItem('authToken');
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            throw error;
        }
    };

    const register = async (userData) => {
        setLoading(true);
        try {
            // ЗАГЛУШКА
            console.log("Попытка регистрации (AuthContext):", userData);
            // const response = await apiClient.post('/auth/register', userData);
            // setLoading(false);
            // return response.data; // Обычно регистрация не возвращает токен сразу, а требует логина

            // Имитация успешной регистрации
            setLoading(false);
            console.log("AuthContext: Заглушка успешной регистрации");
            return { message: "Регистрация прошла успешно. Пожалуйста, войдите." };
        } catch (error) {
            console.error("Ошибка регистрации (AuthContext):", error);
            setLoading(false);
            throw error;
        }
    };


    const logout = () => {
        // ЗАГЛУШКА
        console.log("Выход (AuthContext)");
        localStorage.removeItem('authToken');
        // delete apiClient.defaults.headers.common['Authorization'];
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

// Хук для использования контекста аутентификации
export const useAuth = () => {
    return useContext(AuthContext);
};