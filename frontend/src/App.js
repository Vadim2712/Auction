// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import './App.css'; // Общие стили из create-react-app
import './index.css'; // Наши глобальные стили

import MainLayout from './components/layout/MainLayout';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import AuctionsListPage from './pages/AuctionsListPage';
import AuctionDetailPage from './pages/AuctionDetailPage'; // Создадим далее
// import NotFoundPage from './pages/NotFoundPage'; // Хорошо бы иметь

import { AuthProvider } from './context/AuthContext';

// Заглушки для страниц, которые еще не созданы
const NotFoundPage = () => <h2>404 - Страница не найдена</h2>;


function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/auctions" element={<AuctionsListPage />} />
            <Route path="/auctions/:id" element={<AuctionDetailPage />} /> {/* <--- Новый динамический маршрут */}
            {/* Добавить маршруты для профиля, добавления лота, админки и т.д. */}
            {/* Пример для добавления лота:
            <Route path="/auctions/:auctionId/add-lot" element={<AddLotPage />} />
            */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </MainLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;