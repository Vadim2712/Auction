// src/context/AuthContext.js
import React, { createContext, useState, useContext, useEffect, useCallback } from 'react';
import { registerUser, getCurrentUser } from '../services/apiClient'; // loginUser теперь не нужен напрямую здесь

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [authToken, setAuthToken] = useState(localStorage.getItem('authToken'));
    const [activeRole, setActiveRole] = useState(localStorage.getItem('activeRole'));
    const [isAuthenticated, setIsAuthenticated] = useState(false); // Инициализируем как false
    const [loading, setLoading] = useState(true); // Для начальной проверки токена

    const verifyAuthToken = useCallback(async () => {
        const tokenFromStorage = localStorage.getItem('authToken');
        const userFromStorage = localStorage.getItem('currentUser');
        const roleFromStorage = localStorage.getItem('activeRole');

        if (tokenFromStorage && userFromStorage && roleFromStorage) {
            try {
                // В реальном приложении можно было бы просто вызвать /auth/me
                // и если успешно, то пользователь аутентифицирован.
                // Если /auth/me возвращает данные пользователя, можно обновить currentUser.
                // apiClient.defaults.headers.common['Authorization'] = `Bearer ${tokenFromStorage}`; // Уже в interceptor

                // Попытаемся получить данные пользователя по текущему токену
                const response = await getCurrentUser(); // Использует токен из localStorage через interceptor

                setCurrentUser(response.data.profile || JSON.parse(userFromStorage)); // Обновляем или используем сохраненные, если /me не вернул полный профиль
                setAuthToken(tokenFromStorage);
                setActiveRole(response.data.activeRole || roleFromStorage); // Предпочитаем роль из ответа /me
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


    // Эта функция теперь будет вызываться из LoginPage ПОСЛЕ успешной валидации
    // и выбора роли. `userDataFromValidation` - это объект пользователя,
    // `tokenFromValidation` - токен (может быть тот же, что и финальный, или временный).
    // `chosenRole` - роль, выбранная пользователем.
    const establishSession = (userDataFromValidation, tokenFromValidation, chosenRole) => {
        console.log('[AuthContext] Установка сессии. Пользователь:', userDataFromValidation, 'Выбранная роль:', chosenRole, 'Токен:', tokenFromValidation);

        // В реальном API, если validateCredentials возвращал временный токен,
        // здесь мог бы быть еще один вызов к бэкенду для "полного" логина с выбранной ролью
        // и получения финального токена, который уже содержит эту роль.
        // Но в нашем случае бэкенд /auth/login уже ожидает роль и возвращает финальный токен.
        // Так что tokenFromValidation от validateCredentials может быть просто использован или проигнорирован,
        // если LoginPage делает еще один вызов loginUser из apiClient.js, передавая туда выбранную роль.
        // Давайте предположим, что LoginPage передаст финальный токен и user объект, полученный от /auth/login

        localStorage.setItem('authToken', tokenFromValidation); // Сохраняем финальный токен
        localStorage.setItem('currentUser', JSON.stringify(userDataFromValidation)); // Сохраняем данные пользователя
        localStorage.setItem('activeRole', chosenRole); // Сохраняем активную роль

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
        // delete apiClient.defaults.headers.common['Authorization']; // Делается interceptor'ом при отсутствии токена

        setAuthToken(null);
        setCurrentUser(null);
        setActiveRole(null);
        setIsAuthenticated(false);
    };

    const processRegistration = async (registrationData) => {
        // setLoading(true); // LoginPage/RegistrationPage могут иметь свой локальный loading
        try {
            const response = await registerUser(registrationData); // Вызов apiClient.registerUser
            // setLoading(false);
            return response.data; // Возвращаем { message: "..." }
        } catch (error) {
            // setLoading(false);
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
            loading, // Глобальный loading для инициализации AuthContext
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