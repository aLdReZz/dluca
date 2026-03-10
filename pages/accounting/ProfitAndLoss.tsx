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
            return txn.status === 'categorized';
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
                const categoryName = (txn as any).category as string;
                // Try direct name match first
                let matchingAccount = accounts.find(acc => acc.name === categoryName);
                // Handle hierarchical path "A > B > C" — try each segment from most specific
                if (!matchingAccount && categoryName.includes('>')) {
                    const segments = categoryName.split('>').map((s: string) => s.trim()).reverse();
                    for (const seg of segments) {
                        matchingAccount = accounts.find(acc => acc.name === seg);
                        if (matchingAccount) break;
                    }
                }
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
            <div className="flex-1 overflow-auto px-4 lg:px-8 py-6">
                {!profitLossData ? (
                    <div className="bg-bg-secondary rounded-xl border border-border-color p-12 text-center">
                        <DocumentChartBarIcon className="w-16 h-16 mx-auto mb-4 text-text-secondary/50" />
                        <p className="text-text-secondary">Select a date range to view the profit and loss statement</p>
                    </div>
                ) : (
                    <div className="max-w-3xl mx-auto">
                        {/* Company Header */}
                        <div className="text-center mb-6">
                            <h2 className="text-xl font-bold text-text-primary">D'Luca</h2>
                            <p className="text-sm font-semibold text-text-secondary mt-0.5">Profit and Loss</p>
                            <p className="text-xs text-text-secondary mt-0.5">
                                {formatDateForDisplay(startDate)} - {formatDateForDisplay(endDate)}
                            </p>
                        </div>

                        {/* Table */}
                        <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                            {/* Column Header */}
                            <div className="flex justify-between items-center px-5 py-2.5 border-b border-border-color bg-bg-tertiary">
                                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider"></span>
                                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">TOTAL</span>
                            </div>

                            {/* INCOME */}
                            <div className="border-b border-border-color">
                                {/* Section Header */}
                                <div className="flex justify-between items-center px-5 py-2 bg-bg-tertiary/50">
                                    <span className="text-sm font-semibold text-text-primary">Income</span>
                                </div>

                                {profitLossData.revenueCategories.length === 0 && profitLossData.uncategorized.filter(i => i.name === 'Uncategorized Income').length === 0 ? (
                                    <div className="px-8 py-2 text-sm text-text-secondary italic">No income recorded for this period.</div>
                                ) : (
                                    <>
                                        {profitLossData.revenueCategories.map((category, index) => (
                                            <div key={index}>
                                                {/* Parent category row */}
                                                <div
                                                    className="flex justify-between items-center px-8 py-2 hover:bg-hover-bg/30 cursor-pointer group"
                                                    onClick={() => toggleRevenueCategory(index)}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <ChevronDownIcon className={`w-3.5 h-3.5 text-text-secondary transition-transform flex-shrink-0 ${expandedRevenue.has(index) ? '' : '-rotate-90'}`} />
                                                        <span className="text-sm text-text-primary">{category.name}</span>
                                                    </div>
                                                    <span
                                                        className="text-sm text-text-primary tabular-nums cursor-pointer group-hover:text-accent-blue"
                                                        onClick={(e) => { e.stopPropagation(); showTransactionDetails(category.name); }}
                                                    >
                                                        {formatPeso(category.amount)}
                                                    </span>
                                                </div>
                                                {/* Children */}
                                                {expandedRevenue.has(index) && category.children.map((child, ci) => (
                                                    <div key={ci} className="flex justify-between items-center pl-14 pr-5 py-1.5 hover:bg-hover-bg/20">
                                                        <span className="text-sm text-text-secondary">{child.name}</span>
                                                        <span
                                                            className="text-sm text-text-secondary tabular-nums cursor-pointer hover:text-accent-blue"
                                                            onClick={() => showTransactionDetails(child.name)}
                                                        >
                                                            {formatPeso(child.amount)}
                                                        </span>
                                                    </div>
                                                ))}
                                                {/* Total for parent if expanded */}
                                                {expandedRevenue.has(index) && category.children.length > 0 && (
                                                    <div className="flex justify-between items-center pl-8 pr-5 py-1.5 border-t border-border-color/50 bg-bg-tertiary/30">
                                                        <span className="text-sm font-semibold text-text-primary">Total {category.name}</span>
                                                        <span className="text-sm font-semibold text-text-primary tabular-nums">{formatPeso(category.amount)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {profitLossData.uncategorized.filter(i => i.name === 'Uncategorized Income').map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center px-8 py-2 hover:bg-hover-bg/30">
                                                <span className="text-sm text-text-secondary italic">{item.name}</span>
                                                <span className="text-sm text-text-primary tabular-nums">{formatPeso(item.amount)}</span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* Total Income */}
                                <div className="flex justify-between items-center px-5 py-2.5 border-t border-border-color bg-bg-tertiary/50">
                                    <span className="text-sm font-bold text-text-primary">Total Income</span>
                                    <span className="text-sm font-bold text-text-primary tabular-nums">{formatPeso(profitLossData.totalRevenue)}</span>
                                </div>
                            </div>

                            {/* GROSS PROFIT */}
                            <div className="flex justify-between items-center px-5 py-3 border-b border-border-color bg-bg-tertiary">
                                <span className="text-sm font-bold text-text-primary tracking-wide">GROSS PROFIT</span>
                                <span className={`text-sm font-bold tabular-nums ${profitLossData.totalRevenue >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                                    {formatPeso(profitLossData.totalRevenue)}
                                </span>
                            </div>

                            {/* EXPENSES */}
                            <div className="border-b border-border-color">
                                <div className="flex justify-between items-center px-5 py-2 bg-bg-tertiary/50">
                                    <span className="text-sm font-semibold text-text-primary">Expenses</span>
                                </div>

                                {profitLossData.expenseCategories.length === 0 && profitLossData.uncategorized.filter(i => i.name === 'Uncategorized Expense').length === 0 ? (
                                    <div className="px-8 py-2 text-sm text-text-secondary italic">No expenses recorded for this period.</div>
                                ) : (
                                    <>
                                        {profitLossData.expenseCategories.map((category, index) => (
                                            <div key={index}>
                                                <div
                                                    className="flex justify-between items-center px-8 py-2 hover:bg-hover-bg/30 cursor-pointer group"
                                                    onClick={() => toggleExpenseCategory(index)}
                                                >
                                                    <div className="flex items-center gap-1.5">
                                                        <ChevronDownIcon className={`w-3.5 h-3.5 text-text-secondary transition-transform flex-shrink-0 ${expandedExpenses.has(index) ? '' : '-rotate-90'}`} />
                                                        <span className="text-sm text-text-primary">{category.name}</span>
                                                    </div>
                                                    <span
                                                        className="text-sm text-text-primary tabular-nums cursor-pointer group-hover:text-accent-blue"
                                                        onClick={(e) => { e.stopPropagation(); showTransactionDetails(category.name); }}
                                                    >
                                                        {formatPeso(category.amount)}
                                                    </span>
                                                </div>
                                                {expandedExpenses.has(index) && category.children.map((child, ci) => (
                                                    <div key={ci} className="flex justify-between items-center pl-14 pr-5 py-1.5 hover:bg-hover-bg/20">
                                                        <span className="text-sm text-text-secondary">{child.name}</span>
                                                        <span
                                                            className="text-sm text-text-secondary tabular-nums cursor-pointer hover:text-accent-blue"
                                                            onClick={() => showTransactionDetails(child.name)}
                                                        >
                                                            {formatPeso(child.amount)}
                                                        </span>
                                                    </div>
                                                ))}
                                                {expandedExpenses.has(index) && category.children.length > 0 && (
                                                    <div className="flex justify-between items-center pl-8 pr-5 py-1.5 border-t border-border-color/50 bg-bg-tertiary/30">
                                                        <span className="text-sm font-semibold text-text-primary">Total {category.name}</span>
                                                        <span className="text-sm font-semibold text-text-primary tabular-nums">{formatPeso(category.amount)}</span>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        {profitLossData.uncategorized.filter(i => i.name === 'Uncategorized Expense').map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center px-8 py-2 hover:bg-hover-bg/30">
                                                <span className="text-sm text-text-secondary italic">{item.name}</span>
                                                <span className="text-sm text-text-primary tabular-nums">{formatPeso(item.amount)}</span>
                                            </div>
                                        ))}
                                    </>
                                )}

                                {/* Total Expenses */}
                                <div className="flex justify-between items-center px-5 py-2.5 border-t border-border-color bg-bg-tertiary/50">
                                    <span className="text-sm font-bold text-text-primary">Total Expenses</span>
                                    <span className="text-sm font-bold text-text-primary tabular-nums">{formatPeso(profitLossData.totalExpenses)}</span>
                                </div>
                            </div>

                            {/* NET OPERATING INCOME */}
                            <div className="flex justify-between items-center px-5 py-3 border-b border-border-color bg-bg-tertiary">
                                <span className="text-sm font-bold text-text-primary tracking-wide">NET OPERATING INCOME</span>
                                <span className={`text-sm font-bold tabular-nums ${profitLossData.netIncome >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                                    {formatPeso(profitLossData.netIncome)}
                                </span>
                            </div>

                            {/* NET INCOME */}
                            <div className="flex justify-between items-center px-5 py-4 bg-bg-tertiary/80">
                                <div>
                                    <span className="text-base font-bold text-text-primary tracking-wide">NET INCOME</span>
                                    <div className="text-xs text-text-secondary mt-0.5">Net Profit Margin: {profitLossData.netProfitMargin.toFixed(2)}%</div>
                                </div>
                                <span className={`text-base font-bold tabular-nums ${profitLossData.netIncome >= 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                                    {formatPeso(profitLossData.netIncome)}
                                </span>
                            </div>
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
