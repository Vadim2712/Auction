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
import MyListingsPage from './pages/MyListingsPage';
import AddLotPage from './pages/AddLotPage';
import MyActivityPage from './pages/MyActivityPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ManageUsersPage from './pages/ManageUsersPage'; // Добавили импорт
import ReportPage from './pages/ReportPage'; // Добавили импорт

import './App.css';

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
              path="/profile"
              element={
                <ProtectedRoute roles={['buyer', 'seller', 'admin']}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-auction"
              element={
                <ProtectedRoute roles={['admin', 'seller']}>
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
                <ProtectedRoute roles={['buyer', 'seller', 'admin']}>
                  <MyActivityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-listings"
              element={
                <ProtectedRoute roles={['seller', 'admin']}>
                  <MyListingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute roles={['admin']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route // Новый маршрут для управления пользователями
              path="/admin/users"
              element={
                <ProtectedRoute roles={['admin']}> {/* Только для 'admin' */}
                  <ManageUsersPage />
                </ProtectedRoute>
              }
            />
            <Route // Новый маршрут для отчетов
              path="/reports"
              element={
                // Роли здесь могут быть 'admin' или также 'seller' (менеджер), если им нужен доступ
                <ProtectedRoute roles={['admin', 'seller']}>
                  <ReportPage />
                </ProtectedRoute>
              }
            />

            {/* Маршрут для ненайденных страниц */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </MainLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;