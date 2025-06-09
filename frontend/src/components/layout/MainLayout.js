// src/components/layout/MainLayout.js
import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';

const MainLayout = ({ children }) => {
    return (
        <>
            <Navbar />
            <main className="main-content container py-4">
                {children}
            </main>
            <Footer />
        </>
    );
};

export default MainLayout;