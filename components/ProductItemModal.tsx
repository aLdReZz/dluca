
import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { ProductInventoryItem } from '../types';
import { XMarkIcon } from './Icons';

interface ProductItemModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (product: Omit<ProductInventoryItem, 'id'>) => void;
    categories: string[];
    brands: string[];
    units: string[];
    suppliers: string[];
}

interface ComboboxProps {
    label: string;
    name: string;
    value: string;
    placeholder: string;
    suggestions: string[];
    showSuggestions: boolean;
    highlightedIndex: number;
    error?: string;
    isRequired?: boolean;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onFocus: () => void;
    onBlur: () => void;
    onKeyDown: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    onSuggestionClick: (item: string) => void;
    onMouseEnterSuggestion: (index: number) => void;
}

const Combobox: React.FC<ComboboxProps> = ({
    label, name, value, placeholder, suggestions, showSuggestions,
    highlightedIndex, error, isRequired,
    onChange, onFocus, onBlur, onKeyDown, onSuggestionClick, onMouseEnterSuggestion
}) => (
    <div className="relative">
        <label className="block text-sm font-medium text-text-secondary mb-1">{label}{isRequired && '*'}</label>
        <input
            type="text"
            name={name}
            value={value}
            onChange={onChange}
            onFocus={onFocus}
            onBlur={onBlur}
            onKeyDown={onKeyDown}
            autoComplete="off"
            placeholder={placeholder}
            className={`w-full bg-bg-primary border rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue ${error ? 'border-accent-red' : 'border-border-color'}`}
        />
        {error && <p className="text-xs text-accent-red mt-1">{error}</p>}
        {showSuggestions && suggestions.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-bg-tertiary border-x border-b border-border-color rounded-b-lg z-20 max-h-40 overflow-y-auto">
                {suggestions.map((item, index) => (
                    <div
                        key={item}
                        onMouseDown={() => onSuggestionClick(item)}
                        onMouseEnter={() => onMouseEnterSuggestion(index)}
                        className={`p-2 text-sm cursor-pointer ${index === highlightedIndex ? 'bg-hover-bg' : 'hover:bg-hover-bg'} ${item.startsWith('+ Add') ? 'text-accent-blue' : ''}`}
                    >
                        {item}
                    </div>
                ))}
            </div>
        )}
    </div>
);


const ProductItemModal: React.FC<ProductItemModalProps> = ({ isOpen, onClose, onSave, categories, brands, units, suppliers }) => {
    const initialState = {
        category: '', name: '', brand: '', unit: '', price: 0, supplier: '',
    };
    const [formData, setFormData] = useState(initialState);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const nameInputRef = useRef<HTMLInputElement>(null);

    // State for suggestions visibility
    const [showCategorySuggestions, setShowCategorySuggestions] = useState(false);
    const [showBrandSuggestions, setShowBrandSuggestions] = useState(false);
    const [showSupplierSuggestions, setShowSupplierSuggestions] = useState(false);
    const [showUnitSuggestions, setShowUnitSuggestions] = useState(false);

    // State for keyboard navigation
    const [highlightedCategoryIndex, setHighlightedCategoryIndex] = useState(-1);
    const [highlightedBrandIndex, setHighlightedBrandIndex] = useState(-1);
    const [highlightedSupplierIndex, setHighlightedSupplierIndex] = useState(-1);
    const [highlightedUnitIndex, setHighlightedUnitIndex] = useState(-1);

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            // Focus the first input field when the modal opens
            setTimeout(() => {
                nameInputRef.current?.focus();
            }, 100);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setFormData(initialState);
            setErrors({});
        }
    }, [isOpen]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: name === 'price' ? parseFloat(value) || 0 : value,
        }));
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: '' }));
        }
    };

    const createBlurHandler = (setter: React.Dispatch<React.SetStateAction<boolean>>) => () => {
        setTimeout(() => setter(false), 150);
    };

    // Generic handler for input changes in comboboxes
    const handleComboboxChange = (
        e: React.ChangeEvent<HTMLInputElement>,
        showSetter: React.Dispatch<React.SetStateAction<boolean>>,
        highlightSetter: React.Dispatch<React.SetStateAction<number>>
    ) => {
        handleChange(e);
        showSetter(true);
        highlightSetter(-1);
    };

    // Generic handler for suggestion clicks
    const handleSuggestionClick = (
        field: keyof typeof formData,
        value: string,
        showSetter: React.Dispatch<React.SetStateAction<boolean>>
    ) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        showSetter(false);
    };
    
    // Generic suggestion filtering and display logic
    const useSuggestions = (term: string, list: string[], addText: string) => {
        const filtered = useMemo(() => {
            if (!term) return list;
            return list.filter(item => item.toLowerCase().includes(term.toLowerCase()));
        }, [term, list]);

        const display = useMemo(() => {
            if (filtered.length > 0) return filtered;
            if (term.trim() && !list.some(i => i.toLowerCase() === term.trim().toLowerCase())) {
                return [`+ Add "${term.trim()}" as a new ${addText}`];
            }
            return [];
        }, [filtered, term, list, addText]);

        return display;
    };

    const displayCategorySuggestions = useSuggestions(formData.category, categories, 'category');
    const displayBrandSuggestions = useSuggestions(formData.brand, brands, 'brand');
    const displaySupplierSuggestions = useSuggestions(formData.supplier, suppliers, 'supplier');
    const displayUnitSuggestions = useSuggestions(formData.unit, units, 'unit');

    const handleKeyDown = (
        e: React.KeyboardEvent<HTMLInputElement>,
        suggestions: string[],
        highlightedIndex: number,
        setHighlightedIndex: React.Dispatch<React.SetStateAction<number>>,
        handleSuggestionClickFn: (item: string) => void,
        currentValue: string,
        nextFieldName: string
    ) => {
        if (suggestions.length === 0 && e.key !== 'Tab') return;

        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((highlightedIndex + 1) % suggestions.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((highlightedIndex - 1 + suggestions.length) % suggestions.length);
        } else if (e.key === 'Enter' || e.key === 'Tab') {
            if (highlightedIndex >= 0 && suggestions.length > 0) {
                e.preventDefault();
                const selected = suggestions[highlightedIndex];
                const valueToSet = selected.startsWith('+ Add') ? currentValue.trim() : selected;
                handleSuggestionClickFn(valueToSet);

                const form = e.currentTarget.form;
                if (form) {
                    const nextInput = form.elements.namedItem(nextFieldName) as HTMLInputElement;
                    nextInput?.focus();
                }
            } else if (e.key === 'Enter' && suggestions.length === 1 && suggestions[0].startsWith('+ Add')) {
                e.preventDefault();
                const valueToSet = currentValue.trim();
                handleSuggestionClickFn(valueToSet);
                const form = e.currentTarget.form;
                if (form) {
                    const nextInput = form.elements.namedItem(nextFieldName) as HTMLInputElement;
                    nextInput?.focus();
                }
            }
        }
    };

    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!formData.name.trim()) newErrors.name = "Item name is required";
        if (!formData.category.trim()) newErrors.category = "Category is required";
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (validate()) onSave(formData);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-2xl rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border-color flex justify-between items-center">
                    <h2 className="text-xl font-semibold">Add New Product Item</h2>
                    <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <form noValidate>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Item Name*</label>
                                <input ref={nameInputRef} type="text" name="name" value={formData.name} onChange={handleChange} className={`w-full bg-bg-primary border rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue ${errors.name ? 'border-accent-red' : 'border-border-color'}`} />
                                {errors.name && <p className="text-xs text-accent-red mt-1">{errors.name}</p>}
                            </div>
                            <Combobox
                                label="Category" name="category" value={formData.category} placeholder="Type or select a category"
                                suggestions={displayCategorySuggestions} showSuggestions={showCategorySuggestions}
                                highlightedIndex={highlightedCategoryIndex} 
                                error={errors.category} isRequired
                                onChange={(e) => handleComboboxChange(e, setShowCategorySuggestions, setHighlightedCategoryIndex)}
                                onFocus={() => setShowCategorySuggestions(true)}
                                onBlur={createBlurHandler(setShowCategorySuggestions)}
                                onKeyDown={(e) => handleKeyDown(e, displayCategorySuggestions, highlightedCategoryIndex, setHighlightedCategoryIndex, (item) => handleSuggestionClick('category', item, setShowCategorySuggestions), formData.category, 'brand')}
                                onSuggestionClick={(item) => handleSuggestionClick('category', item.startsWith('+ Add') ? formData.category.trim() : item, setShowCategorySuggestions)}
                                onMouseEnterSuggestion={setHighlightedCategoryIndex}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                             <Combobox
                                label="Brand" name="brand" value={formData.brand} placeholder="Type or select a brand"
                                suggestions={displayBrandSuggestions} showSuggestions={showBrandSuggestions} 
                                highlightedIndex={highlightedBrandIndex}
                                
                                onChange={(e) => handleComboboxChange(e, setShowBrandSuggestions, setHighlightedBrandIndex)}
                                onFocus={() => setShowBrandSuggestions(true)}
                                onBlur={createBlurHandler(setShowBrandSuggestions)}
                                onKeyDown={(e) => handleKeyDown(e, displayBrandSuggestions, highlightedBrandIndex, setHighlightedBrandIndex, (item) => handleSuggestionClick('brand', item, setShowBrandSuggestions), formData.brand, 'supplier')}
                                onSuggestionClick={(item) => handleSuggestionClick('brand', item.startsWith('+ Add') ? formData.brand.trim() : item, setShowBrandSuggestions)}
                                onMouseEnterSuggestion={setHighlightedBrandIndex}
                            />
                            <Combobox
                                label="Supplier" name="supplier" value={formData.supplier} placeholder="Type or select a supplier"
                                suggestions={displaySupplierSuggestions} showSuggestions={showSupplierSuggestions}
                                highlightedIndex={highlightedSupplierIndex}
                                
                                onChange={(e) => handleComboboxChange(e, setShowSupplierSuggestions, setHighlightedSupplierIndex)}
                                onFocus={() => setShowSupplierSuggestions(true)}
                                onBlur={createBlurHandler(setShowSupplierSuggestions)}
                                onKeyDown={(e) => handleKeyDown(e, displaySupplierSuggestions, highlightedSupplierIndex, setHighlightedSupplierIndex, (item) => handleSuggestionClick('supplier', item, setShowSupplierSuggestions), formData.supplier, 'unit')}
                                onSuggestionClick={(item) => handleSuggestionClick('supplier', item.startsWith('+ Add') ? formData.supplier.trim() : item, setShowSupplierSuggestions)}
                                onMouseEnterSuggestion={setHighlightedSupplierIndex}
                            />
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <Combobox
                                label="Unit" name="unit" value={formData.unit} placeholder="Type or select a unit"
                                suggestions={displayUnitSuggestions} showSuggestions={showUnitSuggestions}
                                highlightedIndex={highlightedUnitIndex} 
                                
                                onChange={(e) => handleComboboxChange(e, setShowUnitSuggestions, setHighlightedUnitIndex)}
                                onFocus={() => setShowUnitSuggestions(true)}
                                onBlur={createBlurHandler(setShowUnitSuggestions)}
                                onKeyDown={(e) => handleKeyDown(e, displayUnitSuggestions, highlightedUnitIndex, setHighlightedUnitIndex, (item) => handleSuggestionClick('unit', item, setShowUnitSuggestions), formData.unit, 'price')}
                                onSuggestionClick={(item) => handleSuggestionClick('unit', item.startsWith('+ Add') ? formData.unit.trim() : item, setShowUnitSuggestions)}
                                onMouseEnterSuggestion={setHighlightedUnitIndex}
                            />
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Price (₱)</label>
                                <input type="number" name="price" value={String(formData.price)} onChange={handleChange} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                            </div>
                        </div>
                    </form>
                </div>
                <div className="p-4 bg-bg-tertiary/50 border-t border-border-color flex justify-end items-center gap-4 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-bg-secondary hover:bg-hover-bg transition">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg font-semibold bg-accent-blue text-white hover:bg-opacity-80 transition">Save Item</button>
                </div>
            </div>
        </div>
    );
};

export default ProductItemModal;
