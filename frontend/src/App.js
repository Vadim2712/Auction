// src/App.js
import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import './App.css'; // Общие стили

// Компоненты макета (предполагается, что вы их создали или создадите)
// import Navbar from './components/layout/Navbar';
// import Footer from './components/layout/Footer';
// import MainLayout from './components/layout/MainLayout';

// Страницы
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegistrationPage from './pages/RegistrationPage';
// const AuctionsPage = () => <h2>Аукционы (заглушка)</h2>; // Ваша заглушка или реальный компонент

function App() {
  return (
    <Router>
      {/* <Navbar />  // Если вы используете компонент Navbar */}
      {/* Обертка MainLayout может быть здесь, если она включает Navbar/Footer */}
      {/* <MainLayout> */}
      <nav> {/* Временная навигация, если Navbar еще не готов */}
        <ul>
          <li><Link to="/">Главная</Link></li>
          {/* <li><Link to="/auctions">Аукционы</Link></li> */}
          <li><Link to="/login">Войти</Link></li>
          <li><Link to="/register">Регистрация</Link></li>
        </ul>
      </nav>
      <hr />
      <div className="container"> {/* Добавьте класс для основных стилей контента, если нужно */}
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegistrationPage />} />
          {/* <Route path="/auctions" element={<AuctionsPage />} /> */}
          {/* Определите маршруты для других страниц: AuctionListPage, AuctionDetailPage и т.д. */}
          {/* <Route path="*" element={<NotFoundPage />} /> // Для обработки ненайденных маршрутов */}
        </Routes>
      </div>
      {/* </MainLayout> */}
      {/* <Footer /> // Если вы используете компонент Footer */}
    </Router>
  );
}

export default App;