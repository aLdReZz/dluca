import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { PurchaseOrder, ProductInventoryItem } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon } from './Icons';

interface PurchaseRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<PurchaseOrder, 'id' | 'date' | 'status'>) => void;
    productInventoryItems: ProductInventoryItem[];
    departments: string[];
}

type PurchaseItem = {
    itemId: number | null;
    itemName: string;
    quantity: string;
    cost: string;
};

const PurchaseRequestModal: React.FC<PurchaseRequestModalProps> = ({ isOpen, onClose, onSave, productInventoryItems, departments }) => {
    const [department, setDepartment] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([{ itemId: null, itemName: '', quantity: '1', cost: '' }]);
    const [error, setError] = useState('');
    
    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<ProductInventoryItem[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const firstItemNameInputRef = useRef<HTMLInputElement>(null);

    const totalCost = useMemo(() => {
        return items.reduce((total, item) => {
            return total + (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0);
        }, 0);
    }, [items]);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setTimeout(() => {
                firstItemNameInputRef.current?.focus();
            }, 100);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    const handleAddItem = () => {
        setItems([...items, { itemId: null, itemName: '', quantity: '1', cost: '' }]);
    };

    const handleRemoveItem = (index: number) => {
        const newItems = items.filter((_, i) => i !== index);
        setItems(newItems);
    };

    const handleItemChange = (index: number, field: keyof PurchaseItem, value: any) => {
        const newItems = [...items];
        const currentItem = { ...newItems[index], [field]: value };
        
        if (field === 'itemName') {
            currentItem.itemId = null; 
            setActiveItemIndex(index);
            setHighlightedIndex(-1);
            if (value) {
                setSuggestions(productInventoryItems.filter(p => p.name.toLowerCase().includes(value.toLowerCase())));
            } else {
                setSuggestions([]);
            }
        }
        newItems[index] = currentItem;
        setItems(newItems);
    };
    
    const handleSuggestionClick = (index: number, suggestion: ProductInventoryItem) => {
        const newItems = [...items];
        const unitCost = String(suggestion.price);

        newItems[index] = { ...newItems[index], itemId: suggestion.id, itemName: suggestion.name, cost: unitCost };
        setItems(newItems);
        setActiveItemIndex(null);
    };
    
     const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (suggestions.length === 0 && e.key !== 'Tab') return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((prev) => (prev - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (highlightedIndex >= 0 && suggestions.length > 0) {
                e.preventDefault();
                handleSuggestionClick(index, suggestions[highlightedIndex]);
                
                const form = e.currentTarget.form;
                if (form) {
                    const nextInput = form.elements.namedItem(`quantity-${index}`) as HTMLInputElement;
                    nextInput?.focus();
                }
            }
        }
    };

    const handleSaveClick = () => {
        if (!department) {
            setError('Please select a department.');
            return;
        }
        if (items.length === 0 || items.every(i => !i.itemId)) {
            setError('At least one valid item must be added to the purchase request.');
            return;
        }

        const formattedItems = items
            .filter(item => item.itemId && parseFloat(item.quantity) > 0)
            .map(item => ({
                itemId: item.itemId!,
                quantity: parseFloat(item.quantity),
                cost: parseFloat(item.cost) || 0,
            }));

        if (formattedItems.length === 0) {
            setError('Please ensure at least one item has a valid ID and quantity.');
            return;
        }
        
        const calculatedTotalCost = formattedItems.reduce((total, item) => total + (item.quantity * item.cost), 0);
        
        onSave({
            department,
            items: formattedItems,
            totalCost: calculatedTotalCost,
        });
    };

    useEffect(() => {
        if (isOpen) {
            setItems([{ itemId: null, itemName: '', quantity: '1', cost: '' }]);
            setDepartment('');
            setError('');
        }
    }, [isOpen]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-3xl max-h-[92vh] rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                <form onSubmit={(e) => e.preventDefault()} className="flex flex-col flex-1 min-h-0">
                    <div className="p-6 border-b border-border-color flex justify-between items-center flex-shrink-0 bg-gradient-to-r from-bg-secondary to-bg-tertiary/30">
                        <div>
                            <h2 className="text-2xl font-bold text-text-primary">New Purchase Request</h2>
                            <p className="text-sm text-text-secondary mt-1">Fill in the details for your purchase request</p>
                        </div>
                        <button type="button" onClick={onClose} className="p-2.5 rounded-full text-text-secondary hover:bg-hover-bg hover:text-text-primary transition-all">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-6 space-y-6 flex-1 overflow-y-auto pb-48">
                        <div className="bg-bg-tertiary/30 rounded-xl p-5 border border-border-color/50">
                            <label className="block text-sm font-semibold text-text-primary mb-3 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue"></span>
                                Department*
                            </label>
                            <div className="flex items-center gap-3 flex-wrap">
                                {departments.map(dept => (
                                    <button
                                        key={dept}
                                        type="button"
                                        onClick={() => setDepartment(dept)}
                                        className={`px-5 py-2.5 text-sm font-semibold rounded-lg transition-all duration-200 ${
                                            department === dept
                                                ? 'bg-accent-blue text-white shadow-lg shadow-accent-blue/30 scale-105'
                                                : 'bg-bg-primary text-text-secondary hover:bg-hover-bg hover:scale-102 border border-border-color'
                                        }`}
                                    >
                                        {dept}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <div>
                            <h3 className="text-lg font-bold text-text-primary mb-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue"></span>
                                Items
                            </h3>
                        <div className="space-y-3 bg-bg-tertiary/20 rounded-xl p-4 border border-border-color/30">
                            <div className="grid grid-cols-12 gap-3 items-center text-xs font-semibold text-text-secondary uppercase tracking-wide px-1">
                                <div className="col-span-4">Item Name</div>
                                <div className="col-span-2">Quantity</div>
                                <div className="col-span-2">Unit Cost (₱)</div>
                                <div className="col-span-3">Total Cost (₱)</div>
                                <div className="col-span-1"></div>
                            </div>
                            {items.map((item, index) => {
                                const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0);
                                return (
                                    <div key={index} className="grid grid-cols-12 gap-3 items-center bg-bg-secondary rounded-lg p-2 border border-border-color/50 hover:border-accent-blue/40 transition-all">
                                        <div className="col-span-4 relative">
                                            <input
                                                ref={index === 0 ? firstItemNameInputRef : null}
                                                type="text"
                                                name={`itemName-${index}`}
                                                placeholder="Type to search..."
                                                value={item.itemName}
                                                onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                                                onFocus={() => setActiveItemIndex(index)}
                                                onBlur={() => setTimeout(() => setActiveItemIndex(null), 150)}
                                                onKeyDown={(e) => handleKeyDown(e, index)}
                                                className="w-full bg-bg-primary border border-border-color rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all placeholder:text-text-secondary/50"
                                            />
                                            {activeItemIndex === index && suggestions.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 bg-bg-primary border border-border-color rounded-lg z-20 max-h-96 overflow-y-auto mt-1 shadow-xl">
                                                    {suggestions.map((s, sIndex) => (
                                                        <div
                                                            key={s.id}
                                                            onMouseDown={() => handleSuggestionClick(index, s)}
                                                            onMouseEnter={() => setHighlightedIndex(sIndex)}
                                                            className={`p-3 text-sm cursor-pointer border-b border-border-color/30 last:border-0 transition-colors ${sIndex === highlightedIndex ? 'bg-accent-blue/20 text-accent-blue' : 'hover:bg-hover-bg text-text-primary'}`}
                                                        >
                                                            {s.name}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                name={`quantity-${index}`}
                                                placeholder="Qty"
                                                value={item.quantity}
                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                className="w-full bg-bg-primary border border-border-color rounded-lg px-3 py-2.5 text-sm focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue transition-all"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                placeholder="Cost"
                                                value={item.cost}
                                                disabled
                                                className="w-full bg-bg-tertiary/50 border border-border-color/50 rounded-lg px-3 py-2.5 text-sm text-text-secondary disabled:opacity-60 cursor-not-allowed"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <div className="w-full bg-bg-primary/50 border border-accent-blue/20 rounded-lg px-3 py-2.5 text-sm text-right text-text-primary font-semibold h-full flex items-center justify-end">
                                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(itemTotal)}
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-lg transition-all hover:scale-110">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button type="button" onClick={handleAddItem} className="flex items-center gap-2 text-sm text-accent-blue font-semibold hover:bg-accent-blue/10 px-4 py-3 rounded-lg transition-all hover:scale-102 border border-accent-blue/30 hover:border-accent-blue/60">
                            <PlusIcon className="w-5 h-5" /> Add Item
                        </button>
                        {error && (
                            <div className="bg-accent-red/10 border border-accent-red/30 rounded-lg p-4 flex items-start gap-3">
                                <svg className="w-5 h-5 text-accent-red flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                                </svg>
                                <p className="text-sm text-accent-red font-medium">{error}</p>
                            </div>
                        )}
                        </div>
                    </div>
                    <div className="p-5 bg-gradient-to-r from-bg-tertiary/50 to-bg-tertiary/30 border-t border-border-color flex justify-between items-center gap-4 rounded-b-2xl flex-shrink-0">
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-text-secondary">Total Cost:</span>
                            <span className="font-bold text-2xl text-accent-blue">
                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalCost)}
                            </span>
                        </div>
                        <div className="flex gap-3">
                            <button type="button" onClick={onClose} className="px-6 py-2.5 rounded-lg font-semibold bg-bg-secondary hover:bg-hover-bg transition-all border border-border-color hover:border-text-secondary/30">Cancel</button>
                            <button type="button" onClick={handleSaveClick} className="px-6 py-2.5 rounded-lg font-semibold bg-accent-blue text-white hover:bg-opacity-90 transition-all shadow-lg shadow-accent-blue/30 hover:shadow-accent-blue/50 hover:scale-105">Save Request</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PurchaseRequestModal;