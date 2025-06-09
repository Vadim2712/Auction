// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { registerUser, getCurrentUser } from '../services/apiClient';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
    const [activeRole, setActiveRole] = useState(localStorage.getItem('activeRole'));
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);

    const verifyAuthToken = useCallback(async () => {
        const tokenFromStorage = localStorage.getItem('authToken');
        const userFromStorage = localStorage.getItem('currentUser');
        const roleFromStorage = localStorage.getItem('activeRole');

        if (tokenFromStorage && userFromStorage && roleFromStorage) {
            try {
                const response = await getCurrentUser();

                setCurrentUser(response.data.profile || JSON.parse(userFromStorage));
                setAuthToken(tokenFromStorage);
                setActiveRole(response.data.activeRole || roleFromStorage);
                setIsAuthenticated(true);
                console.log('[AuthContext] Сессия восстановлена, пользователь:', response.data.profile || JSON.parse(userFromStorage), "Активная роль:", response.data.activeRole || roleFromStorage);

            } catch (error) {
                console.error("[AuthContext] Ошибка проверки токена или токен невалиден:", error.response?.data?.message || error.message);
                localStorage.removeItem('authToken');
                localStorage.removeItem('currentUser');
                localStorage.removeItem('activeRole');
                setCurrentUser(null);
                setActiveRole(null);
                setIsAuthenticated(false);
            }
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        verifyAuthToken();
    }, [verifyAuthToken]);

    const establishSession = (userDataFromValidation, tokenFromValidation, chosenRole) => {
        console.log('[AuthContext] Установка сессии. Пользователь:', userDataFromValidation, 'Выбранная роль:', chosenRole, 'Токен:', tokenFromValidation);

        localStorage.setItem('authToken', tokenFromValidation);
        localStorage.setItem('currentUser', JSON.stringify(userDataFromValidation));
        localStorage.setItem('activeRole', chosenRole);
        setAuthToken(tokenFromValidation);
        setCurrentUser(userDataFromValidation);
        setActiveRole(chosenRole);
        setIsAuthenticated(true);
        setLoading(false);
    };

    const logout = () => {
        console.log('[AuthContext] Выход из системы');
        localStorage.removeItem('authToken');
        localStorage.removeItem('currentUser');
        localStorage.removeItem('activeRole');

        setAuthToken(null);
        setCurrentUser(null);
        setActiveRole(null);
        setIsAuthenticated(false);
    };

    const processRegistration = async (registrationData) => {
        try {
            const response = await registerUser(registrationData);
            return response.data;
        } catch (error) {
            console.error("[AuthContext] Ошибка регистрации:", error.response?.data || error);
            throw error.response?.data || new Error(error.message || 'Ошибка регистрации');
        }
    };
    console.log('[AuthContext State] loading:', loading, 'isAuthenticated:', isAuthenticated, 'currentUser:', currentUser, 'activeRole:', activeRole);
    return (
        <AuthContext.Provider value={{
            currentUser,
            authToken,
            activeRole,
            isAuthenticated,
            loading,
            establishSession,
            logout,
            processRegistration
        }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    return useContext(AuthContext);
};