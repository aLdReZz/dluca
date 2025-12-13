import React, { useState, useEffect, useMemo } from 'react';
import type { AccountingTransaction, AccountBalance } from '../types';
import { useFirebaseData, useFirebaseMutation } from '../hooks/useFirebase';
import { accountingService } from '../utils/firebaseService';
import TransactionModal from '../components/TransactionModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
import LoadingSpinner from '../components/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, BanknotesIcon, ArrowTrendingUpIcon, ChartBarIcon } from '../components/Icons';

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

const Accounting: React.FC = () => {
    const [activeAccount, setActiveAccount] = useState<'cash' | 'gcash' | 'grab' | 'card'>('cash');
    const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<AccountingTransaction | null>(null);
    const [deletingTransaction, setDeletingTransaction] = useState<AccountingTransaction | null>(null);
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [openingBalances, setOpeningBalances] = useState<Record<string, number>>({
        cash: 0,
        gcash: 0,
        grab: 0,
        card: 0,
    });

    // Fetch all transactions
    const { data: allTransactions = [], loading: transactionsLoading, error: transactionsError, refetch } = useFirebaseData(
        () => accountingService.getAll(),
        []
    );

    // Fetch account balances
    const { data: cashBalance } = useFirebaseData(() => accountingService.getAccountBalance('cash'), []);
    const { data: gcashBalance } = useFirebaseData(() => accountingService.getAccountBalance('gcash'), []);
    const { data: grabBalance } = useFirebaseData(() => accountingService.getAccountBalance('grab'), []);
    const { data: cardBalance } = useFirebaseData(() => accountingService.getAccountBalance('card'), []);

    // Update opening balances when fetched
    useEffect(() => {
        if (cashBalance) setOpeningBalances(prev => ({ ...prev, cash: cashBalance.openingBalance }));
        if (gcashBalance) setOpeningBalances(prev => ({ ...prev, gcash: gcashBalance.openingBalance }));
        if (grabBalance) setOpeningBalances(prev => ({ ...prev, grab: grabBalance.openingBalance }));
        if (cardBalance) setOpeningBalances(prev => ({ ...prev, card: cardBalance.openingBalance }));
    }, [cashBalance, gcashBalance, grabBalance, cardBalance]);

    // Mutations
    const { mutate: addTransaction, loading: addLoading } = useFirebaseMutation(
        (transaction: Omit<AccountingTransaction, 'id' | 'runningBalance'>) => accountingService.add(transaction)
    );

    const { mutate: updateTransaction, loading: updateLoading } = useFirebaseMutation(
        (data: { id: string; updates: Partial<AccountingTransaction> }) =>
            accountingService.update(data.id, data.updates)
    );

    const { mutate: deleteTransaction, loading: deleteLoading } = useFirebaseMutation(
        (id: string) => accountingService.delete(id)
    );

    const { mutate: setAccountBalance, loading: setBalanceLoading } = useFirebaseMutation(
        (data: { account: string; openingBalance: number }) =>
            accountingService.setAccountBalance(data.account, data.openingBalance)
    );

    // Filter transactions by active account
    const accountTransactions = useMemo(() => {
        if (!allTransactions || !Array.isArray(allTransactions)) return [];
        return allTransactions
            .filter(t => t.account === activeAccount)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    }, [allTransactions, activeAccount]);

    // Calculate running balance
    const transactionsWithBalance = useMemo(() => {
        const sorted = [...accountTransactions].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        let balance = openingBalances[activeAccount] || 0;

        return sorted.map(transaction => {
            if (transaction.type === 'credit') {
                balance += transaction.amount;
            } else {
                balance -= transaction.amount;
            }
            return { ...transaction, runningBalance: balance };
        }).reverse(); // Show newest first
    }, [accountTransactions, activeAccount, openingBalances]);

    // Calculate statistics
    const stats = useMemo(() => {
        const openingBalance = openingBalances[activeAccount] || 0;
        const income = accountTransactions
            .filter(t => t.type === 'credit')
            .reduce((sum, t) => sum + t.amount, 0);
        const expenses = accountTransactions
            .filter(t => t.type === 'debit')
            .reduce((sum, t) => sum + t.amount, 0);
        const currentBalance = openingBalance + income - expenses;

        return { openingBalance, income, expenses, currentBalance };
    }, [accountTransactions, activeAccount, openingBalances]);

    const handleSaveTransaction = async (transaction: Omit<AccountingTransaction, 'id' | 'runningBalance'>) => {
        try {
            if (editingTransaction) {
                await updateTransaction({ id: editingTransaction.id, updates: transaction });
                setOperationStatus({ type: 'success', message: 'Transaction updated successfully' });
            } else {
                // Handle transfer: create two transactions
                if (transaction.type === 'transfer' && transaction.transferTo) {
                    // Debit from source account
                    await addTransaction({
                        ...transaction,
                        type: 'debit',
                        description: `Transfer to ${transaction.transferTo}: ${transaction.description}`,
                    });
                    // Credit to destination account
                    await addTransaction({
                        ...transaction,
                        account: transaction.transferTo,
                        type: 'credit',
                        description: `Transfer from ${transaction.account}: ${transaction.description}`,
                    });
                    setOperationStatus({ type: 'success', message: 'Transfer completed successfully' });
                } else {
                    await addTransaction(transaction);
                    setOperationStatus({ type: 'success', message: 'Transaction added successfully' });
                }
            }
            await refetch();
            setIsTransactionModalOpen(false);
            setEditingTransaction(null);
        } catch (error) {
            setOperationStatus({ type: 'error', message: 'Failed to save transaction' });
        }
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

    const handleSetOpeningBalance = async (account: string, balance: number) => {
        try {
            await setAccountBalance({ account, openingBalance: balance });
            setOpeningBalances(prev => ({ ...prev, [account]: balance }));
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

    const accountLabels = {
        cash: 'Cash',
        gcash: 'GCash',
        grab: 'Grab',
        card: 'Debit/Credit Card',
    };

    // Show error if there's a problem loading data
    if (transactionsError) {
        console.error('Error loading transactions:', transactionsError);
    }

    // Only show loading spinner for the first 2 seconds, then show the page anyway
    if (transactionsLoading && !allTransactions) {
        return (
            <div className="flex justify-center items-center h-full">
                <LoadingSpinner />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-bg-primary">
            {/* Header */}
            <div className="p-4 lg:p-6 border-b border-border-color sticky-mobile">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div>
                        <h1 className="text-2xl lg:text-3xl font-bold text-text-primary">Accounting</h1>
                        <p className="text-sm text-text-secondary mt-1">Track transactions and balances</p>
                    </div>
                    <button
                        onClick={() => {
                            setEditingTransaction(null);
                            setIsTransactionModalOpen(true);
                        }}
                        className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors tap-target w-full sm:w-auto"
                    >
                        <PlusIcon className="w-5 h-5" />
                        <span className="font-medium">Add Transaction</span>
                    </button>
                </div>
            </div>

            {/* Status Messages */}
            {operationStatus && (
                <div className={`mx-6 mt-4 p-4 rounded-lg ${
                    operationStatus.type === 'success' ? 'bg-accent-green/20 text-accent-green' : 'bg-accent-red/20 text-accent-red'
                }`}>
                    {operationStatus.message}
                </div>
            )}

            {/* Tab Navigation */}
            <div className="px-4 lg:px-6 pt-4 border-b border-border-color overflow-x-auto mobile-scroll">
                <div className="flex gap-2 lg:gap-4 min-w-max">
                    {(['cash', 'gcash', 'grab', 'card'] as const).map(account => (
                        <button
                            key={account}
                            onClick={() => setActiveAccount(account)}
                            className={`px-4 py-2.5 border-b-2 transition-colors whitespace-nowrap text-sm lg:text-base tap-target ${
                                activeAccount === account
                                    ? 'border-accent-blue text-text-primary font-medium'
                                    : 'border-transparent text-text-secondary hover:text-text-primary'
                            }`}
                        >
                            {accountLabels[account]}
                        </button>
                    ))}
                </div>
            </div>

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

            {/* Opening Balance Setting */}
            <div className="px-6 pb-4">
                <div className="bg-bg-secondary p-4 rounded-xl border border-border-color">
                    <label className="block text-sm font-medium text-text-secondary mb-2">
                        Set Opening Balance for {accountLabels[activeAccount]}
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="number"
                            step="0.01"
                            value={openingBalances[activeAccount]}
                            onChange={(e) => setOpeningBalances(prev => ({ ...prev, [activeAccount]: parseFloat(e.target.value) || 0 }))}
                            className="flex-1 bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue"
                            placeholder="0.00"
                        />
                        <button
                            onClick={() => handleSetOpeningBalance(activeAccount, openingBalances[activeAccount])}
                            disabled={setBalanceLoading}
                            className="px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors disabled:opacity-50"
                        >
                            {setBalanceLoading ? 'Saving...' : 'Save'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Transactions Table */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                {transactionsWithBalance.length === 0 ? (
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
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Description</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Reference</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">Amount</th>
                                        <th className="px-4 py-3 text-right text-sm font-semibold text-text-primary">Balance</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-color">
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
                                            <td className="px-4 py-3 text-sm text-text-primary">{transaction.description}</td>
                                            <td className="px-4 py-3 text-sm text-text-secondary">{transaction.reference || '-'}</td>
                                            <td className="px-4 py-3 text-sm text-right font-medium">
                                                <span className={transaction.type === 'credit' ? 'text-accent-green' : 'text-accent-red'}>
                                                    {transaction.type === 'credit' ? '+' : '-'}{formatPeso(transaction.amount)}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-sm text-right font-semibold text-text-primary">
                                                {formatPeso(transaction.runningBalance)}
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={() => {
                                                            setEditingTransaction(transaction);
                                                            setIsTransactionModalOpen(true);
                                                        }}
                                                        className="p-1 text-accent-blue hover:bg-accent-blue/20 rounded transition-colors"
                                                        title="Edit"
                                                    >
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
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
                                        <div className="flex justify-between">
                                            <span className="text-text-secondary">Amount:</span>
                                            <span className={`font-medium ${transaction.type === 'credit' ? 'text-accent-green' : 'text-accent-red'}`}>
                                                {transaction.type === 'credit' ? '+' : '-'}{formatPeso(transaction.amount)}
                                            </span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-text-secondary">Balance:</span>
                                            <span className="font-semibold text-text-primary">{formatPeso(transaction.runningBalance)}</span>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-4 pt-4 border-t border-border-color">
                                        <button
                                            onClick={() => {
                                                setEditingTransaction(transaction);
                                                setIsTransactionModalOpen(true);
                                            }}
                                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors"
                                        >
                                            <PencilIcon className="w-4 h-4" />
                                            Edit
                                        </button>
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
            <TransactionModal
                isOpen={isTransactionModalOpen}
                onClose={() => {
                    setIsTransactionModalOpen(false);
                    setEditingTransaction(null);
                }}
                onSave={handleSaveTransaction}
                editingTransaction={editingTransaction}
                currentAccount={activeAccount}
            />

            <DeleteConfirmationModal
                isOpen={!!deletingTransaction}
                onClose={() => setDeletingTransaction(null)}
                onConfirm={handleDeleteTransaction}
                itemName={deletingTransaction?.description || 'this transaction'}
            />
        </div>
    );
};

export default Accounting;
