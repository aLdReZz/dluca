import React, { useState, useEffect, useMemo } from 'react';
import { useFirebaseData } from '../../hooks/useFirebase';
import { salesService, chartOfAccountsService } from '../../utils/firebaseService';
import type { SalesData, Account } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CalendarDaysIcon, ChevronDownIcon, DocumentChartBarIcon } from '../../components/Icons';
import CalendarPopup from '../../components/CalendarPopup';
import {
    parseSalesDate,
    parseNumericValue,
    getSalesFieldValue,
    TOTAL_HEADERS,
    TOTAL_INCLUDE,
    TOTAL_EXCLUDE,
    SERVICE_HEADERS,
    SERVICE_INCLUDE,
    COGS_HEADERS,
    COGS_INCLUDE,
    COGS_EXCLUDE,
    DATE_HEADERS,
    DATE_INCLUDE,
} from '../../utils/salesData';

const formatPeso = (amount: number) => {
    return '₱' + amount.toLocaleString('en-PH', {
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
        day: 'numeric',
        year: 'numeric'
    });
};

const ProfitAndLoss: React.FC = () => {
    // Fetch data
    const { data: salesData = [], loading: salesLoading } = useFirebaseData(
        () => salesService.getAll(),
        []
    );
    const { data: accounts = [], loading: accountsLoading } = useFirebaseData(
        () => chartOfAccountsService.getAll(),
        []
    );

    // Date range state
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = React.useRef<HTMLDivElement>(null);

    // Initialize date range to current month
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

    const handleRangeComplete = (range: { start: string; end: string }) => {
        setStartDate(range.start);
        setEndDate(range.end);
        setIsCalendarOpen(false);
    };

    // Calculate P&L data
    const profitLossData = useMemo(() => {
        if (!startDate || !endDate || !Array.isArray(salesData) || !Array.isArray(accounts)) return null;

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');

        // Filter sales data by date range
        const filteredData = salesData.filter(row => {
            const dateValue = getSalesFieldValue(row, DATE_INCLUDE, [], DATE_HEADERS);
            const rowDate = parseSalesDate(dateValue ?? row.Date);
            return rowDate && rowDate >= start && rowDate <= end;
        });

        // Calculate revenue (from sales)
        const grossSales = filteredData.reduce((sum, row) => {
            const value = getSalesFieldValue(row, TOTAL_INCLUDE, TOTAL_EXCLUDE, TOTAL_HEADERS);
            return sum + parseNumericValue(value);
        }, 0);

        const serviceCharge = filteredData.reduce((sum, row) => {
            const value = getSalesFieldValue(row, SERVICE_INCLUDE, [], SERVICE_HEADERS);
            return sum + parseNumericValue(value);
        }, 0);

        const netSales = grossSales - serviceCharge;

        // Cost of Goods Sold
        const costOfGoodsSold = filteredData.reduce((sum, row) => {
            const value = getSalesFieldValue(row, COGS_INCLUDE, COGS_EXCLUDE, COGS_HEADERS);
            return sum + parseNumericValue(value);
        }, 0);

        const grossProfit = netSales - costOfGoodsSold;

        // Operating Expenses (from chart of accounts - expense type)
        const expenseAccounts = accounts.filter((acc: Account) => acc.type === 'expense' && acc.isActive);

        // For now, we'll show the structure. In the future, you can link actual transactions to these accounts
        const operatingExpenses = expenseAccounts.map((acc: Account) => ({
            code: acc.code,
            name: acc.name,
            amount: 0 // This should be populated from actual transactions
        }));

        const totalOperatingExpenses = operatingExpenses.reduce((sum, exp) => sum + exp.amount, 0);

        const operatingIncome = grossProfit - totalOperatingExpenses;

        // Net Income
        const netIncome = operatingIncome;

        return {
            grossSales,
            serviceCharge,
            netSales,
            costOfGoodsSold,
            grossProfit,
            grossProfitMargin: netSales > 0 ? (grossProfit / netSales) * 100 : 0,
            operatingExpenses,
            totalOperatingExpenses,
            operatingIncome,
            netIncome,
            netProfitMargin: netSales > 0 ? (netIncome / netSales) * 100 : 0,
        };
    }, [salesData, accounts, startDate, endDate]);

    if (salesLoading || accountsLoading) {
        return (
            <div className="flex justify-center items-center h-full">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 lg:p-6 border-b border-border-color">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Profit and Loss</h1>
                        <p className="text-sm text-text-secondary mt-1">Income statement for the selected period</p>
                    </div>

                    {/* Date Range Selector */}
                    <div className="relative" ref={calendarRef}>
                        <button
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            className="w-full sm:w-auto bg-bg-tertiary border border-border-color rounded-lg px-3 py-2 text-sm font-medium flex items-center justify-between sm:justify-start gap-2 hover:bg-hover-bg transition"
                        >
                            <CalendarDaysIcon className="w-5 h-5 text-text-secondary flex-shrink-0" />
                            <span className="text-text-primary">
                                {startDate && endDate
                                    ? `${formatDateForDisplay(startDate)} - ${formatDateForDisplay(endDate)}`
                                    : 'Select range'}
                            </span>
                            <ChevronDownIcon className={`w-4 h-4 text-text-secondary transition-transform ${isCalendarOpen ? 'rotate-180' : ''}`} />
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

            {/* P&L Statement */}
            <div className="flex-1 overflow-auto px-6 py-6">
                {!profitLossData ? (
                    <div className="bg-bg-secondary rounded-xl border border-border-color p-12 text-center">
                        <DocumentChartBarIcon className="w-16 h-16 mx-auto mb-4 text-text-secondary/50" />
                        <p className="text-text-secondary">Select a date range to view the profit and loss statement</p>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto">
                        <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                            {/* Company Header */}
                            <div className="bg-bg-tertiary px-6 py-4 border-b border-border-color text-center">
                                <h2 className="text-lg font-bold text-text-primary">D'Luca</h2>
                                <h3 className="text-sm font-semibold text-text-secondary mt-1">PROFIT AND LOSS</h3>
                                <p className="text-xs text-text-secondary mt-1">
                                    {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
                                </p>
                            </div>

                            {/* Revenue Section */}
                            <div className="px-6 py-4 border-b border-border-color">
                                <h4 className="text-sm font-bold text-accent-green mb-3">REVENUE</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary pl-4">Gross Sales</span>
                                        <span className="text-text-primary font-medium">{formatPeso(profitLossData.grossSales)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary pl-4">Less: Service Charge</span>
                                        <span className="text-text-primary font-medium">({formatPeso(profitLossData.serviceCharge)})</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-border-color font-semibold">
                                        <span className="text-text-primary">Net Sales</span>
                                        <span className="text-text-primary">{formatPeso(profitLossData.netSales)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Cost of Goods Sold */}
                            <div className="px-6 py-4 border-b border-border-color">
                                <h4 className="text-sm font-bold text-accent-orange mb-3">COST OF GOODS SOLD</h4>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-text-secondary pl-4">Cost of Goods Sold</span>
                                        <span className="text-text-primary font-medium">{formatPeso(profitLossData.costOfGoodsSold)}</span>
                                    </div>
                                    <div className="flex justify-between pt-2 border-t border-border-color font-semibold">
                                        <span className="text-text-primary">Gross Profit</span>
                                        <span className="text-accent-green">{formatPeso(profitLossData.grossProfit)}</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-text-secondary pl-4">Gross Profit Margin</span>
                                        <span className="text-text-secondary">{profitLossData.grossProfitMargin.toFixed(2)}%</span>
                                    </div>
                                </div>
                            </div>

                            {/* Operating Expenses */}
                            <div className="px-6 py-4 border-b border-border-color">
                                <h4 className="text-sm font-bold text-accent-red mb-3">OPERATING EXPENSES</h4>
                                <div className="space-y-2 text-sm">
                                    {profitLossData.operatingExpenses.length === 0 ? (
                                        <div className="text-text-secondary pl-4 text-xs italic">
                                            No expense accounts defined. Add expense accounts in Chart of Accounts.
                                        </div>
                                    ) : (
                                        profitLossData.operatingExpenses.map((exp, index) => (
                                            <div key={index} className="flex justify-between">
                                                <span className="text-text-secondary pl-4">{exp.code} - {exp.name}</span>
                                                <span className="text-text-primary font-medium">{formatPeso(exp.amount)}</span>
                                            </div>
                                        ))
                                    )}
                                    <div className="flex justify-between pt-2 border-t border-border-color font-semibold">
                                        <span className="text-text-primary">Total Operating Expenses</span>
                                        <span className="text-text-primary">{formatPeso(profitLossData.totalOperatingExpenses)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Net Income */}
                            <div className="px-6 py-4 bg-bg-tertiary">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-base font-bold">
                                        <span className="text-text-primary">Operating Income</span>
                                        <span className={profitLossData.operatingIncome >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                                            {formatPeso(profitLossData.operatingIncome)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-lg font-bold pt-2 border-t-2 border-border-color">
                                        <span className="text-text-primary">NET INCOME</span>
                                        <span className={profitLossData.netIncome >= 0 ? 'text-accent-green' : 'text-accent-red'}>
                                            {formatPeso(profitLossData.netIncome)}
                                        </span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-text-secondary">Net Profit Margin</span>
                                        <span className="text-text-secondary font-semibold">{profitLossData.netProfitMargin.toFixed(2)}%</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Print Note */}
                        <div className="mt-4 text-center">
                            <p className="text-xs text-text-secondary">
                                Note: Operating expenses are currently placeholders. Link actual expense transactions to accounts for accurate reporting.
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProfitAndLoss;
