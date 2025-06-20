// src/components/layout/Footer.js
import React from 'react';
import './Footer.css';

const Footer = () => {
    const currentYear = new Date().getFullYear();
    return (
        <footer className="footer">
            <div className="footer-content">
                <p>&copy; {currentYear} Система "Аукцион". Все права защищены.(или не очень)</p>
                <p>
                    Разработано в рамках курсового проекта. <a href="https://github.com/Vadim2712/Auction" target="_blank" rel="noopener noreferrer">GitHub проекта</a>
                </p>
            </div>
        </footer>
    );
};

export default Footer;