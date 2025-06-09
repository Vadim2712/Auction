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

export default Table;