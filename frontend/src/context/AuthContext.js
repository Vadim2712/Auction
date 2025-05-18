// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
import { loginUser, registerUser }
    //, checkTokenValidity // Если бы была такая функция на бэкенде
    from '../services/apiClient'; // <--- Импортируем функции API

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true); // Изначально true для проверки токена

    useEffect(() => {
        const verifyToken = async () => {
            const token = localStorage.getItem('authToken');
            if (token) {
                try {
                    // ЗАГЛУШКА: В реальном приложении здесь должен быть вызов к API для проверки токена
                    // и получения данных пользователя. Например:
                    // const response = await checkTokenValidity(token); // или apiClient.get('/auth/me');
                    // setUser(response.data.user);
                    // setIsAuthenticated(true);

                    // Имитируем успешную проверку токена, если он есть (очень упрощенно)
                    console.log("AuthContext: Найден токен, имитируем пользователя (ЗАГЛУШКА)");
                    // Здесь можно попытаться распарсить токен, если он содержит user info,
                    // но это небезопасно без серверной валидации.
                    // Для заглушки просто создадим фейкового юзера, если есть токен.
                    setUser({ id: 0, fullName: "Загруженный Пользователь", email: "token@example.com", role: "buyer" });
                    setIsAuthenticated(true);

                } catch (error) {
                    console.error("AuthContext: Ошибка проверки токена (ЗАГЛУШКА)", error);
                    localStorage.removeItem('authToken');
                    setUser(null);
                    setIsAuthenticated(false);
                }
            }
            setLoading(false);
        };
        verifyToken();
    }, []);


    const login = async (email, password) => {
        setLoading(true);
        try {
            const response = await loginUser({ email, password }); // <--- Используем apiClient
            const { token, user: userData } = response.data;
            localStorage.setItem('authToken', token);
            // apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`; // Уже делается интерцептором
            setUser(userData);
            setIsAuthenticated(true);
            setLoading(false);
            return userData;
        } catch (error) {
            console.error("Ошибка входа (AuthContext):", error.response?.data?.message || error.message);
            localStorage.removeItem('authToken');
            setUser(null);
            setIsAuthenticated(false);
            setLoading(false);
            throw error.response?.data || new Error('Ошибка входа');
        }
    };

    const register = async (userData) => {
        setLoading(true);
        try {
            const response = await registerUser(userData); // <--- Используем apiClient
            setLoading(false);
            return response.data;
        } catch (error) {
            console.error("Ошибка регистрации (AuthContext):", error.response?.data?.message || error.message);
            setLoading(false);
            throw error.response?.data || new Error('Ошибка регистрации');
        }
    };

    const logout = () => {
        console.log("Выход (AuthContext)");
        localStorage.removeItem('authToken');
        // delete apiClient.defaults.headers.common['Authorization']; // Уже делается интерцептором при отсутствии токена
        setUser(null);
        setIsAuthenticated(false);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout, register }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};