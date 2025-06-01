// src/components/common/Table.js
import React from 'react';
import './Table.css';

const Table = ({ headers, data, renderRow, className = '', emptyMessage = "Нет данных для отображения" }) => {
    if (!data || data.length === 0) {
        return <p className="table-empty-message">{emptyMessage}</p>;
    }

    const tableClasses = `custom-table ${className}`;

    return (
        <div className="table-responsive-wrapper">
            <table className={tableClasses.trim()}>
                <thead>
                    <tr>
                        {headers.map((header, index) => (
                            <th key={index}>{header.label}</th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {data.map((row, rowIndex) => renderRow(row, rowIndex))}
                </tbody>
            </table>
        </div>
    );
};

// Определяем PropTypes для лучшей документации и проверки типов
// import PropTypes from 'prop-types';
// Table.propTypes = {
//     headers: PropTypes.arrayOf(PropTypes.shape({
//         key: PropTypes.string.isRequired, // Не используется в текущей реализации рендера, но полезно для структуры
//         label: PropTypes.string.isRequired,
//     })).isRequired,
//     data: PropTypes.array.isRequired,
//     renderRow: PropTypes.func.isRequired,
//     className: PropTypes.string,
//     emptyMessage: PropTypes.string,
// };


export default Table;