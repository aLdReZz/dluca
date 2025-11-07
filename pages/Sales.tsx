
import React, { useState, useEffect } from 'react';
import type { SalesData } from '../types';
import { UploadIcon } from '../components/Icons';

interface SalesProps {
    salesData: SalesData[];
    setSalesData: React.Dispatch<React.SetStateAction<SalesData[]>>;
}

const PLACEHOLDER_SALES: SalesData[] = [
    {
        Date: '16 Oct 25',
        Time: '6:20pm',
        'Transaction ID': '17606010007',
        'Receipt No.': '5521',
        Source: 'In-Store',
        Cashier: '',
        'Payment Type': 'Cash',
        Total: '125.27',
        'Service Rate': '10',
        'Service Amount': '10.27',
        Cost: '20.45',
        Profit: '104.82',
        'Email Recipient': '',
        Customer: '',
        'Email Address': '',
        'Mobile Number': '',
        Notes: '',
        'Delivery Address': '',
        'Park Tag': '',
        __column1: '16 Oct 25',
        __column10: '10.27',
    },
    {
        Date: '16 Oct 25',
        Time: '6:09pm',
        'Transaction ID': '1760609395',
        'Receipt No.': '5520',
        Source: 'In-Store',
        Cashier: '',
        'Payment Type': 'GCash',
        Total: '392.14',
        'Service Rate': '10',
        'Service Amount': '32.14',
        Cost: '90.45',
        Profit: '301.69',
        'Email Recipient': '',
        Customer: '',
        'Email Address': '',
        'Mobile Number': '',
        Notes: '',
        'Delivery Address': '',
        'Park Tag': '',
        __column1: '16 Oct 25',
        __column10: '32.14',
    },
];

const Sales: React.FC<SalesProps> = ({ salesData, setSalesData }) => {
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        if (salesData.length === 0) {
            setSalesData(PLACEHOLDER_SALES);
        }
    }, [salesData.length, setSalesData]);

    const handleFile = (file: File) => {
        if (file && file.type === 'text/csv') {
            const reader = new FileReader();
            reader.onload = (e) => {
                const text = e.target?.result as string;
                parseSalesCSV(text);
            };
            reader.readAsText(file);
        } else {
            alert('Please upload a valid CSV file.');
        }
    };
    
    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };
    
    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const parseSalesCSV = (text: string) => {
        const rows: string[][] = [];
        let current = '';
        let row: string[] = [];
        let inQuotes = false;
        const input = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

        for (let i = 0; i < input.length; i++) {
            const char = input[i];
            const nextChar = input[i + 1];

            if (char === '"') {
                if (inQuotes && nextChar === '"') {
                    current += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                row.push(current);
                current = '';
            } else if (char === '\n' && !inQuotes) {
                row.push(current);
                rows.push(row);
                row = [];
                current = '';
            } else {
                current += char;
            }
        }

        if (current.length > 0 || row.length > 0) {
            row.push(current);
            rows.push(row);
        }

        if (rows.length === 0) {
            setSalesData([]);
            return;
        }

        const headers = rows[0].map(header => header.trim().replace(/^\uFEFF/, '').replace(/"/g, ''));
        const data: SalesData[] = [];

        for (let i = 1; i < rows.length; i++) {
            const values = rows[i];
            if (values.every(value => !value || !value.trim())) continue;
            const rowData: SalesData = {};
            headers.forEach((header, index) => {
                const raw = values[index] ?? '';
                rowData[header] = raw.trim().replace(/^\uFEFF/, '').replace(/"/g, '');
            });
            rowData.__column1 = (values[0] ?? '').trim().replace(/^\uFEFF/, '').replace(/"/g, '');
            rowData.__column10 = (values[9] ?? '').trim().replace(/^\uFEFF/, '').replace(/"/g, '');
            data.push(rowData);
        }

        setSalesData(data);
    };
    
    const headers = salesData.length > 0 ? Object.keys(salesData[0]) : [];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <label
                htmlFor="salesFileInput"
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-bg-secondary border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 mb-8 ${dragActive ? 'border-accent-blue bg-bg-tertiary' : 'border-border-color'}`}
            >
                <UploadIcon className="w-12 h-12 mb-4 text-text-secondary/70" />
                <h3 className="text-xl font-semibold">Upload Sales CSV</h3>
                <p className="text-text-secondary mt-2">Click to browse or drag and drop your file here</p>
                <input type="file" id="salesFileInput" className="hidden" accept=".csv" onChange={handleFileChange} />
            </label>
            
            {salesData.length > 0 && (
                <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                    <div className="p-4 sm:p-6 border-b border-border-color">
                        <h3 className="text-lg font-semibold">Sales Transactions</h3>
                    </div>
                    {/* Desktop Table View */}
                    <div className="overflow-x-auto hidden lg:block">
                        <table className="w-full min-w-[800px]">
                            <thead className="bg-bg-tertiary/40">
                                <tr>
                                    {headers.map(header => (
                                        <th key={header} className="p-4 text-left text-sm font-medium text-text-secondary">{header}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color">
                                {salesData.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="hover:bg-hover-bg/50 transition-colors">
                                        {headers.map(header => (
                                            <td key={`${rowIndex}-${header}`} className="p-4 text-sm text-text-primary">{row[header]}</td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {/* Mobile Card View */}
                    <div className="block lg:hidden p-4 space-y-4">
                        {salesData.map((row, rowIndex) => (
                            <div key={rowIndex} className="bg-bg-tertiary/60 p-4 rounded-lg">
                                {headers.map(header => (
                                    <div key={`${rowIndex}-${header}`} className="flex justify-between text-sm py-1 border-b border-border-color/50 last:border-b-0">
                                        <span className="font-medium text-text-secondary">{header}</span>
                                        <span className="text-text-primary text-right break-all">{row[header]}</span>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default Sales;
