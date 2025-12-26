import React, { useState, useEffect, useMemo } from 'react';
import { useFirebaseData, useFirebaseMutation } from '../../hooks/useFirebase';
import { chartOfAccountsService } from '../../utils/firebaseService';
import type { Account } from '../../types';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon } from '../../components/Icons';

interface AccountWithChildren extends Account {
    children: AccountWithChildren[];
    level: number;
}

const accountTypes = [
    { value: 'bank', label: 'Bank', color: 'text-accent-cyan' },
    { value: 'asset', label: 'Asset', color: 'text-accent-blue' },
    { value: 'liability', label: 'Liability', color: 'text-accent-red' },
    { value: 'equity', label: 'Equity', color: 'text-accent-purple' },
    { value: 'revenue', label: 'Revenue', color: 'text-accent-green' },
    { value: 'expense', label: 'Expense', color: 'text-accent-orange' },
];

const ChartOfAccounts: React.FC = () => {
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    // New account form state
    const [newName, setNewName] = useState('');
    const [newType, setNewType] = useState<Account['type']>('expense');
    const [newDescription, setNewDescription] = useState('');
    const [newParentId, setNewParentId] = useState('');

    // Edit account form state
    const [editName, setEditName] = useState('');
    const [editType, setEditType] = useState<Account['type']>('expense');
    const [editDescription, setEditDescription] = useState('');
    const [editParentId, setEditParentId] = useState('');

    // Fetch accounts
    const { data: accounts = [], loading, error, refetch } = useFirebaseData(
        () => chartOfAccountsService.getAll(),
        []
    );

    // Build hierarchical account tree
    const accountsTree = useMemo(() => {
        const buildTree = (parentId: string | null | undefined = null, level = 0): AccountWithChildren[] => {
            return accounts
                .filter(account => account.parentId === parentId || (!account.parentId && !parentId))
                .map(account => ({
                    ...account,
                    level,
                    children: buildTree(account.id, level + 1)
                }))
                .sort((a, b) => a.name.localeCompare(b.name));
        };

        return buildTree(null);
    }, [accounts]);

    // Flatten tree for display
    const flattenedAccounts = useMemo(() => {
        const flatten = (nodes: AccountWithChildren[]): AccountWithChildren[] => {
            return nodes.reduce((acc, node) => {
                return [...acc, node, ...flatten(node.children)];
            }, [] as AccountWithChildren[]);
        };

        return flatten(accountsTree);
    }, [accountsTree]);

    // Mutations
    const { mutate: addAccount } = useFirebaseMutation(
        (account: Omit<Account, 'id'>) => chartOfAccountsService.add(account)
    );

    const { mutate: updateAccount } = useFirebaseMutation(
        (data: { id: string; updates: Partial<Account> }) =>
            chartOfAccountsService.update(data.id, data.updates)
    );

    const { mutate: deleteAccount } = useFirebaseMutation(
        (id: string) => chartOfAccountsService.delete(id)
    );

    const { mutate: seedAccounts, loading: seedingAccounts } = useFirebaseMutation(
        () => chartOfAccountsService.seedRestaurantAccounts()
    );

    const handleAddAccount = async () => {
        if (!newName || !newType) {
            setOperationStatus({ type: 'error', message: 'Please fill in all required fields' });
            return;
        }

        try {
            await addAccount({
                code: '',
                name: newName,
                type: newType,
                description: newDescription,
                parentId: newParentId || undefined,
                isActive: true,
            });
            setOperationStatus({ type: 'success', message: 'Account added successfully' });
            await refetch();

            // Reset form
            setNewName('');
            setNewType('expense');
            setNewDescription('');
            setNewParentId('');
            setIsAddingNew(false);
        } catch (error) {
            setOperationStatus({ type: 'error', message: 'Failed to add account' });
        }
    };

    const handleCancelNew = () => {
        setNewName('');
        setNewType('expense');
        setNewDescription('');
        setNewParentId('');
        setIsAddingNew(false);
    };

    const handleEditAccount = (account: Account) => {
        setEditingAccountId(account.id);
        setEditName(account.name);
        setEditType(account.type);
        setEditDescription(account.description || '');
        setEditParentId(account.parentId || '');
    };

    const handleSaveEdit = async () => {
        if (!editingAccountId || !editName || !editType) {
            setOperationStatus({ type: 'error', message: 'Please fill in all required fields' });
            return;
        }

        try {
            await updateAccount({
                id: editingAccountId,
                updates: {
                    name: editName,
                    type: editType,
                    description: editDescription,
                    parentId: editParentId || undefined,
                }
            });
            setOperationStatus({ type: 'success', message: 'Account updated successfully' });
            await refetch();
            setEditingAccountId(null);
        } catch (error) {
            setOperationStatus({ type: 'error', message: 'Failed to update account' });
        }
    };

    const handleCancelEdit = () => {
        setEditingAccountId(null);
        setEditName('');
        setEditType('expense');
        setEditDescription('');
        setEditParentId('');
    };

    const handleDeleteAccount = async () => {
        if (deletingAccount) {
            try {
                await deleteAccount(deletingAccount.id);
                setOperationStatus({ type: 'success', message: 'Account deleted successfully' });
                await refetch();
                setDeletingAccount(null);
            } catch (error) {
                setOperationStatus({ type: 'error', message: 'Failed to delete account' });
            }
        }
    };

    const handleSeedAccounts = async () => {
        if (window.confirm('This will add a complete restaurant Chart of Accounts. Continue?')) {
            try {
                await seedAccounts();
                setOperationStatus({ type: 'success', message: 'Restaurant accounts added successfully!' });
                await refetch();
            } catch (error) {
                setOperationStatus({ type: 'error', message: 'Failed to seed accounts' });
            }
        }
    };

    // Clear status messages after 3 seconds
    useEffect(() => {
        if (operationStatus) {
            const timer = setTimeout(() => setOperationStatus(null), 3000);
            return () => clearTimeout(timer);
        }
    }, [operationStatus]);

    if (loading) {
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

            {/* Header */}
            <div className="p-4 lg:p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-text-primary">Chart of Accounts</h1>
                        <p className="text-sm text-text-secondary mt-1">Manage your accounting categories and accounts</p>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={handleSeedAccounts}
                            disabled={seedingAccounts}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-green text-white rounded-lg hover:bg-accent-green/90 transition-colors tap-target disabled:opacity-50"
                        >
                            <FolderIcon className="w-5 h-5" />
                            <span className="font-medium">
                                {seedingAccounts ? 'Loading...' : 'Load Restaurant Accounts'}
                            </span>
                        </button>
                        <button
                            onClick={() => setIsAddingNew(true)}
                            className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors tap-target"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span className="font-medium">Add Account</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Accounts List */}
            <div className="flex-1 overflow-auto px-6 pb-6">
                {accounts.length === 0 && !isAddingNew ? (
                    <div className="bg-bg-secondary rounded-xl border border-border-color p-12 text-center">
                        <FolderIcon className="w-16 h-16 mx-auto mb-4 text-text-secondary/50" />
                        <p className="text-text-secondary">No accounts yet. Click "Add Account" to get started.</p>
                    </div>
                ) : (
                    <>
                        {/* Desktop Table */}
                        <div className="hidden lg:block bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                            <table className="w-full">
                                <thead className="bg-bg-tertiary">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Account Name</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Type</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Parent Account</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Description</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">Status</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-color">
                                    {/* Inline Add New Account Row */}
                                    {isAddingNew && (
                                        <tr className="bg-accent-blue/10 border-2 border-accent-blue">
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={newName}
                                                    onChange={(e) => setNewName(e.target.value)}
                                                    placeholder="Account name"
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                                />
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={newType}
                                                    onChange={(e) => setNewType(e.target.value as Account['type'])}
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10"
                                                >
                                                    {accountTypes.map(type => (
                                                        <option key={type.value} value={type.value}>{type.label}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <select
                                                    value={newParentId}
                                                    onChange={(e) => setNewParentId(e.target.value)}
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10"
                                                >
                                                    <option value="">None (Top Level)</option>
                                                    {accounts.filter(a => a.type === newType).map(acc => (
                                                        <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-4 py-3">
                                                <input
                                                    type="text"
                                                    value={newDescription}
                                                    onChange={(e) => setNewDescription(e.target.value)}
                                                    placeholder="Description (optional)"
                                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                                />
                                            </td>
                                            <td className="px-4 py-3 text-center">
                                                <span className="px-2 py-1 rounded text-xs font-medium bg-accent-green/20 text-accent-green">Active</span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <div className="flex items-center justify-center gap-2">
                                                    <button
                                                        onClick={handleAddAccount}
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
                                    {flattenedAccounts.map((account: AccountWithChildren) => {
                                        const isEditing = editingAccountId === account.id;
                                        const accountType = accountTypes.find(t => t.value === account.type);
                                        const indentation = account.level * 24; // 24px per level

                                        if (isEditing) {
                                            return (
                                                <tr key={account.id} className="bg-accent-purple/10 border-2 border-accent-purple">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2">
                                                            <div style={{ width: `${indentation}px` }} />
                                                            <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Account name" className="flex-1 bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue" />
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select value={editType} onChange={(e) => setEditType(e.target.value as Account['type'])} className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10">
                                                            {accountTypes.map(type => (
                                                                <option key={type.value} value={type.value}>{type.label}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <select value={editParentId} onChange={(e) => setEditParentId(e.target.value)} className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10">
                                                            <option value="">None (Top Level)</option>
                                                            {accounts.filter(a => a.type === editType && a.id !== editingAccountId).map(acc => (
                                                                <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <input type="text" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} placeholder="Description (optional)" className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue" />
                                                    </td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className="px-2 py-1 rounded text-xs font-medium bg-accent-green/20 text-accent-green">Active</span>
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
                                            <tr key={account.id} className="hover:bg-hover-bg/30 transition-colors">
                                                <td className="px-4 py-3 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <div style={{ width: `${indentation}px` }} />
                                                        {account.level > 0 && (
                                                            <span className="text-text-secondary">└─</span>
                                                        )}
                                                        <span className={`${account.level === 0 ? 'font-semibold' : 'font-medium'} text-text-primary`}>
                                                            {account.name}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3 text-sm">
                                                    <span className={`font-medium ${accountType?.color}`}>{accountType?.label}</span>
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-secondary">
                                                    {account.parentId ? accounts.find(a => a.id === account.parentId)?.name || '-' : '-'}
                                                </td>
                                                <td className="px-4 py-3 text-sm text-text-secondary">{account.description || '-'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs font-medium ${account.isActive ? 'bg-accent-green/20 text-accent-green' : 'bg-text-secondary/20 text-text-secondary'}`}>
                                                        {account.isActive ? 'Active' : 'Inactive'}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <button onClick={() => handleEditAccount(account)} className="p-1 text-accent-blue hover:bg-accent-blue/20 rounded transition-colors" title="Edit">
                                                            <PencilIcon className="w-4 h-4" />
                                                        </button>
                                                        <button onClick={() => setDeletingAccount(account)} className="p-1 text-accent-red hover:bg-accent-red/20 rounded transition-colors" title="Delete">
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
                            {/* Inline Add New Account Card for Mobile */}
                            {isAddingNew && (
                                <div className="bg-accent-blue/10 border-2 border-accent-blue rounded-xl p-4">
                                    <div className="space-y-3">
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Account Name</label>
                                            <input type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Account name" className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue" />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Type</label>
                                            <select value={newType} onChange={(e) => setNewType(e.target.value as Account['type'])} className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10">
                                                {accountTypes.map(type => (
                                                    <option key={type.value} value={type.value}>{type.label}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Parent Account (optional)</label>
                                            <select value={newParentId} onChange={(e) => setNewParentId(e.target.value)} className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10">
                                                <option value="">None (Top Level)</option>
                                                {accounts.filter(a => a.type === newType).map(acc => (
                                                    <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-text-secondary mb-1">Description (optional)</label>
                                            <input type="text" value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="Description" className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue" />
                                        </div>
                                        <div className="flex gap-2 pt-2">
                                            <button onClick={handleAddAccount} className="flex-1 px-4 py-2.5 bg-accent-green text-white rounded-lg hover:bg-accent-green/80 transition-colors font-medium">Save</button>
                                            <button onClick={handleCancelNew} className="flex-1 px-4 py-2.5 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-hover-bg transition-colors font-medium">Cancel</button>
                                        </div>
                                    </div>
                                </div>
                            )}
                            {flattenedAccounts.map((account: AccountWithChildren) => {
                                const accountType = accountTypes.find(t => t.value === account.type);
                                const indentation = account.level * 16; // 16px per level for mobile
                                return (
                                    <div key={account.id} className="bg-bg-secondary rounded-xl border border-border-color p-4">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="flex items-center gap-2">
                                                <div style={{ width: `${indentation}px` }} />
                                                {account.level > 0 && (
                                                    <span className="text-text-secondary text-sm">└─</span>
                                                )}
                                                <div className={`text-lg ${account.level === 0 ? 'font-bold' : 'font-semibold'} text-text-primary`}>{account.name}</div>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${account.isActive ? 'bg-accent-green/20 text-accent-green' : 'bg-text-secondary/20 text-text-secondary'}`}>
                                                {account.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex justify-between">
                                                <span className="text-text-secondary">Type:</span>
                                                <span className={`font-medium ${accountType?.color}`}>{accountType?.label}</span>
                                            </div>
                                            {account.parentId && (
                                                <div className="flex justify-between">
                                                    <span className="text-text-secondary">Parent:</span>
                                                    <span className="text-text-primary">{accounts.find(a => a.id === account.parentId)?.name || '-'}</span>
                                                </div>
                                            )}
                                            {account.description && (
                                                <div className="flex justify-between">
                                                    <span className="text-text-secondary">Description:</span>
                                                    <span className="text-text-primary">{account.description}</span>
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-2 mt-4 pt-4 border-t border-border-color">
                                            <button onClick={() => handleEditAccount(account)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors">
                                                <PencilIcon className="w-4 h-4" />
                                                Edit
                                            </button>
                                            <button onClick={() => setDeletingAccount(account)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-red/20 text-accent-red rounded-lg hover:bg-accent-red/30 transition-colors">
                                                <TrashIcon className="w-4 h-4" />
                                                Delete
                                            </button>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </>
                )}
            </div>

            {/* Modals */}
            <DeleteConfirmationModal
                isOpen={!!deletingAccount}
                onClose={() => setDeletingAccount(null)}
                onConfirm={handleDeleteAccount}
                itemName={deletingAccount?.name || 'this account'}
            />
        </div>
    );
};

export default ChartOfAccounts;
