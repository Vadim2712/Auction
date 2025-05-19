// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import MainLayout from './components/layout/MainLayout';
import ProtectedRoute from './components/ProtectedRoute';

import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import AuctionsListPage from './pages/AuctionsListPage';
import AuctionDetailPage from './pages/AuctionDetailPage';
import CreateAuctionPage from './pages/CreateAuctionPage';
import AddLotPage from './pages/AddLotPage';
import MyActivityPage from './pages/MyActivityPage'; // Страница активности пользователя
// import MyListingsPage from './pages/MyListingsPage'; // Раскомментируйте, когда создадим
import NotFoundPage from './pages/NotFoundPage';

import './App.css'; // Основные стили приложения

function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout>
          <Routes>
            {/* Публичные маршруты */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/auctions" element={<AuctionsListPage />} />
            <Route path="/auctions/:id" element={<AuctionDetailPage />} />

            {/* Защищенные маршруты */}
            <Route
              path="/create-auction"
              element={
                <ProtectedRoute roles={['admin']}>
                  <CreateAuctionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auctions/:auctionId/add-lot"
              element={
                <ProtectedRoute roles={['admin', 'seller']}>
                  <AddLotPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-activity"
              element={
                <ProtectedRoute roles={['buyer', 'seller', 'admin']}> {/* Доступно всем авторизованным */}
                  <MyActivityPage />
                </ProtectedRoute>
              }
            />
            {/*
            <Route
              path="/my-listings"
              element={
                <ProtectedRoute roles={['seller', 'admin']}>
                  <MyListingsPage />
                </ProtectedRoute>
              }
            />
            */}

            {/* Маршрут для ненайденных страниц */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </MainLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;