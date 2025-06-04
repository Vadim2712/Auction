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
import EditLotPage from './pages/EditLotPage'; // <<-- НОВЫЙ ИМПОРТ
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
                <ProtectedRoute roles={['buyer', 'seller', 'SYSTEM_ADMIN', 'admin']}> {/* Добавил SYSTEM_ADMIN и 'admin' для полноты */}
                  <ProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/create-auction"
              element={
                <ProtectedRoute roles={['SYSTEM_ADMIN', 'seller', 'admin']}> {/* 'admin' - если есть обобщенная, 'seller' - новая логика */}
                  <CreateAuctionPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/auctions/:auctionId/add-lot"
              element={
                <ProtectedRoute roles={['SYSTEM_ADMIN', 'seller', 'admin']}>
                  <AddLotPage />
                </ProtectedRoute>
              }
            />
            <Route // <<-- НОВЫЙ МАРШРУТ ДЛЯ РЕДАКТИРОВАНИЯ ЛОТА
              path="/auctions/:auctionId/lots/:lotId/edit"
              element={
                <ProtectedRoute roles={['SYSTEM_ADMIN', 'seller', 'admin']}> {/* Права аналогичны добавлению/удалению */}
                  <EditLotPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-activity"
              element={
                <ProtectedRoute roles={['buyer', 'seller', 'SYSTEM_ADMIN', 'admin']}>
                  <MyActivityPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/my-listings"
              element={
                <ProtectedRoute roles={['seller', 'SYSTEM_ADMIN', 'admin']}>
                  <MyListingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/dashboard"
              element={
                <ProtectedRoute roles={['SYSTEM_ADMIN', 'admin']}> {/* 'admin' - если используете обобщенную роль в AuthContext */}
                  <AdminDashboardPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute roles={['SYSTEM_ADMIN', 'admin']}>
                  <ManageUsersPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute roles={['SYSTEM_ADMIN', 'seller', 'admin']}>
                  <ReportPage />
                </ProtectedRoute>
              }
            />

            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </MainLayout>
      </Router>
    </AuthProvider>
  );
}

export default App;