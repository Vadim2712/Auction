// src/services/apiClient.js (или как вы его назовете)
import axios from 'axios';

const apiClient = axios.create({
    baseURL: 'http://localhost:8080/api/v1', // URL вашего бэкенда
    headers: {
        'Content-Type': 'application/json',
    },
});

// Можно добавить interceptors для автоматического добавления токена авторизации
// apiClient.interceptors.request.use(config => {
//   const token = localStorage.getItem('authToken');
//   if (token) {
//     config.headers.Authorization = `Bearer ${token}`;
//   }
//   return config;
// });

export default apiClient;