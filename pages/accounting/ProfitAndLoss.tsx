import React, { useState, useEffect, useMemo } from 'react';
import { useFirebaseData } from '../../hooks/useFirebase';
import { accountingService, chartOfAccountsService } from '../../utils/firebaseService';
import type { AccountingTransaction, Account } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CalendarDaysIcon, ChevronDownIcon, DocumentChartBarIcon } from '../../components/Icons';
import CalendarPopup from '../../components/CalendarPopup';

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
    const { data: transactions = [], loading: transactionsLoading } = useFirebaseData(
        () => accountingService.getAll(),
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
    const [dateFilter, setDateFilter] = useState('this-month');
    const calendarRef = React.useRef<HTMLDivElement>(null);

    // Expanded categories state
    const [expandedRevenue, setExpandedRevenue] = useState<Set<number>>(new Set());
    const [expandedExpenses, setExpandedExpenses] = useState<Set<number>>(new Set());

    // Transaction detail modal state
    const [selectedTransactions, setSelectedTransactions] = useState<AccountingTransaction[] | null>(null);
    const [modalTitle, setModalTitle] = useState('');

    const toggleRevenueCategory = (index: number) => {
        const newExpanded = new Set(expandedRevenue);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedRevenue(newExpanded);
    };

    const toggleExpenseCategory = (index: number) => {
        const newExpanded = new Set(expandedExpenses);
        if (newExpanded.has(index)) {
            newExpanded.delete(index);
        } else {
            newExpanded.add(index);
        }
        setExpandedExpenses(newExpanded);
    };

    // Function to apply date filter
    const applyDateFilter = (filter: string) => {
        const now = new Date();
        let firstDay: Date;
        let lastDay: Date;

        switch (filter) {
            case 'all':
                // Set to a very wide range (e.g., 10 years back)
                firstDay = new Date(now.getFullYear() - 10, 0, 1);
                lastDay = now;
                break;
            case 'this-month':
                firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                break;
            case 'last-month':
                firstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                lastDay = new Date(now.getFullYear(), now.getMonth(), 0);
                break;
            case 'this-quarter':
                const currentQuarter = Math.floor(now.getMonth() / 3);
                firstDay = new Date(now.getFullYear(), currentQuarter * 3, 1);
                lastDay = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0);
                break;
            case 'this-year':
                firstDay = new Date(now.getFullYear(), 0, 1);
                lastDay = new Date(now.getFullYear(), 11, 31);
                break;
            case 'last-year':
                firstDay = new Date(now.getFullYear() - 1, 0, 1);
                lastDay = new Date(now.getFullYear() - 1, 11, 31);
                break;
            case 'custom':
                // Don't change dates for custom
                return;
            default:
                firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
                lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }

        setStartDate(formatDateForInput(firstDay));
        setEndDate(formatDateForInput(lastDay));
        setDateFilter(filter);
    };

    // Initialize date range to current month
    useEffect(() => {
        applyDateFilter('this-month');
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
        setDateFilter('custom');
        setIsCalendarOpen(false);
    };

    // Function to show transaction details
    const showTransactionDetails = (accountName: string, accountId?: string) => {
        if (!startDate || !endDate) return;

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');

        // Filter transactions for this account
        const accountTransactions = transactions.filter(txn => {
            const txnDate = new Date(txn.date);
            if (txnDate < start || txnDate > end) return false;

            // Match by account ID or account name
            if (accountId && txn.accountId === accountId) return true;
            if ((txn as any).category === accountName) return true;

            // Check if transaction belongs to this account
            const account = accounts.find(acc => acc.id === txn.accountId);
            return account?.name === accountName;
        });

        setSelectedTransactions(accountTransactions);
        setModalTitle(accountName);
    };

    // Calculate P&L data
    const profitLossData = useMemo(() => {
        if (!startDate || !endDate || !Array.isArray(transactions) || !Array.isArray(accounts)) return null;

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');

        // Create account lookup map
        const accountMap = new Map(accounts.map(acc => [acc.id, acc]));

        // Filter transactions by date range — only include categorized (not in review)
        const filteredTransactions = transactions.filter(txn => {
            const txnDate = new Date(txn.date);
            if (txnDate < start || txnDate > end) return false;
            return !txn.status || txn.status === 'categorized';
        });

        // Helper function to get parent account or self
        const getParentOrSelf = (account: Account): Account => {
            if (account.parentId && accountMap.has(account.parentId)) {
                return accountMap.get(account.parentId)!;
            }
            return account;
        };

        // Group transactions by parent category
        interface CategoryGroup {
            code: string;
            name: string;
            amount: number;
            children: { code: string; name: string; amount: number }[];
        }

        const revenueCategories = new Map<string, CategoryGroup>();
        const expenseCategories = new Map<string, CategoryGroup>();
        const uncategorizedItems: { name: string; amount: number }[] = [];

        filteredTransactions.forEach(txn => {
            let account: Account | undefined;
            let accountType = 'uncategorized';

            // Get account from Chart of Accounts
            if (txn.accountId && accountMap.has(txn.accountId)) {
                account = accountMap.get(txn.accountId)!;
                accountType = account.type;
            } else if ((txn as any).category) {
                // Try to find account by category name
                const categoryName = (txn as any).category;
                const matchingAccount = accounts.find(acc => acc.name === categoryName);
                if (matchingAccount) {
                    account = matchingAccount;
                    accountType = matchingAccount.type;
                }
            }

            // Group by parent category
            if (txn.type === 'credit' && accountType === 'revenue' && account) {
                const parent = getParentOrSelf(account);
                if (!revenueCategories.has(parent.id)) {
                    revenueCategories.set(parent.id, {
                        code: parent.code,
                        name: parent.name,
                        amount: 0,
                        children: []
                    });
                }
                const category = revenueCategories.get(parent.id)!;
                category.amount += txn.amount;

                // If this is a child account, add to children
                if (account.parentId) {
                    const existingChild = category.children.find(c => c.name === account.name);
                    if (existingChild) {
                        existingChild.amount += txn.amount;
                    } else {
                        category.children.push({
                            code: account.code,
                            name: account.name,
                            amount: txn.amount
                        });
                    }
                }
            } else if (txn.type === 'debit' && accountType === 'expense' && account) {
                const parent = getParentOrSelf(account);
                if (!expenseCategories.has(parent.id)) {
                    expenseCategories.set(parent.id, {
                        code: parent.code,
                        name: parent.name,
                        amount: 0,
                        children: []
                    });
                }
                const category = expenseCategories.get(parent.id)!;
                category.amount += txn.amount;

                // If this is a child account, add to children
                if (account.parentId) {
                    const existingChild = category.children.find(c => c.name === account.name);
                    if (existingChild) {
                        existingChild.amount += txn.amount;
                    } else {
                        category.children.push({
                            code: account.code,
                            name: account.name,
                            amount: txn.amount
                        });
                    }
                }
            } else {
                // Uncategorized transactions
                const category = txn.type === 'credit' ? 'Uncategorized Income' : 'Uncategorized Expense';
                const existing = uncategorizedItems.find(item => item.name === category);
                if (existing) {
                    existing.amount += txn.amount;
                } else {
                    uncategorizedItems.push({ name: category, amount: txn.amount });
                }
            }
        });

        const totalRevenue = Array.from(revenueCategories.values()).reduce((sum, cat) => sum + cat.amount, 0) +
            uncategorizedItems.filter(item => item.name === 'Uncategorized Income').reduce((sum, item) => sum + item.amount, 0);

        const totalExpenses = Array.from(expenseCategories.values()).reduce((sum, cat) => sum + cat.amount, 0) +
            uncategorizedItems.filter(item => item.name === 'Uncategorized Expense').reduce((sum, item) => sum + item.amount, 0);

        const netIncome = totalRevenue - totalExpenses;

        return {
            revenueCategories: Array.from(revenueCategories.values()),
            expenseCategories: Array.from(expenseCategories.values()),
            uncategorized: uncategorizedItems,
            totalRevenue,
            totalExpenses,
            netIncome,
            netProfitMargin: totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0,
        };
    }, [transactions, accounts, startDate, endDate]);

    if (transactionsLoading || accountsLoading) {
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
                <div className="flex flex-col gap-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-2xl font-bold text-text-primary">Profit and Loss</h1>
                            <p className="text-sm text-text-secondary mt-1">Income statement for the selected period</p>
                        </div>

                        {/* Date Range Selector */}
                        <div className="relative" ref={calendarRef}>
                            <button
                                onClick={() => {
                                    setDateFilter('custom');
                                    setIsCalendarOpen(!isCalendarOpen);
                                }}
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

                    {/* Date Filter Buttons */}
                    <div className="flex flex-wrap gap-2">
                        <button
                            onClick={() => applyDateFilter('all')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                dateFilter === 'all'
                                    ? 'bg-accent-blue text-white'
                                    : 'bg-bg-tertiary text-text-secondary hover:bg-hover-bg'
                            }`}
                        >
                            All Dates
                        </button>
                        <button
                            onClick={() => applyDateFilter('this-month')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                dateFilter === 'this-month'
                                    ? 'bg-accent-blue text-white'
                                    : 'bg-bg-tertiary text-text-secondary hover:bg-hover-bg'
                            }`}
                        >
                            This Month
                        </button>
                        <button
                            onClick={() => applyDateFilter('last-month')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                dateFilter === 'last-month'
                                    ? 'bg-accent-blue text-white'
                                    : 'bg-bg-tertiary text-text-secondary hover:bg-hover-bg'
                            }`}
                        >
                            Last Month
                        </button>
                        <button
                            onClick={() => applyDateFilter('this-quarter')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                dateFilter === 'this-quarter'
                                    ? 'bg-accent-blue text-white'
                                    : 'bg-bg-tertiary text-text-secondary hover:bg-hover-bg'
                            }`}
                        >
                            This Quarter
                        </button>
                        <button
                            onClick={() => applyDateFilter('this-year')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                dateFilter === 'this-year'
                                    ? 'bg-accent-blue text-white'
                                    : 'bg-bg-tertiary text-text-secondary hover:bg-hover-bg'
                            }`}
                        >
                            This Year
                        </button>
                        <button
                            onClick={() => applyDateFilter('last-year')}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                                dateFilter === 'last-year'
                                    ? 'bg-accent-blue text-white'
                                    : 'bg-bg-tertiary text-text-secondary hover:bg-hover-bg'
                            }`}
                        >
                            Last Year
                        </button>
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
                                    {profitLossData.revenueCategories.length === 0 ? (
                                        <div className="text-text-secondary pl-4 text-xs italic">
                                            No revenue recorded for this period.
                                        </div>
                                    ) : (
                                        profitLossData.revenueCategories.map((category, index) => (
                                            <div key={index} className="space-y-1">
                                                <div className="flex justify-between font-medium">
                                                    <div
                                                        className={`flex items-center gap-2 ${category.children.length > 0 ? 'cursor-pointer hover:bg-hover-bg rounded px-2 py-1 -mx-2' : ''}`}
                                                        onClick={() => category.children.length > 0 && toggleRevenueCategory(index)}
                                                    >
                                                        {category.children.length > 0 && (
                                                            <ChevronDownIcon className={`w-4 h-4 text-text-secondary transition-transform ${expandedRevenue.has(index) ? '' : '-rotate-90'}`} />
                                                        )}
                                                        <span className="text-text-primary">{category.name}</span>
                                                    </div>
                                                    <span
                                                        className="text-text-primary cursor-pointer hover:text-accent-blue hover:underline select-none"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            showTransactionDetails(category.name);
                                                        }}
                                                    >
                                                        {formatPeso(category.amount)}
                                                    </span>
                                                </div>
                                                {category.children.length > 0 && expandedRevenue.has(index) && (
                                                    <div className="pl-6 space-y-1">
                                                        {category.children.map((child, childIndex) => (
                                                            <div key={childIndex} className="flex justify-between text-xs">
                                                                <span className="text-text-secondary">{child.name}</span>
                                                                <span
                                                                    className="text-text-secondary cursor-pointer hover:text-accent-blue hover:underline select-none"
                                                                    onClick={() => showTransactionDetails(child.name)}
                                                                >
                                                                    {formatPeso(child.amount)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                    {profitLossData.uncategorized.filter(item => item.name === 'Uncategorized Income').map((item, index) => (
                                        <div key={`unc-${index}`} className="flex justify-between">
                                            <span className="text-text-secondary pl-4 italic">{item.name}</span>
                                            <span className="text-text-primary font-medium">{formatPeso(item.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-2 border-t border-border-color font-semibold">
                                        <span className="text-text-primary">Total Revenue</span>
                                        <span className="text-text-primary">{formatPeso(profitLossData.totalRevenue)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Expenses */}
                            <div className="px-6 py-4 border-b border-border-color">
                                <h4 className="text-sm font-bold text-accent-red mb-3">EXPENSES</h4>
                                <div className="space-y-2 text-sm">
                                    {profitLossData.expenseCategories.length === 0 ? (
                                        <div className="text-text-secondary pl-4 text-xs italic">
                                            No expenses recorded for this period.
                                        </div>
                                    ) : (
                                        profitLossData.expenseCategories.map((category, index) => (
                                            <div key={index} className="space-y-1">
                                                <div className="flex justify-between font-medium">
                                                    <div
                                                        className={`flex items-center gap-2 ${category.children.length > 0 ? 'cursor-pointer hover:bg-hover-bg rounded px-2 py-1 -mx-2' : ''}`}
                                                        onClick={() => category.children.length > 0 && toggleExpenseCategory(index)}
                                                    >
                                                        {category.children.length > 0 && (
                                                            <ChevronDownIcon className={`w-4 h-4 text-text-secondary transition-transform ${expandedExpenses.has(index) ? '' : '-rotate-90'}`} />
                                                        )}
                                                        <span className="text-text-primary">{category.name}</span>
                                                    </div>
                                                    <span
                                                        className="text-text-primary cursor-pointer hover:text-accent-blue hover:underline select-none"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            showTransactionDetails(category.name);
                                                        }}
                                                    >
                                                        {formatPeso(category.amount)}
                                                    </span>
                                                </div>
                                                {category.children.length > 0 && expandedExpenses.has(index) && (
                                                    <div className="pl-6 space-y-1">
                                                        {category.children.map((child, childIndex) => (
                                                            <div key={childIndex} className="flex justify-between text-xs">
                                                                <span className="text-text-secondary">{child.name}</span>
                                                                <span
                                                                    className="text-text-secondary cursor-pointer hover:text-accent-blue hover:underline select-none"
                                                                    onClick={() => showTransactionDetails(child.name)}
                                                                >
                                                                    {formatPeso(child.amount)}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))
                                    )}
                                    {profitLossData.uncategorized.filter(item => item.name === 'Uncategorized Expense').map((item, index) => (
                                        <div key={`unc-${index}`} className="flex justify-between">
                                            <span className="text-text-secondary pl-4 italic">{item.name}</span>
                                            <span className="text-text-primary font-medium">{formatPeso(item.amount)}</span>
                                        </div>
                                    ))}
                                    <div className="flex justify-between pt-2 border-t border-border-color font-semibold">
                                        <span className="text-text-primary">Total Expenses</span>
                                        <span className="text-text-primary">{formatPeso(profitLossData.totalExpenses)}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Net Income */}
                            <div className="px-6 py-4 bg-bg-tertiary">
                                <div className="space-y-2">
                                    <div className="flex justify-between text-lg font-bold pt-2">
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
                                Note: Expenses are grouped by transaction description. Update the Chart of Accounts to link transactions to specific expense categories.
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Transaction Details Modal */}
            {selectedTransactions && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedTransactions(null)}>
                    <div className="bg-bg-secondary rounded-xl border border-border-color max-w-4xl w-full max-h-[80vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
                        <div className="p-4 border-b border-border-color flex items-center justify-between">
                            <h3 className="text-lg font-bold text-text-primary">Transactions - {modalTitle}</h3>
                            <button
                                onClick={() => setSelectedTransactions(null)}
                                className="p-1 rounded-lg hover:bg-hover-bg transition"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="overflow-auto max-h-[calc(80vh-120px)] p-4">
                            {selectedTransactions.length === 0 ? (
                                <p className="text-text-secondary text-center py-8">No transactions found for this category.</p>
                            ) : (
                                <div className="space-y-2">
                                    {selectedTransactions.map((txn, index) => (
                                        <div key={index} className="bg-bg-tertiary/40 p-3 rounded-lg border border-border-color hover:bg-hover-bg transition">
                                            <div className="flex justify-between items-start mb-2">
                                                <div>
                                                    <div className="font-medium text-text-primary">{txn.description}</div>
                                                    <div className="text-xs text-text-secondary mt-1">
                                                        {formatDateForDisplay(txn.date)}
                                                    </div>
                                                </div>
                                                <div className={`font-semibold ${txn.type === 'credit' ? 'text-accent-green' : 'text-accent-red'}`}>
                                                    {txn.type === 'credit' ? '+' : '-'}{formatPeso(txn.amount)}
                                                </div>
                                            </div>
                                            {txn.notes && (
                                                <div className="text-xs text-text-secondary mt-2 pt-2 border-t border-border-color">
                                                    {txn.notes}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                        <div className="p-4 border-t border-border-color">
                            <div className="flex justify-between items-center">
                                <span className="text-sm font-medium text-text-secondary">Total Transactions:</span>
                                <span className="text-sm font-bold text-text-primary">{selectedTransactions.length}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProfitAndLoss;
