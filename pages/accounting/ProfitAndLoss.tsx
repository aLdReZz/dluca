import React, { useState, useEffect, useMemo } from 'react';
import { useFirebaseData } from '../../hooks/useFirebase';
import { accountingService, chartOfAccountsService } from '../../utils/firebaseService';
import type { AccountingTransaction, Account } from '../../types';
import LoadingSpinner from '../../components/LoadingSpinner';
import { CalendarDaysIcon, ChevronDownIcon, DocumentChartBarIcon } from '../../components/Icons';
import CalendarPopup from '../../components/CalendarPopup';
import CategoryAutocomplete from '../../components/CategoryAutocomplete';

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
    const [expandedChildren, setExpandedChildren] = useState<Set<string>>(new Set());

    // Transaction detail modal state
    const [selectedTransactions, setSelectedTransactions] = useState<AccountingTransaction[] | null>(null);
    const [modalTitle, setModalTitle] = useState('');
    const [editingTxnId, setEditingTxnId] = useState<string | null>(null);
    const [editFields, setEditFields] = useState({ date: '', description: '', bank: '', category: '', amount: '' });
    const [savingTxn, setSavingTxn] = useState(false);

    const bankAccounts = useMemo(() =>
        Array.isArray(accounts) ? accounts.filter(a => a.type === 'bank' && a.isActive) : [],
    [accounts]);

    const categoryAccounts = useMemo(() =>
        Array.isArray(accounts) ? accounts.filter(a => a.type !== 'bank' && a.isActive) : [],
    [accounts]);

    const startEditTxn = (txn: AccountingTransaction) => {
        setEditingTxnId(txn.id);
        setEditFields({
            date: txn.date,
            description: txn.description,
            bank: (txn as any).bank || '',
            category: (txn as any).category || '',
            amount: txn.amount.toString(),
        });
    };

    const saveEditTxn = async (txn: AccountingTransaction) => {
        setSavingTxn(true);
        try {
            const lastSegment = editFields.category.split('>').pop()?.trim() || editFields.category;
            const selectedAccount = categoryAccounts.find(a => a.name === lastSegment);
            await accountingService.update(txn.id, {
                date: editFields.date,
                description: editFields.description,
                bank: editFields.bank,
                category: editFields.category,
                amount: parseFloat(editFields.amount) || txn.amount,
                accountId: selectedAccount?.id ?? txn.accountId,
            } as any);
            // Update local list
            setSelectedTransactions(prev => prev ? prev.map(t => t.id === txn.id ? {
                ...t,
                date: editFields.date,
                description: editFields.description,
                amount: parseFloat(editFields.amount) || t.amount,
                bank: editFields.bank,
                category: editFields.category,
            } as any : t) : prev);
            setEditingTxnId(null);
        } finally {
            setSavingTxn(false);
        }
    };

    const toggleRevenueCategory = (index: number) => {
        setExpandedRevenue(prev => { const s = new Set(prev); s.has(index) ? s.delete(index) : s.add(index); return s; });
    };

    const toggleExpenseCategory = (index: number) => {
        setExpandedExpenses(prev => { const s = new Set(prev); s.has(index) ? s.delete(index) : s.add(index); return s; });
    };

    const toggleChild = (key: string) => {
        setExpandedChildren(prev => { const s = new Set(prev); s.has(key) ? s.delete(key) : s.add(key); return s; });
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
    // fullPath can be a top-level group ("Cost of Goods Sold") or full path ("Cost of Goods Sold > Bakery > Supplies")
    const showTransactionDetails = (fullPath: string) => {
        if (!startDate || !endDate) return;

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');
        const isTopLevel = !fullPath.includes('>');

        const accountTransactions = transactions.filter(txn => {
            if (txn.status !== 'categorized') return false;
            const txnDate = new Date(txn.date);
            if (txnDate < start || txnDate > end) return false;

            // Match against category path string
            const cat = ((txn as any).category as string | undefined)?.trim();
            if (cat) {
                if (isTopLevel) {
                    // Match any transaction whose first segment equals fullPath
                    const firstSeg = cat.split('>')[0].trim();
                    if (firstSeg === fullPath) return true;
                } else {
                    // Match exact path or deeper paths that start with this path
                    if (cat === fullPath || cat.startsWith(fullPath + ' >') || cat.startsWith(fullPath + '>')) return true;
                }
            }

            // Match via Chart of Accounts
            const account = accounts.find(acc => acc.id === txn.accountId);
            if (account) {
                if (isTopLevel) {
                    if (account.name === fullPath) return true;
                    const parent = account.parentId ? accounts.find(a => a.id === account.parentId) : null;
                    if (parent?.name === fullPath) return true;
                } else {
                    // sub-path: check if account name matches last segment
                    const lastSeg = fullPath.split('>').pop()?.trim() ?? '';
                    if (account.name === lastSeg) return true;
                }
            }

            return false;
        });

        setSelectedTransactions(accountTransactions);
        setModalTitle(fullPath);
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

        // Build full ancestor chain from leaf to root
        const getAncestorChain = (account: Account): Account[] => {
            const chain: Account[] = [account];
            let current = account;
            while (current.parentId && accountMap.has(current.parentId)) {
                current = accountMap.get(current.parentId)!;
                chain.unshift(current);
            }
            return chain; // [root, ...middle, leaf]
        };

        // Group transactions by parent category
        interface CategoryGroup {
            code: string;
            name: string;
            amount: number;
            children: {
                name: string;
                amount: number;
                grandchildren: { name: string; amount: number }[];
            }[];
        }

        const revenueCategories = new Map<string, CategoryGroup>();
        const expenseCategories = new Map<string, CategoryGroup>();
        const uncategorizedItems: { name: string; amount: number }[] = [];

        const addToGroup = (
            map: Map<string, ReturnType<typeof map.get> & object>,
            groupKey: string, groupName: string, groupCode: string,
            childName: string | null, grandchildName: string | null,
            amount: number
        ) => {
            if (!map.has(groupKey)) {
                (map as any).set(groupKey, { code: groupCode, name: groupName, amount: 0, children: [] });
            }
            const cat = (map as any).get(groupKey)!;
            cat.amount += amount;
            if (childName) {
                let child = cat.children.find((c: any) => c.name === childName);
                if (!child) { child = { name: childName, amount: 0, grandchildren: [] }; cat.children.push(child); }
                child.amount += amount;
                if (grandchildName) {
                    const gc = child.grandchildren.find((g: any) => g.name === grandchildName);
                    if (gc) gc.amount += amount;
                    else child.grandchildren.push({ name: grandchildName, amount });
                }
            }
        };

        filteredTransactions.forEach(txn => {
            let groupKey: string;
            let groupName: string;
            let childName: string | null = null;
            let grandchildName: string | null = null;
            let accountType = 'uncategorized';
            let groupCode = '';

            if (txn.accountId && accountMap.has(txn.accountId)) {
                const account = accountMap.get(txn.accountId)!;
                accountType = account.type;
                const chain = getAncestorChain(account);
                const root = chain[0];
                groupName = root.name;
                groupKey = root.name;
                groupCode = root.code;
                childName = chain.length > 1 ? chain[1].name : null;
                grandchildName = chain.length > 2 ? chain.slice(2).map(a => a.name).join(' > ') : null;
            } else if ((txn as any).category) {
                const categoryPath = (txn as any).category as string;
                const segments = categoryPath.split('>').map((s: string) => s.trim());

                groupName = segments[0];
                groupKey = groupName;
                childName = segments.length > 1 ? segments[1] : null;
                grandchildName = segments.length > 2 ? segments.slice(2).join(' > ') : null;

                for (const seg of [...segments].reverse()) {
                    const found = accounts.find(acc => acc.name === seg);
                    if (found) { accountType = found.type; groupCode = found.code; break; }
                }
                if (accountType === 'uncategorized') {
                    const found = accounts.find(acc => acc.name === groupName);
                    if (found) { accountType = found.type; groupCode = found.code; }
                }
            } else {
                const label = txn.type === 'credit' ? 'Uncategorized Income' : 'Uncategorized Expense';
                const existing = uncategorizedItems.find(item => item.name === label);
                if (existing) existing.amount += txn.amount;
                else uncategorizedItems.push({ name: label, amount: txn.amount });
                return;
            }

            if (txn.type === 'credit' && accountType === 'revenue') {
                addToGroup(revenueCategories as any, groupKey, groupName, groupCode, childName, grandchildName, txn.amount);
            } else if (txn.type === 'debit' && accountType === 'expense') {
                addToGroup(expenseCategories as any, groupKey, groupName, groupCode, childName, grandchildName, txn.amount);
            } else {
                const label = txn.type === 'credit' ? 'Uncategorized Income' : 'Uncategorized Expense';
                const existing = uncategorizedItems.find(item => item.name === label);
                if (existing) existing.amount += txn.amount;
                else uncategorizedItems.push({ name: label, amount: txn.amount });
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
                                                <div className="flex justify-between items-center px-8 py-2 hover:bg-hover-bg/30 group">
                                                    <span
                                                        className="text-sm text-text-primary hover:text-accent-blue cursor-pointer flex-1"
                                                        onClick={() => toggleRevenueCategory(index)}
                                                    >{category.name}</span>
                                                    <span
                                                        className="text-sm text-text-primary tabular-nums hover:text-accent-blue cursor-pointer"
                                                        onClick={() => showTransactionDetails(category.name)}
                                                    >
                                                        {formatPeso(category.amount)}
                                                    </span>
                                                </div>
                                                {/* Children (mid-level) */}
                                                {expandedRevenue.has(index) && (category as any).children.map((child: any, ci: number) => (
                                                    <div key={ci}>
                                                        <div className="flex justify-between items-center pl-12 pr-5 py-1.5 hover:bg-hover-bg/20">
                                                            <span
                                                                className="text-sm text-text-secondary hover:text-accent-blue cursor-pointer flex-1"
                                                                onClick={() => toggleChild(category.name + '::' + child.name)}
                                                            >{child.name}</span>
                                                            <span
                                                                className="text-sm text-text-secondary tabular-nums hover:text-accent-blue cursor-pointer"
                                                                onClick={() => showTransactionDetails(category.name + ' > ' + child.name)}
                                                            >{formatPeso(child.amount)}</span>
                                                        </div>
                                                        {/* Grandchildren */}
                                                        {expandedChildren.has(category.name + '::' + child.name) && child.grandchildren.map((gc: any, gi: number) => (
                                                            <div key={gi} className="flex justify-between items-center pl-20 pr-5 py-1 hover:bg-hover-bg/10 cursor-pointer"
                                                                onClick={() => showTransactionDetails(category.name + ' > ' + child.name + ' > ' + gc.name)}>
                                                                <span className="text-xs text-text-secondary/70">{gc.name}</span>
                                                                <span className="text-xs text-text-secondary/70 tabular-nums">{formatPeso(gc.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                                {/* Total for parent if expanded */}
                                                {expandedRevenue.has(index) && (category as any).children.length > 0 && (
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
                                                <div className="flex justify-between items-center px-8 py-2 hover:bg-hover-bg/30 group">
                                                    <span
                                                        className="text-sm text-text-primary hover:text-accent-blue cursor-pointer flex-1"
                                                        onClick={() => toggleExpenseCategory(index)}
                                                    >{category.name}</span>
                                                    <span
                                                        className="text-sm text-text-primary tabular-nums hover:text-accent-blue cursor-pointer"
                                                        onClick={() => showTransactionDetails(category.name)}
                                                    >
                                                        {formatPeso(category.amount)}
                                                    </span>
                                                </div>
                                                {/* Children (mid-level) */}
                                                {expandedExpenses.has(index) && (category as any).children.map((child: any, ci: number) => (
                                                    <div key={ci}>
                                                        <div className="flex justify-between items-center pl-12 pr-5 py-1.5 hover:bg-hover-bg/20">
                                                            <span
                                                                className="text-sm text-text-secondary hover:text-accent-blue cursor-pointer flex-1"
                                                                onClick={() => toggleChild(category.name + '::' + child.name)}
                                                            >{child.name}</span>
                                                            <span
                                                                className="text-sm text-text-secondary tabular-nums hover:text-accent-blue cursor-pointer"
                                                                onClick={() => showTransactionDetails(category.name + ' > ' + child.name)}
                                                            >{formatPeso(child.amount)}</span>
                                                        </div>
                                                        {/* Grandchildren */}
                                                        {expandedChildren.has(category.name + '::' + child.name) && child.grandchildren.map((gc: any, gi: number) => (
                                                            <div key={gi} className="flex justify-between items-center pl-20 pr-5 py-1 hover:bg-hover-bg/10 cursor-pointer"
                                                                onClick={() => showTransactionDetails(category.name + ' > ' + child.name + ' > ' + gc.name)}>
                                                                <span className="text-xs text-text-secondary/70">{gc.name}</span>
                                                                <span className="text-xs text-text-secondary/70 tabular-nums">{formatPeso(gc.amount)}</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ))}
                                                {expandedExpenses.has(index) && (category as any).children.length > 0 && (
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
                        <div className="overflow-auto max-h-[calc(80vh-120px)]">
                            {selectedTransactions.length === 0 ? (
                                <p className="text-text-secondary text-center py-8">No transactions found for this category.</p>
                            ) : (
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b border-border-color bg-bg-tertiary/40 sticky top-0">
                                            <th className="text-left px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide w-28">Date</th>
                                            <th className="text-left px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide">Description</th>
                                            <th className="text-left px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide w-24">Bank</th>
                                            <th className="text-left px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide w-40">Category</th>
                                            <th className="text-right px-4 py-2 text-xs font-semibold text-text-secondary uppercase tracking-wide w-28">Amount</th>
                                            <th className="w-16"></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {selectedTransactions.map((txn, index) => {
                                            const isEditing = editingTxnId === txn.id;
                                            if (isEditing) {
                                                return (
                                                    <tr key={index} className="border-b border-border-color/50 bg-accent-blue/5">
                                                        <td className="px-2 py-1.5">
                                                            <input type="date" value={editFields.date} onChange={e => setEditFields(p => ({...p, date: e.target.value}))}
                                                                className="w-full bg-bg-primary border border-border-color rounded px-2 py-1 text-xs text-text-primary" />
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            <input type="text" value={editFields.description} onChange={e => setEditFields(p => ({...p, description: e.target.value}))}
                                                                className="w-full bg-bg-primary border border-border-color rounded px-2 py-1 text-xs text-text-primary" />
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            <div className="relative">
                                                                <select value={editFields.bank} onChange={e => setEditFields(p => ({...p, bank: e.target.value}))}
                                                                    style={{ backgroundImage: 'none' }}
                                                                    className="w-full appearance-none bg-bg-primary border border-border-color rounded px-2 pr-6 py-1 text-xs text-text-primary">
                                                                    <option value="">-</option>
                                                                    {bankAccounts.map(b => <option key={b.id} value={b.name}>{b.name}</option>)}
                                                                </select>
                                                                <svg className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                                                </svg>
                                                            </div>
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            <CategoryAutocomplete
                                                                value={editFields.category}
                                                                onChange={val => setEditFields(p => ({...p, category: val}))}
                                                                options={categoryAccounts}
                                                                placeholder="Select category"
                                                                showClear={false}
                                                            />
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            <input type="number" value={editFields.amount} onChange={e => setEditFields(p => ({...p, amount: e.target.value}))}
                                                                className="w-full bg-bg-primary border border-border-color rounded px-2 py-1 text-xs text-text-primary text-right" />
                                                        </td>
                                                        <td className="px-2 py-1.5">
                                                            <div className="flex gap-1 justify-center">
                                                                <button onClick={() => saveEditTxn(txn)} disabled={savingTxn}
                                                                    className="px-2 py-1 bg-accent-blue text-white rounded text-xs hover:bg-accent-blue/90 disabled:opacity-50">
                                                                    {savingTxn ? '…' : 'Save'}
                                                                </button>
                                                                <button onClick={() => setEditingTxnId(null)}
                                                                    className="px-2 py-1 bg-bg-tertiary text-text-secondary rounded text-xs hover:bg-hover-bg">
                                                                    ✕
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            return (
                                            <tr key={index} className="border-b border-border-color/50 hover:bg-hover-bg transition group">
                                                <td className="px-4 py-2 text-text-secondary whitespace-nowrap">{formatDateForDisplay(txn.date)}</td>
                                                <td className="px-4 py-2 text-text-primary">
                                                    {txn.description}
                                                    {txn.notes && <span className="block text-xs text-text-secondary mt-0.5">{txn.notes}</span>}
                                                </td>
                                                <td className="px-4 py-2 text-text-secondary capitalize">{(txn as any).bank || txn.account}</td>
                                                <td className="px-4 py-2 text-text-secondary">{(txn as any).category || '-'}</td>
                                                <td className={`px-4 py-2 text-right font-medium whitespace-nowrap ${txn.type === 'credit' ? 'text-accent-green' : 'text-accent-red'}`}>
                                                    {txn.type === 'credit' ? '+' : '-'}{formatPeso(txn.amount)}
                                                </td>
                                                <td className="px-2 py-2 text-center">
                                                    <button onClick={() => startEditTxn(txn)}
                                                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-hover-bg transition text-text-secondary hover:text-text-primary">
                                                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                                        </svg>
                                                    </button>
                                                </td>
                                            </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
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
