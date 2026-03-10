import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFirebaseData, useFirebaseMutation } from '../../hooks/useFirebase';
import { chartOfAccountsService } from '../../utils/firebaseService';
import type { Account } from '../../types';
import DeleteConfirmationModal from '../../components/DeleteConfirmationModal';
import LoadingSpinner from '../../components/LoadingSpinner';
import { PlusIcon, PencilIcon, TrashIcon, FolderIcon, ChevronDownIcon, ChevronUpIcon } from '../../components/Icons';

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
    const addFormRef = useRef<HTMLTableRowElement>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [editingAccountId, setEditingAccountId] = useState<string | null>(null);
    const [deletingAccount, setDeletingAccount] = useState<Account | null>(null);
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());
    const [animatingOut, setAnimatingOut] = useState<Set<string>>(new Set());
    const [justExpanded, setJustExpanded] = useState<Set<string>>(new Set());

    const toggleCollapsed = (id: string) => {
        if (collapsedIds.has(id)) {
            // Expanding — show rows then play entrance animation
            setCollapsedIds(prev => { const n = new Set(prev); n.delete(id); return n; });
            setJustExpanded(prev => new Set(prev).add(id));
            setTimeout(() => setJustExpanded(prev => { const n = new Set(prev); n.delete(id); return n; }), 300);
        } else {
            // Collapsing — play exit animation then hide
            setAnimatingOut(prev => new Set(prev).add(id));
            setTimeout(() => {
                setCollapsedIds(prev => new Set(prev).add(id));
                setAnimatingOut(prev => { const n = new Set(prev); n.delete(id); return n; });
            }, 200);
        }
    };

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
        if (!accounts || !Array.isArray(accounts)) return [];

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

    // Flatten tree for display (keep children visible while animating out)
    const flattenedAccounts = useMemo(() => {
        if (!accountsTree || accountsTree.length === 0) return [];

        const flatten = (nodes: AccountWithChildren[]): AccountWithChildren[] => {
            return nodes.reduce((acc, node) => {
                if (collapsedIds.has(node.id) && !animatingOut.has(node.id)) return [...acc, node];
                return [...acc, node, ...flatten(node.children)];
            }, [] as AccountWithChildren[]);
        };

        return flatten(accountsTree);
    }, [accountsTree, collapsedIds, animatingOut]);

    // Collapse / expand all
    const allCategoryIds = useMemo(() => accountsTree.filter(a => a.children.length > 0).map(a => a.id), [accountsTree]);
    const allCollapsed = allCategoryIds.length > 0 && allCategoryIds.every(id => collapsedIds.has(id));

    const toggleAll = () => {
        if (allCollapsed) {
            setCollapsedIds(new Set());
            setJustExpanded(new Set(allCategoryIds));
            setTimeout(() => setJustExpanded(new Set()), 300);
        } else {
            setAnimatingOut(new Set(allCategoryIds));
            setTimeout(() => {
                setCollapsedIds(new Set(allCategoryIds));
                setAnimatingOut(new Set());
            }, 200);
        }
    };

    // Helper: get root category id for a given account
    const getRootCategoryId = (account: AccountWithChildren): string => {
        if (account.level === 0) return account.id;
        const parent = accounts.find(a => a.id === account.parentId);
        if (!parent || !parent.parentId) return parent?.id || '';
        return accounts.find(a => a.id === parent.parentId)?.id || parent.id;
    };

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

    const { mutate: deleteAllAccounts, loading: deletingAll } = useFirebaseMutation(
        () => chartOfAccountsService.deleteAll()
    );

    const handleClearAll = async () => {
        if (window.confirm('This will permanently delete ALL chart of accounts. This cannot be undone. Continue?')) {
            try {
                await deleteAllAccounts();
                setOperationStatus({ type: 'success', message: 'All accounts deleted.' });
                await refetch();
            } catch {
                setOperationStatus({ type: 'error', message: 'Failed to delete accounts' });
            }
        }
    };

    const handleAddAccount = async () => {
        if (!newName || !newType) {
            setOperationStatus({ type: 'error', message: 'Please fill in all required fields' });
            return;
        }

        try {
            // Auto-generate code based on account type and count
            const typePrefix = {
                'bank': '1',
                'asset': '1',
                'liability': '2',
                'equity': '3',
                'revenue': '4',
                'expense': '5'
            }[newType] || '9';

            const sameTypeCount = accounts.filter(a => a.type === newType).length;
            const generatedCode = `${typePrefix}${String(sameTypeCount + 1).padStart(3, '0')}`;

            const accountData: Omit<Account, 'id'> = {
                code: generatedCode,
                name: newName,
                type: newType,
                description: newDescription,
                isActive: true,
            };

            // Only add parentId if it has a value (Firebase doesn't allow undefined)
            if (newParentId) {
                accountData.parentId = newParentId;
            }

            await addAccount(accountData);
            setOperationStatus({ type: 'success', message: 'Account added successfully' });
            await refetch();

            // Reset form
            setNewName('');
            setNewType('expense');
            setNewDescription('');
            setNewParentId('');
            setIsAddingNew(false);
        } catch (error) {
            console.error('Error adding account:', error);
            setOperationStatus({ type: 'error', message: `Failed to add account: ${error instanceof Error ? error.message : 'Unknown error'}` });
        }
    };

    const handleCancelNew = () => {
        setNewName('');
        setNewType('expense');
        setNewDescription('');
        setNewParentId('');
        setIsAddingNew(false);
    };

    const handleAddChild = (parent: Account) => {
        setNewParentId(parent.id);
        setNewType(parent.type);
        setNewName('');
        setNewDescription('');
        setIsAddingNew(true);
        setTimeout(() => addFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
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
            const updates: Partial<Account> = {
                name: editName,
                type: editType,
                description: editDescription,
            };

            // Only add parentId if it has a value (Firebase doesn't allow undefined)
            if (editParentId) {
                updates.parentId = editParentId;
            }

            await updateAccount({
                id: editingAccountId,
                updates
            });
            setOperationStatus({ type: 'success', message: 'Account updated successfully' });
            await refetch();
            setEditingAccountId(null);
        } catch (error) {
            console.error('Error updating account:', error);
            setOperationStatus({ type: 'error', message: `Failed to update account: ${error instanceof Error ? error.message : 'Unknown error'}` });
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
            <style>{`
                @keyframes coaSlideDown {
                    from { max-height: 0; opacity: 0; }
                    to   { max-height: 80px; opacity: 1; }
                }
                @keyframes coaSlideUp {
                    from { max-height: 80px; opacity: 1; }
                    to   { max-height: 0; opacity: 0; }
                }
                @keyframes coaMobileSlideDown {
                    from { max-height: 0; opacity: 0; }
                    to   { max-height: 300px; opacity: 1; }
                }
                @keyframes coaMobileSlideUp {
                    from { max-height: 300px; opacity: 1; }
                    to   { max-height: 0; opacity: 0; }
                }
                tr.coa-enter td { overflow: hidden; }
                tr.coa-enter td > .coa-cell { animation: coaSlideDown 0.25s ease-out forwards; }
                tr.coa-exit  td { overflow: hidden; }
                tr.coa-exit  td > .coa-cell { animation: coaSlideUp  0.18s ease-in  forwards; }
                div.coa-enter { animation: coaMobileSlideDown 0.25s ease-out forwards; overflow: hidden; }
                div.coa-exit  { animation: coaMobileSlideUp  0.18s ease-in  forwards; overflow: hidden; }
            `}</style>
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
                        {accounts.length > 0 && (
                            <button
                                onClick={handleClearAll}
                                disabled={deletingAll}
                                className="flex items-center justify-center gap-2 px-4 py-3 bg-accent-red/10 text-accent-red border border-accent-red/30 rounded-lg hover:bg-accent-red/20 transition-colors tap-target disabled:opacity-50"
                            >
                                <TrashIcon className="w-5 h-5" />
                                <span className="font-medium">{deletingAll ? 'Clearing...' : 'Clear All'}</span>
                            </button>
                        )}
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
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">
                                            <div className="flex items-center gap-2">
                                                <span>Account Name</span>
                                                {allCategoryIds.length > 0 && (
                                                    <button
                                                        onClick={toggleAll}
                                                        title={allCollapsed ? 'Expand All' : 'Collapse All'}
                                                        className="p-0.5 rounded hover:bg-hover-bg transition-colors text-text-secondary hover:text-text-primary"
                                                    >
                                                        {allCollapsed
                                                            ? <ChevronDownIcon className="w-4 h-4" />
                                                            : <ChevronUpIcon className="w-4 h-4" />
                                                        }
                                                    </button>
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary w-32">Type</th>
                                        <th className="px-4 py-3 text-left text-sm font-semibold text-text-primary">Description</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary w-24">Status</th>
                                        <th className="px-4 py-3 text-center text-sm font-semibold text-text-primary w-24">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-color">
                                    {/* Inline Add New Account Row */}
                                    {isAddingNew && (
                                        <tr ref={addFormRef} className="bg-accent-blue/10 border-2 border-accent-blue">
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
                                                <div className="space-y-1">
                                                    {newParentId && (
                                                        <p className="text-xs text-accent-blue font-medium truncate">
                                                            Under: {accounts.find(a => a.id === newParentId)?.name}
                                                        </p>
                                                    )}
                                                    <select
                                                        value={newParentId}
                                                        onChange={(e) => setNewParentId(e.target.value)}
                                                        className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer appearance-none bg-[url('data:image/svg+xml;charset=UTF-8,%3csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 24 24%27 fill=%27none%27 stroke=%27%23888888%27 stroke-width=%272%27 stroke-linecap=%27round%27 stroke-linejoin=%27round%27%3e%3cpolyline points=%276 9 12 15 18 9%27%3e%3c/polyline%3e%3c/svg%3e')] bg-no-repeat bg-[right_0.5rem_center] bg-[length:1.25rem] pr-10"
                                                    >
                                                        <option value="">None (Category)</option>
                                                        {(accounts || []).filter(a => a.type === newType).map(acc => (
                                                            <option key={acc.id} value={acc.id}>{acc.name}</option>
                                                        ))}
                                                    </select>
                                                </div>
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

                                        if (isEditing) {
                                            return (
                                                <tr key={account.id} className="bg-accent-purple/10 border-2 border-accent-purple">
                                                    <td className="px-4 py-3">
                                                        <div className="flex items-center gap-2" style={{ paddingLeft: `${account.level * 28}px` }}>
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

                                        // Level 0 — Category (bold header row)
                                        if (account.level === 0) {
                                            const isCollapsed = collapsedIds.has(account.id);
                                            const hasChildren = account.children.length > 0;
                                            return (
                                                <tr key={account.id} className="bg-bg-tertiary/60 hover:bg-hover-bg/40 transition-colors cursor-pointer select-none" onClick={() => hasChildren && toggleCollapsed(account.id)}>
                                                    <td className="px-4 py-3 text-sm">
                                                        <div className="flex items-center gap-2">
                                                            {hasChildren && (
                                                                isCollapsed
                                                                    ? <ChevronDownIcon className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                                                                    : <ChevronUpIcon className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                                                            )}
                                                            <span className="font-bold text-text-primary tracking-wide uppercase text-xs">
                                                                {account.name}
                                                            </span>
                                                            {hasChildren && (
                                                                <span className="text-xs text-text-secondary/50 font-normal normal-case">
                                                                    {isCollapsed ? `(${account.children.length} hidden)` : ''}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm">
                                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${
                                                            accountType?.value === 'bank' ? 'border-accent-cyan/40 text-accent-cyan bg-accent-cyan/10' :
                                                            accountType?.value === 'asset' ? 'border-accent-blue/40 text-accent-blue bg-accent-blue/10' :
                                                            accountType?.value === 'liability' ? 'border-accent-red/40 text-accent-red bg-accent-red/10' :
                                                            accountType?.value === 'equity' ? 'border-accent-purple/40 text-accent-purple bg-accent-purple/10' :
                                                            accountType?.value === 'revenue' ? 'border-accent-green/40 text-accent-green bg-accent-green/10' :
                                                            'border-accent-orange/40 text-accent-orange bg-accent-orange/10'
                                                        }`}>
                                                            {accountType?.label}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-sm text-text-secondary">{account.description || ''}</td>
                                                    <td className="px-4 py-3 text-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${account.isActive ? 'bg-accent-green/20 text-accent-green' : 'bg-text-secondary/20 text-text-secondary'}`}>
                                                            {account.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                                                        <div className="flex items-center justify-center gap-1">
                                                            <button onClick={() => handleAddChild(account)} className="p-1 text-accent-green hover:bg-accent-green/20 rounded transition-colors" title="Add Sub-Category"><PlusIcon className="w-4 h-4" /></button>
                                                            <button onClick={() => handleEditAccount(account)} className="p-1 text-accent-blue hover:bg-accent-blue/20 rounded transition-colors" title="Edit"><PencilIcon className="w-4 h-4" /></button>
                                                            <button onClick={() => setDeletingAccount(account)} className="p-1 text-accent-red hover:bg-accent-red/20 rounded transition-colors" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        // Level 1 — Sub Category
                                        if (account.level === 1) {
                                            const rootId = getRootCategoryId(account);
                                            const animClass = animatingOut.has(rootId) ? 'coa-exit' : justExpanded.has(rootId) ? 'coa-enter' : '';
                                            return (
                                                <tr key={account.id} className={`hover:bg-hover-bg/30 transition-colors ${animClass}`}>
                                                    <td className="p-0 text-sm">
                                                        <div className="coa-cell flex items-center gap-1.5 py-2.5 pr-4" style={{ paddingLeft: '20px' }}>
                                                            <span className="text-text-secondary text-xs">├─</span>
                                                            <span className="font-semibold text-text-primary">{account.name}</span>
                                                        </div>
                                                    </td>
                                                    <td className="p-0 text-sm text-text-secondary/50">
                                                        <div className="coa-cell px-4 py-2.5">—</div>
                                                    </td>
                                                    <td className="p-0 text-sm text-text-secondary">
                                                        <div className="coa-cell px-4 py-2.5">{account.description || ''}</div>
                                                    </td>
                                                    <td className="p-0 text-center">
                                                        <div className="coa-cell px-4 py-2.5 flex justify-center">
                                                            <span className={`px-2 py-1 rounded text-xs font-medium ${account.isActive ? 'bg-accent-green/20 text-accent-green' : 'bg-text-secondary/20 text-text-secondary'}`}>
                                                                {account.isActive ? 'Active' : 'Inactive'}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="p-0">
                                                        <div className="coa-cell px-4 py-2.5 flex items-center justify-center gap-1">
                                                            <button onClick={() => handleAddChild(account)} className="p-1 text-accent-green hover:bg-accent-green/20 rounded transition-colors" title="Add Account"><PlusIcon className="w-4 h-4" /></button>
                                                            <button onClick={() => handleEditAccount(account)} className="p-1 text-accent-blue hover:bg-accent-blue/20 rounded transition-colors" title="Edit"><PencilIcon className="w-4 h-4" /></button>
                                                            <button onClick={() => setDeletingAccount(account)} className="p-1 text-accent-red hover:bg-accent-red/20 rounded transition-colors" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }

                                        // Level 2+ — Account (leaf)
                                        {
                                            const rootId = getRootCategoryId(account);
                                            const animClass = animatingOut.has(rootId) ? 'coa-exit' : justExpanded.has(rootId) ? 'coa-enter' : '';
                                            return (
                                            <tr key={account.id} className={`hover:bg-hover-bg/20 transition-colors ${animClass}`}>
                                                <td className="p-0 text-sm">
                                                    <div className="coa-cell flex items-center gap-1.5 py-2 pr-4" style={{ paddingLeft: `${20 + (account.level - 1) * 20}px` }}>
                                                        <span className="text-text-secondary/50 text-xs">└─</span>
                                                        <span className="text-text-primary">{account.name}</span>
                                                    </div>
                                                </td>
                                                <td className="p-0 text-sm text-text-secondary/50">
                                                    <div className="coa-cell px-4 py-2">—</div>
                                                </td>
                                                <td className="p-0 text-sm text-text-secondary">
                                                    <div className="coa-cell px-4 py-2">{account.description || ''}</div>
                                                </td>
                                                <td className="p-0 text-center">
                                                    <div className="coa-cell px-4 py-2 flex justify-center">
                                                        <span className={`px-2 py-1 rounded text-xs font-medium ${account.isActive ? 'bg-accent-green/20 text-accent-green' : 'bg-text-secondary/20 text-text-secondary'}`}>
                                                            {account.isActive ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="p-0">
                                                    <div className="coa-cell px-4 py-2 flex items-center justify-center gap-2">
                                                        <button onClick={() => handleEditAccount(account)} className="p-1 text-accent-blue hover:bg-accent-blue/20 rounded transition-colors" title="Edit"><PencilIcon className="w-4 h-4" /></button>
                                                        <button onClick={() => setDeletingAccount(account)} className="p-1 text-accent-red hover:bg-accent-red/20 rounded transition-colors" title="Delete"><TrashIcon className="w-4 h-4" /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                        }
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
                                                {(accounts || []).filter(a => a.type === newType).map(acc => (
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
                                const isCategory = account.level === 0;
                                const isSubCategory = account.level === 1;
                                const isCollapsed = collapsedIds.has(account.id);
                                const hasChildren = account.children.length > 0;
                                const mobileRootId = getRootCategoryId(account);
                                const mobileAnimClass = !isCategory
                                    ? (animatingOut.has(mobileRootId) ? 'coa-exit' : justExpanded.has(mobileRootId) ? 'coa-enter' : '')
                                    : '';
                                return (
                                    <div
                                        key={account.id}
                                        className={`rounded-xl border p-4 ${mobileAnimClass} ${
                                            isCategory
                                                ? 'bg-bg-tertiary/60 border-border-color'
                                                : isSubCategory
                                                ? 'bg-bg-secondary border-border-color ml-4'
                                                : 'bg-bg-secondary border-border-color/50 ml-8'
                                        }`}
                                    >
                                        <div
                                            className={`flex justify-between items-start mb-2 ${isCategory && hasChildren ? 'cursor-pointer' : ''}`}
                                            onClick={() => isCategory && hasChildren && toggleCollapsed(account.id)}
                                        >
                                            <div className="flex items-center gap-2">
                                                {isCategory && hasChildren && (
                                                    isCollapsed
                                                        ? <ChevronDownIcon className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                                                        : <ChevronUpIcon className="w-3.5 h-3.5 text-text-secondary flex-shrink-0" />
                                                )}
                                                {isSubCategory && <span className="text-text-secondary text-xs">├─</span>}
                                                {!isCategory && !isSubCategory && <span className="text-text-secondary/50 text-xs">└─</span>}
                                                <span className={`${isCategory ? 'font-bold uppercase text-xs tracking-wide' : isSubCategory ? 'font-semibold text-sm' : 'text-sm'} text-text-primary`}>
                                                    {account.name}
                                                    {isCategory && isCollapsed && hasChildren && <span className="ml-1 text-text-secondary/50 font-normal normal-case">({account.children.length} hidden)</span>}
                                                </span>
                                            </div>
                                            <span className={`px-2 py-1 rounded text-xs font-medium ${account.isActive ? 'bg-accent-green/20 text-accent-green' : 'bg-text-secondary/20 text-text-secondary'}`}>
                                                {account.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </div>
                                        {isCategory && (
                                            <div className="mb-2">
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${accountType?.color} border-current/30 bg-current/5`}>
                                                    {accountType?.label}
                                                </span>
                                            </div>
                                        )}
                                        {account.description && (
                                            <p className="text-xs text-text-secondary mb-2">{account.description}</p>
                                        )}
                                        <div className="flex gap-2 pt-3 border-t border-border-color">
                                            {(isCategory || isSubCategory) && (
                                                <button onClick={() => handleAddChild(account)} className="flex items-center justify-center gap-1 px-3 py-2 bg-accent-green/20 text-accent-green rounded-lg hover:bg-accent-green/30 transition-colors text-sm">
                                                    <PlusIcon className="w-4 h-4" />
                                                </button>
                                            )}
                                            <button onClick={() => handleEditAccount(account)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-blue/20 text-accent-blue rounded-lg hover:bg-accent-blue/30 transition-colors text-sm">
                                                <PencilIcon className="w-4 h-4" /> Edit
                                            </button>
                                            <button onClick={() => setDeletingAccount(account)} className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-accent-red/20 text-accent-red rounded-lg hover:bg-accent-red/30 transition-colors text-sm">
                                                <TrashIcon className="w-4 h-4" /> Delete
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
