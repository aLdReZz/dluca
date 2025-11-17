
import React, { useState, useEffect } from 'react';
import type { SalesData } from '../types';
import { UploadIcon, TrashIcon } from '../components/Icons';
import { useFirebaseData, useFirebaseMutation } from '../hooks/useFirebase';
import { salesService } from '../utils/firebaseService';

interface SalesProps {
    salesData?: SalesData[];
    setSalesData?: React.Dispatch<React.SetStateAction<SalesData[]>>;
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

const Sales: React.FC<SalesProps> = ({ salesData: propSalesData, setSalesData: setPropSalesData }) => {
    // Fetch sales data from Firebase
    const { data: firebaseSalesData = [], loading: salesLoading, error: salesError } = useFirebaseData(
        () => salesService.getAll(),
        []
    );

    // Batch upload mutation for CSV imports
    const { mutate: batchUpload, loading: uploadLoading, error: uploadError } = useFirebaseMutation(
        (records: SalesData[]) => salesService.batch(records)
    );

    // Delete all mutation
    const { mutate: deleteAllSales, loading: deleteLoading, error: deleteError } = useFirebaseMutation(
        () => salesService.deleteAll()
    );

    // Use Firebase data if available, otherwise use prop data (for backward compatibility)
    const salesData = (Array.isArray(firebaseSalesData) && firebaseSalesData.length > 0) ? firebaseSalesData : (propSalesData || []);

    const [dragActive, setDragActive] = useState(false);
    const [uploadStatus, setUploadStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    useEffect(() => {
        if (salesData.length === 0 && !salesLoading) {
            // Try to set placeholder data to prop setSalesData if available
            if (setPropSalesData) {
                setPropSalesData(PLACEHOLDER_SALES);
            }
        }
    }, [salesData.length, salesLoading, setPropSalesData]);

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

    const handleDeleteAll = async () => {
        try {
            await deleteAllSales(undefined);

            // Also clear prop data for backward compatibility
            if (setPropSalesData) {
                setPropSalesData([]);
            }

            setUploadStatus({ type: 'success', message: 'All sales data has been deleted' });
            setShowDeleteConfirm(false);
            setTimeout(() => setUploadStatus(null), 3000);

            // Refresh the page data
            window.location.reload();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to delete sales data';
            setUploadStatus({ type: 'error', message: errorMsg });
            setShowDeleteConfirm(false);
        }
    };

    const parseSalesCSV = async (text: string) => {
        try {
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
                if (setPropSalesData) {
                    setPropSalesData([]);
                }
                setUploadStatus({ type: 'error', message: 'No data found in CSV file' });
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

            // Upload to Firebase
            await batchUpload(data);

            // Also update prop data for backward compatibility
            if (setPropSalesData) {
                setPropSalesData(data);
            }

            setUploadStatus({ type: 'success', message: `Successfully uploaded ${data.length} sales records` });
            setTimeout(() => setUploadStatus(null), 3000);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to upload sales data';
            setUploadStatus({ type: 'error', message: errorMsg });
        }
    };
    
    const headers = salesData.length > 0 ? Object.keys(salesData[0]) : [];

    // Show loading state
    if (salesLoading) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <div className="flex flex-col items-center justify-center h-96">
                    <div className="text-center">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-accent-blue mx-auto mb-4"></div>
                        <p className="text-text-secondary">Loading sales data...</p>
                    </div>
                </div>
            </div>
        );
    }

    // Show error state
    if (salesError) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                    <p className="text-red-500 font-medium">Error loading sales data</p>
                    <p className="text-text-secondary text-sm mt-1">{salesError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {/* Upload Status Messages */}
            {uploadStatus && (
                <div className={`mb-6 p-4 rounded-lg border ${
                    uploadStatus.type === 'success'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                }`}>
                    <p className={uploadStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}>
                        {uploadStatus.message}
                    </p>
                </div>
            )}

            {/* Upload Status - During Upload */}
            {uploadLoading && (
                <div className="mb-6 p-4 rounded-lg bg-accent-blue/10 border border-accent-blue/30 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-accent-blue"></div>
                    <p className="text-accent-blue">Uploading sales data to Firestore...</p>
                </div>
            )}

            {/* Upload Error */}
            {uploadError && (
                <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/30">
                    <p className="text-red-500 text-sm">Upload error: {uploadError}</p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
                <label
                    htmlFor="salesFileInput"
                    onDragEnter={handleDrag}
                    onDragLeave={handleDrag}
                    onDragOver={handleDrag}
                    onDrop={handleDrop}
                    className={`flex-1 flex flex-col items-center justify-center p-8 sm:p-12 text-center bg-bg-secondary border-2 border-dashed rounded-xl cursor-pointer transition-all duration-300 ${dragActive ? 'border-accent-blue bg-bg-tertiary' : 'border-border-color'}`}
                >
                    <UploadIcon className="w-12 h-12 mb-4 text-text-secondary/70" />
                    <h3 className="text-xl font-semibold">Upload Sales CSV</h3>
                    <p className="text-text-secondary mt-2">Click to browse or drag and drop your file here</p>
                    <input type="file" id="salesFileInput" className="hidden" accept=".csv" onChange={handleFileChange} />
                </label>

                {salesData.length > 0 && (
                    <div className="flex items-center">
                        <button
                            onClick={() => setShowDeleteConfirm(true)}
                            disabled={deleteLoading}
                            className="px-6 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border-2 border-red-500/30 rounded-xl font-semibold transition-all duration-300 flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <TrashIcon className="w-5 h-5" />
                            Delete All Data
                        </button>
                    </div>
                )}
            </div>

            {/* Delete Confirmation Modal */}
            {showDeleteConfirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
                    <div className="bg-bg-secondary border border-border-color rounded-xl p-6 max-w-md w-full shadow-2xl">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center">
                                <TrashIcon className="w-6 h-6 text-red-500" />
                            </div>
                            <h3 className="text-xl font-semibold">Delete All Sales Data?</h3>
                        </div>
                        <p className="text-text-secondary mb-6">
                            This action cannot be undone. All sales transactions will be permanently deleted from the database.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDeleteConfirm(false)}
                                disabled={deleteLoading}
                                className="flex-1 px-4 py-2 bg-bg-tertiary hover:bg-hover-bg text-text-primary rounded-lg font-semibold transition-colors disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleDeleteAll}
                                disabled={deleteLoading}
                                className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {deleteLoading ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                        Deleting...
                                    </>
                                ) : (
                                    'Delete All'
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
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
                                            <td key={`${rowIndex}-${header}`} className="p-4 text-sm text-text-primary">{typeof row[header] === 'string' || typeof row[header] === 'number' ? row[header] : String(row[header] || '')}</td>
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
                                        <span className="text-text-primary text-right break-all">{typeof row[header] === 'string' || typeof row[header] === 'number' ? row[header] : String(row[header] || '')}</span>
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
