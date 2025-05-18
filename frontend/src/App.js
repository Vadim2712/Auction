// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css'; // Общие стили из create-react-app
import './index.css'; // Наши глобальные стили

import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
// import AuctionsListPage from './pages/AuctionsListPage'; // Создадим далее
// import AuctionDetailPage from './pages/AuctionDetailPage'; // Создадим далее
// import NotFoundPage from './pages/NotFoundPage'; // Хорошо бы иметь

import { AuthProvider } from './context/AuthContext';

// Заглушки для страниц, которые еще не созданы
const AuctionsListPage = () => <h2>Список Аукционов (скоро здесь будут аукционы!)</h2>;
const NotFoundPage = () => <h2>404 - Страница не найдена</h2>;


function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout> {/* Оборачиваем все маршруты в MainLayout */}
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/auctions" element={<AuctionsListPage />} />
            {/* <Route path="/auctions/:id" element={<AuctionDetailPage />} /> */}
            {/* Добавить маршруты для профиля, добавления лота, админки и т.д. */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </MainLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;