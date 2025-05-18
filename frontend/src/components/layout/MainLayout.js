// src/components/layout/MainLayout.js
import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const MainLayout = ({ children }) => {
    return (
        <div className="main-layout">
            <Navbar />
            <main className="main-content">
                <div className="container"> {/* Обертка для контента страницы */}
                    {children}
                </div>
            </main>
            <Footer />
        </div>
    );
};

export default MainLayout;