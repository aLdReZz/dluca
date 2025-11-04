import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { RecipeCosting, RecipeIngredient, ProductInventoryItem } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon } from './Icons';

interface RecipeCostingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<RecipeCosting, 'id'> & { id?: number }) => void;
    recipeToEdit: RecipeCosting | null;
    products: ProductInventoryItem[];
}

const ALLOCATIONS = [
    { name: 'Overhead/Utilities', percentage: 20 },
    { name: 'Labor', percentage: 20 },
    { name: 'VAT', percentage: 12 },
    { name: 'Breakages', percentage: 15 },
    { name: 'Others', percentage: 15 },
    { name: 'S.C. Disc', percentage: 20 },
];
const TOTAL_ALLOCATION_PERCENTAGE = ALLOCATIONS.reduce((sum, item) => sum + item.percentage, 0);
const ALLOCATION_MULTIPLIER = 1 + TOTAL_ALLOCATION_PERCENTAGE / 100;


const RecipeCostingModal: React.FC<RecipeCostingModalProps> = ({ isOpen, onClose, onSave, recipeToEdit, products }) => {
    const [name, setName] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [ingredients, setIngredients] = useState<RecipeIngredient[]>([]);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});

    const [activeIngredientIndex, setActiveIngredientIndex] = useState<number | null>(null);
    const [suggestions, setSuggestions] = useState<ProductInventoryItem[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    
    const nameInputRef = useRef<HTMLInputElement>(null);
    
    const formatPeso = (amount: number) => `₱${amount.toFixed(2)}`;

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            if (recipeToEdit) {
                setName(recipeToEdit.name);
                setSellingPrice(String(recipeToEdit.sellingPrice));
                setIngredients(recipeToEdit.ingredients);
            } else {
                setName('');
                setSellingPrice('');
                setIngredients([]);
            }
            setErrors({});
            setTimeout(() => nameInputRef.current?.focus(), 100);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, recipeToEdit]);

    const totalCost = useMemo(() => {
        return ingredients.reduce((sum, ing) => sum + ing.cost, 0);
    }, [ingredients]);

    const totalCostWithAllocation = useMemo(() => {
        return totalCost * ALLOCATION_MULTIPLIER;
    }, [totalCost]);

    const foodCostPercentage = useMemo(() => {
        const price = parseFloat(sellingPrice);
        if (!price || !totalCost) return 0;
        return (totalCost / price) * 100;
    }, [totalCost, sellingPrice]);

    const finalCostPercentage = useMemo(() => {
        const price = parseFloat(sellingPrice);
        if (!price || !totalCostWithAllocation) return 0;
        return (totalCostWithAllocation / price) * 100;
    }, [totalCostWithAllocation, sellingPrice]);


    const handleAddIngredient = () => {
        setIngredients([...ingredients, { itemId: 0, name: '', quantity: 1, unit: '', cost: 0 }]);
    };

    const handleRemoveIngredient = (index: number) => {
        setIngredients(ingredients.filter((_, i) => i !== index));
    };

    const handleIngredientChange = (index: number, field: keyof RecipeIngredient, value: any) => {
        const newIngredients = [...ingredients];
        const currentIngredient = { ...newIngredients[index] };

        if (field === 'name') {
            currentIngredient.name = value;
            currentIngredient.itemId = 0; // Reset ID on name change
            setActiveIngredientIndex(index);
            setHighlightedIndex(-1);
            if (value) {
                setSuggestions(products.filter(p => p.name.toLowerCase().includes(value.toLowerCase())));
            } else {
                setSuggestions([]);
            }
        } else if (field === 'quantity') {
            const product = products.find(p => p.id === currentIngredient.itemId);
            currentIngredient.quantity = parseFloat(value) || 0;
            if (product) {
                currentIngredient.cost = currentIngredient.quantity * product.price;
            }
        }
        
        newIngredients[index] = currentIngredient;
        setIngredients(newIngredients);
    };
    
    const handleSuggestionClick = (index: number, suggestion: ProductInventoryItem) => {
        const newIngredients = [...ingredients];
        const quantity = newIngredients[index].quantity || 1;
        newIngredients[index] = {
            itemId: suggestion.id,
            name: suggestion.name,
            quantity: quantity,
            unit: suggestion.unit,
            cost: quantity * suggestion.price,
        };
        setIngredients(newIngredients);
        setActiveIngredientIndex(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
        if (!suggestions.length && e.key !== 'Tab') return;

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
            }
        }
    };
    
    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!name.trim()) newErrors.name = "Recipe name is required";
        if (!sellingPrice || parseFloat(sellingPrice) <= 0) newErrors.sellingPrice = "Selling price must be greater than 0";
        if (ingredients.length === 0 || ingredients.some(i => i.itemId === 0)) newErrors.ingredients = "Please add at least one valid ingredient";
        
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSave = () => {
        if (!validate()) return;
        
        const recipeData = {
            name,
            sellingPrice: parseFloat(sellingPrice),
            ingredients,
            totalCost,
            totalCostWithAllocation,
            foodCostPercentage,
            finalCostPercentage,
        };

        onSave({ id: recipeToEdit?.id, ...recipeData });
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                <form onSubmit={(e) => e.preventDefault()} className="flex flex-col flex-1 min-h-0">
                    <div className="p-6 border-b border-border-color flex justify-between items-center flex-shrink-0">
                        <h2 className="text-xl font-semibold">{recipeToEdit ? 'Edit Recipe Costing' : 'New Recipe Costing'}</h2>
                        <button type="button" onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Recipe Name*</label>
                                <input ref={nameInputRef} type="text" value={name} onChange={e => setName(e.target.value)} className={`w-full bg-bg-primary border rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue ${errors.name ? 'border-accent-red' : 'border-border-color'}`} />
                                {errors.name && <p className="text-xs text-accent-red mt-1">{errors.name}</p>}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Selling Price (₱)*</label>
                                <input type="number" value={sellingPrice} onChange={e => setSellingPrice(e.target.value)} className={`w-full bg-bg-primary border rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue ${errors.sellingPrice ? 'border-accent-red' : 'border-border-color'}`} />
                                {errors.sellingPrice && <p className="text-xs text-accent-red mt-1">{errors.sellingPrice}</p>}
                            </div>
                        </div>
                        
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                            <div className="lg:col-span-2">
                                <h3 className="text-md font-semibold text-text-primary mb-2">Ingredients</h3>
                                <div className="space-y-3">
                                    {ingredients.map((ing, index) => (
                                        <div key={index} className="grid grid-cols-12 gap-2 items-center">
                                            <div className="col-span-1 flex justify-center">
                                                <button type="button" onClick={() => handleRemoveIngredient(index)} className="p-2 text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-full transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                            </div>
                                            <div className="col-span-5 relative">
                                                <input type="text" placeholder="Search ingredient..." value={ing.name} onChange={e => handleIngredientChange(index, 'name', e.target.value)} onFocus={() => setActiveIngredientIndex(index)} onBlur={() => setTimeout(() => setActiveIngredientIndex(null), 150)} onKeyDown={e => handleKeyDown(e, index)} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 text-sm focus:ring-accent-blue focus:border-accent-blue"/>
                                                {activeIngredientIndex === index && suggestions.length > 0 && (
                                                    <div className="absolute top-full left-0 right-0 bg-bg-tertiary border-x border-b border-border-color rounded-b-lg z-20 max-h-40 overflow-y-auto mt-1">
                                                        {suggestions.map((s, sIndex) => (
                                                            <div key={s.id} onMouseDown={() => handleSuggestionClick(index, s)} onMouseEnter={() => setHighlightedIndex(sIndex)} className={`p-2 text-sm cursor-pointer ${sIndex === highlightedIndex ? 'bg-hover-bg' : 'hover:bg-hover-bg'}`}>
                                                                {s.name} <span className="text-text-secondary/70">({s.brand})</span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                            <div className="col-span-2">
                                                <input type="number" placeholder="Qty" value={ing.quantity} onChange={e => handleIngredientChange(index, 'quantity', e.target.value)} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 text-sm focus:ring-accent-blue focus:border-accent-blue" />
                                            </div>
                                            <div className="col-span-2">
                                                <div className="w-full bg-bg-primary border border-border-color rounded-lg p-2 text-sm text-text-secondary h-full flex items-center">{ing.unit || 'Unit'}</div>
                                            </div>
                                            <div className="col-span-2">
                                                <div className="w-full bg-bg-primary border border-border-color rounded-lg p-2 text-sm text-right text-text-primary h-full flex items-center justify-end font-semibold">
                                                    {formatPeso(ing.cost)}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <button type="button" onClick={handleAddIngredient} className="mt-3 flex items-center gap-2 text-sm text-accent-blue font-medium hover:bg-accent-blue/10 px-2 py-1 rounded-lg transition-colors"><PlusIcon className="w-4 h-4"/> Add Ingredient</button>
                                {errors.ingredients && <p className="text-xs text-accent-red mt-1">{errors.ingredients}</p>}
                            </div>
                             <div className="lg:col-span-1">
                                <h3 className="text-md font-semibold text-text-primary mb-2">Mark Up Summary</h3>
                                <div className="space-y-1.5 text-sm">
                                    {ALLOCATIONS.map(alloc => {
                                        const amount = totalCost * (alloc.percentage / 100);
                                        return (
                                            <div key={alloc.name} className="flex justify-between items-center">
                                                <span className="text-text-secondary">{alloc.name}</span>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-semibold">{formatPeso(amount)}</span>
                                                    <span className="text-xs text-text-secondary/70 w-12 text-right">({alloc.percentage}%)</span>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="flex justify-between items-center pt-2 border-t border-border-color/50 font-semibold">
                                        <span>Total Markup</span>
                                        <div className="flex items-baseline gap-2">
                                            <span>{formatPeso(totalCostWithAllocation - totalCost)}</span>
                                            <span className="text-xs text-text-secondary/70 w-12 text-right">({TOTAL_ALLOCATION_PERCENTAGE}%)</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-4 bg-bg-tertiary/50 border-t border-border-color flex flex-col md:flex-row justify-between items-center gap-4 rounded-b-2xl flex-shrink-0">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-2 text-center md:text-left">
                            <div>
                                <span className="text-xs text-text-secondary block">Ingredient Cost</span>
                                <span className="font-semibold text-md">{formatPeso(totalCost)}</span>
                            </div>
                            <div>
                                <span className="text-xs text-text-secondary block">Total w/ Mark Up</span>
                                <span className="font-semibold text-md">{formatPeso(totalCostWithAllocation)}</span>
                            </div>
                            <div>
                                <span className="text-xs text-text-secondary block">Food Cost %</span>
                                <span className="font-semibold text-md">{foodCostPercentage.toFixed(2)}%</span>
                            </div>
                            <div>
                                <span className="text-xs text-text-secondary block">Final Cost %</span>
                                <span className={`font-semibold text-md ${finalCostPercentage > 100 ? 'text-accent-red' : 'text-accent-green'}`}>
                                    {finalCostPercentage.toFixed(2)}%
                                </span>
                            </div>
                        </div>
                        <div className="flex gap-2 w-full md:w-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="w-full md:w-[140px] px-5 py-3 rounded-md font-semibold bg-bg-tertiary hover:bg-hover-bg transition"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={handleSave}
                                className="w-full md:w-[140px] px-5 py-3 rounded-md font-semibold bg-accent-blue text-white hover:bg-opacity-80 transition"
                            >
                                Save Recipe
                            </button>
                        </div>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default RecipeCostingModal;
