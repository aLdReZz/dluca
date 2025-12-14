import React, { useState, useEffect, useMemo } from 'react';
import type { AccountingTransaction } from '../../types';
import { useFirebaseData, useFirebaseMutation } from '../../hooks/useFirebase';
import { accountingService } from '../../utils/firebaseService';
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
    const [editingTransaction, setEditingTransaction] = useState<AccountingTransaction | null>(null);
    const [deletingTransaction, setDeletingTransaction] = useState<AccountingTransaction | null>(null);
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [openingBalance, setOpeningBalance] = useState<number>(0);

    // New transaction form state
    const [newDate, setNewDate] = useState(() => {
        const today = new Date();
        return today.toISOString().split('T')[0];
    });
    const [newType, setNewType] = useState<'credit' | 'debit'>('credit');
    const [newDescription, setNewDescription] = useState('');
    const [newReference, setNewReference] = useState('');
    const [newCategory, setNewCategory] = useState('');
    const [newAmount, setNewAmount] = useState('');

    // Fetch all transactions
    const { data: allTransactions = [], loading: transactionsLoading, error: transactionsError, refetch } = useFirebaseData(
        () => accountingService.getAll(),
        []
    );

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

    // Calculate statistics
    const stats = useMemo(() => {
        const income = sortedTransactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);
        const expenses = sortedTransactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);
        const currentBalance = openingBalance + income - expenses;

        return { openingBalance, income, expenses, currentBalance };
    }, [sortedTransactions, openingBalance]);

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
        setNewAmount('');
        setIsAddingNew(false);
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

    if (transactionsLoading && !allTransactions) {
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

            {/* Summary Cards */}
            <div className="p-4 lg:p-6 grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
                <SummaryCard
                    title="Opening Balance"
                    value={formatPeso(stats.openingBalance)}
                    icon={BanknotesIcon}
                    color="text-accent-purple"
                />
                <SummaryCard
                    title="Total Income"
                    value={formatPeso(stats.income)}
                    icon={ArrowTrendingUpIcon}
                    color="text-accent-green"
                />
                <SummaryCard
                    title="Total Expenses"
                    value={formatPeso(stats.expenses)}
                    icon={ChartBarIcon}
                    color="text-accent-red"
                />
                <SummaryCard
                    title="Current Balance"
                    value={formatPeso(stats.currentBalance)}
                    icon={BanknotesIcon}
                    color="text-accent-blue"
                />
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
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer"
                                                >
                                                    <option value="credit">Income</option>
                                                    <option value="debit">Expense</option>
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={newCategory}
                                                    onChange={(e) => setNewCategory(e.target.value)}
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer"
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
                                    {transactionsWithBalance.map((transaction) => (
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
                                            <td className="px-4 py-3 text-sm text-right font-medium">
                                                <span className={transaction.type === 'credit' ? 'text-accent-green' : 'text-accent-red'}>
                                                    {transaction.type === 'credit' ? '+' : '-'}{formatPeso(transaction.amount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => setDeletingTransaction(transaction)}
                                                        className="p-1 text-accent-red hover:bg-accent-red/20 rounded transition-colors"
                                                        title="Delete"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
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
                                                className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer"
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
                                                className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer"
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
