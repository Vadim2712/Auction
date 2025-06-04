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
import EditLotPage from './pages/EditLotPage';
import MyActivityPage from './pages/MyActivityPage';
import NotFoundPage from './pages/NotFoundPage';
import ProfilePage from './pages/ProfilePage';
import AdminDashboardPage from './pages/AdminDashboardPage';
import ManageUsersPage from './pages/ManageUsersPage';
import ReportPage from './pages/ReportPage';

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
                // Доступно всем аутентифицированным пользователям с бизнес-ролью или системному администратору
                <ProtectedRoute roles={['buyer', 'seller', 'SYSTEM_ADMIN']}>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-auction"
              element={
                // Создавать аукционы могут SYSTEM_ADMIN и пользователи с активной ролью 'seller'
                <ProtectedRoute roles={['SYSTEM_ADMIN', 'seller']}>
                  <CreateAuctionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auctions/:auctionId/add-lot"
              element={
                // Добавлять лоты могут SYSTEM_ADMIN и пользователи с активной ролью 'seller'
                <ProtectedRoute roles={['SYSTEM_ADMIN', 'seller']}>
                  <AddLotPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auctions/:auctionId/lots/:lotId/edit"
              element={
                // Редактировать лоты могут SYSTEM_ADMIN и пользователи с активной ролью 'seller'
                <ProtectedRoute roles={['SYSTEM_ADMIN', 'seller']}>
                  <EditLotPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-activity"
              element={
                <ProtectedRoute roles={['buyer', 'seller', 'SYSTEM_ADMIN']}>
                  <MyActivityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-listings"
              element={
                <ProtectedRoute roles={['seller', 'SYSTEM_ADMIN']}>
                  <MyListingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute roles={['SYSTEM_ADMIN']}>
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute roles={['SYSTEM_ADMIN']}>
                  <ManageUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                // Отчеты доступны SYSTEM_ADMIN и пользователям с активной ролью 'seller'
                <ProtectedRoute roles={['SYSTEM_ADMIN', 'seller']}>
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