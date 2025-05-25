// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect } from 'react';
// validateCredentials теперь будет использоваться на LoginPage, а не здесь напрямую для "полного" логина
// registerUser остается для вызова со страницы регистрации
import { registerUser } from '../services/apiClient'; // Убедитесь, что getMyActivity и другие не auth функции тут не импортируются

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
    const [activeRole, setActiveRole] = useState(localStorage.getItem('activeRole'));
    const [isAuthenticated, setIsAuthenticated] = useState(!!localStorage.getItem('authToken')); // Начальное состояние
    const [loading, setLoading] = useState(true); // Изначально true для проверки токена

    useEffect(() => {
        // При загрузке приложения пытаемся восстановить сессию из localStorage
        const storedUser = localStorage.getItem('currentUser');
        const storedToken = localStorage.getItem('authToken');
        const storedRole = localStorage.getItem('activeRole');

        if (storedToken && storedUser && storedRole) {
            try {
                setCurrentUser(JSON.parse(storedUser));
                setAuthToken(storedToken);
                setActiveRole(storedRole);
                setIsAuthenticated(true);
                // В реальном приложении здесь бы была проверка токена на валидность через API
                // apiClient.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`; // Уже делается interceptor'ом
            } catch (error) {
                console.error("Ошибка восстановления сессии из localStorage:", error);
                localStorage.clear(); // Очищаем, если данные некорректны
                setIsAuthenticated(false);
                setCurrentUser(null);
                setActiveRole(null);
            }
        }
        setLoading(false);
    }, []);

    // Новая функция для установки сессии после выбора роли
    const establishSession = (userData, token, chosenRole) => {
        console.log('[AuthContext] Establishing session with user:', userData, 'role:', chosenRole, 'token:', token);
        localStorage.setItem('authToken', token);
        localStorage.setItem('currentUser', JSON.stringify(userData));
        localStorage.setItem('activeRole', chosenRole);
        // apiClient.defaults.headers.common['Authorization'] = `Bearer ${token}`; // Уже делается interceptor'ом

        setAuthToken(token);
        setCurrentUser(userData);
        setActiveRole(chosenRole);
        setIsAuthenticated(true);
        setLoading(false); // Убедимся, что загрузка завершена
    };

    const logout = () => {
        console.log('[AuthContext] Logging out');
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('activeRole');
        // delete apiClient.defaults.headers.common['Authorization']; // Уже делается interceptor'ом

        setAuthToken(null);
        setCurrentUser(null);
        setActiveRole(null);
        setIsAuthenticated(false);
    };

    // Функция register остается для страницы регистрации
    const processRegistration = async (registrationData) => {
        setLoading(true);
        try {
            const response = await registerUser(registrationData); // Вызов apiClient.registerUser
            console.log('[AuthContext] registerUser response from apiClient:', response);
            setLoading(false);
            return response.data; // Возвращаем { message: "..." }
        } catch (error) {
            console.error("[AuthContext] Registration error from apiClient:", error);
            setLoading(false);
            throw error.response?.data || new Error(error.message || 'Ошибка регистрации');
        }
    };


    return (
        <AuthContext.Provider value={{
            currentUser,
            authToken,
            activeRole,
            isAuthenticated,
            loading,
            establishSession, // Новая функция для LoginPage
            logout,
            processRegistration // Для RegistrationPage
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};