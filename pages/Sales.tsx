
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { SalesData } from '../types';
import { UploadIcon, TrashIcon, CurrencyPesoIcon, BanknotesIcon, CreditCardIcon, CalendarDaysIcon, ClipboardDocumentListIcon } from '../components/Icons';
import LoadingSpinner from '../components/LoadingSpinner';
import { useFirebaseData, useFirebaseMutation } from '../hooks/useFirebase';
import { salesService } from '../utils/firebaseService';
import CalendarPopup from '../components/CalendarPopup';
import { parseSalesDate } from '../utils/salesData';

interface SalesProps {
    salesData?: SalesData[];
    setSalesData?: React.Dispatch<React.SetStateAction<SalesData[]>>;
}

const formatPeso = (amount: number) => {
    const safeAmount = typeof amount === 'number' && Number.isFinite(amount) ? amount : 0;
    return '₱' + safeAmount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatDateForInput = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00');
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric'
    });
};

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
    const [sortColumn, setSortColumn] = useState<string | null>(null);
    const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

    // Date filter states
    const [filter, setFilter] = useState<'daily' | 'weekly' | 'monthly' | 'lastMonth' | 'custom'>('monthly');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);

    // Initialize date range for default "This Month" filter
    useEffect(() => {
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setStartDate(formatDateForInput(firstDay));
        setEndDate(formatDateForInput(lastDay));
    }, []);

    // Close calendar on outside click
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFilterChange = (newFilter: 'daily' | 'weekly' | 'monthly' | 'lastMonth') => {
        setFilter(newFilter);
        const now = new Date();

        switch (newFilter) {
            case 'daily':
                setStartDate(formatDateForInput(now));
                setEndDate(formatDateForInput(now));
                break;
            case 'weekly': {
                const dayOfWeek = now.getDay();
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - dayOfWeek);
                const endOfWeek = new Date(now);
                endOfWeek.setDate(now.getDate() + (6 - dayOfWeek));
                setStartDate(formatDateForInput(startOfWeek));
                setEndDate(formatDateForInput(endOfWeek));
                break;
            }
            case 'monthly': {
                const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                setStartDate(formatDateForInput(firstDay));
                setEndDate(formatDateForInput(lastDay));
                break;
            }
            case 'lastMonth': {
                const firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                const lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                setStartDate(formatDateForInput(firstDay));
                setEndDate(formatDateForInput(lastDay));
                break;
            }
        }
    };

    const handleRangeComplete = (range: { start: string; end: string }) => {
        setFilter('custom');
        setStartDate(range.start);
        setEndDate(range.end);
        setIsCalendarOpen(false);
    };

    // Filter sales data by date range
    const filteredSalesData = useMemo(() => {
        if (!startDate || !endDate) return salesData;

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');

        return salesData.filter(row => {
            const dateStr = row['Date'] || row['__column1'] || '';
            const saleDate = parseSalesDate(dateStr);
            if (!saleDate) return false;
            return saleDate >= start && saleDate <= end;
        });
    }, [salesData, startDate, endDate]);

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

    const handleExportToExcel = () => {
        if (filteredSalesData.length === 0) {
            setUploadStatus({ type: 'error', message: 'No data to export' });
            setTimeout(() => setUploadStatus(null), 3000);
            return;
        }

        try {
            // Get headers from the first row
            const headers = Object.keys(filteredSalesData[0]).filter(h => !h.startsWith('__'));

            // Create CSV content
            const csvRows = [];

            // Add header row
            csvRows.push(headers.map(h => `"${h}"`).join(','));

            // Add data rows
            filteredSalesData.forEach(row => {
                const values = headers.map(header => {
                    const value = row[header] || '';
                    // Escape quotes in the value
                    const escaped = String(value).replace(/"/g, '""');
                    return `"${escaped}"`;
                });
                csvRows.push(values.join(','));
            });

            // Create CSV string
            const csvContent = csvRows.join('\n');

            // Create blob and download
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            const url = URL.createObjectURL(blob);

            // Generate filename with date range
            const filename = `sales_${startDate}_to_${endDate}.csv`;

            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setUploadStatus({ type: 'success', message: `Exported ${filteredSalesData.length} sales records to ${filename}` });
            setTimeout(() => setUploadStatus(null), 3000);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to export sales data';
            setUploadStatus({ type: 'error', message: errorMsg });
            setTimeout(() => setUploadStatus(null), 3000);
        }
    };

    // Helper function to check if payment type requires 4% fee
    const requires4PercentFee = (paymentType: string): boolean => {
        const type = paymentType.toLowerCase().trim();
        return type.includes('card') || type.includes('credit') || type.includes('qr ph') || type.includes('qrph');
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

            // Detect UTAK format (item-based) vs old format (transaction-based)
            const isUTAKFormat = headers.includes('Transaction ID') && headers.includes('Total Cost') && headers.includes('Service Amount');

            let data: SalesData[] = [];

            if (isUTAKFormat) {
                // New UTAK format: Group items by Transaction ID
                const transactionMap = new Map<string, {
                    items: any[];
                    date: string;
                    time: string;
                    receiptNo: string;
                    paymentType: string;
                    total: number;
                    totalCost: number;
                    serviceAmount: number;
                }>();

                for (let i = 1; i < rows.length; i++) {
                    const values = rows[i];
                    if (values.every(value => !value || !value.trim())) continue;

                    const rowData: Record<string, string> = {};
                    headers.forEach((header, index) => {
                        const raw = values[index] ?? '';
                        rowData[header] = raw.trim().replace(/^\uFEFF/, '').replace(/"/g, '');
                    });

                    const txnId = rowData['Transaction ID'] || '';
                    if (!txnId) continue;

                    if (!transactionMap.has(txnId)) {
                        // Use "Total Cost" from the first row (UTAK's aggregated cost)
                        const totalCostFromUTAK = parseFloat(rowData['Total Cost'] || '0') || 0;

                        transactionMap.set(txnId, {
                            items: [],
                            date: rowData['Date'] || '',
                            time: rowData['Time'] || '',
                            receiptNo: rowData['Receipt No.'] || '',
                            paymentType: rowData['Payment Type'] || '',
                            total: parseFloat(rowData['Total'] || '0') || 0,
                            totalCost: totalCostFromUTAK,
                            serviceAmount: 0,
                        });
                    }

                    const transaction = transactionMap.get(txnId)!;
                    transaction.items.push(rowData);

                    // Aggregate service amount from all items
                    const itemService = parseFloat(rowData['Service Amount'] || '0') || 0;
                    transaction.serviceAmount += itemService;
                }

                // Convert grouped transactions to SalesData format
                transactionMap.forEach((transaction) => {
                    const grossSales = transaction.total;
                    const originalServiceAmount = transaction.serviceAmount; // From CSV

                    // Apply 4% fee for Card, Credit Card, and QR PH transactions FIRST
                    let adjustedCost = transaction.totalCost;
                    let adjustedTotal = grossSales;
                    let feeAmount = 0;

                    if (requires4PercentFee(transaction.paymentType)) {
                        feeAmount = grossSales * 0.04;
                        adjustedTotal = grossSales - feeAmount; // Deduct from sales
                        adjustedCost = transaction.totalCost + feeAmount; // Add to cost
                    }

                    // Use original service amount from CSV, no recalculation
                    const profit = (adjustedTotal - originalServiceAmount) - adjustedCost;

                    data.push({
                        Date: transaction.date,
                        Time: transaction.time,
                        'Transaction ID': transaction.items[0]['Transaction ID'] || '',
                        'Receipt No.': transaction.receiptNo,
                        'Payment Type': transaction.paymentType,
                        Total: adjustedTotal.toFixed(2),
                        'Service Rate': '10',
                        'Service Amount': originalServiceAmount.toFixed(2),
                        Cost: adjustedCost.toFixed(2),
                        Profit: profit.toFixed(2),
                        Cashier: transaction.items[0]['Cashier'] || '',
                        Customer: transaction.items[0]['Customer'] || '',
                        'Park Tag': transaction.items[0]['Park Tag'] || '',
                        Type: transaction.items[0]['Type'] || '',
                        __column1: transaction.date,
                        __column10: originalServiceAmount.toFixed(2),
                    });
                });
            } else {
                // Old format: Direct mapping with 4% fee adjustment
                for (let i = 1; i < rows.length; i++) {
                    const values = rows[i];
                    if (values.every(value => !value || !value.trim())) continue;
                    const rowData: SalesData = {};
                    headers.forEach((header, index) => {
                        const raw = values[index] ?? '';
                        rowData[header] = raw.trim().replace(/^\uFEFF/, '').replace(/"/g, '');
                    });

                    // Apply 4% fee for Card, Credit Card, and QR PH transactions
                    const paymentType = rowData['Payment Type'] || '';
                    if (requires4PercentFee(paymentType)) {
                        const total = parseFloat(rowData['Total'] || '0') || 0;
                        const cost = parseFloat(rowData['Cost'] || '0') || 0;
                        const serviceAmount = parseFloat(rowData['Service Amount'] || '0') || 0;

                        // Apply 4% fee first
                        const feeAmount = total * 0.04;
                        const adjustedTotal = total - feeAmount;
                        const adjustedCost = cost + feeAmount;

                        // Keep original service amount from CSV, no recalculation
                        const profit = (adjustedTotal - serviceAmount) - adjustedCost;

                        rowData['Total'] = adjustedTotal.toFixed(2);
                        rowData['Cost'] = adjustedCost.toFixed(2);
                        rowData['Profit'] = profit.toFixed(2);
                        // Service Amount stays as-is from CSV
                    }

                    rowData.__column1 = (values[0] ?? '').trim().replace(/^\uFEFF/, '').replace(/"/g, '');
                    rowData.__column10 = (values[9] ?? '').trim().replace(/^\uFEFF/, '').replace(/"/g, '');
                    data.push(rowData);
                }
            }

            // Get existing data count before upload
            const existingCount = salesData.length;

            // Upload to Firebase (only adds new records)
            await batchUpload(data);

            // Refresh to get updated data
            window.location.reload();
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to upload sales data';
            setUploadStatus({ type: 'error', message: errorMsg });
        }
    };
    
    const headers = filteredSalesData.length > 0 ? Object.keys(filteredSalesData[0]) : [];

    // Sort data
    const sortedData = React.useMemo(() => {
        if (!sortColumn) return filteredSalesData;

        return [...filteredSalesData].sort((a, b) => {
            const aVal = String(a[sortColumn] || '');
            const bVal = String(b[sortColumn] || '');

            // Try numeric sort first
            const aNum = parseFloat(aVal);
            const bNum = parseFloat(bVal);

            let comparison = 0;
            if (!isNaN(aNum) && !isNaN(bNum)) {
                comparison = aNum - bNum;
            } else {
                comparison = aVal.localeCompare(bVal);
            }

            return sortDirection === 'asc' ? comparison : -comparison;
        });
    }, [filteredSalesData, sortColumn, sortDirection]);

    const handleSort = (column: string) => {
        if (sortColumn === column) {
            // Toggle direction if same column
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            // Set new column
            setSortColumn(column);
            setSortDirection('asc');
        }
    };

    // Calculate sales breakdown by payment system (consolidated)
    const paymentSystemStats = useMemo(() => {
        const stats = new Map<string, { total: number; count: number; profit: number }>();

        // Helper function to categorize payment types
        const categorizePayment = (paymentType: string): string => {
            const type = paymentType.toLowerCase().trim();
            if (type === 'gcredit') return 'GCredit';
            if (type === 'gcash') return 'GCash';
            if (type === 'paymaya') return 'PayMaya';
            if (type === 'grabpay' || type === 'grab') return 'GrabPay';
            if (type === 'qrph' || type === 'qr ph') return 'QR PH';
            if (type === 'card' || type === 'credit card' || type === 'debit card') return 'Card';
            if (type === 'cash') return 'Cash';
            return paymentType; // Keep original if no match
        };

        // Helper function to parse split payments (e.g., "Cash 500 GCash 200" or "Cash 65 gcash 662")
        const parseSplitPayment = (paymentType: string): { method: string; amount: number }[] => {
            const payments: { method: string; amount: number }[] = [];

            // Pattern: payment_method amount (e.g., "cash 500", "gcash 200")
            // Using case-insensitive regex with word boundaries to match exact payment types
            // IMPORTANT: Check gcash BEFORE cash to avoid "gcash" matching the "cash" pattern
            const patterns = [
                { regex: /\bgcash\s+([\d,.]+)/gi, method: 'GCash' },
                { regex: /\bgcredit\s+([\d,.]+)/gi, method: 'GCredit' },
                { regex: /\bcash\s+([\d,.]+)/gi, method: 'Cash' },
                { regex: /\bpaymaya\s+([\d,.]+)/gi, method: 'PayMaya' },
                { regex: /\bgrab(?:pay)?\s+([\d,.]+)/gi, method: 'GrabPay' },
                { regex: /\bqr\s*ph\s+([\d,.]+)/gi, method: 'QR PH' },
                { regex: /\bcard\s+([\d,.]+)/gi, method: 'Card' },
            ];

            let foundSplit = false;
            patterns.forEach(({ regex, method }) => {
                // Reset regex lastIndex before each match to ensure correct behavior
                regex.lastIndex = 0;
                const matches = [...paymentType.matchAll(regex)];
                matches.forEach(match => {
                    const amount = parseFloat(match[1].replace(/,/g, '')) || 0;
                    if (amount > 0) {
                        payments.push({ method, amount });
                        foundSplit = true;
                    }
                });
            });

            return foundSplit ? payments : [];
        };

        filteredSalesData.forEach(row => {
            const rawPaymentType = row['Payment Type'] || 'Unknown';
            const total = parseFloat(row['Total'] || '0') || 0;
            const serviceAmount = parseFloat(row['Service Amount'] || '0') || 0;
            const netAmount = total - serviceAmount; // Exclude service charges to match UTAK
            const profit = parseFloat(row['Profit'] || '0') || 0;

            // Try to parse as split payment
            const splitPayments = parseSplitPayment(rawPaymentType);

            if (splitPayments.length > 0) {
                // Handle split payment - use parsed amounts and deduct proportional service charges
                const totalSplit = splitPayments.reduce((sum, p) => sum + p.amount, 0);

                splitPayments.forEach((payment, index) => {
                    if (!stats.has(payment.method)) {
                        stats.set(payment.method, { total: 0, count: 0, profit: 0 });
                    }

                    const current = stats.get(payment.method)!;

                    // Calculate proportional service charge for this payment method
                    const proportionalService = totalSplit > 0 ? (payment.amount / totalSplit) * serviceAmount : 0;
                    const netPaymentAmount = payment.amount - proportionalService; // Deduct service charge

                    current.total += netPaymentAmount; // Add net amount (excluding service charge)

                    // Only count as 1 transaction for the first payment method in the split
                    if (index === 0) {
                        current.count += 1;
                    }

                    // Distribute profit proportionally
                    const profitShare = totalSplit > 0 ? (payment.amount / totalSplit) * profit : 0;
                    current.profit += profitShare;
                });
            } else {
                // Handle single payment method - use net amount (excluding service charges)
                const paymentType = categorizePayment(rawPaymentType);

                if (!stats.has(paymentType)) {
                    stats.set(paymentType, { total: 0, count: 0, profit: 0 });
                }

                const current = stats.get(paymentType)!;
                current.total += netAmount; // Use net amount to match UTAK reporting
                current.count += 1;
                current.profit += profit;
            }
        });

        return Array.from(stats.entries())
            .map(([name, data]) => ({ name, ...data }))
            .sort((a, b) => b.total - a.total);
    }, [filteredSalesData]);

    // Get icon and color for payment type
    const getPaymentIcon = (paymentType: string) => {
        if (paymentType === 'Cash') return { icon: BanknotesIcon, color: 'green' };
        if (paymentType === 'GCash') return { icon: CurrencyPesoIcon, color: 'blue' };
        if (paymentType === 'GCredit') return { icon: CreditCardIcon, color: 'blue' };
        if (paymentType === 'PayMaya') return { icon: CurrencyPesoIcon, color: 'purple' };
        if (paymentType === 'GrabPay') return { icon: CurrencyPesoIcon, color: 'orange' };
        if (paymentType === 'Card') return { icon: CreditCardIcon, color: 'purple' };
        if (paymentType === 'QR PH') return { icon: CurrencyPesoIcon, color: 'blue' };
        return { icon: CurrencyPesoIcon, color: 'yellow' };
    };

    const colorClasses = {
        blue: { bg: 'bg-accent-blue/10', text: 'text-accent-blue', border: 'border-accent-blue/30' },
        green: { bg: 'bg-accent-green/10', text: 'text-accent-green', border: 'border-accent-green/30' },
        orange: { bg: 'bg-accent-orange/10', text: 'text-accent-orange', border: 'border-accent-orange/30' },
        purple: { bg: 'bg-accent-purple/10', text: 'text-accent-purple', border: 'border-accent-purple/30' },
        yellow: { bg: 'bg-accent-yellow/10', text: 'text-accent-yellow', border: 'border-accent-yellow/30' },
    };

    const FilterButton: React.FC<{
        period: 'daily' | 'weekly' | 'monthly' | 'lastMonth' | 'custom';
        label: string;
        activeFilter: string;
        onClick: () => void;
    }> = ({ period, label, activeFilter, onClick }) => (
        <button
            onClick={onClick}
            className={`px-2 sm:px-2.5 lg:px-3 py-1 sm:py-1.5 text-[11px] sm:text-xs lg:text-sm font-medium rounded-md transition-colors duration-200 whitespace-nowrap ${
                activeFilter === period
                    ? 'bg-accent-blue text-white'
                    : 'bg-transparent text-text-secondary hover:text-text-primary hover:bg-bg-secondary'
            }`}
        >
            {label}
        </button>
    );

    // Show loading state
    if (salesLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <LoadingSpinner message="Loading sales data..." />
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
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto w-full">
            {/* Header with Date Filters */}
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-4 sm:mb-6 lg:mb-8 gap-3 sm:gap-4">
                <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold">Sales Tracking</h2>
                    <p className="text-text-secondary mt-0.5 sm:mt-1 text-xs sm:text-sm">Track and analyze your sales transactions.</p>
                </div>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2 flex-wrap w-full sm:w-auto">
                    <div className="flex items-center gap-1 sm:gap-1.5 p-0.5 sm:p-1 bg-bg-tertiary rounded-lg w-full sm:w-auto overflow-x-auto">
                        <FilterButton period="daily" label="Today" activeFilter={filter} onClick={() => handleFilterChange('daily')} />
                        <FilterButton period="weekly" label="This Week" activeFilter={filter} onClick={() => handleFilterChange('weekly')} />
                        <FilterButton period="monthly" label="This Month" activeFilter={filter} onClick={() => handleFilterChange('monthly')} />
                        <FilterButton period="lastMonth" label="Last Month" activeFilter={filter} onClick={() => handleFilterChange('lastMonth')} />
                    </div>
                    <div className="relative w-full sm:w-auto" ref={calendarRef}>
                        <button
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            className="w-full sm:w-auto bg-bg-tertiary border border-border-color rounded-lg px-2.5 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm font-medium flex items-center justify-between sm:justify-start gap-2 hover:bg-hover-bg transition"
                            aria-label="Select date range"
                        >
                            <CalendarDaysIcon className="w-4 h-4 sm:w-5 sm:h-5 text-text-secondary flex-shrink-0" />
                            <span className="text-text-primary truncate">
                                {startDate && endDate
                                    ? `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`
                                    : 'Select range'}
                            </span>
                        </button>
                        {isCalendarOpen && (
                            <CalendarPopup
                                initialRange={{ start: startDate || endDate, end: endDate || startDate }}
                                onRangeComplete={handleRangeComplete}
                                onClose={() => setIsCalendarOpen(false)}
                            />
                        )}
                    </div>
                </div>
            </div>
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

            {/* Action Buttons - Always Visible */}
            <div className="mb-4 sm:mb-6 lg:mb-8 flex justify-end gap-1.5 sm:gap-2">
                {salesData.length > 0 && (
                    <button
                        onClick={handleExportToExcel}
                        className="p-1.5 sm:p-2 bg-bg-tertiary hover:bg-hover-bg text-text-secondary hover:text-text-primary border border-border-color/50 rounded-lg transition-all duration-300"
                        title="Export to Excel"
                    >
                        <ClipboardDocumentListIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                )}

                <label
                    htmlFor="salesFileInput"
                    className="p-1.5 sm:p-2 bg-bg-tertiary hover:bg-hover-bg text-text-secondary hover:text-text-primary border border-border-color/50 rounded-lg cursor-pointer transition-all duration-300"
                    title="Upload CSV"
                >
                    <UploadIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    <input type="file" id="salesFileInput" className="hidden" accept=".csv" onChange={handleFileChange} />
                </label>

                {salesData.length > 0 && (
                    <button
                        onClick={() => setShowDeleteConfirm(true)}
                        disabled={deleteLoading}
                        className="p-1.5 sm:p-2 bg-bg-tertiary hover:bg-hover-bg text-text-secondary hover:text-text-primary border border-border-color/50 rounded-lg transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Delete All"
                    >
                        <TrashIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
                )}
            </div>

            {/* Payment System Breakdown Cards */}
            {salesData.length > 0 && paymentSystemStats.length > 0 && (
                <div className="mb-4 sm:mb-6 lg:mb-8">
                    <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-3 mb-3 sm:mb-4">
                        <h2 className="text-base sm:text-lg lg:text-xl font-bold">Sales by Payment System</h2>
                        <p className="text-[11px] sm:text-xs lg:text-sm text-text-secondary/50">
                            Total: {formatPeso(paymentSystemStats.reduce((sum, stat) => sum + stat.total, 0))}
                        </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:flex lg:flex-wrap gap-2 sm:gap-3 lg:gap-4">
                        {paymentSystemStats.map((system) => {
                            const { icon: Icon, color } = getPaymentIcon(system.name);
                            const colors = colorClasses[color as keyof typeof colorClasses];

                            return (
                                <div
                                    key={system.name}
                                    className="bg-bg-secondary rounded-lg sm:rounded-xl border border-border-color/50 p-3 sm:p-4 lg:p-5 transition-all duration-200 hover:border-border-color lg:flex-1 lg:min-w-0"
                                >
                                    {/* Row 1: Icon + Title */}
                                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                                        <div className={`h-8 w-8 sm:h-10 sm:w-10 lg:h-11 lg:w-11 rounded-lg sm:rounded-xl ${colors.bg} flex items-center justify-center flex-shrink-0`}>
                                            <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colors.text}`} />
                                        </div>
                                        <p className="text-[10px] sm:text-xs font-medium text-text-secondary/70 uppercase tracking-wide truncate">{system.name}</p>
                                    </div>

                                    {/* Row 2: Value */}
                                    <p className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary whitespace-nowrap">{formatPeso(system.total)}</p>

                                    {/* Additional stats (small text) */}
                                    <div className="mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-border-color/30 space-y-0.5 sm:space-y-1">
                                        <div className="flex justify-between text-[10px] sm:text-xs">
                                            <span className="text-text-secondary">Transactions</span>
                                            <span className="text-text-primary font-medium">{system.count}</span>
                                        </div>
                                        <div className="flex justify-between text-[10px] sm:text-xs">
                                            <span className="text-text-secondary">Avg Sale</span>
                                            <span className="text-text-primary font-medium">{formatPeso(system.total / system.count)}</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {salesData.length > 0 && (
                <div className="bg-bg-secondary rounded-lg sm:rounded-xl border border-border-color overflow-hidden">
                    <div className="p-2.5 sm:p-3 border-b border-border-color">
                        <h3 className="text-sm sm:text-base lg:text-lg font-semibold">Sales Transactions ({sortedData.length})</h3>
                    </div>

                    {/* Desktop Table View */}
                    <div className="overflow-x-auto hidden lg:block">
                        <table className="w-full text-xs">
                            <thead className="bg-bg-tertiary/60 sticky top-0">
                                <tr>
                                    {headers.map(header => (
                                        <th
                                            key={header}
                                            onClick={() => handleSort(header)}
                                            className="p-2 text-left font-semibold text-text-secondary cursor-pointer hover:bg-bg-tertiary/80 transition-colors whitespace-nowrap"
                                        >
                                            <div className="flex items-center gap-2">
                                                <span>{header}</span>
                                                {sortColumn === header && (
                                                    <span className="text-accent-blue">{sortDirection === 'asc' ? '↑' : '↓'}</span>
                                                )}
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color/50">
                                {sortedData.map((row, rowIndex) => (
                                    <tr key={rowIndex} className="hover:bg-hover-bg/30 transition-colors">
                                        {headers.map(header => (
                                            <td key={`${rowIndex}-${header}`} className="p-2 text-text-primary whitespace-nowrap overflow-hidden text-ellipsis max-w-xs">
                                                {typeof row[header] === 'string' || typeof row[header] === 'number' ? row[header] : String(row[header] || '')}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile Card View */}
                    <div className="block lg:hidden p-2 sm:p-3 space-y-1.5 sm:space-y-2">
                        {sortedData.map((row, rowIndex) => (
                            <div key={rowIndex} className="bg-bg-tertiary/60 p-2.5 sm:p-3 rounded-lg text-[11px] sm:text-xs">
                                {headers.map(header => (
                                    <div key={`${rowIndex}-${header}`} className="flex justify-between py-0.5 sm:py-1 border-b border-border-color/30 last:border-b-0">
                                        <span className="font-medium text-text-secondary truncate mr-2">{header}</span>
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
