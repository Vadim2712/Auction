// src/pages/ReportPage.js
import React, { useState } from 'react';
// import {
//     getLotWithMaxPriceDifference,
//     getAuctionWithMostSoldLots,
//     getBuyerAndSellerOfMostExpensiveLot,
//     // ... другие функции apiClient для отчетов
// } from '../services/apiClient';
// import Alert from '../components/common/Alert';
// import Loader from '../components/common/Loader';
// import Card from '../components/common/Card';
// import Table from '../components/common/Table';
// import './ReportPage.css'; // Если нужны специфичные стили

const ReportPage = () => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [reportData, setReportData] = useState(null);
    const [selectedReport, setSelectedReport] = useState('');

    const handleGenerateReport = async (reportType) => {
        // setSelectedReport(reportType);
        // setLoading(true);
        // setError('');
        // setReportData(null);
        // try {
        //     let response;
        //     switch (reportType) {
        //         case 'lotMaxPriceDiff':
        //             response = await getLotWithMaxPriceDifference();
        //             break;
        //         case 'auctionMostSold':
        //             response = await getAuctionWithMostSoldLots();
        //             break;
        //         case 'mostExpensiveLotInfo':
        //             response = await getBuyerAndSellerOfMostExpensiveLot();
        //             break;
        //         // Добавить другие кейсы для всех отчетов
        //         default:
        //             throw new Error('Неизвестный тип отчета');
        //     }
        //     setReportData(response.data);
        // } catch (err) {
        //     console.error(`Ошибка генерации отчета ${reportType}:`, err);
        //     setError(`Не удалось сгенерировать отчет: ${err.response?.data?.message || err.message}`);
        // } finally {
        //     setLoading(false);
        // }
        console.log(`Генерация отчета: ${reportType} (имитация)`);
        alert(`Запрос на генерацию отчета "${reportType}" отправлен (имитация). Результаты будут отображены здесь.`);
    };

    // const renderReportData = () => {
    //     if (!reportData) return null;
    //     // Здесь будет логика отображения разных отчетов
    //     // Например, для 'lotMaxPriceDiff':
    //     // if (selectedReport === 'lotMaxPriceDiff' && reportData.lot) {
    //     //     return <Card title="Лот с макс. разницей цен"> ... </Card>;
    //     // }
    //     // Для списков можно использовать <Table />
    //     return <pre>{JSON.stringify(reportData, null, 2)}</pre>; // Пока просто JSON
    // };

    return (
        <div className="report-page container">
            <h1>Страница отчетов</h1>
            <p>Выберите отчет для генерации. Эта страница находится в активной разработке.</p>

            <div className="report-selectors">
                {/* Заменить на более удобные селекторы или кнопки */}
                <button onClick={() => handleGenerateReport('lotMaxPriceDiff')} disabled={loading} className="button">Лот с макс. разницей цен</button>
                <button onClick={() => handleGenerateReport('auctionMostSold')} disabled={loading} className="button">Аукцион с макс. продажами</button>
                <button onClick={() => handleGenerateReport('mostExpensiveLotInfo')} disabled={loading} className="button">Инфо о самом дорогом лоте</button>
                {/* Добавить кнопки для всех необходимых отчетов */}
                {/* getAuctionsWithNoSoldLots
                    getTopNMostExpensiveSoldLots
                    getItemsForSaleByDateAndAuction
                    getBuyersOfItemsWithSpecificity
                    getSellersReportBySpecificity
                */}
            </div>

            {loading && <p>Генерация отчета...</p> /* <Loader text="Генерация отчета..." /> */}
            {error && <p className="error-message">{error}</p> /* <Alert message={error} type="danger" /> */}

            <div className="report-display-area">
                <h2>Результаты отчета: {selectedReport}</h2>
                {reportData ? (
                    <div> {/* Здесь будет renderReportData() */}
                        <p>Данные отчета (пока в JSON):</p>
                        <pre>{JSON.stringify(reportData, null, 2)}</pre>
                    </div>
                ) : (
                    <p>Выберите отчет, чтобы увидеть данные.</p>
                )}
            </div>
        </div>
    );
};

export default ReportPage;