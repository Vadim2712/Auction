// src/components/layout/Footer.js
import React from 'react';

const Footer = () => {
    return (
        <footer className="footer">
            <p>&copy; {new Date().getFullYear()} Проект "Аукцион". Все права защищены (или не очень).</p>
        </footer>
    );
};

export default Footer;