import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { PurchaseOrder, ProductInventoryItem } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon, ChevronDownIcon } from './Icons';

interface PurchaseRequestModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<PurchaseOrder, 'id' | 'date' | 'status'>) => void;
    productInventoryItems: ProductInventoryItem[];
    departments: string[];
    editingOrder?: PurchaseOrder | null;
}

type PurchaseItem = {
    itemId: number | null;
    itemName: string;
    unit: string;
    quantity: string;
    cost: string;
    isCustomItem: boolean; // Track if this is a custom item not in the pricelist
    isSelected?: boolean; // Track if item is selected in template mode
    category?: string; // Category for grouping in template mode
};

const PurchaseRequestModal: React.FC<PurchaseRequestModalProps> = ({ isOpen, onClose, onSave, productInventoryItems, departments, editingOrder }) => {
    const [department, setDepartment] = useState('');
    const [items, setItems] = useState<PurchaseItem[]>([{ itemId: null, itemName: '', unit: '', quantity: '1', cost: '', isCustomItem: false }]);
    const [error, setError] = useState('');
    const [useTemplate, setUseTemplate] = useState(false);
    const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());

    const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<ProductInventoryItem[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const firstItemNameInputRef = useRef<HTMLInputElement>(null);

    const isEditMode = !!editingOrder;
    const filledItemsCount = useMemo(
        () => items.filter(item => item.itemName.trim()).length,
        [items]
    );

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

    const loadTemplateItems = () => {
        const templateItems: PurchaseItem[] = productInventoryItems.map(product => ({
            itemId: product.id,
            itemName: product.name,
            unit: product.unit,
            quantity: '',
            cost: String(product.price),
            isCustomItem: false,
            isSelected: false,
            category: product.category
        }));
        setItems(templateItems);

        // Expand all categories by default
        const categories = new Set(productInventoryItems.map(p => p.category));
        setExpandedCategories(categories);

        setUseTemplate(true);
    };

    const switchToManualMode = () => {
        setItems([{ itemId: null, itemName: '', unit: '', quantity: '1', cost: '', isCustomItem: false }]);
        setUseTemplate(false);
    };

    const handleToggleItem = (index: number) => {
        const newItems = [...items];
        newItems[index].isSelected = !newItems[index].isSelected;
        // Clear quantity when unchecking
        if (!newItems[index].isSelected) {
            newItems[index].quantity = '';
        }
        setItems(newItems);
    };

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => {
            const newSet = new Set(prev);
            if (newSet.has(category)) {
                newSet.delete(category);
            } else {
                newSet.add(category);
            }
            return newSet;
        });
    };

    // Group items by category for template mode
    const itemsByCategory = useMemo(() => {
        if (!useTemplate) return {};

        const grouped: Record<string, PurchaseItem[]> = {};
        items.forEach(item => {
            const category = item.category || 'Uncategorized';
            if (!grouped[category]) {
                grouped[category] = [];
            }
            grouped[category].push(item);
        });
        return grouped;
    }, [items, useTemplate]);

    const handleAddItem = () => {
        setItems([...items, { itemId: null, itemName: '', unit: '', quantity: '1', cost: '', isCustomItem: false }]);
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
            currentItem.isCustomItem = false;
            setHighlightedIndex(-1);
            if (value) {
                setActiveItemIndex(index);
                const filteredSuggestions = productInventoryItems.filter(p => p.name.toLowerCase().includes(value.toLowerCase()));
                setSuggestions(filteredSuggestions);

                // Check if there's an exact match
                const exactMatch = productInventoryItems.find(p => p.name.toLowerCase() === value.toLowerCase());
                if (exactMatch && !currentItem.itemId) {
                    // Don't show dropdown if there's an exact match but it hasn't been selected yet
                    setActiveItemIndex(null);
                }
            } else {
                setActiveItemIndex(null);
                setSuggestions([]);
            }
        }
        newItems[index] = currentItem;
        setItems(newItems);
    };
    
    const handleSuggestionClick = (index: number, suggestion: ProductInventoryItem) => {
        const newItems = [...items];
        const unitCost = String(suggestion.price);

        newItems[index] = {
            ...newItems[index],
            itemId: suggestion.id,
            itemName: suggestion.name,
            unit: suggestion.unit,
            cost: unitCost,
            isCustomItem: false
        };
        setItems(newItems);
        setActiveItemIndex(null);
    };

    const handleAddCustomItem = (index: number) => {
        const newItems = [...items];
        const currentItem = newItems[index];

        // Mark this item as custom (not from pricelist)
        newItems[index] = {
            ...currentItem,
            itemId: null,
            isCustomItem: true,
            cost: currentItem.cost || '0'
        };
        setItems(newItems);
        setActiveItemIndex(null);
        setSuggestions([]);
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

        // Filter items based on mode
        const itemsToProcess = useTemplate
            ? items.filter(item => item.isSelected)
            : items;

        if (itemsToProcess.length === 0 || itemsToProcess.every(i => !i.itemName.trim())) {
            setError(useTemplate
                ? 'Please select at least one item from the template.'
                : 'At least one item must be added to the purchase request.');
            return;
        }

        const formattedItems = itemsToProcess
            .filter(item => item.itemName.trim() && parseFloat(item.quantity) > 0)
            .map(item => ({
                itemId: item.isCustomItem ? undefined : item.itemId!,
                itemName: item.itemName,
                unit: item.unit,
                quantity: parseFloat(item.quantity),
                cost: parseFloat(item.cost) || 0,
            }));

        if (formattedItems.length === 0) {
            setError('Please ensure at least one item has a valid name and quantity.');
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
            if (editingOrder) {
                // Populate form with editing order data
                setDepartment(editingOrder.department);
                setItems(editingOrder.items.map(item => ({
                    itemId: item.itemId !== undefined ? item.itemId : null,
                    itemName: item.itemName,
                    unit: item.unit || '',
                    quantity: String(item.quantity),
                    cost: String(item.cost),
                    isCustomItem: item.itemId === undefined,
                })));
            } else {
                // Reset to empty form
                setItems([{ itemId: null, itemName: '', unit: '', quantity: '1', cost: '', isCustomItem: false }]);
                setDepartment('');
            }
            setError('');
        }
    }, [isOpen, editingOrder]);
    
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-3" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-3xl max-h-[92vh] rounded-xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                <form onSubmit={(e) => e.preventDefault()} className="flex flex-col flex-1 min-h-0">
                    <div className="p-4 border-b border-border-color flex justify-between items-center flex-shrink-0 bg-gradient-to-r from-bg-secondary to-bg-tertiary/30">
                        <div>
                            <h2 className="text-xl font-bold text-text-primary">
                                {isEditMode ? 'Edit Purchase Request' : 'New Purchase Request'}
                            </h2>
                            <p className="text-xs text-text-secondary mt-0.5">
                                {isEditMode ? 'Update the details for your purchase request' : 'Fill in the details for your purchase request'}
                            </p>
                        </div>
                        <button type="button" onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-hover-bg hover:text-text-primary transition-all">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="p-4 space-y-4 flex-1 overflow-y-auto pb-32 bg-gradient-to-b from-bg-secondary via-bg-secondary to-bg-primary/60">
                        <div className="space-y-2">
                            <label className="block text-sm font-semibold text-text-primary flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-accent-blue"></span>
                                Department*
                            </label>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
                                {departments.map(dept => (
                                    <button
                                        key={dept}
                                        type="button"
                                        onClick={() => setDepartment(dept)}
                                        className={`group relative overflow-hidden rounded-lg px-4 py-2.5 text-center font-semibold text-sm transition-all duration-200 ${
                                            department === dept
                                                ? 'bg-gradient-to-br from-accent-blue to-accent-blue/80 text-white shadow-lg shadow-accent-blue/30'
                                                : 'bg-bg-secondary border border-border-color/50 text-text-secondary hover:border-accent-blue/40 hover:text-text-primary hover:shadow-md'
                                        }`}
                                    >
                                        <div className={`absolute inset-0 bg-gradient-to-br from-accent-blue/20 to-transparent opacity-0 transition-opacity duration-200 ${department !== dept ? 'group-hover:opacity-100' : ''}`}></div>
                                        <span className="relative z-10">{dept}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-3">
                            <div className="flex items-center justify-between flex-wrap gap-2">
                                <h3 className="text-base font-bold text-text-primary flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-accent-blue"></span>
                                    Items
                                </h3>
                                <div className="flex items-center gap-2">
                                    <div className="flex items-center gap-2 bg-bg-tertiary/40 rounded-lg border border-border-color/30 p-1">
                                        <button
                                            type="button"
                                            onClick={switchToManualMode}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                                !useTemplate
                                                    ? 'bg-accent-blue text-white shadow-sm'
                                                    : 'text-text-secondary hover:text-text-primary'
                                            }`}
                                        >
                                            Manual
                                        </button>
                                        <button
                                            type="button"
                                            onClick={loadTemplateItems}
                                            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
                                                useTemplate
                                                    ? 'bg-accent-blue text-white shadow-sm'
                                                    : 'text-text-secondary hover:text-text-primary'
                                            }`}
                                        >
                                            Template
                                        </button>
                                    </div>
                                    {!useTemplate && (
                                        <span className="text-xs text-text-secondary font-medium px-2 py-1 bg-bg-tertiary/40 rounded-md border border-border-color/30">
                                            {filledItemsCount} {filledItemsCount === 1 ? 'item' : 'items'}
                                        </span>
                                    )}
                                    {useTemplate && (
                                        <span className="text-xs text-text-secondary font-medium px-2 py-1 bg-bg-tertiary/40 rounded-md border border-border-color/30">
                                            {items.filter(i => i.isSelected).length} selected
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Desktop Table */}
                            <div className="hidden md:block bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                                <table className="w-full">
                                    <thead className="bg-bg-tertiary">
                                        <tr>
                                            {useTemplate && (
                                                <th className="px-4 py-2 text-center text-sm font-semibold text-text-primary w-16">Select</th>
                                            )}
                                            <th className="px-4 py-2 text-left text-sm font-semibold text-text-primary">Item Name</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold text-text-primary">Qty</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold text-text-primary">Unit</th>
                                            <th className="px-4 py-2 text-left text-sm font-semibold text-text-primary">Unit Cost</th>
                                            <th className="px-4 py-2 text-right text-sm font-semibold text-text-primary">Total</th>
                                            {!useTemplate && (
                                                <th className="px-4 py-2 text-center text-sm font-semibold text-text-primary w-20">Actions</th>
                                            )}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border-color">
                                        {useTemplate ? (
                                            // Template mode: render items grouped by category
                                            Object.entries(itemsByCategory).map(([category, categoryItems]) => {
                                                const isExpanded = expandedCategories.has(category);
                                                const selectedInCategory = categoryItems.filter(i => i.isSelected).length;

                                                return (
                                                    <React.Fragment key={category}>
                                                        {/* Category Header Row */}
                                                        <tr className="bg-bg-tertiary/50">
                                                            <td colSpan={6} className="px-4 py-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => toggleCategory(category)}
                                                                    className="flex items-center gap-2 w-full text-left hover:text-accent-blue transition-colors"
                                                                >
                                                                    <ChevronDownIcon
                                                                        className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                                                    />
                                                                    <span className="font-semibold text-sm text-text-primary">{category}</span>
                                                                    <span className="text-xs text-text-secondary">
                                                                        ({selectedInCategory}/{categoryItems.length} selected)
                                                                    </span>
                                                                </button>
                                                            </td>
                                                        </tr>
                                                        {/* Category Items */}
                                                        {isExpanded && categoryItems.map((item) => {
                                                            const index = items.indexOf(item);
                                                            const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0);
                                                            const unitDisplay = item.unit || '—';
                                                            const unitCostValue = parseFloat(item.cost) || 0;

                                                            return (
                                                                <tr key={index} className={`transition-colors ${item.isSelected ? 'bg-accent-blue/10' : 'hover:bg-bg-tertiary/30'}`}>
                                                                    {/* Checkbox */}
                                                                    <td className="px-4 py-1.5 text-center">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.isSelected || false}
                                                                            onChange={() => handleToggleItem(index)}
                                                                            className="w-4 h-4 rounded border-border-color text-accent-blue focus:ring-2 focus:ring-accent-blue focus:ring-offset-0 cursor-pointer"
                                                                        />
                                                                    </td>
                                                                    {/* Item Name */}
                                                                    <td className="px-4 py-1.5">
                                                                        <span className="text-sm text-text-primary">{item.itemName}</span>
                                                                    </td>
                                                                    {/* Quantity */}
                                                                    <td className="px-4 py-1.5">
                                                                        <input
                                                                            type="number"
                                                                            name={`quantity-${index}`}
                                                                            placeholder=""
                                                                            value={item.quantity}
                                                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                                            disabled={!item.isSelected}
                                                                            className={`w-20 bg-bg-primary border border-border-color rounded-xl px-3 py-1 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue ${
                                                                                !item.isSelected ? 'opacity-50 cursor-not-allowed' : ''
                                                                            }`}
                                                                        />
                                                                    </td>
                                                                    {/* Unit */}
                                                                    <td className="px-4 py-1.5 text-sm text-text-secondary">
                                                                        {unitDisplay}
                                                                    </td>
                                                                    {/* Unit Cost */}
                                                                    <td className="px-4 py-1.5 text-sm text-text-secondary">
                                                                        {unitCostValue > 0 ? `₱${unitCostValue.toFixed(2)}` : '—'}
                                                                    </td>
                                                                    {/* Total */}
                                                                    <td className="px-4 py-1.5 text-right text-sm font-semibold text-text-primary">
                                                                        {itemTotal > 0 ? `₱${itemTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                    </React.Fragment>
                                                );
                                            })
                                        ) : (
                                            // Manual mode: render items as before
                                            items.map((item, index) => {
                                            const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0);
                                            const unitDisplay = item.unit || '—';
                                            const unitCostValue = parseFloat(item.cost) || 0;
                                            return (
                                                <tr key={index} className="transition-colors hover:bg-bg-tertiary/30">
                                                    {/* Item Name */}
                                                    <td className="px-4 py-2 relative">
                                                        <>
                                                            <input
                                                                ref={index === 0 ? firstItemNameInputRef : null}
                                                                type="text"
                                                                name={`itemName-${index}`}
                                                                placeholder="Search or add item..."
                                                                value={item.itemName}
                                                                onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                                                                onFocus={() => {
                                                                    if (item.itemName) {
                                                                        setActiveItemIndex(index);
                                                                    }
                                                                }}
                                                                onBlur={() => setTimeout(() => setActiveItemIndex(null), 150)}
                                                                onKeyDown={(e) => handleKeyDown(e, index)}
                                                                disabled={item.isCustomItem}
                                                                autoComplete="off"
                                                                className={`w-full bg-bg-primary border rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue transition-all ${
                                                                    item.isCustomItem
                                                                        ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
                                                                        : 'border-border-color'
                                                                }`}
                                                            />
                                                            {activeItemIndex === index && item.itemName && suggestions.length > 0 && !item.isCustomItem && (
                                                            <div className="absolute top-full left-4 right-4 bg-bg-primary border border-border-color rounded-xl z-20 max-h-96 overflow-y-auto mt-1 shadow-xl">
                                                                {suggestions.map((s, sIndex) => (
                                                                    <div
                                                                        key={s.id}
                                                                        onMouseDown={() => handleSuggestionClick(index, s)}
                                                                        onMouseEnter={() => setHighlightedIndex(sIndex)}
                                                                        className={`p-3 text-sm cursor-pointer border-b border-border-color/30 last:border-0 transition-colors ${sIndex === highlightedIndex ? 'bg-accent-blue/20 text-accent-blue' : 'hover:bg-hover-bg text-text-primary'}`}
                                                                    >
                                                                        <div className="font-medium">{s.name}</div>
                                                                        <div className="text-xs text-text-secondary mt-0.5">{s.unit} • ₱{s.price}</div>
                                                                    </div>
                                                                ))}
                                                            </div>
                                                        )}
                                                        {activeItemIndex === index && item.itemName && suggestions.length === 0 && !item.isCustomItem && !item.itemId && (
                                                            <div className="absolute top-full left-4 right-4 bg-bg-primary border border-border-color rounded-xl z-20 mt-1 shadow-xl">
                                                                <div
                                                                    onMouseDown={() => handleAddCustomItem(index)}
                                                                    className="p-3 text-sm cursor-pointer bg-accent-green/10 hover:bg-accent-green/20 transition-colors text-accent-green font-medium flex items-center gap-2"
                                                                >
                                                                    <PlusIcon className="w-4 h-4 flex-shrink-0" />
                                                                    <span>Add "{item.itemName}" as custom item</span>
                                                                </div>
                                                            </div>
                                                            )}
                                                        </>
                                                    </td>

                                                    {/* Quantity */}
                                                    <td className="px-4 py-2">
                                                        <input
                                                            type="number"
                                                            name={`quantity-${index}`}
                                                            placeholder="0"
                                                            value={item.quantity}
                                                            onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                            className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-1.5 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                                        />
                                                    </td>

                                                    {/* Unit */}
                                                    <td className="px-4 py-2 text-sm text-text-secondary">
                                                        {unitDisplay}
                                                    </td>

                                                    {/* Unit Cost */}
                                                    <td className="px-4 py-2 text-sm text-text-secondary">
                                                        {unitCostValue > 0 ? `₱${unitCostValue.toFixed(2)}` : '—'}
                                                    </td>

                                                    {/* Total */}
                                                    <td className="px-4 py-2 text-right text-sm font-semibold text-text-primary">
                                                        {itemTotal > 0 ? `₱${itemTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                    </td>

                                                    {/* Actions */}
                                                    <td className="px-4 py-2">
                                                        {items.length > 1 && (
                                                            <div className="flex justify-center">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveItem(index)}
                                                                    className="p-2 text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
                                                                    aria-label="Remove item"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card View */}
                            <div className="md:hidden space-y-3">
                                {useTemplate ? (
                                    // Template mode: render items grouped by category
                                    Object.entries(itemsByCategory).map(([category, categoryItems]) => {
                                        const isExpanded = expandedCategories.has(category);
                                        const selectedInCategory = categoryItems.filter(i => i.isSelected).length;

                                        return (
                                            <div key={category} className="space-y-1.5">
                                                {/* Category Header */}
                                                <button
                                                    type="button"
                                                    onClick={() => toggleCategory(category)}
                                                    className="w-full bg-bg-tertiary/50 rounded-lg px-3 py-1.5 flex items-center gap-2 hover:bg-bg-tertiary transition-colors"
                                                >
                                                    <ChevronDownIcon
                                                        className={`w-3.5 h-3.5 transition-transform ${isExpanded ? 'rotate-0' : '-rotate-90'}`}
                                                    />
                                                    <span className="font-semibold text-xs text-text-primary">{category}</span>
                                                    <span className="text-[10px] text-text-secondary ml-auto">
                                                        {selectedInCategory}/{categoryItems.length}
                                                    </span>
                                                </button>

                                                {/* Category Items */}
                                                {isExpanded && (
                                                    <div className="space-y-1.5">
                                                        {categoryItems.map((item) => {
                                                            const index = items.indexOf(item);
                                                            const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0);
                                                            const unitDisplay = item.unit || '—';
                                                            const unitCostValue = parseFloat(item.cost) || 0;

                                                            return (
                                                                <div key={index} className={`bg-bg-secondary rounded-lg border p-2 ${item.isSelected ? 'border-accent-blue bg-accent-blue/5' : 'border-border-color'}`}>
                                                                    {/* Single Row: Checkbox, Item Info, Quantity Controls, and Total */}
                                                                    <div className="flex items-center gap-2">
                                                                        <input
                                                                            type="checkbox"
                                                                            checked={item.isSelected || false}
                                                                            onChange={() => handleToggleItem(index)}
                                                                            className="w-4 h-4 rounded border-border-color text-accent-blue focus:ring-1 focus:ring-accent-blue focus:ring-offset-0 cursor-pointer flex-shrink-0"
                                                                        />
                                                                        <div className="flex-1 min-w-0">
                                                                            <div className="text-xs font-medium text-text-primary truncate">{item.itemName}</div>
                                                                            <div className="text-[10px] text-text-secondary">{unitDisplay} • ₱{unitCostValue.toFixed(2)}</div>
                                                                        </div>
                                                                        {/* Minimalist Quantity Controls */}
                                                                        <div className="flex items-center gap-1 flex-shrink-0">
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const currentQty = parseFloat(item.quantity) || 0;
                                                                                    if (currentQty > 0) {
                                                                                        handleItemChange(index, 'quantity', String(currentQty - 1));
                                                                                    }
                                                                                }}
                                                                                disabled={!item.isSelected}
                                                                                className={`w-6 h-6 flex items-center justify-center text-text-secondary transition-colors ${
                                                                                    !item.isSelected ? 'opacity-30 cursor-not-allowed' : 'hover:text-text-primary active:text-accent-blue'
                                                                                }`}
                                                                            >
                                                                                <span className="text-base">−</span>
                                                                            </button>
                                                                            <input
                                                                                type="number"
                                                                                name={`quantity-${index}`}
                                                                                placeholder=""
                                                                                value={item.quantity}
                                                                                onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                                                disabled={!item.isSelected}
                                                                                className={`w-10 h-6 text-center text-xs font-medium text-text-primary bg-transparent border-0 focus:outline-none ${
                                                                                    !item.isSelected ? 'opacity-30 cursor-not-allowed' : ''
                                                                                }`}
                                                                            />
                                                                            <button
                                                                                type="button"
                                                                                onClick={() => {
                                                                                    const currentQty = parseFloat(item.quantity) || 0;
                                                                                    handleItemChange(index, 'quantity', String(currentQty + 1));
                                                                                }}
                                                                                disabled={!item.isSelected}
                                                                                className={`w-6 h-6 flex items-center justify-center text-text-secondary transition-colors ${
                                                                                    !item.isSelected ? 'opacity-30 cursor-not-allowed' : 'hover:text-text-primary active:text-accent-blue'
                                                                                }`}
                                                                            >
                                                                                <span className="text-base">+</span>
                                                                            </button>
                                                                        </div>
                                                                        {/* Total Amount */}
                                                                        <div className="text-right flex-shrink-0 min-w-[60px]">
                                                                            <span className="text-xs font-semibold text-text-primary">
                                                                                {itemTotal > 0 ? `₱${itemTotal.toLocaleString('en-PH', { minimumFractionDigits: 2 })}` : '—'}
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })
                                ) : (
                                    // Manual mode: render items as before
                                    items.map((item, index) => {
                                    const itemTotal = (parseFloat(item.quantity) || 0) * (parseFloat(item.cost) || 0);
                                    const unitDisplay = item.unit || '—';
                                    const unitCostValue = parseFloat(item.cost) || 0;
                                    return (
                                        <div key={index} className="bg-bg-secondary rounded-xl border border-border-color p-4 space-y-3">
                                            {/* Item Name */}
                                            <div className="relative">
                                                <label className="block text-xs font-semibold text-text-secondary mb-1.5">Item Name</label>
                                                <input
                                                    ref={index === 0 ? firstItemNameInputRef : null}
                                                    type="text"
                                                    name={`itemName-${index}`}
                                                    placeholder="Search or add item..."
                                                    value={item.itemName}
                                                    onChange={(e) => handleItemChange(index, 'itemName', e.target.value)}
                                                    onFocus={() => {
                                                        if (item.itemName) {
                                                            setActiveItemIndex(index);
                                                        }
                                                    }}
                                                    onBlur={() => setTimeout(() => setActiveItemIndex(null), 150)}
                                                    onKeyDown={(e) => handleKeyDown(e, index)}
                                                    disabled={item.isCustomItem}
                                                    autoComplete="off"
                                                    className={`w-full bg-bg-primary border rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue ${
                                                        item.isCustomItem
                                                            ? 'bg-accent-green/10 border-accent-green/30 text-accent-green'
                                                            : 'border-border-color'
                                                    }`}
                                                />
                                                {activeItemIndex === index && item.itemName && suggestions.length > 0 && !item.isCustomItem && (
                                                    <div className="absolute top-full left-0 right-0 bg-bg-primary border border-border-color rounded-xl z-20 max-h-96 overflow-y-auto mt-1 shadow-xl">
                                                        {suggestions.map((s, sIndex) => (
                                                            <div
                                                                key={s.id}
                                                                onMouseDown={() => handleSuggestionClick(index, s)}
                                                                onMouseEnter={() => setHighlightedIndex(sIndex)}
                                                                className={`p-3 text-sm cursor-pointer border-b border-border-color/30 last:border-0 ${sIndex === highlightedIndex ? 'bg-accent-blue/20 text-accent-blue' : 'hover:bg-hover-bg text-text-primary'}`}
                                                            >
                                                                <div className="font-medium">{s.name}</div>
                                                                <div className="text-xs text-text-secondary mt-0.5">{s.unit} • ₱{s.price}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                {activeItemIndex === index && item.itemName && suggestions.length === 0 && !item.isCustomItem && !item.itemId && (
                                                    <div className="absolute top-full left-0 right-0 bg-bg-primary border border-border-color rounded-xl z-20 mt-1 shadow-xl">
                                                        <div
                                                            onMouseDown={() => handleAddCustomItem(index)}
                                                            className="p-3 text-sm cursor-pointer bg-accent-green/10 hover:bg-accent-green/20 text-accent-green font-medium flex items-center gap-2"
                                                        >
                                                            <PlusIcon className="w-4 h-4 flex-shrink-0" />
                                                            <span>Add "{item.itemName}" as custom item</span>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>

                                            <div className="grid grid-cols-2 gap-3">
                                                {/* Quantity */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Qty</label>
                                                    <input
                                                        type="number"
                                                        name={`quantity-${index}`}
                                                        placeholder="0"
                                                        value={item.quantity}
                                                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                                                        className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                                    />
                                                </div>

                                                {/* Unit */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Unit</label>
                                                    <div className="flex items-center h-[38px] px-3 text-sm text-text-secondary bg-bg-tertiary/30 rounded-xl border border-border-color">
                                                        {unitDisplay}
                                                    </div>
                                                </div>

                                                {/* Unit Cost */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Unit Cost</label>
                                                    <div className="flex items-center h-[38px] px-3 text-sm text-text-secondary bg-bg-tertiary/30 rounded-xl border border-border-color">
                                                        {unitCostValue > 0 ? `₱${unitCostValue.toFixed(2)}` : '—'}
                                                    </div>
                                                </div>

                                                {/* Total */}
                                                <div>
                                                    <label className="block text-xs font-semibold text-text-secondary mb-1.5">Total</label>
                                                    <div className="flex items-center h-[38px] px-3 text-sm font-semibold text-text-primary bg-bg-tertiary/30 rounded-xl border border-border-color">
                                                        {itemTotal > 0 ? `₱${itemTotal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Delete Button */}
                                            {items.length > 1 && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveItem(index)}
                                                    className="w-full flex items-center justify-center gap-2 px-3 py-2 text-accent-red hover:bg-accent-red/10 rounded-xl border border-accent-red/20 hover:border-accent-red/40 transition-all text-sm font-medium"
                                                >
                                                    <TrashIcon className="w-4 h-4" />
                                                    Remove Item
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                                )}
                            </div>
                            {!useTemplate && (
                                <button
                                    type="button"
                                    onClick={handleAddItem}
                                    className="flex items-center gap-2 text-sm text-accent-blue font-semibold hover:bg-accent-blue/10 px-4 py-2.5 rounded-md transition-all border border-accent-blue/30 hover:border-accent-blue/60 w-full sm:w-auto"
                                >
                                    <PlusIcon className="w-5 h-5" /> Add Item
                                </button>
                            )}
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
                    <div className="p-3 bg-gradient-to-r from-bg-tertiary/50 to-bg-tertiary/30 border-t border-border-color flex justify-between items-center gap-3 rounded-b-xl flex-shrink-0">
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium text-text-secondary">Total:</span>
                            <span className="font-bold text-xl text-accent-blue">
                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(totalCost)}
                            </span>
                        </div>
                        <div className="flex gap-2">
                            <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg font-semibold text-sm bg-bg-secondary hover:bg-hover-bg transition-all border border-border-color hover:border-text-secondary/30">Cancel</button>
                            <button type="button" onClick={handleSaveClick} className="px-4 py-2 rounded-lg font-semibold text-sm bg-accent-blue text-white hover:bg-opacity-90 transition-all shadow-lg shadow-accent-blue/30 hover:shadow-accent-blue/50">
                                {isEditMode ? 'Update Request' : 'Save Request'}
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default PurchaseRequestModal;



