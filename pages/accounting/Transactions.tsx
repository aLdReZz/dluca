import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { AccountingTransaction, Account } from '../../types';
import { useFirebaseData, useFirebaseMutation } from '../../hooks/useFirebase';
import { accountingService, chartOfAccountsService } from '../../utils/firebaseService';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import DatePickerInput from '../../components/DatePickerInput';
import { PlusIcon, PencilIcon, TrashIcon, BanknotesIcon, ArrowTrendingUpIcon, ChartBarIcon, XMarkIcon, CheckIcon, ChevronUpIcon, ChevronDownIcon, ArrowsUpDownIcon } from '../../components/Icons';

const formatPeso = (amount: number) => {
    return '₱' + amount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
};

const SortableHeader: React.FC<{
    label: string;
    field: SortField;
    currentSortField: SortField;
    sortDirection: SortDirection;
    onSort: (field: SortField) => void;
    width: number;
    onResizeStart: (e: React.MouseEvent) => void;
    align?: 'left' | 'right' | 'center';
}> = ({ label, field, currentSortField, sortDirection, onSort, width, onResizeStart, align = 'left' }) => {
    const isActive = currentSortField === field && sortDirection;

    return (
        <th
            className="relative px-4 py-3 text-sm font-semibold text-text-primary bg-bg-tertiary select-none group"
            style={{ width: `${width}px`, minWidth: `${width}px` }}
        >
            <div
                className={`flex items-center gap-2 cursor-pointer hover:text-accent-blue transition-colors ${
                    align === 'right' ? 'justify-end' : align === 'center' ? 'justify-center' : 'justify-start'
                }`}
                onClick={() => onSort(field)}
            >
                <span>{label}</span>
                <span className="w-4 h-4 flex items-center justify-center">
                    {isActive ? (
                        sortDirection === 'asc' ? (
                            <ChevronUpIcon className="w-4 h-4 text-accent-blue" />
                        ) : (
                            <ChevronDownIcon className="w-4 h-4 text-accent-blue" />
                        )
                    ) : (
                        <ArrowsUpDownIcon className="w-3 h-3 text-text-secondary opacity-0 group-hover:opacity-100 transition-opacity" />
                    )}
                </span>
            </div>
            {/* Resize handle */}
            <div
                className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-accent-blue/50 active:bg-accent-blue"
                onMouseDown={onResizeStart}
                onClick={(e) => e.stopPropagation()}
            />
        </th>
    );
};

const CategoryAutocomplete: React.FC<{
    value: string;
    onChange: (value: string) => void;
    options: { id: string; name: string }[];
    placeholder?: string;
    className?: string;
}> = ({ value, onChange, options, placeholder = 'Select or type category', className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [inputValue, setInputValue] = useState(value);
    const [selectedIndex, setSelectedIndex] = useState(-1);
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0, width: 0 });
    const wrapperRef = useRef<HTMLDivElement>(null);
    const optionsRef = useRef<(HTMLDivElement | null)[]>([]);

    useEffect(() => {
        setInputValue(value);
    }, [value]);

    useEffect(() => {
        const updatePosition = () => {
            if (wrapperRef.current && isOpen) {
                const rect = wrapperRef.current.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + 4,
                    left: rect.left,
                    width: rect.width
                });
            }
        };

        if (isOpen) {
            updatePosition();
            window.addEventListener('scroll', updatePosition, true);
            window.addEventListener('resize', updatePosition);
        }

        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSelectedIndex(-1);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = useMemo(() => {
        if (!inputValue) return options;
        return options.filter(option =>
            option.name.toLowerCase().includes(inputValue.toLowerCase())
        );
    }, [inputValue, options]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newValue = e.target.value;
        setInputValue(newValue);
        onChange(newValue);
        setIsOpen(true);
        setSelectedIndex(-1);
    };

    const handleSelectOption = (optionName: string) => {
        setInputValue(optionName);
        onChange(optionName);
        setIsOpen(false);
        setSelectedIndex(-1);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!isOpen && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setIsOpen(true);
            setSelectedIndex(0);
            e.preventDefault();
            return;
        }

        if (!isOpen) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setSelectedIndex(prev => {
                    const newIndex = prev < filteredOptions.length - 1 ? prev + 1 : prev;
                    // Scroll into view
                    setTimeout(() => {
                        optionsRef.current[newIndex]?.scrollIntoView({ block: 'nearest' });
                    }, 0);
                    return newIndex;
                });
                break;
            case 'ArrowUp':
                e.preventDefault();
                setSelectedIndex(prev => {
                    const newIndex = prev > 0 ? prev - 1 : 0;
                    // Scroll into view
                    setTimeout(() => {
                        optionsRef.current[newIndex]?.scrollIntoView({ block: 'nearest' });
                    }, 0);
                    return newIndex;
                });
                break;
            case 'Enter':
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
                    handleSelectOption(filteredOptions[selectedIndex].name);
                }
                break;
            case 'Tab':
                if (selectedIndex >= 0 && selectedIndex < filteredOptions.length) {
                    handleSelectOption(filteredOptions[selectedIndex].name);
                }
                // Don't preventDefault - allow Tab to move to next field
                break;
            case 'Escape':
                e.preventDefault();
                setIsOpen(false);
                setSelectedIndex(-1);
                break;
        }
    };

    return (
        <div ref={wrapperRef} className="relative">
            <input
                type="text"
                value={inputValue}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                onFocus={() => setIsOpen(true)}
                placeholder={placeholder}
                className={className}
                autoComplete="off"
            />
            {isOpen && filteredOptions.length > 0 && (
                <div className="fixed z-[9999] bg-bg-primary border border-border-color rounded-xl shadow-lg max-h-60 overflow-y-auto"
                     data-autocomplete-dropdown="true"
                     style={{
                         top: `${dropdownPosition.top}px`,
                         left: `${dropdownPosition.left}px`,
                         width: `${dropdownPosition.width}px`
                     }}>
                    {filteredOptions.map((option, index) => (
                        <div
                            key={option.id}
                            ref={el => optionsRef.current[index] = el}
                            onClick={() => handleSelectOption(option.name)}
                            className={`px-3 py-2 cursor-pointer transition-colors text-sm text-text-primary ${
                                index === selectedIndex
                                    ? 'bg-accent-blue text-white'
                                    : 'hover:bg-hover-bg'
                            }`}
                        >
                            {option.name}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const SummaryCard: React.FC<{
    title: string;
    value: string;
    icon: React.FC<{ className?: string }>;
    color?: string;
    onClick?: () => void;
    isSelected?: boolean;
    logoSrc?: string;
    logoFull?: boolean;
}> = ({ title, value, icon: Icon, color = 'text-accent-blue', onClick, isSelected = false, logoSrc, logoFull }) => (
    <div
        className={`bg-bg-secondary p-4 rounded-xl border transition-all duration-200 cursor-pointer ${
            isSelected
                ? 'border-accent-blue shadow-lg shadow-accent-blue/20'
                : 'border-border-color hover:border-border-color/80'
        }`}
        onClick={onClick}
    >
        <div className="flex items-center justify-between mb-2">
            <div className={`rounded-lg bg-bg-tertiary flex-shrink-0 ${logoFull ? 'p-0 overflow-hidden w-9 h-9' : 'p-2'}`}>
                {logoSrc
                    ? <img src={logoSrc} alt={title} className={`grayscale opacity-70 ${logoFull ? 'w-full h-full object-cover' : 'w-5 h-5 object-contain'}`} />
                    : <Icon className="w-5 h-5 text-text-secondary" />
                }
            </div>
            {isSelected && (
                <div className="px-2 py-0.5 rounded bg-accent-blue/20 border border-accent-blue/30 flex-shrink-0">
                    <span className="text-xs font-medium text-accent-blue whitespace-nowrap">Active</span>
                </div>
            )}
        </div>
        <div className="min-w-0">
            <div className="text-xs font-medium text-text-secondary mb-1 truncate" title={title}>{title}</div>
            <div className="text-xl font-bold text-text-primary truncate" title={value}>{value}</div>
        </div>
    </div>
);

type SortField = 'date' | 'type' | 'category' | 'description' | 'reference' | 'bank' | 'amount';
type SortDirection = 'asc' | 'desc' | null;

const Transactions: React.FC = () => {
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [showCsvModal, setShowCsvModal] = useState(false);
    const [csvRows, setCsvRows] = useState<Array<{ date: string; description: string; amount: string; type: string; reference: string; category: string; bank: string; valid: boolean; error?: string }>>([]);
    const [csvImporting, setCsvImporting] = useState(false);
    const csvFileInputRef = useRef<HTMLInputElement>(null);
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
    const [deletingTransaction, setDeletingTransaction] = useState<AccountingTransaction | null>(null);
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [openingBalance, setOpeningBalance] = useState<number>(0);
    const [selectedBank, setSelectedBank] = useState<string | null>(null);

    // Batch selection state
    const [selectedTransactions, setSelectedTransactions] = useState<Set<string>>(new Set());
    const [isBatchDeleting, setIsBatchDeleting] = useState(false);
    const [isBatchEditing, setIsBatchEditing] = useState(false);
    const [batchEditData, setBatchEditData] = useState({
        type: '',
        category: '',
        bank: ''
    });

    // Date filter state
    const [dateFilter, setDateFilter] = useState<string>('all');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    const [searchQuery, setSearchQuery] = useState<string>('');

    const applyDateFilter = (filter: string) => {
        const now = new Date();
        const fmt = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        setDateFilter(filter);
        if (filter === 'this-month') {
            setStartDate(fmt(new Date(now.getFullYear(), now.getMonth(), 1)));
            setEndDate(fmt(new Date(now.getFullYear(), now.getMonth() + 1, 0)));
        } else if (filter === 'last-month') {
            setStartDate(fmt(new Date(now.getFullYear(), now.getMonth() - 1, 1)));
            setEndDate(fmt(new Date(now.getFullYear(), now.getMonth(), 0)));
        } else if (filter === 'this-quarter') {
            const q = Math.floor(now.getMonth() / 3);
            setStartDate(fmt(new Date(now.getFullYear(), q * 3, 1)));
            setEndDate(fmt(new Date(now.getFullYear(), (q + 1) * 3, 0)));
        } else if (filter === 'this-year') {
            setStartDate(fmt(new Date(now.getFullYear(), 0, 1)));
            setEndDate(fmt(new Date(now.getFullYear(), 11, 31)));
        } else if (filter === 'last-year') {
            setStartDate(fmt(new Date(now.getFullYear() - 1, 0, 1)));
            setEndDate(fmt(new Date(now.getFullYear() - 1, 11, 31)));
        } else {
            setStartDate('');
            setEndDate('');
        }
    };

    // Tab state
    const [activeTab, setActiveTab] = useState<'review' | 'categorized'>('review');
    const [reviewCategories, setReviewCategories] = useState<Record<string, string>>({});
    const [selectedReviewIds, setSelectedReviewIds] = useState<Set<string>>(new Set());
    const [confirmingIds, setConfirmingIds] = useState<Set<string>>(new Set());

    // Sorting state
    const [sortField, setSortField] = useState<SortField>('date');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Column resizing state
    const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
        date: 120,
        type: 100,
        category: 150,
        description: 250,
        reference: 150,
        bank: 120,
        amount: 130,
        actions: 100
    });
    const [resizingColumn, setResizingColumn] = useState<string | null>(null);
    const [startX, setStartX] = useState<number>(0);
    const [startWidth, setStartWidth] = useState<number>(0);

    // Edit transaction form state
    const [editDate, setEditDate] = useState('');
    const [editType, setEditType] = useState<'credit' | 'debit'>('credit');
    const [editDescription, setEditDescription] = useState('');
    const [editReference, setEditReference] = useState('');
    const [editCategory, setEditCategory] = useState('');
    const [editPaymentMethod, setEditPaymentMethod] = useState('');
    const [editAmount, setEditAmount] = useState('');

    // New transaction form state
    const [newDate, setNewDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [newType, setNewType] = useState<'credit' | 'debit'>('credit');
    const [newDescription, setNewDescription] = useState('');
    const [newReference, setNewReference] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newPaymentMethod, setNewPaymentMethod] = useState('');
    const [newAmount, setNewAmount] = useState('');

    // Fetch all transactions
    const { data: allTransactions = [], loading: transactionsLoading, error: transactionsError, refetch } = useFirebaseData(
        () => accountingService.getAll(),
        []
    );

    // Fetch bank accounts from Chart of Accounts
    const { data: allAccounts = [], loading: accountsLoading } = useFirebaseData(
        () => chartOfAccountsService.getAll(),
        []
    );

    // Filter to get only leaf bank accounts (exclude parent categories that have no parentId)
    const bankAccounts = useMemo(() => {
        if (!allAccounts || !Array.isArray(allAccounts)) return [];
        return allAccounts.filter(account => account.type === 'bank' && account.isActive && account.parentId);
    }, [allAccounts]);

    // Filter to get all non-bank accounts for category dropdown
    const categoryAccounts = useMemo(() => {
        if (!allAccounts || !Array.isArray(allAccounts)) return [];
        return allAccounts.filter(account =>
            account.type !== 'bank' && account.isActive
        ).sort((a, b) => a.name.localeCompare(b.name));
    }, [allAccounts]);

    // Fetch opening balance
    const { data: balanceData } = useFirebaseData(() => accountingService.getAccountBalance('general'), []);

    // Update opening balance when fetched
    useEffect(() => {
        if (balanceData) setOpeningBalance(balanceData.openingBalance);
    }, [balanceData]);

    // Mutations
    const { mutate: addTransaction } = useFirebaseMutation(
        (transaction: Omit<AccountingTransaction, 'id' | 'runningBalance'>) => accountingService.add(transaction)
    );

    const { mutate: updateTransaction } = useFirebaseMutation(
        (data: { id: string; updates: Partial<AccountingTransaction> }) =>
            accountingService.update(data.id, data.updates)
    );

    const { mutate: deleteTransaction } = useFirebaseMutation(
        (id: string) => accountingService.delete(id)
    );

    const { mutate: setAccountBalance, loading: setBalanceLoading } = useFirebaseMutation(
        (data: { account: string; openingBalance: number }) =>
            accountingService.setAccountBalance(data.account, data.openingBalance)
    );

    // Sort all transactions by date, then by time (createdAt)
    const sortedTransactions = useMemo(() => {
        if (!allTransactions || !Array.isArray(allTransactions)) return [];
        return allTransactions.sort((a, b) => {
            // First sort by date (newest first)
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateB !== dateA) {
                return dateB - dateA;
            }
            // If dates are equal, sort by createdAt time (newest first)
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return timeB - timeA;
        });
    }, [allTransactions]);

    // Filter transactions by selected bank and date range
    const filteredTransactions = useMemo(() => {
        const start = startDate ? new Date(startDate + 'T00:00:00') : null;
        const end = endDate ? new Date(endDate + 'T23:59:59') : null;
        const q = searchQuery.trim().toLowerCase();
        return sortedTransactions.filter(t => {
            if (selectedBank && (t as any).bank?.toLowerCase() !== selectedBank.toLowerCase()) return false;
            const txnDate = new Date(t.date);
            if (start && txnDate < start) return false;
            if (end && txnDate > end) return false;
            if (q && !t.description?.toLowerCase().includes(q)) return false;
            return true;
        });
    }, [sortedTransactions, selectedBank, startDate, endDate, searchQuery]);

    // Split into review vs categorized
    const reviewTransactions = useMemo(() => {
        return filteredTransactions.filter(t => t.status === 'review');
    }, [filteredTransactions]);

    const categorizedTransactions = useMemo(() => {
        return filteredTransactions.filter(t => !t.status || t.status === 'categorized');
    }, [filteredTransactions]);

    // Sorting handler
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            // Cycle through: asc -> desc -> no sort -> asc
            setSortDirection(sortDirection === 'asc' ? 'desc' : sortDirection === 'desc' ? null : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Column resize handlers
    const handleResizeStart = (e: React.MouseEvent, columnKey: string) => {
        e.preventDefault();
        setResizingColumn(columnKey);
        setStartX(e.clientX);
        setStartWidth(columnWidths[columnKey]);
    };

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            if (resizingColumn) {
                const diff = e.clientX - startX;
                const newWidth = Math.max(80, startWidth + diff);
                setColumnWidths(prev => ({
                    ...prev,
                    [resizingColumn]: newWidth
                }));
            }
        };

        const handleMouseUp = () => {
            setResizingColumn(null);
        };

        if (resizingColumn) {
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }

        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [resizingColumn, startX, startWidth]);

    // Calculate running balance with sorting (categorized only)
    const transactionsWithBalance = useMemo(() => {
        const sorted = [...categorizedTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let balance = openingBalance || 0;

        const withBalance = sorted.map(transaction => {
            if (transaction.type === 'credit') {
                balance += transaction.amount;
            } else {
                balance -= transaction.amount;
            }
            return { ...transaction, runningBalance: balance };
        }).reverse();

        // Apply sorting if active
        if (sortDirection) {
            return [...withBalance].sort((a, b) => {
                let aValue: any;
                let bValue: any;

                switch (sortField) {
                    case 'date':
                        aValue = new Date(a.date).getTime();
                        bValue = new Date(b.date).getTime();
                        break;
                    case 'type':
                        aValue = a.type;
                        bValue = b.type;
                        break;
                    case 'category':
                        aValue = (a as any).category || '';
                        bValue = (b as any).category || '';
                        break;
                    case 'description':
                        aValue = a.description.toLowerCase();
                        bValue = b.description.toLowerCase();
                        break;
                    case 'reference':
                        aValue = a.reference || '';
                        bValue = b.reference || '';
                        break;
                    case 'bank':
                        aValue = (a as any).bank || '';
                        bValue = (b as any).bank || '';
                        break;
                    case 'amount':
                        aValue = a.amount;
                        bValue = b.amount;
                        break;
                    default:
                        return 0;
                }

                if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
                if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
                return 0;
            });
        }

        return withBalance;
    }, [filteredTransactions, openingBalance, sortField, sortDirection]);

    // Calculate bank account balances
    const bankBalances = useMemo(() => {
        if (!bankAccounts || bankAccounts.length === 0) return [];

        return bankAccounts.map(bank => {
            const bankTransactions = sortedTransactions.filter(
                t => (t as any).bank?.toLowerCase() === bank.name.toLowerCase()
            );

            const income = bankTransactions
                .filter(t => t.type === 'credit')
                .reduce((sum, t) => sum + t.amount, 0);

            const expenses = bankTransactions
                .filter(t => t.type === 'debit')
                .reduce((sum, t) => sum + t.amount, 0);

            const balance = income - expenses;

            return {
                name: bank.name,
                balance,
                income,
                expenses
            };
        });
    }, [sortedTransactions, bankAccounts]);

    const handleAddNewTransaction = async () => {
        if (!newDate || !newDescription || !newAmount || !newCategory) {
            setOperationStatus({ type: 'error', message: 'Please fill in all required fields' });
            return;
        }

        try {
            // Find the account from Chart of Accounts to determine transaction type
            const selectedAccount = categoryAccounts.find(acc => acc.name === newCategory);
            let transactionType: 'credit' | 'debit' = 'debit';

            if (selectedAccount) {
                // Revenue increases with credits, expenses/assets decrease with debits
                if (selectedAccount.type === 'revenue') {
                    transactionType = 'credit';
                } else if (selectedAccount.type === 'expense' || selectedAccount.type === 'asset') {
                    transactionType = 'debit';
                } else if (selectedAccount.type === 'liability' || selectedAccount.type === 'equity') {
                    transactionType = 'credit';
                }
            }

            const transaction: Omit<AccountingTransaction, 'id' | 'runningBalance'> = {
                date: newDate,
                type: transactionType,
                description: newDescription,
                reference: newReference,
                amount: parseFloat(newAmount),
                account: 'general',
                category: newCategory,
                bank: newPaymentMethod,
                accountId: selectedAccount?.id,
                status: 'categorized' as const
            };

            await addTransaction(transaction);
            setOperationStatus({ type: 'success', message: 'Transaction added successfully' });
            await refetch();

            // Reset form
            const today = new Date();
            setNewDate(today.toISOString().split('T')[0]);
            setNewType('credit');
            setNewDescription('');
            setNewReference('');
            setNewCategory('');
            setNewPaymentMethod('');
            setNewAmount('');
            setIsAddingNew(false);
        } catch (error) {
            setOperationStatus({ type: 'error', message: 'Failed to add transaction' });
        }
    };

    const handleOpenAddTransaction = () => {
        setNewPaymentMethod(selectedBank || '');
        setIsAddingNew(true);
    };

    const handleCancelNew = () => {
        const today = new Date();
        setNewDate(today.toISOString().split('T')[0]);
        setNewType('credit');
        setNewDescription('');
        setNewReference('');
        setNewCategory('');
        setNewPaymentMethod('');
        setNewAmount('');
        setIsAddingNew(false);
    };

    const parseCsvLine = (line: string): string[] => {
        const result: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (ch === '"') { inQuotes = !inQuotes; }
            else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
            else { current += ch; }
        }
        result.push(current.trim());
        return result;
    };

    const parseCsvDate = (raw: string): string => {
        const cleaned = raw.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleaned)) return cleaned;
        const withYear = /\d{4}/.test(cleaned) ? cleaned : `${cleaned} ${new Date().getFullYear()}`;
        const d = new Date(withYear);
        if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
        return cleaned;
    };

    const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            const lines = text.split(/\r?\n/).filter(l => l.trim());
            if (lines.length < 2) return;
            const rawHeaders = parseCsvLine(lines[0]);
            const headers = rawHeaders.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));

            const getCol = (cols: string[], names: string[]) => {
                for (const name of names) {
                    const idx = headers.indexOf(name);
                    if (idx !== -1) return (cols[idx] || '').trim();
                }
                return '';
            };

            const parsed = lines.slice(1).map(line => {
                const cols = parseCsvLine(line);
                const rawDate = getCol(cols, ['date']);
                const date = parseCsvDate(rawDate);
                const description = getCol(cols, ['description', 'desc', 'details', 'narration']);
                const rawAmount = getCol(cols, ['amount', 'debitamount', 'creditamount', 'value']);
                const amount = rawAmount.replace(/[₱,\s]/g, '');
                const rawType = getCol(cols, ['type', 'transactiontype', 'drcr']).toLowerCase();
                // "income" → credit, "expense" → debit
                const type = rawType === 'income' ? 'credit' : rawType === 'expense' ? 'debit' : rawType;
                const category = getCol(cols, ['category']);
                const subCategory = getCol(cols, ['subcategory', 'subcat']);
                const subSubCategory = getCol(cols, ['subsubcategory', 'subsubcat']);
                const fullCategory = [category, subCategory, subSubCategory].filter(Boolean).join(' > ');
                const bank = getCol(cols, ['bank', 'paymentmethod', 'method', 'bankaccount']);

                let valid = true;
                let error = '';
                if (!rawDate) { valid = false; error = 'Missing date'; }
                else if (!description) { valid = false; error = 'Missing description'; }
                else if (!amount || isNaN(parseFloat(amount))) { valid = false; error = 'Invalid amount'; }

                return { date, description, amount, type, reference: '', category: fullCategory, bank, valid, error };
            }).filter(r => r.date || r.description || r.amount);

            setCsvRows(parsed);
            setShowCsvModal(true);
        };
        reader.readAsText(file);
        e.target.value = '';
    };

    const handleCsvImport = async () => {
        const validRows = csvRows.filter(r => r.valid);
        if (!validRows.length) return;
        setCsvImporting(true);

        const transactionsToImport = validRows.map(row => {
            const selectedAccount = categoryAccounts.find(acc => acc.name === row.category);
            let transactionType: 'credit' | 'debit' = 'debit';
            if (row.type === 'credit' || row.type === 'cr') {
                transactionType = 'credit';
            } else if (row.type === 'debit' || row.type === 'dr') {
                transactionType = 'debit';
            } else if (selectedAccount) {
                transactionType = selectedAccount.type === 'revenue' || selectedAccount.type === 'liability' || selectedAccount.type === 'equity' ? 'credit' : 'debit';
            }
            return {
                date: row.date,
                type: transactionType,
                description: row.description,
                reference: row.reference,
                amount: parseFloat(row.amount),
                account: 'general' as const,
                category: row.category,
                bank: row.bank,
                accountId: selectedAccount?.id,
                status: 'review' as const
            };
        });

        let successCount = 0;
        let batchError = '';
        try {
            successCount = await accountingService.addBatch(transactionsToImport);
        } catch (err: any) {
            console.error('Batch import failed:', err);
            batchError = err?.message || 'Unknown error';
        }

        await refetch();
        setCsvImporting(false);
        setShowCsvModal(false);
        setCsvRows([]);
        const failCount = validRows.length - successCount;
        const msg = batchError
            ? `Import failed: ${batchError}`
            : failCount > 0
            ? `${successCount} imported, ${failCount} failed — check your Firestore quota or connection`
            : `${successCount} transaction${successCount !== 1 ? 's' : ''} imported successfully`;
        setOperationStatus({ type: failCount > 0 || batchError ? 'error' : 'success', message: msg });
    };

    const handleEditTransaction = (transaction: AccountingTransaction) => {
        setEditingTransactionId(transaction.id);
        setEditDate(transaction.date);
        setEditType(transaction.type);
        setEditDescription(transaction.description);
        setEditReference(transaction.reference || '');
        setEditCategory((transaction as any).category || '');
        setEditPaymentMethod((transaction as any).bank || '');
        setEditAmount(transaction.amount.toString());
    };

    const handleSaveEdit = async () => {
        if (!editingTransactionId || !editDate || !editDescription || !editAmount || !editCategory) {
            setOperationStatus({ type: 'error', message: 'Please fill in all required fields' });
            return;
        }

        try {
            // Find the account from Chart of Accounts to determine transaction type
            const selectedAccount = categoryAccounts.find(acc => acc.name === editCategory);
            let transactionType: 'credit' | 'debit' = 'debit';

            if (selectedAccount) {
                // Revenue increases with credits, expenses/assets decrease with debits
                if (selectedAccount.type === 'revenue') {
                    transactionType = 'credit';
                } else if (selectedAccount.type === 'expense' || selectedAccount.type === 'asset') {
                    transactionType = 'debit';
                } else if (selectedAccount.type === 'liability' || selectedAccount.type === 'equity') {
                    transactionType = 'credit';
                }
            }

            await updateTransaction({
                id: editingTransactionId,
                updates: {
                    date: editDate,
                    type: transactionType,
                    description: editDescription,
                    reference: editReference,
                    category: editCategory,
                    bank: editPaymentMethod,
                    amount: parseFloat(editAmount),
                    accountId: selectedAccount?.id
                }
            });
            setOperationStatus({ type: 'success', message: 'Transaction updated successfully' });
            await refetch();
            setEditingTransactionId(null);
        } catch (error) {
            setOperationStatus({ type: 'error', message: 'Failed to update transaction' });
        }
    };

    const handleCancelEdit = () => {
        setEditingTransactionId(null);
        setEditDate('');
        setEditType('credit');
        setEditDescription('');
        setEditReference('');
        setEditCategory('');
        setEditPaymentMethod('');
        setEditAmount('');
    };

    const handleDeleteTransaction = async () => {
        if (deletingTransaction) {
            try {
                await deleteTransaction(deletingTransaction.id);
                setOperationStatus({ type: 'success', message: 'Transaction deleted successfully' });
                await refetch();
                setDeletingTransaction(null);
            } catch (error) {
                setOperationStatus({ type: 'error', message: 'Failed to delete transaction' });
            }
        }
    };

    const handleSetOpeningBalance = async (balance: number) => {
        try {
            await setAccountBalance({ account: 'general', openingBalance: balance });
            setOpeningBalance(balance);
            setOperationStatus({ type: 'success', message: 'Opening balance set successfully' });
        } catch (error) {
            setOperationStatus({ type: 'error', message: 'Failed to set opening balance' });
        }
    };

    // Batch selection handlers
    const handleSelectAll = () => {
        if (selectedTransactions.size === transactionsWithBalance.length) {
            setSelectedTransactions(new Set());
        } else {
            const allIds = new Set(transactionsWithBalance.map(t => t.id).filter(Boolean) as string[]);
            setSelectedTransactions(allIds);
        }
    };

    const handleSelectTransaction = (id: string) => {
        const newSelected = new Set(selectedTransactions);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedTransactions(newSelected);
    };

    const handleBatchDelete = async () => {
        if (selectedTransactions.size === 0) return;
        setIsBatchDeleting(true);
    };

    const confirmBatchDelete = async () => {
        try {
            const idsToDelete = Array.from(selectedTransactions);
            const deletePromises = idsToDelete.map(id => deleteTransaction(id));
            await Promise.all(deletePromises);
            setSelectedTransactions(new Set());
            setIsBatchDeleting(false);
            setOperationStatus({
                type: 'success',
                message: `Successfully deleted ${idsToDelete.length} transaction(s)`
            });
            await refetch();
        } catch (error) {
            setOperationStatus({ type: 'error', message: 'Failed to delete some transactions' });
            setIsBatchDeleting(false);
        }
    };

    const cancelBatchDelete = () => {
        setIsBatchDeleting(false);
    };

    const handleBatchEdit = () => {
        if (selectedTransactions.size === 0) return;
        setIsBatchEditing(true);
        setBatchEditData({ type: '', category: '', bank: '' });
    };

    const confirmBatchEdit = async () => {
        try {
            const updatePromises = Array.from(selectedTransactions).map(id => {
                const transaction = transactionsWithBalance.find(t => t.id === id);
                if (!transaction) return Promise.resolve();

                const updates: Partial<AccountingTransaction> = {};
                if (batchEditData.type) updates.type = batchEditData.type as 'credit' | 'debit';
                if (batchEditData.category) updates.category = batchEditData.category;
                if (batchEditData.bank) updates.bank = batchEditData.bank;

                return updateTransaction({ id, updates });
            });

            await Promise.all(updatePromises);
            setSelectedTransactions(new Set());
            setIsBatchEditing(false);
            setBatchEditData({ type: '', category: '', bank: '' });
            setOperationStatus({
                type: 'success',
                message: `Successfully updated ${updatePromises.length} transaction(s)`
            });
            await refetch();
        } catch (error) {
            setOperationStatus({ type: 'error', message: 'Failed to update some transactions' });
            setIsBatchEditing(false);
        }
    };

    const cancelBatchEdit = () => {
        setIsBatchEditing(false);
        setBatchEditData({ type: '', category: '', bank: '' });
    };

    // Confirm a single "For Review" transaction → move to Categorized
    const handleConfirmTransaction = async (id: string, category: string) => {
        setConfirmingIds(prev => new Set(prev).add(id));
        try {
            const selectedAccount = categoryAccounts.find(acc => acc.name === category);
            await updateTransaction({
                id,
                updates: {
                    status: 'categorized',
                    ...(category ? { category, accountId: selectedAccount?.id } : {})
                }
            });
            setReviewCategories(prev => { const n = { ...prev }; delete n[id]; return n; });
            setSelectedReviewIds(prev => { const n = new Set(prev); n.delete(id); return n; });
            await refetch();
        } catch {
            setOperationStatus({ type: 'error', message: 'Failed to confirm transaction' });
        } finally {
            setConfirmingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        }
    };

    // Exclude (delete) a "For Review" transaction
    const handleExcludeTransaction = async (id: string) => {
        setConfirmingIds(prev => new Set(prev).add(id));
        try {
            await deleteTransaction(id);
            setSelectedReviewIds(prev => { const n = new Set(prev); n.delete(id); return n; });
            await refetch();
            setOperationStatus({ type: 'success', message: 'Transaction excluded' });
        } catch {
            setOperationStatus({ type: 'error', message: 'Failed to exclude transaction' });
        } finally {
            setConfirmingIds(prev => { const n = new Set(prev); n.delete(id); return n; });
        }
    };

    // Batch confirm all selected review transactions
    const handleBatchConfirm = async () => {
        const ids = Array.from(selectedReviewIds);
        if (!ids.length) return;
        setConfirmingIds(new Set(ids));
        try {
            await Promise.all(ids.map(id => {
                const category = reviewCategories[id] ?? ((reviewTransactions.find(t => t.id === id) as any)?.category ?? '');
                const selectedAccount = categoryAccounts.find(acc => acc.name === category);
                return updateTransaction({ id, updates: { status: 'categorized', ...(category ? { category, accountId: selectedAccount?.id } : {}) } });
            }));
            setSelectedReviewIds(new Set());
            setReviewCategories(prev => { const n = { ...prev }; ids.forEach(id => delete n[id]); return n; });
            setOperationStatus({ type: 'success', message: `${ids.length} transaction${ids.length !== 1 ? 's' : ''} confirmed` });
            await refetch();
        } catch {
            setOperationStatus({ type: 'error', message: 'Failed to confirm some transactions' });
        } finally {
            setConfirmingIds(new Set());
        }
    };

    // Clear status messages after 3 seconds
    useEffect(() => {
        if (operationStatus) {
            const timer = setTimeout(() => setOperationStatus(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [operationStatus]);

    // Handle ESC key to cancel add transaction
    useEffect(() => {
        const handleEscKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isAddingNew) {
                handleCancelNew();
            }
        };

        document.addEventListener('keydown', handleEscKey);
        return () => document.removeEventListener('keydown', handleEscKey);
    }, [isAddingNew]);


    if (transactionsError) {
        console.error('Error loading transactions:', transactionsError);
    }

    if ((transactionsLoading && !allTransactions) || (accountsLoading && !allAccounts)) {
        return (
            <div className="flex justify-center items-center h-full">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col overflow-auto">
            {/* Status Messages */}
            {operationStatus && (
                <div className={`mx-4 lg:mx-6 mt-4 lg:mt-6 p-4 rounded-lg ${
                    operationStatus.type === 'success' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red'
                }`}>
                    {operationStatus.message}
                </div>
            )}

            {/* Bank Account Balance Cards */}
            <div className="px-4 lg:px-6 pt-4 lg:pt-6 pb-3">
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 mb-3">
                    <h2 className="text-lg font-semibold text-text-primary truncate">
                        {selectedBank ? `${selectedBank} Transactions` : 'All Bank Accounts'}
                    </h2>
                    {selectedBank && (
                        <button
                            onClick={() => setSelectedBank(null)}
                            className="text-sm text-accent-blue hover:text-accent-blue/80 transition-colors whitespace-nowrap self-start sm:self-auto"
                        >
                            View All Banks
                        </button>
                    )}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 lg:gap-4">
                    {bankBalances.length > 0 ? (
                        bankBalances.map((bank, index) => (
                            <SummaryCard
                                key={bank.name}
                                title={bank.name}
                                value={formatPeso(bank.balance)}
                                icon={BanknotesIcon}
                                color={
                                    index === 0 ? 'text-accent-blue' :
                                    index === 1 ? 'text-accent-cyan' :
                                    index === 2 ? 'text-accent-green' :
                                    'text-accent-purple'
                                }
                                onClick={() => setSelectedBank(bank.name)}
                                isSelected={selectedBank === bank.name}
                                logoSrc={
                                    bank.name.toLowerCase().includes('rcbc') ? '/rcbc-logo.png' :
                                    bank.name.toLowerCase().includes('gcash') ? '/gcash-logo.png' :
                                    undefined
                                }
                                logoFull={bank.name.toLowerCase().includes('gcash') || bank.name.toLowerCase().includes('rcbc')}
                            />
                        ))
                    ) : (
                        <div className="col-span-2 lg:col-span-4 text-center text-text-secondary py-8">
                            No bank accounts found. Add bank accounts in Chart of Accounts.
                        </div>
                    )}
                </div>
            </div>

            {/* Date Filters */}
            <div className="px-4 lg:px-6 pb-2">
                <div className="flex flex-wrap items-center gap-2">
                    {[
                        { key: 'all', label: 'All Dates' },
                        { key: 'this-month', label: 'This Month' },
                        { key: 'last-month', label: 'Last Month' },
                        { key: 'this-quarter', label: 'This Quarter' },
                        { key: 'this-year', label: 'This Year' },
                        { key: 'last-year', label: 'Last Year' },
                    ].map(f => (
                        <button
                            key={f.key}
                            onClick={() => applyDateFilter(f.key)}
                            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                dateFilter === f.key
                                    ? 'bg-accent-blue text-white'
                                    : 'bg-bg-tertiary text-text-secondary hover:bg-hover-bg border border-border-color'
                            }`}
                        >
                            {f.label}
                        </button>
                    ))}
                    <div className="flex items-center gap-1.5 ml-1">
                        <input
                            type="date"
                            value={startDate}
                            onChange={e => { setStartDate(e.target.value); setDateFilter('custom'); }}
                            className="bg-bg-tertiary border border-border-color rounded-lg px-2 py-1.5 text-sm text-text-primary focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                        />
                        <span className="text-text-secondary text-sm">—</span>
                        <input
                            type="date"
                            value={endDate}
                            onChange={e => { setEndDate(e.target.value); setDateFilter('custom'); }}
                            className="bg-bg-tertiary border border-border-color rounded-lg px-2 py-1.5 text-sm text-text-primary focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                        />
                    </div>
                </div>
            </div>

            {/* Search Bar */}
            <div className="px-4 lg:px-6 pb-3">
                <div className="relative">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-4.35-4.35M17 11A6 6 0 1 1 5 11a6 6 0 0 1 12 0z" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search description..."
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        className="w-full bg-bg-tertiary border border-border-color rounded-lg pl-9 pr-9 py-2 text-sm text-text-primary placeholder-text-secondary focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                    />
                    {searchQuery && (
                        <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-text-primary">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Add Transaction Button & Batch Actions */}
            <div className="px-4 lg:px-6 pb-3 flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3">
                {/* Batch Actions */}
                {selectedTransactions.size > 0 && (
                    <div className="flex items-center gap-3 p-3 bg-accent-blue/10 border border-accent-blue/30 rounded-lg">
                        <span className="text-sm font-medium text-accent-blue whitespace-nowrap">
                            {selectedTransactions.size} selected
                        </span>
                        <div className="flex gap-2">
                            <button
                                onClick={handleBatchEdit}
                                className="flex items-center gap-2 px-3 py-1.5 bg-accent-blue/10 text-accent-blue rounded hover:bg-accent-blue/20 transition-colors text-sm font-medium"
                            >
                                <PencilIcon className="w-4 h-4" />
                                Edit
                            </button>
                            <button
                                onClick={handleBatchDelete}
                                className="flex items-center gap-2 px-3 py-1.5 bg-accent-red/10 text-accent-red rounded hover:bg-accent-red/20 transition-colors text-sm font-medium"
                            >
                                <TrashIcon className="w-4 h-4" />
                                Delete
                            </button>
                            <button
                                onClick={() => setSelectedTransactions(new Set())}
                                className="px-3 py-1.5 bg-bg-tertiary text-text-secondary rounded hover:bg-hover-bg transition-colors text-sm font-medium"
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                )}

                <div className="flex gap-2 w-full sm:w-auto">
                    <input
                        ref={csvFileInputRef}
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={handleCsvFileChange}
                    />
                    <button
                        onClick={() => csvFileInputRef.current?.click()}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-bg-secondary border border-border-color text-text-primary rounded-lg hover:bg-hover-bg transition-colors tap-target flex-1 sm:flex-none"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                        <span className="font-medium">Import CSV</span>
                    </button>
                    <button
                        onClick={handleOpenAddTransaction}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors tap-target flex-1 sm:flex-none"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span className="font-medium">Add Transaction</span>
                    </button>
                </div>
            </div>

            {/* Tab Bar */}
            <div className="px-4 lg:px-6 pb-0">
                <div className="flex items-center justify-between border-b border-border-color">
                    <div className="flex">
                        <button
                            onClick={() => { setActiveTab('review'); setSelectedTransactions(new Set()); }}
                            className={`px-5 py-2.5 text-sm font-medium transition-colors relative ${activeTab === 'review' ? 'text-accent-blue border-b-2 border-accent-blue -mb-px' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            For Review
                            {reviewTransactions.length > 0 && (
                                <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'review' ? 'bg-accent-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}>
                                    {reviewTransactions.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab('categorized'); setSelectedReviewIds(new Set()); }}
                            className={`px-5 py-2.5 text-sm font-medium transition-colors relative ${activeTab === 'categorized' ? 'text-accent-blue border-b-2 border-accent-blue -mb-px' : 'text-text-secondary hover:text-text-primary'}`}
                        >
                            Categorized
                            <span className={`ml-2 px-1.5 py-0.5 rounded-full text-xs font-semibold ${activeTab === 'categorized' ? 'bg-accent-blue text-white' : 'bg-bg-tertiary text-text-secondary'}`}>
                                {transactionsWithBalance.length}
                            </span>
                        </button>
                    </div>
                    {transactionsWithBalance.length > 0 && (
                        <button
                            onClick={async () => {
                                if (!confirm(`Move all ${transactionsWithBalance.length} categorized transactions back to For Review?`)) return;
                                await accountingService.resetAllToReview();
                                await refetch();
                                setActiveTab('review');
                            }}
                            className="text-xs text-text-secondary hover:text-accent-blue transition-colors pb-0.5"
                        >
                            Move all to For Review
                        </button>
                    )}
                </div>
            </div>

            {/* Transactions List */}
            <div className="px-4 lg:px-6 pb-4 pt-3">
                {activeTab === 'review' ? (
                    reviewTransactions.length === 0 ? (
                        <div className="bg-bg-secondary rounded-xl border border-border-color p-8 lg:p-12 text-center">
                            <CheckIcon className="w-10 h-10 text-accent-green mx-auto mb-3 opacity-60" />
                            <p className="text-text-primary font-medium mb-1">All caught up!</p>
                            <p className="text-text-secondary text-sm">No transactions to review. Import a CSV to get started.</p>
                        </div>
                    ) : (
                        <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                            {selectedReviewIds.size > 0 && (
                                <div className="flex items-center gap-3 px-4 py-2.5 bg-accent-green/10 border-b border-accent-green/20">
                                    <span className="text-sm font-medium text-accent-green">{selectedReviewIds.size} selected</span>
                                    <button onClick={handleBatchConfirm} className="flex items-center gap-1.5 px-3 py-1.5 bg-accent-green text-white rounded-lg hover:bg-accent-green/90 text-sm font-medium transition-colors">
                                        <CheckIcon className="w-4 h-4" /> Confirm All
                                    </button>
                                    <button onClick={() => setSelectedReviewIds(new Set())} className="px-3 py-1.5 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg text-sm transition-colors">Clear</button>
                                </div>
                            )}
                            <div className="overflow-auto">
                                <table className="w-full" style={{ tableLayout: 'fixed' }}>
                                    <thead className="bg-bg-tertiary sticky top-0 z-10">
                                        <tr>
                                            <th className="w-10 px-3 py-3 text-center">
                                                <input type="checkbox"
                                                    checked={selectedReviewIds.size === reviewTransactions.length && reviewTransactions.length > 0}
                                                    onChange={() => setSelectedReviewIds(selectedReviewIds.size === reviewTransactions.length ? new Set() : new Set(reviewTransactions.map(t => t.id)))}
                                                    className="w-4 h-4 rounded border-border-color bg-bg-secondary text-accent-blue cursor-pointer" />
                                            </th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary" style={{width:'120px'}}>Date</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Description</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary" style={{width:'120px'}}>Bank</th>
                                            <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary" style={{width:'130px'}}>Amount</th>
                                            <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary" style={{width:'220px'}}>Category</th>
                                            <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary" style={{width:'90px'}}>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-color">
                                        {reviewTransactions.map((transaction) => {
                                            const localCategory = reviewCategories[transaction.id] ?? ((transaction as any).category || '');
                                            const isConfirming = confirmingIds.has(transaction.id);
                                            return (
                                                <tr key={transaction.id} className={`hover:bg-hover-bg/30 transition-colors ${isConfirming ? 'opacity-40 pointer-events-none' : ''}`}>
                                                    <td className="px-3 py-3 text-center">
                                                        <input type="checkbox"
                                                            checked={selectedReviewIds.has(transaction.id)}
                                                            onChange={() => {
                                                                const n = new Set(selectedReviewIds);
                                                                n.has(transaction.id) ? n.delete(transaction.id) : n.add(transaction.id);
                                                                setSelectedReviewIds(n);
                                                            }}
                                                            className="w-4 h-4 rounded border-border-color bg-bg-secondary text-accent-blue cursor-pointer" />
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-text-secondary whitespace-nowrap">{formatDate(transaction.date)}</td>
                                                    <td className="px-4 py-3 text-sm text-text-primary">
                                                        <div className="truncate" title={transaction.description}>{transaction.description}</div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-text-secondary">{(transaction as any).bank || '-'}</td>
                                                    <td className="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">
                                                        <span className={transaction.type === 'credit' ? 'text-accent-green' : 'text-accent-red'}>
                                                            {transaction.type === 'credit' ? '+' : '-'}{formatPeso(transaction.amount)}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-2">
                                                        <CategoryAutocomplete
                                                            value={localCategory}
                                                            onChange={(val) => setReviewCategories(prev => ({ ...prev, [transaction.id]: val }))}
                                                            options={categoryAccounts}
                                                            placeholder="Select category"
                                                            className="w-full bg-bg-primary border border-border-color rounded-lg px-2 py-1.5 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button onClick={() => handleConfirmTransaction(transaction.id, localCategory)} disabled={isConfirming} title="Confirm & categorize"
                                                                className="p-1.5 rounded-lg bg-accent-green/10 text-accent-green hover:bg-accent-green/20 transition-colors disabled:opacity-50">
                                                                <CheckIcon className="w-4 h-4" />
                                                            </button>
                                                            <button onClick={() => handleExcludeTransaction(transaction.id)} disabled={isConfirming} title="Exclude"
                                                                className="p-1.5 rounded-lg bg-accent-red/10 text-accent-red hover:bg-accent-red/20 transition-colors disabled:opacity-50">
                                                                <XMarkIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                ) : (
                /* Categorized Tab */
                transactionsWithBalance.length === 0 && !isAddingNew ? (
                    <div className="bg-bg-secondary rounded-xl border border-border-color p-8 lg:p-12 text-center">
                        <p className="text-text-secondary">No categorized transactions yet.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden lg:block bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                            <div className="overflow-auto">
                                <table className="w-full" style={{ tableLayout: 'fixed' }}>
                                    <thead className="bg-bg-tertiary sticky top-0 z-10">
                                        <tr>
                                            <th className="w-12 px-4 py-3 text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={selectedTransactions.size > 0 && selectedTransactions.size === transactionsWithBalance.length}
                                                    onChange={handleSelectAll}
                                                    className="w-4 h-4 rounded border-border-color bg-bg-secondary text-accent-blue focus:ring-2 focus:ring-accent-blue/50 cursor-pointer"
                                                />
                                            </th>
                                            <SortableHeader
                                                label="Date"
                                                field="date"
                                                currentSortField={sortField}
                                                sortDirection={sortDirection}
                                                onSort={handleSort}
                                                width={columnWidths.date}
                                                onResizeStart={(e) => handleResizeStart(e, 'date')}
                                            />
                                            <SortableHeader
                                                label="Category"
                                                field="category"
                                                currentSortField={sortField}
                                                sortDirection={sortDirection}
                                                onSort={handleSort}
                                                width={columnWidths.category}
                                                onResizeStart={(e) => handleResizeStart(e, 'category')}
                                            />
                                            <SortableHeader
                                                label="Description"
                                                field="description"
                                                currentSortField={sortField}
                                                sortDirection={sortDirection}
                                                onSort={handleSort}
                                                width={columnWidths.description}
                                                onResizeStart={(e) => handleResizeStart(e, 'description')}
                                            />
                                            <SortableHeader
                                                label="Reference"
                                                field="reference"
                                                currentSortField={sortField}
                                                sortDirection={sortDirection}
                                                onSort={handleSort}
                                                width={columnWidths.reference}
                                                onResizeStart={(e) => handleResizeStart(e, 'reference')}
                                            />
                                            <SortableHeader
                                                label="Bank"
                                                field="bank"
                                                currentSortField={sortField}
                                                sortDirection={sortDirection}
                                                onSort={handleSort}
                                                width={columnWidths.bank}
                                                onResizeStart={(e) => handleResizeStart(e, 'bank')}
                                            />
                                            <SortableHeader
                                                label="Amount"
                                                field="amount"
                                                currentSortField={sortField}
                                                sortDirection={sortDirection}
                                                onSort={handleSort}
                                                width={columnWidths.amount}
                                                onResizeStart={(e) => handleResizeStart(e, 'amount')}
                                                align="right"
                                            />
                                            <th
                                                className="relative px-4 py-3 text-center text-sm font-semibold text-text-primary bg-bg-tertiary"
                                                style={{ width: `${columnWidths.actions}px`, minWidth: `${columnWidths.actions}px` }}
                                            >
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                <tbody className="divide-y divide-border-color">
                                    {/* Inline Add New Transaction Row */}
                                    {isAddingNew && (
                                        <tr className="bg-accent-blue/10 border-2 border-accent-blue">
                                            <td className="px-4 py-3 text-center">
                                                {/* Empty cell for checkbox column */}
                                            </td>
                                            <td className="px-4 py-3 relative overflow-visible">
                                                <DatePickerInput
                                                    value={newDate}
                                                    onChange={setNewDate}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <CategoryAutocomplete
                                                    value={newCategory}
                                                    onChange={setNewCategory}
                                                    options={categoryAccounts}
                                                    placeholder="Type or select category"
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={newDescription}
                                                    onChange={(e) => setNewDescription(e.target.value)}
                                                    placeholder="Description"
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={newReference}
                                                    onChange={(e) => setNewReference(e.target.value)}
                                                    placeholder="Reference (optional)"
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={newPaymentMethod}
                                                    onChange={(e) => setNewPaymentMethod(e.target.value)}
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10"
                                                >
                                                    <option value="">Select bank</option>
                                                    {bankAccounts.map(account => (
                                                        <option key={account.id} value={account.name}>{account.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="number"
                                                    step="0.01"
                                                    value={newAmount}
                                                    onChange={(e) => setNewAmount(e.target.value)}
                                                    placeholder="0.00"
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm text-right focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={handleAddNewTransaction}
                                                        className="px-3 py-1.5 bg-accent-green text-white rounded-lg hover:bg-accent-green/80 transition-colors text-sm font-medium"
                                                    >
                                                        Save
                                                    </button>
                                                    <button
                                                        onClick={handleCancelNew}
                                                        className="p-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg transition-colors"
                                                        title="Cancel"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                    {transactionsWithBalance.map((transaction) => {
                                        const isEditing = editingTransactionId === transaction.id;

                                        if (isEditing) {
                                            return (
                                                <tr key={transaction.id} className="bg-accent-purple/10 border-2 border-accent-purple">
                                                    <td className="px-4 py-3 text-center">
                                                        <input
                                                            type="checkbox"
                                                            checked={selectedTransactions.has(transaction.id!)}
                                                            onChange={() => transaction.id && handleSelectTransaction(transaction.id)}
                                                            className="w-4 h-4 rounded border-border-color bg-bg-secondary text-accent-blue focus:ring-2 focus:ring-accent-blue/50 cursor-pointer"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 relative overflow-visible">
                                                        <DatePickerInput value={editDate} onChange={setEditDate} />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <CategoryAutocomplete
                                                            value={editCategory}
                                                            onChange={setEditCategory}
                                                            options={categoryAccounts}
                                                            placeholder="Type or select category"
                                                            className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description" className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input type="text" value={editReference} onChange={(e) => setEditReference(e.target.value)} placeholder="Reference (optional)" className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select value={editPaymentMethod} onChange={(e) => setEditPaymentMethod(e.target.value)} className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10">
                                                            <option value="">Select bank</option>
                                                            {bankAccounts.map(account => (
                                                                <option key={account.id} value={account.name}>{account.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input type="number" step="0.01" value={editAmount} onChange={(e) => setEditAmount(e.target.value)} placeholder="0.00" className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm text-right focus:ring-2 focus:ring-accent-blue focus:border-accent-blue" />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center justify-center gap-2">
                                                            <button onClick={handleSaveEdit} className="px-3 py-1.5 bg-accent-green text-white rounded-lg hover:bg-accent-green/80 transition-colors text-sm font-medium">Save</button>
                                                            <button onClick={handleCancelEdit} className="p-2 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg transition-colors" title="Cancel">
                                                                <XMarkIcon className="w-4 h-4" />
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={transaction.id} className="hover:bg-hover-bg/30 transition-colors">
                                                <td className="px-4 py-3 text-center">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedTransactions.has(transaction.id!)}
                                                        onChange={() => transaction.id && handleSelectTransaction(transaction.id)}
                                                        className="w-4 h-4 rounded border-border-color bg-bg-secondary text-accent-blue focus:ring-2 focus:ring-accent-blue/50 cursor-pointer"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-primary whitespace-nowrap">{formatDate(transaction.date)}</td>
                                                <td className="px-4 py-3 text-sm text-text-secondary">
                                                    <div className="truncate" title={(transaction as any).category || '-'}>
                                                        {(transaction as any).category || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-primary">
                                                    <div className="truncate" title={transaction.description}>
                                                        {transaction.description}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-secondary">
                                                    <div className="truncate" title={transaction.reference || '-'}>
                                                        {transaction.reference || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-secondary">
                                                    <div className="truncate" title={(transaction as any).bank || '-'}>
                                                        {(transaction as any).bank || '-'}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-right font-medium whitespace-nowrap">
                                                    <span className={transaction.type === 'credit' ? 'text-accent-green' : 'text-accent-red'}>
                                                        {transaction.type === 'credit' ? '+' : '-'}{formatPeso(transaction.amount)}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => handleEditTransaction(transaction)} className="p-1 text-accent-blue hover:bg-accent-blue/20 rounded transition-colors" title="Edit">
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setDeletingTransaction(transaction)} className="p-1 text-accent-red hover:bg-accent-red/20 rounded transition-colors" title="Delete">
                                                            <TrashIcon className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                            </div>
                        </div>

                        {/* Mobile Cards */}
                        <div className="lg:hidden space-y-4">
                            {/* Inline Add New Transaction Card for Mobile */}
                            {isAddingNew && (
                                <div className="bg-accent-blue/10 border-2 border-accent-blue rounded-xl p-4">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Date</label>
                                            <DatePickerInput
                                                value={newDate}
                                                onChange={setNewDate}
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Category *</label>
                                            <CategoryAutocomplete
                                                value={newCategory}
                                                onChange={setNewCategory}
                                                options={categoryAccounts}
                                                placeholder="Type or select category"
                                                className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Description</label>
                                            <input
                                                type="text"
                                                value={newDescription}
                                                onChange={(e) => setNewDescription(e.target.value)}
                                                placeholder="Description"
                                                className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Reference (optional)</label>
                                            <input
                                                type="text"
                                                value={newReference}
                                                onChange={(e) => setNewReference(e.target.value)}
                                                placeholder="Reference"
                                                className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Bank</label>
                                            <select
                                                value={newPaymentMethod}
                                                onChange={(e) => setNewPaymentMethod(e.target.value)}
                                                className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10"
                                            >
                                                <option value="">Select bank</option>
                                                {bankAccounts.map(account => (
                                                    <option key={account.id} value={account.name}>{account.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Amount</label>
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={newAmount}
                                                onChange={(e) => setNewAmount(e.target.value)}
                                                placeholder="0.00"
                                                className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                            />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button
                                                onClick={handleAddNewTransaction}
                                                className="flex-1 px-4 py-2.5 bg-accent-green text-white rounded-lg hover:bg-accent-green/80 transition-colors font-medium"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={handleCancelNew}
                                                className="flex-1 px-4 py-2.5 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg transition-colors font-medium"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {transactionsWithBalance.map((transaction) => (
                                <div key={transaction.id} className="bg-bg-secondary rounded-xl border border-border-color p-4">
                                    <div className="flex items-start gap-3 mb-3">
                                        {/* Checkbox */}
                                        <input
                                            type="checkbox"
                                            checked={selectedTransactions.has(transaction.id!)}
                                            onChange={() => transaction.id && handleSelectTransaction(transaction.id)}
                                            className="w-5 h-5 mt-1 rounded border-border-color bg-bg-tertiary text-accent-blue focus:ring-2 focus:ring-accent-blue/50 cursor-pointer flex-shrink-0"
                                        />

                                        <div className="flex-1 min-w-0">
                                            <div className="min-w-0 flex-1">
                                                <div className="text-sm text-text-secondary">{formatDate(transaction.date)}</div>
                                                <div className="text-lg font-semibold text-text-primary mt-1 truncate">{transaction.description}</div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm">
                                        {transaction.reference && (
                                            <div className="flex justify-between">
                                                <span className="text-text-secondary">Reference:</span>
                                                <span className="text-text-primary">{transaction.reference}</span>
                                            </div>
                                        )}
                                        {(transaction as any).category && (
                                            <div className="flex justify-between">
                                                <span className="text-text-secondary">Category:</span>
                                                <span className="text-text-primary">{(transaction as any).category}</span>
                                            </div>
                                        )}
                                        {(transaction as any).bank && (
                                            <div className="flex justify-between">
                                                <span className="text-text-secondary">Bank:</span>
                                                <span className="text-text-primary">{(transaction as any).bank}</span>
                                            </div>
                                        )}
                                        <div className="flex justify-between">
                                            <span className="text-text-secondary">Amount:</span>
                                            <span className={`font-medium ${transaction.type === 'credit' ? 'text-accent-green' : 'text-accent-red'}`}>
                                                {transaction.type === 'credit' ? '+' : '-'}{formatPeso(transaction.amount)}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-border-color">
                                        <button
                                            onClick={() => setDeletingTransaction(transaction)}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-red/20 text-accent-red rounded-lg hover:bg-accent-red/30 transition-colors"
                                        >
                                            <TrashIcon className="w-4 h-4" />
                                            Delete
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                ))}
            </div>

            {/* Modals */}
            <DeleteConfirmationModal
                isOpen={!!deletingTransaction}
                onClose={() => setDeletingTransaction(null)}
                onConfirm={handleDeleteTransaction}
                itemName={deletingTransaction?.description || 'this transaction'}
            />

            {/* Batch Delete Confirmation Modal */}
            {isBatchDeleting && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-bg-secondary rounded-xl border border-border-color p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-semibold text-text-primary mb-2">
                            Confirm Batch Delete
                        </h3>
                        <p className="text-sm text-text-secondary mb-6">
                            Are you sure you want to delete {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''}?
                            This action cannot be undone.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={cancelBatchDelete}
                                className="flex-1 px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-hover-bg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmBatchDelete}
                                className="flex-1 px-4 py-2 bg-accent-red text-white rounded-lg hover:bg-accent-red/90 transition-colors"
                            >
                                Delete All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Batch Edit Modal */}
            {isBatchEditing && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-bg-secondary rounded-xl border border-border-color p-6 max-w-md w-full shadow-2xl">
                        <h3 className="text-lg font-semibold text-text-primary mb-2">
                            Batch Edit Transactions
                        </h3>
                        <p className="text-sm text-text-secondary mb-4">
                            Update {selectedTransactions.size} transaction{selectedTransactions.size !== 1 ? 's' : ''}.
                            Only filled fields will be updated.
                        </p>

                        <div className="space-y-4 mb-6">
                            {/* Type */}
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                    Transaction Type
                                </label>
                                <select
                                    value={batchEditData.type}
                                    onChange={(e) => setBatchEditData({ ...batchEditData, type: e.target.value })}
                                    className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                                >
                                    <option value="">-- Keep Original --</option>
                                    <option value="credit">Credit</option>
                                    <option value="debit">Debit</option>
                                </select>
                            </div>

                            {/* Category */}
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                    Category
                                </label>
                                <input
                                    type="text"
                                    value={batchEditData.category}
                                    onChange={(e) => setBatchEditData({ ...batchEditData, category: e.target.value })}
                                    placeholder="Leave blank to keep original"
                                    className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-lg text-text-primary placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                                />
                            </div>

                            {/* Bank Account */}
                            <div>
                                <label className="block text-xs font-medium text-text-secondary mb-1.5">
                                    Bank Account
                                </label>
                                <select
                                    value={batchEditData.bank}
                                    onChange={(e) => setBatchEditData({ ...batchEditData, bank: e.target.value })}
                                    className="w-full px-3 py-2 bg-bg-tertiary border border-border-color rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue"
                                >
                                    <option value="">-- Keep Original --</option>
                                    {banks.map((bank) => (
                                        <option key={bank.id} value={bank.name}>
                                            {bank.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={cancelBatchEdit}
                                className="flex-1 px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-hover-bg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmBatchEdit}
                                className="flex-1 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
                            >
                                Update All
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* CSV Import Modal */}
            {showCsvModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-bg-primary border border-border-color rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                        <div className="flex items-center justify-between p-5 border-b border-border-color">
                            <div>
                                <h2 className="text-lg font-semibold text-text-primary">Import CSV</h2>
                                <p className="text-sm text-text-secondary mt-0.5">
                                    {csvRows.filter(r => r.valid).length} valid · {csvRows.filter(r => !r.valid).length} invalid
                                </p>
                            </div>
                            <button onClick={() => { setShowCsvModal(false); setCsvRows([]); }} className="p-2 rounded-lg hover:bg-hover-bg transition-colors">
                                <XMarkIcon className="w-5 h-5 text-text-secondary" />
                            </button>
                        </div>

                        <div className="p-4 bg-bg-secondary/50 border-b border-border-color">
                            <p className="text-xs text-text-secondary">
                                Expected columns: <span className="text-text-primary font-medium">date, description, amount</span> (required) · type, reference, category, bank (optional)
                            </p>
                        </div>

                        <div className="overflow-auto flex-1">
                            <table className="w-full text-sm">
                                <thead className="sticky top-0 bg-bg-tertiary">
                                    <tr>
                                        <th className="px-3 py-2 text-left font-medium text-text-secondary w-8">#</th>
                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Date</th>
                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Description</th>
                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Amount</th>
                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Type</th>
                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Category</th>
                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Bank</th>
                                        <th className="px-3 py-2 text-left font-medium text-text-secondary">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {csvRows.map((row, i) => (
                                        <tr key={i} className={`border-t border-border-color ${row.valid ? 'hover:bg-hover-bg' : 'bg-accent-red/5'}`}>
                                            <td className="px-3 py-2 text-text-secondary">{i + 1}</td>
                                            <td className="px-3 py-2 text-text-primary">{row.date}</td>
                                            <td className="px-3 py-2 text-text-primary max-w-[200px] truncate">{row.description}</td>
                                            <td className="px-3 py-2 text-text-primary">{row.amount}</td>
                                            <td className="px-3 py-2 text-text-secondary capitalize">{row.type || '—'}</td>
                                            <td className="px-3 py-2 text-text-secondary">{row.category || '—'}</td>
                                            <td className="px-3 py-2 text-text-secondary">{row.bank || '—'}</td>
                                            <td className="px-3 py-2">
                                                {row.valid
                                                    ? <span className="text-xs text-accent-green font-medium">Ready</span>
                                                    : <span className="text-xs text-accent-red font-medium">{row.error}</span>
                                                }
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <div className="flex gap-3 p-5 border-t border-border-color">
                            <button
                                onClick={() => { setShowCsvModal(false); setCsvRows([]); }}
                                className="flex-1 px-4 py-2.5 bg-bg-tertiary text-text-primary rounded-lg hover:bg-hover-bg transition-colors font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleCsvImport}
                                disabled={csvImporting || csvRows.filter(r => r.valid).length === 0}
                                className="flex-1 px-4 py-2.5 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {csvImporting ? `Importing ${csvRows.filter(r => r.valid).length} transactions, please wait...` : `Import ${csvRows.filter(r => r.valid).length} Transactions`}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Transactions;
