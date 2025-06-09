// src/pages/ReportPage.js
import React, { useState, useCallback, useEffect } from 'react';
import {
    getLotWithMaxPriceDifference,
    getAuctionWithMostSoldLots,
    getBuyerAndSellerOfMostExpensiveLot,
    getAuctionsWithNoSoldLots,
    getTopNMostExpensiveSoldLots,
    getItemsForSaleByDateAndAuction,
    getBuyersOfItemsWithSpecificity,
    getSellersReportBySpecificity,
} from '../services/apiClient';
import { useAuth } from '../context/AuthContext';
import Alert from '../components/common/Alert';
import Loader from '../components/common/Loader';
import Card from '../components/common/Card';
import Table from '../components/common/Table';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import Pagination from '../components/common/Pagination';
import './ReportPage.css';

const ReportPage = () => {
    const { loading: authLoading, isAuthenticated, activeRole } = useAuth();
    const [loadingReport, setLoadingReport] = useState(false);
    const [error, setError] = useState('');
    const [reportData, setReportData] = useState(null);
    const [currentReportType, setCurrentReportType] = useState('');
    const [currentReportLabel, setCurrentReportLabel] = useState('');

    const [reportParams, setReportParams] = useState({
        limit: '3',
        auctionIdForItems: '',
        dateForItems: '',
        specificityForBuyers: '',
        specificityForSellers: '',
        minSalesForSellers: '0',
        page: 1,
        pageSize: 10,
    });

    const reportsConfig = React.useMemo(() => [
        { type: 'lotMaxPriceDiff', label: 'Лот с макс. разницей цен', apiFn: getLotWithMaxPriceDifference, params: [] },
        { type: 'auctionMostSold', label: 'Аукцион с макс. продажами', apiFn: getAuctionWithMostSoldLots, params: [] },
        { type: 'mostExpensiveLotInfo', label: 'Инфо о самом дорогом лоте', apiFn: getBuyerAndSellerOfMostExpensiveLot, params: [] },
        { type: 'auctionsNoSales', label: 'Аукционы без продаж', apiFn: (p) => getAuctionsWithNoSoldLots({ page: p.page, pageSize: p.pageSize }), params: ['page', 'pageSize'], paginated: true },
        { type: 'topNExpensiveLots', label: 'Топ N дорогих лотов', apiFn: (p) => getTopNMostExpensiveSoldLots(parseInt(p.limit, 10)), params: ['limit'] },
        { type: 'itemsForSale', label: 'Предметы на дату и аукционе', apiFn: (p) => getItemsForSaleByDateAndAuction(p.auctionIdForItems, p.dateForItems), params: ['auctionIdForItems', 'dateForItems'], requiredParams: ['auctionIdForItems', 'dateForItems'] },
        { type: 'buyersBySpecificity', label: 'Покупатели по специфике', apiFn: (p) => getBuyersOfItemsWithSpecificity(p.specificityForBuyers, { page: p.page, pageSize: p.pageSize }), params: ['specificityForBuyers', 'page', 'pageSize'], requiredParams: ['specificityForBuyers'], paginated: true },
        { type: 'sellersBySpecificity', label: 'Продавцы по специфике', apiFn: (p) => getSellersReportBySpecificity(p.specificityForSellers, parseFloat(p.minSalesForSellers) || 0, { page: p.page, pageSize: p.pageSize }), params: ['specificityForSellers', 'minSalesForSellers', 'page', 'pageSize'], requiredParams: ['specificityForSellers'], paginated: true },
    ], []);

    const handleParamChange = (e) => {
        const { name, value } = e.target;
        const shouldResetPage = name !== 'page' && name !== 'pageSize';
        setReportParams(prev => ({
            ...prev,
            [name]: value,
            page: shouldResetPage ? 1 : (name === 'page' ? parseInt(value, 10) || 1 : prev.page)
        }));
    };

    const executeReportGeneration = useCallback(async (reportTypeToGenerate, paramsForApi) => {
        if (!reportTypeToGenerate) return;

        const config = reportsConfig.find(r => r.type === reportTypeToGenerate);
        if (!config) {
            setError("Выбран неверный тип отчета.");
            return;
        }

        setCurrentReportType(reportTypeToGenerate);
        setCurrentReportLabel(config.label);
        setLoadingReport(true); setError(''); setReportData(null);

        try {
            if (config.requiredParams) {
                for (const paramName of config.requiredParams) {
                    if (!paramsForApi[paramName] || String(paramsForApi[paramName]).trim() === '') {
                        const fieldConfig = config.paramsConfig && config.paramsConfig[paramName];
                        const fieldLabel = fieldConfig ? fieldConfig.label : paramName;
                        throw new Error(`Параметр "${fieldLabel}" обязателен для этого отчета.`);
                    }
                }
            }
            const relevantParams = {};
            if (config.params.includes('limit')) relevantParams.limit = parseInt(paramsForApi.limit, 10) || 3;
            if (config.params.includes('auctionIdForItems')) relevantParams.auctionIdForItems = paramsForApi.auctionIdForItems;
            if (config.params.includes('dateForItems')) relevantParams.dateForItems = paramsForApi.dateForItems;
            if (config.params.includes('specificityForBuyers')) relevantParams.specificityForBuyers = paramsForApi.specificityForBuyers;
            if (config.params.includes('specificityForSellers')) relevantParams.specificityForSellers = paramsForApi.specificityForSellers;
            if (config.params.includes('minSalesForSellers')) relevantParams.minSalesForSellers = parseFloat(paramsForApi.minSalesForSellers) || 0;
            if (config.paginated) {
                relevantParams.page = parseInt(paramsForApi.page, 10) || 1;
                relevantParams.pageSize = parseInt(paramsForApi.pageSize, 10) || 10;
            }

            const response = await config.apiFn(relevantParams);
            setReportData(response.data);
        } catch (err) {
            console.error(`Ошибка генерации отчета ${reportTypeToGenerate}:`, err);
            const errMsg = err.response?.data?.error || err.response?.data?.message || err.message || 'Неизвестная ошибка';
            setError(`Не удалось сгенерировать отчет: ${errMsg}`);
        } finally {
            setLoadingReport(false);
        }
    }, [reportsConfig]);

    useEffect(() => {
        if (currentReportType) {
            const config = reportsConfig.find(r => r.type === currentReportType);
            if (config && config.paginated) {
                executeReportGeneration(currentReportType, reportParams);
            }
        }
    }, [reportParams.page, currentReportType]);

    const renderReportParamsInputs = () => {
        if (!currentReportType) return null;
        const config = reportsConfig.find(r => r.type === currentReportType);
        if (!config || !config.params || config.params.length === 0) return null;

        return (
            <div className="report-params-form">
                {config.params.map(paramName => {
                    let inputType = "text";
                    let label = paramName;
                    let placeholder = '';
                    let min, max, step;

                    const commonInputProps = {
                        key: paramName,
                        name: paramName,
                        value: reportParams[paramName] || '',
                        onChange: handleParamChange,
                        placeholder: placeholder,
                        min: min,
                        max: max,
                        step: step,
                        required: config.requiredParams?.includes(paramName),
                    };

                    switch (paramName) {
                        case 'limit': label = "Кол-во записей (N)"; inputType = "number"; commonInputProps.min = 1; break;
                        case 'auctionIdForItems': label = "ID Аукциона"; break;
                        case 'dateForItems': label = "Дата (ГГГГ-ММ-ДД)"; inputType = "date"; break;
                        case 'specificityForBuyers': label = "Специфика (для покупателей)"; commonInputProps.placeholder = "напр., картины"; break;
                        case 'specificityForSellers': label = "Специфика (для продавцов)"; commonInputProps.placeholder = "напр., антиквариат"; break;
                        case 'minSalesForSellers': label = "Мин. сумма продаж"; inputType = "number"; commonInputProps.min = 0; commonInputProps.step = "0.01"; break;
                        case 'page': label = "Страница"; inputType = "number"; commonInputProps.min = 1; break;
                        case 'pageSize': label = "Записей на странице"; inputType = "number"; commonInputProps.min = 1; commonInputProps.max = 100; break;
                        default: break;
                    }
                    commonInputProps.label = label;
                    commonInputProps.type = inputType;

                    return <Input {...commonInputProps} />;
                })}
            </div>
        );
    };

    const renderReportDataTable = (dataToRender, reportTypeForTable) => {
        if (!dataToRender || !Array.isArray(dataToRender) || dataToRender.length === 0) return <p>Нет данных для отображения в таблице.</p>;
        let headers = [];
        let rowRenderer;

        switch (reportTypeForTable) {
            case 'auctionsNoSales':
                headers = [{ label: 'ID' }, { label: 'Название/Специфика' }, { label: 'Дата' }, { label: 'Статус' }];
                rowRenderer = (item) => (
                    <tr key={item.id}><td>{item.id}</td><td>{item.nameSpecificity}</td><td>{new Date(item.auctionDate).toLocaleDateString('ru-RU')}</td><td>{item.status}</td></tr>
                );
                break;
            case 'topNExpensiveLots':
                headers = [{ label: 'ID Лота' }, { label: 'Название' }, { label: 'Продавец' }, { label: 'Покупатель' }, { label: 'Финальная цена (руб.)' }];
                rowRenderer = (item) => (
                    <tr key={item.id}><td>{item.id}</td><td>{item.name}</td><td>{item.User?.fullName || `ID ${item.sellerId}`}</td><td>{item.FinalBuyer?.fullName || `ID ${item.finalBuyerId}`}</td><td>{item.finalPrice}</td></tr>
                );
                break;
            case 'itemsForSale':
                headers = [{ label: 'Лот №' }, { label: 'Название' }, { label: 'Стартовая цена (руб.)' }, { label: 'Текущая цена (руб.)' }, { label: 'Статус' }];
                rowRenderer = (item) => (
                    <tr key={item.id}><td>{item.lotNumber}</td><td>{item.name}</td><td>{item.startPrice}</td><td>{item.currentPrice}</td><td>{item.status}</td></tr>
                );
                break;
            case 'buyersBySpecificity':
                headers = [{ label: 'ID Покупателя' }, { label: 'ФИО' }, { label: 'Email' }];
                rowRenderer = (item) => (
                    <tr key={item.id}><td>{item.id}</td><td>{item.fullName}</td><td>{item.email}</td></tr>
                );
                break;
            case 'sellersBySpecificity':
                headers = [{ label: 'ID Продавца' }, { label: 'ФИО Продавца' }, { label: 'Всего продано (сумма)' }, { label: 'Кол-во лотов' }];
                rowRenderer = (item) => (
                    <tr key={item.seller.id}><td>{item.seller.id}</td><td>{item.seller.fullName}</td><td>{item.totalSales?.toFixed(2)} руб.</td><td>{item.lotsSold}</td></tr>
                );
                break;
            default: return <pre>{JSON.stringify(dataToRender, null, 2)}</pre>;
        }
        return <Table headers={headers} data={dataToRender} renderRow={rowRenderer} emptyMessage="Нет данных для этого отчета." />;
    };

    const renderReportDisplay = () => {
        if (loadingReport) return <Loader text="Генерация отчета..." />;
        if (!reportData && currentReportType && !error) return <p>Нажмите "Сгенерировать отчет", чтобы увидеть данные.</p>;
        if (!reportData && !currentReportType && !error) return <p>Выберите отчет и параметры для генерации.</p>;
        if (!reportData && error) return null;
        if (!reportData) return null;

        switch (currentReportType) {
            case 'lotMaxPriceDiff':
                return reportData.lot ? (
                    <Card title={`Лот #${reportData.lot.id} (${reportData.lot.name})`}>
                        <p>Начальная цена: {reportData.lot.startPrice} руб.</p>
                        <p>Конечная цена: {reportData.lot.finalPrice} руб.</p>
                        <p><strong>Разница: {reportData.priceDifference} руб.</strong></p>
                    </Card>
                ) : <Alert message="Лот для отчета не найден." type="warning" />;
            case 'auctionMostSold':
                return reportData.auction ? (
                    <Card title={`Аукцион "${reportData.auction.nameSpecificity}" (ID: ${reportData.auction.id})`}>
                        <p>Продано лотов: <strong>{reportData.soldCount}</strong></p>
                        <p>Дата: {new Date(reportData.auction.auctionDate).toLocaleDateString('ru-RU')} {reportData.auction.auctionTime}</p>
                        <p>Место: {reportData.auction.location}</p>
                    </Card>
                ) : <Alert message="Аукцион для отчета не найден." type="warning" />;
            case 'mostExpensiveLotInfo':
                return reportData.lot ? (
                    <Card title={`Самый дорогой лот #${reportData.lot.id} (${reportData.lot.name})`}>
                        <p>Продано за: <strong>{reportData.lot.finalPrice} руб.</strong></p>
                        <p>Продавец: {reportData.seller?.fullName || `ID: ${reportData.seller?.id}`}</p>
                        <p>Покупатель: {reportData.buyer?.fullName || `ID: ${reportData.buyer?.id}`}</p>
                    </Card>
                ) : <Alert message="Лот для отчета не найден." type="warning" />;
            default:
                const listData = reportData.data || (Array.isArray(reportData) ? reportData : []);
                return renderReportDataTable(listData, currentReportType);
        }
    };

    const handleReportTypeSelection = (e) => {
        const newType = e.target.value;
        setCurrentReportType(newType);
        setReportData(null);
        setError('');
        const config = reportsConfig.find(r => r.type === newType);
        if (config && config.paginated) {
            setReportParams(prev => ({ ...prev, page: 1, pageSize: 10 }));
        } else {
            setReportParams(prev => ({ ...prev, page: 1 }));
        }
    };

    if (authLoading) return <div className="container page-loader-container"><Loader text="Проверка авторизации..." /></div>;

    if (!isAuthenticated || !(activeRole === 'SYSTEM_ADMIN' || activeRole === 'seller')) {
        return <div className="container"><Alert message="Доступ к этой странице ограничен. Требуется роль Администратора или Продавца." type="danger" /></div>;
    }

    return (
        <div className="report-page container">
            <h1>Страница отчетов</h1>
            {error && <Alert message={error} type="danger" onClose={() => setError('')} />}

            <div className="report-controls card">
                <div className="report-selection form-group-common">
                    <label htmlFor="reportTypeSelect">Выберите отчет:</label>
                    <select
                        id="reportTypeSelect"
                        value={currentReportType}
                        onChange={handleReportTypeSelection}
                        className="form-control"
                    >
                        <option value="">-- Выберите тип отчета --</option>
                        {reportsConfig.map(r => <option key={r.type} value={r.type}>{r.label}</option>)}
                    </select>
                </div>

                {currentReportType && renderReportParamsInputs()}

                {currentReportType && (
                    <Button
                        onClick={() => executeReportGeneration(currentReportType, reportParams)}
                        disabled={loadingReport}
                        variant="primary"
                        className="generate-report-btn"
                    >
                        {loadingReport ? 'Генерация...' : 'Сгенерировать отчет'}
                    </Button>
                )}
            </div>

            <div className="report-display-area">
                {currentReportLabel && !loadingReport && reportData && <h2>Результаты отчета: {currentReportLabel}</h2>}
                {renderReportDisplay()}
            </div>

            {reportData?.pagination && reportData.pagination.totalPages > 1 && !loadingReport && (
                <Pagination
                    currentPage={reportParams.page}
                    totalPages={reportData.pagination.totalPages}
                    onPageChange={(newPage) => setReportParams(p => ({ ...p, page: newPage }))}
                    totalItems={reportData.pagination.totalItems}
                    disabled={loadingReport}
                />
            )}
        </div>
    );
};

export default ReportPage;