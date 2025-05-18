import React from 'react';
import { BrowserRouter as Router, Route, Routes, Link } from 'react-router-dom';
import './App.css'; // Общие стили

// Примерные компоненты страниц (создайте их в src/pages/)
const HomePage = () => <h2>Главная страница</h2>;
const AuctionsPage = () => <h2>Аукционы</h2>;
const LoginPage = () => <h2>Вход</h2>;
// ... другие страницы

function App() {
  return (
    <Router>
      <div>
        <nav>
          <ul>
            <li><Link to="/">Главная</Link></li>
            <li><Link to="/auctions">Аукционы</Link></li>
            <li><Link to="/login">Войти</Link></li>
            {/* Добавьте другие ссылки по мере необходимости */}
          </ul>
        </nav>

        <hr />

        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/auctions" element={<AuctionsPage />} />
          <Route path="/login" element={<LoginPage />} />
          {/* Определите маршруты для других страниц */}
        </Routes>
      </div>
    </Router>
  );
}

export default App;