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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-2xl max-h-[90vh] rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                <form onSubmit={(e) => e.preventDefault()} className="flex flex-col flex-1 min-h-0">
                    <div className="p-6 border-b border-border-color flex justify-between items-center flex-shrink-0">
                        <h2 className="text-xl font-semibold">New Purchase Request</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <div className="p-6 space-y-4 flex-1 overflow-y-auto pb-48">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Department*</label>
                            <div className="flex items-center gap-2 flex-wrap">
                                {departments.map(dept => (
                                    <button
                                        key={dept}
                                        type="button"
                                        onClick={() => setDepartment(dept)}
                                        className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors duration-200 ${
                                            department === dept
                                                ? 'bg-accent-blue text-white'
                                                : 'bg-bg-tertiary text-text-secondary hover:bg-hover-bg'
                                        }`}
                                    >
                                        {dept}
                                    </button>
                                ))}
                            </div>
                        </div>
                        <h3 className="text-md font-semibold text-text-primary pt-2">Items</h3>
                        <div className="space-y-3">
                            <div className="grid grid-cols-12 gap-2 items-center text-xs text-text-secondary">
                                <div className="col-span-4">Item Name</div>
                                <div className="col-span-2">Quantity</div>
                                <div className="col-span-2">Unit Cost (₱)</div>
                                <div className="col-span-3">Total Cost (₱)</div>
                                <div className="col-span-1"></div>
                            </div>
                            {items.map((item, index) => {
                                const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0);
                                return (
                                    <div key={index} className="grid grid-cols-12 gap-2 items-center">
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
                                                className="w-full bg-bg-primary border border-border-color rounded-lg p-2 text-sm focus:ring-accent-blue focus:border-accent-blue"
                                            />
                                            {activeItemIndex === index && suggestions.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 bg-bg-tertiary border-x border-b border-border-color rounded-b-lg z-20 max-h-96 overflow-y-auto mt-1">
                                                    {suggestions.map((s, sIndex) => (
                                                        <div
                                                            key={s.id}
                                                            onMouseDown={() => handleSuggestionClick(index, s)}
                                                            onMouseEnter={() => setHighlightedIndex(sIndex)}
                                                            className={`p-2 text-sm cursor-pointer ${sIndex === highlightedIndex ? 'bg-hover-bg' : 'hover:bg-hover-bg'}`}
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
                                                className="w-full bg-bg-primary border border-border-color rounded-lg p-2 text-sm focus:ring-accent-blue focus:border-accent-blue"
                                            />
                                        </div>
                                        <div className="col-span-2">
                                            <input
                                                type="number"
                                                placeholder="Cost"
                                                value={item.cost}
                                                disabled
                                                className="w-full bg-bg-primary border border-border-color rounded-lg p-2 text-sm text-text-secondary disabled:opacity-75"
                                            />
                                        </div>
                                        <div className="col-span-3">
                                            <div className="w-full bg-bg-primary border border-border-color rounded-lg p-2 text-sm text-right text-text-primary h-full flex items-center justify-end">
                                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(itemTotal)}
                                            </div>
                                        </div>
                                        <div className="col-span-1 flex justify-end">
                                            {items.length > 1 && (
                                                <button type="button" onClick={() => handleRemoveItem(index)} className="p-2 text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-full transition-colors">
                                                    <TrashIcon className="w-5 h-5" />
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <button type="button" onClick={handleAddItem} className="flex items-center gap-2 text-sm text-accent-blue font-medium hover:bg-accent-blue/10 px-3 py-2 rounded-lg transition-colors">
                            <PlusIcon className="w-4 h-4" /> Add Item
                        </button>
                        {error && <p className="text-sm text-accent-red mt-2">{error}</p>}
                    </div>
                    <div className="p-4 bg-bg-tertiary/50 border-t border-border-color flex justify-between items-center gap-4 rounded-b-2xl flex-shrink-0">
                        <div>
                            <span className="text-sm text-text-secondary">Total Cost:</span>
                            <span className="ml-2 font-semibold text-lg">
                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalCost)}
                            </span>
                        </div>
                        <div className="flex gap-4">
                            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-bg-secondary hover:bg-hover-bg transition">Cancel</button>
                            <button type="button" onClick={handleSaveClick} className="px-4 py-2 rounded-lg font-semibold bg-accent-blue text-white hover:bg-opacity-80 transition">Save Request</button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PurchaseRequestModal;