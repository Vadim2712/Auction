// src/components/layout/MainLayout.js
import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
// import './MainLayout.css'; // если создадите отдельный файл для MainLayout

const MainLayout = ({ children }) => {
    return (
        // Если используете App.css для #root flex, то этот div может не нуждаться в flex
        // Но если хотите изолировать стили MainLayout:
        // <div className="main-layout-container">
        <>
            <Navbar />
            <main className="main-content container py-4"> {/* py-4 для отступов bootstrap */}
                {children}
            </main>
            <Footer />
        </>
        // </div>
    );
};

export default MainLayout;