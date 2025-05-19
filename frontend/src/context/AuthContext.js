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
        console.log('[AuthContext] Attempting login for:', email);
        try {
            const response = await loginUser(email, password); // Вызов apiClient
            console.log('[AuthContext] loginUser response:', response); // <--- Что пришло от apiClient
            const { token, user: userData } = response.data;
            localStorage.setItem('authToken', token);
            setUser(userData);
            setIsAuthenticated(true);
            console.log('[AuthContext] Login successful, user set:', userData);
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

    const register = async (payload) => {
        setLoading(true);
        console.log('[AuthContext] Attempting registration for:', payload.email);
        try {
            const response = await registerUser(payload); // Вызов apiClient
            console.log('[AuthContext] registerUser response:', response); // <--- Что пришло от apiClient
            // Если registerUser сразу логинит:
            if (response.data.token && response.data.user) {
                localStorage.setItem('authToken', response.data.token);
                setUser(response.data.user);
                setIsAuthenticated(true);
                console.log('[AuthContext] Registration successful, user set and logged in:', response.data.user);
            } else {
                console.log('[AuthContext] Registration successful, message:', response.data.message);
                // Здесь можно не логинить автоматически, а просто показать сообщение и перенаправить на логин
            }
            setLoading(false);
            return response.data; // Возвращаем полный ответ для обработки на странице
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