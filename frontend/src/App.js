// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';


import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
import AuctionsListPage from './pages/AuctionsListPage';
import AuctionDetailPage from './pages/AuctionDetailPage';
import CreateAuctionPage from './pages/CreateAuctionPage'; // <--- Импортируем новую страницу
import AddLotPage from './pages/AddLotPage';
import NotFoundPage from './pages/NotFoundPage'; // Если NotFoundPage у вас отдельно

import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/auth/ProtectedRoute'; // <--- Импортируем ProtectedRoute

// const NotFoundPage = () => <h2>404 - Страница не найдена</h2>; // Если не импортируете

function App() {
  return (
    <AuthProvider>
      <Router>
        <MainLayout>
          <Routes>
            {/* ... (существующие маршруты) ... */}
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegistrationPage />} />
            <Route path="/auctions" element={<AuctionsListPage />} />
            <Route path="/auctions/:id" element={<AuctionDetailPage />} />

            <Route
              path="/auctions/create"
              element={
                <ProtectedRoute roles={['admin']}>
                  <CreateAuctionPage />
                </ProtectedRoute>
              }
            />

            {/* Новый защищенный маршрут для добавления лота */}
            <Route
              path="/auctions/:auctionId/add-lot"
              element={
                <ProtectedRoute roles={['admin', 'seller']}> {/* Доступно админам и продавцам */}
                  <AddLotPage />
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