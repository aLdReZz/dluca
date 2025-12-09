import React, { useState, useEffect } from 'react';
import type { AccountingTransaction } from '../types';
import { XMarkIcon } from './Icons';

interface TransactionModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (transaction: Omit<AccountingTransaction, 'id' | 'runningBalance'>) => void;
    editingTransaction?: AccountingTransaction | null;
    currentAccount: 'cash' | 'gcash' | 'grab' | 'card';
}

const TransactionModal: React.FC<TransactionModalProps> = ({
    isOpen,
    onClose,
    onSave,
    editingTransaction,
    currentAccount,
}) => {
    const initialState = {
        date: new Date().toISOString().split('T')[0],
        type: 'debit' as 'debit' | 'credit' | 'transfer',
        account: currentAccount,
        description: '',
        amount: 0,
        reference: '',
        notes: '',
        transferTo: undefined as 'cash' | 'gcash' | 'grab' | 'card' | undefined,
    };

    const [formData, setFormData] = useState(initialState);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (editingTransaction) {
                setFormData({
                    date: editingTransaction.date,
                    type: editingTransaction.type,
                    account: editingTransaction.account,
                    description: editingTransaction.description,
                    amount: editingTransaction.amount,
                    reference: editingTransaction.reference || '',
                    notes: editingTransaction.notes || '',
                    transferTo: editingTransaction.transferTo as 'cash' | 'gcash' | 'grab' | 'card' | undefined,
                });
            } else {
                setFormData({ ...initialState, account: currentAccount });
            }
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, editingTransaction, currentAccount]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'amount' ? parseFloat(value) || 0 : value,
        }));
        // Clear error when user starts typing
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};

        if (!formData.date) newErrors.date = 'Date is required';
        if (!formData.description.trim()) newErrors.description = 'Description is required';
        if (formData.amount <= 0) newErrors.amount = 'Amount must be greater than 0';
        if (formData.type === 'transfer' && !formData.transferTo) {
            newErrors.transferTo = 'Please select destination account';
        }
        if (formData.type === 'transfer' && formData.transferTo === formData.account) {
            newErrors.transferTo = 'Cannot transfer to the same account';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validate()) {
            const transaction: any = {
                date: formData.date,
                type: formData.type,
                account: formData.account,
                description: formData.description,
                amount: formData.amount,
                runningBalance: 0, // Will be calculated
                createdAt: editingTransaction?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            // Only add optional fields if they have values
            if (formData.reference && formData.reference.trim()) {
                transaction.reference = formData.reference;
            }
            if (formData.notes && formData.notes.trim()) {
                transaction.notes = formData.notes;
            }
            if (formData.type === 'transfer' && formData.transferTo) {
                transaction.transferTo = formData.transferTo;
            }

            onSave(transaction);
            setFormData(initialState);
            setErrors({});
        }
    };

    const handleClose = () => {
        setFormData(initialState);
        setErrors({});
        onClose();
    };

    if (!isOpen) return null;

    const accountOptions = ['cash', 'gcash', 'grab', 'card'].filter(acc => acc !== formData.account);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-bg-secondary border border-border-color rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-[0_20px_60px_rgba(0,0,0,0.6)]">
                <div className="sticky top-0 bg-bg-secondary border-b border-border-color px-6 py-4 flex items-center justify-between z-10">
                    <h2 className="text-xl font-semibold text-text-primary">
                        {editingTransaction ? 'Edit Transaction' : 'Add Transaction'}
                    </h2>
                    <button
                        onClick={handleClose}
                        className="text-text-secondary hover:text-text-primary transition-colors"
                    >
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Date */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Date<span className="text-accent-red">*</span>
                        </label>
                        <input
                            type="date"
                            name="date"
                            value={formData.date}
                            onChange={handleChange}
                            className={`w-full bg-bg-primary border rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue ${
                                errors.date ? 'border-accent-red' : 'border-border-color'
                            }`}
                        />
                        {errors.date && <p className="text-xs text-accent-red mt-1">{errors.date}</p>}
                    </div>

                    {/* Type */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Type<span className="text-accent-red">*</span>
                        </label>
                        <select
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                            className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue"
                        >
                            <option value="debit">Debit (Money Out)</option>
                            <option value="credit">Credit (Money In)</option>
                            <option value="transfer">Transfer</option>
                        </select>
                    </div>

                    {/* Account */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Account<span className="text-accent-red">*</span>
                        </label>
                        <select
                            name="account"
                            value={formData.account}
                            onChange={handleChange}
                            className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue"
                        >
                            <option value="cash">Cash</option>
                            <option value="gcash">GCash</option>
                            <option value="grab">Grab</option>
                            <option value="card">Debit/Credit Card</option>
                        </select>
                    </div>

                    {/* Transfer To (only shown when type is transfer) */}
                    {formData.type === 'transfer' && (
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-1">
                                Transfer To<span className="text-accent-red">*</span>
                            </label>
                            <select
                                name="transferTo"
                                value={formData.transferTo || ''}
                                onChange={handleChange}
                                className={`w-full bg-bg-primary border rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue ${
                                    errors.transferTo ? 'border-accent-red' : 'border-border-color'
                                }`}
                            >
                                <option value="">Select destination account</option>
                                {accountOptions.map(acc => (
                                    <option key={acc} value={acc}>
                                        {acc === 'cash' ? 'Cash' : acc === 'gcash' ? 'GCash' : acc === 'grab' ? 'Grab' : 'Debit/Credit Card'}
                                    </option>
                                ))}
                            </select>
                            {errors.transferTo && <p className="text-xs text-accent-red mt-1">{errors.transferTo}</p>}
                        </div>
                    )}

                    {/* Amount */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Amount<span className="text-accent-red">*</span>
                        </label>
                        <input
                            type="number"
                            name="amount"
                            value={formData.amount}
                            onChange={handleChange}
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            className={`w-full bg-bg-primary border rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue ${
                                errors.amount ? 'border-accent-red' : 'border-border-color'
                            }`}
                        />
                        {errors.amount && <p className="text-xs text-accent-red mt-1">{errors.amount}</p>}
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Description<span className="text-accent-red">*</span>
                        </label>
                        <input
                            type="text"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            placeholder="Enter transaction description"
                            className={`w-full bg-bg-primary border rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue ${
                                errors.description ? 'border-accent-red' : 'border-border-color'
                            }`}
                        />
                        {errors.description && <p className="text-xs text-accent-red mt-1">{errors.description}</p>}
                    </div>

                    {/* Reference */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Reference/Receipt # (Optional)
                        </label>
                        <input
                            type="text"
                            name="reference"
                            value={formData.reference}
                            onChange={handleChange}
                            placeholder="e.g., INV-001, REC-123"
                            className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue"
                        />
                    </div>

                    {/* Notes */}
                    <div>
                        <label className="block text-sm font-medium text-text-secondary mb-1">
                            Notes (Optional)
                        </label>
                        <textarea
                            name="notes"
                            value={formData.notes}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Additional notes..."
                            className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue resize-none"
                        />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 px-4 py-2 bg-bg-tertiary text-text-primary rounded-lg hover:bg-hover-bg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 px-4 py-2 bg-accent-blue text-white rounded-lg hover:bg-accent-blue/90 transition-colors"
                        >
                            {editingTransaction ? 'Update' : 'Add'} Transaction
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TransactionModal;
