import React, { useState, useEffect, useMemo } from 'react';
import type { AccountingTransaction, Account } from '../../types';
import { useFirebaseData, useFirebaseMutation } from '../../hooks/useFirebase';
import { accountingService, chartOfAccountsService } from '../../utils/firebaseService';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import DatePickerInput from '../../components/DatePickerInput';
import { PlusIcon, PencilIcon, TrashIcon, BanknotesIcon, ArrowTrendingUpIcon, ChartBarIcon, XMarkIcon, CheckIcon } from '../../components/Icons';

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

const SummaryCard: React.FC<{
    title: string;
    value: string;
    icon: React.FC<{ className?: string }>;
    color?: string;
}> = ({ title, value, icon: Icon, color = 'text-accent-blue' }) => (
    <div className="bg-bg-secondary p-5 rounded-xl border border-border-color">
        <div className="flex justify-between items-start">
            <div>
                <div className="text-sm font-medium text-text-secondary">{title}</div>
                <div className="text-2xl font-semibold text-text-primary mt-2">{value}</div>
            </div>
            <div className="p-3 rounded-lg bg-bg-tertiary">
                <Icon className={`w-6 h-6 ${color}`} />
            </div>
        </div>
    </div>
);

const Transactions: React.FC = () => {
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
    const [deletingTransaction, setDeletingTransaction] = useState<AccountingTransaction | null>(null);
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [openingBalance, setOpeningBalance] = useState<number>(0);

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

    // Filter to get only bank type accounts
    const bankAccounts = useMemo(() => {
        if (!allAccounts || !Array.isArray(allAccounts)) return [];
        return allAccounts.filter(account => account.type === 'bank' && account.isActive);
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

    // Sort all transactions
    const sortedTransactions = useMemo(() => {
        if (!allTransactions || !Array.isArray(allTransactions)) return [];
        return allTransactions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allTransactions]);

    // Calculate running balance
    const transactionsWithBalance = useMemo(() => {
        const sorted = [...sortedTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let balance = openingBalance || 0;

        return sorted.map(transaction => {
            if (transaction.type === 'credit') {
                balance += transaction.amount;
            } else {
                balance -= transaction.amount;
            }
            return { ...transaction, runningBalance: balance };
        }).reverse();
    }, [sortedTransactions, openingBalance]);

    // Calculate bank account balances
    const bankBalances = useMemo(() => {
        if (!bankAccounts || bankAccounts.length === 0) return [];

        return bankAccounts.map(bank => {
            const bankTransactions = sortedTransactions.filter(
                t => (t as any).paymentMethod === bank.name
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
        if (!newDate || !newDescription || !newAmount) {
            setOperationStatus({ type: 'error', message: 'Please fill in all required fields' });
            return;
        }

        try {
            const transaction: Omit<AccountingTransaction, 'id' | 'runningBalance'> = {
                date: newDate,
                type: newType,
                description: newDescription,
                reference: newReference,
                amount: parseFloat(newAmount),
                account: 'general'
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

    const handleEditTransaction = (transaction: AccountingTransaction) => {
        setEditingTransactionId(transaction.id);
        setEditDate(transaction.date);
        setEditType(transaction.type);
        setEditDescription(transaction.description);
        setEditReference(transaction.reference || '');
        setEditCategory((transaction as any).category || '');
        setEditPaymentMethod((transaction as any).paymentMethod || '');
        setEditAmount(transaction.amount.toString());
    };

    const handleSaveEdit = async () => {
        if (!editingTransactionId || !editDate || !editDescription || !editAmount) {
            setOperationStatus({ type: 'error', message: 'Please fill in all required fields' });
            return;
        }

        try {
            await updateTransaction({
                id: editingTransactionId,
                updates: {
                    date: editDate,
                    type: editType,
                    description: editDescription,
                    reference: editReference,
                    category: editCategory,
                    paymentMethod: editPaymentMethod,
                    amount: parseFloat(editAmount),
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

    // Clear status messages after 3 seconds
    useEffect(() => {
        if (operationStatus) {
            const timer = setTimeout(() => setOperationStatus(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [operationStatus]);

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
        <div className="h-full flex flex-col">
            {/* Status Messages */}
            {operationStatus && (
                <div className={`mx-6 mt-6 p-4 rounded-lg ${
                    operationStatus.type === 'success' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red'
                }`}>
                    {operationStatus.message}
                </div>
            )}

            {/* Bank Account Balance Cards */}
            <div className="p-4 lg:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
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
                        />
                    ))
                ) : (
                    <div className="col-span-2 lg:col-span-4 text-center text-text-secondary py-8">
                        No bank accounts found. Add bank accounts in Chart of Accounts.
                    </div>
                )}
            </div>

            {/* Add Transaction Button */}
            <div className="px-6 pb-4 flex justify-end">
                <button
                    onClick={() => setIsAddingNew(true)}
                    className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors tap-target"
                >
                    <PlusIcon className="w-5 h-5" />
                    <span className="font-medium">Add Transaction</span>
                </button>
            </div>

            {/* Transactions List */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                {transactionsWithBalance.length === 0 && !isAddingNew ? (
                    <div className="bg-bg-secondary rounded-xl border border-border-color p-12 text-center">
                        <p className="text-text-secondary">No transactions yet. Click "Add Transaction" to get started.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden lg:block bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-bg-tertiary">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Date</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Type</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Category</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Description</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Reference</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Bank</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">Amount</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-color">
                                    {/* Inline Add New Transaction Row */}
                                    {isAddingNew && (
                                        <tr className="bg-accent-blue/10 border-2 border-accent-blue">
                                            <td className="px-4 py-3 relative overflow-visible">
                                                <DatePickerInput
                                                    value={newDate}
                                                    onChange={setNewDate}
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={newType}
                                                    onChange={(e) => setNewType(e.target.value as 'credit' | 'debit')}
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10"
                                                >
                                                    <option value="credit">Income</option>
                                                    <option value="debit">Expense</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={newCategory}
                                                    onChange={(e) => setNewCategory(e.target.value)}
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10"
                                                >
                                                    <option value="">Select category</option>
                                                    <option value="Food">Food</option>
                                                    <option value="Transportation">Transportation</option>
                                                    <option value="Utilities">Utilities</option>
                                                    <option value="Salary">Salary</option>
                                                    <option value="Other">Other</option>
                                                </select>
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
                                                        className="px-3 py-1.5 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg transition-colors text-sm font-medium"
                                                    >
                                                        Cancel
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
                                                    <td className="px-4 py-3 relative overflow-visible">
                                                        <DatePickerInput value={editDate} onChange={setEditDate} />
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select value={editType} onChange={(e) => setEditType(e.target.value as 'credit' | 'debit')} className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10">
                                                            <option value="credit">Income</option>
                                                            <option value="debit">Expense</option>
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select value={editCategory} onChange={(e) => setEditCategory(e.target.value)} className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10">
                                                            <option value="">Select category</option>
                                                            <option value="Food">Food</option>
                                                            <option value="Transportation">Transportation</option>
                                                            <option value="Utilities">Utilities</option>
                                                            <option value="Salary">Salary</option>
                                                            <option value="Other">Other</option>
                                                        </select>
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
                                                            <button onClick={handleCancelEdit} className="px-3 py-1.5 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg transition-colors text-sm font-medium">Cancel</button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        return (
                                            <tr key={transaction.id} className="hover:bg-hover-bg/30 transition-colors">
                                                <td className="px-4 py-3 text-sm text-text-primary">{formatDate(transaction.date)}</td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                                                        transaction.type === 'credit'
                                                            ? 'bg-accent-green/20 text-accent-green'
                                                            : transaction.type === 'transfer'
                                                            ? 'bg-accent-blue/20 text-accent-blue'
                                                            : 'bg-accent-red/20 text-accent-red'
                                                    }`}>
                                                        {transaction.type === 'credit' ? 'Income' : transaction.type === 'transfer' ? 'Transfer' : 'Expense'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-secondary">{(transaction as any).category || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-text-primary">{transaction.description}</td>
                                                <td className="px-4 py-3 text-sm text-text-secondary">{transaction.reference || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-text-secondary">{(transaction as any).paymentMethod || '-'}</td>
                                                <td className="px-4 py-3 text-sm text-right font-medium">
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
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
                                            <select
                                                value={newType}
                                                onChange={(e) => setNewType(e.target.value as 'credit' | 'debit')}
                                                className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10"
                                            >
                                                <option value="credit">Income</option>
                                                <option value="debit">Expense</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Category</label>
                                            <select
                                                value={newCategory}
                                                onChange={(e) => setNewCategory(e.target.value)}
                                                className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10"
                                            >
                                                <option value="">Select category</option>
                                                <option value="Food">Food</option>
                                                <option value="Transportation">Transportation</option>
                                                <option value="Utilities">Utilities</option>
                                                <option value="Salary">Salary</option>
                                                <option value="Other">Other</option>
                                            </select>
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
                                    <div className="flex justify-between items-start mb-3">
                                        <div>
                                            <div className="text-sm text-text-secondary">{formatDate(transaction.date)}</div>
                                            <div className="text-lg font-semibold text-text-primary mt-1">{transaction.description}</div>
                                        </div>
                                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                                            transaction.type === 'credit'
                                                ? 'bg-accent-green/20 text-accent-green'
                                                : transaction.type === 'transfer'
                                                ? 'bg-accent-blue/20 text-accent-blue'
                                                : 'bg-accent-red/20 text-accent-red'
                                        }`}>
                                            {transaction.type === 'credit' ? 'Income' : transaction.type === 'transfer' ? 'Transfer' : 'Expense'}
                                        </span>
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
                                        {(transaction as any).paymentMethod && (
                                            <div className="flex justify-between">
                                                <span className="text-text-secondary">Bank:</span>
                                                <span className="text-text-primary">{(transaction as any).paymentMethod}</span>
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
                )}
            </div>

            {/* Modals */}
            <DeleteConfirmationModal
                isOpen={!!deletingTransaction}
                onClose={() => setDeletingTransaction(null)}
                onConfirm={handleDeleteTransaction}
                itemName={deletingTransaction?.description || 'this transaction'}
            />
        </div>
    );
};

export default Transactions;
