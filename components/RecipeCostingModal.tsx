import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { RecipeCosting, RecipeIngredient, RecipeComponent, ProductInventoryItem } from '../types';
import { XMarkIcon, PlusIcon, TrashIcon } from './Icons';

interface RecipeCostingModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: Omit<RecipeCosting, 'id'> & { id?: number }) => void;
    recipeToEdit: RecipeCosting | null;
    products: ProductInventoryItem[];
    recipes?: RecipeCosting[]; // For using template recipes as ingredients
}

const DEFAULT_ALLOCATIONS = [
    { name: 'Overhead/Utilities', percentage: 20 },
    { name: 'Labor', percentage: 20 },
    { name: 'VAT', percentage: 12 },
    { name: 'Breakages', percentage: 15 },
    { name: 'Others', percentage: 15 },
    { name: 'S.C. Disc', percentage: 20 },
];

const RecipeCostingModal: React.FC<RecipeCostingModalProps> = ({ isOpen, onClose, onSave, recipeToEdit, products, recipes = [] }) => {
    const [name, setName] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [isTemplate, setIsTemplate] = useState(false);
    const [yieldAmount, setYieldAmount] = useState('');
    const [yieldUnit, setYieldUnit] = useState('g');
    const [components, setComponents] = useState<RecipeComponent[]>([{ id: '1', name: '', ingredients: [], cost: 0 }]);
    const [errors, setErrors] = useState<{ [key: string]: string }>({});
    const [allocations, setAllocations] = useState(DEFAULT_ALLOCATIONS);
    const [editingAllocationIndex, setEditingAllocationIndex] = useState<number | null>(null);

    const [activeIngredientIndex, setActiveIngredientIndex] = useState<string | null>(null); // Changed to string to support componentId-ingredientIndex
    const [suggestions, setSuggestions] = useState<(ProductInventoryItem | RecipeCosting)[]>([]);
    const [highlightedIndex, setHighlightedIndex] = useState(-1);
    const [editingComponentId, setEditingComponentId] = useState<string | null>(null);
    const [editingIngredientKey, setEditingIngredientKey] = useState<string | null>(null);
    const [isEditMode, setIsEditMode] = useState(false);
    const [isClosing, setIsClosing] = useState(false);

    const nameInputRef = useRef<HTMLInputElement>(null);
    
    const formatPeso = (amount: number) => `₱${amount.toFixed(2)}`;

    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
            setAllocations(DEFAULT_ALLOCATIONS); // Reset allocations when opening modal
            if (recipeToEdit) {
                setName(recipeToEdit.name);
                setSellingPrice(String(recipeToEdit.sellingPrice));
                setIsTemplate(recipeToEdit.isTemplate || false);
                setYieldAmount(recipeToEdit.yieldAmount ? String(recipeToEdit.yieldAmount) : '');
                setYieldUnit(recipeToEdit.yieldUnit || 'g');

                // Check if recipe has components or legacy ingredients
                if (recipeToEdit.components && recipeToEdit.components.length > 0) {
                    // Recalculate costs for components
                    const updatedComponents = recipeToEdit.components.map(comp => {
                        const updatedIngredients = comp.ingredients.map(ing => {
                            const product = products.find(p => p.id === ing.itemId);
                            if (product) {
                                const recalculatedCost = calculateCost(product, ing.quantity, ing.unit);
                                return { ...ing, cost: recalculatedCost };
                            }
                            return ing;
                        });
                        const componentCost = updatedIngredients.reduce((sum, ing) => sum + ing.cost, 0);
                        return { ...comp, ingredients: updatedIngredients, cost: componentCost };
                    });
                    setComponents(updatedComponents);
                } else {
                    // Legacy: single component with all ingredients
                    const updatedIngredients = recipeToEdit.ingredients.map(ing => {
                        const product = products.find(p => p.id === ing.itemId);
                        if (product) {
                            const recalculatedCost = calculateCost(product, ing.quantity, ing.unit);
                            return { ...ing, cost: recalculatedCost };
                        }
                        return ing;
                    });
                    const componentCost = updatedIngredients.reduce((sum, ing) => sum + ing.cost, 0);
                    setComponents([{ id: '1', name: '', ingredients: updatedIngredients, cost: componentCost }]);
                }
            } else {
                setName('');
                setSellingPrice('');
                setIsTemplate(false);
                setYieldAmount('');
                setYieldUnit('g');
                setComponents([{ id: '1', name: '', ingredients: [], cost: 0 }]);
            }
            setErrors({});
            setTimeout(() => nameInputRef.current?.focus(), 100);
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen, recipeToEdit, products]);

    const totalCost = useMemo(() => {
        return components.reduce((sum, comp) => sum + comp.cost, 0);
    }, [components]);

    const totalAllocationPercentage = useMemo(() => {
        return allocations.reduce((sum, item) => sum + item.percentage, 0);
    }, [allocations]);

    const allocationMultiplier = useMemo(() => {
        return 1 + totalAllocationPercentage / 100;
    }, [totalAllocationPercentage]);

    const totalCostWithAllocation = useMemo(() => {
        return totalCost * allocationMultiplier;
    }, [totalCost, allocationMultiplier]);

    const foodCostPercentage = useMemo(() => {
        const price = parseFloat(sellingPrice);
        if (!price || !totalCost) return 0;
        return (price / totalCost) * 100;
    }, [totalCost, sellingPrice]);

    const finalCostPercentage = useMemo(() => {
        const price = parseFloat(sellingPrice);
        if (!price || !totalCostWithAllocation) return 0;
        return (totalCostWithAllocation / price) * 100;
    }, [totalCostWithAllocation, sellingPrice]);


    // Unit conversion function
    const convertUnit = (quantity: number, fromUnit: string, toUnit: string): number => {
        // Normalize units to lowercase
        const from = fromUnit.toLowerCase();
        const to = toUnit.toLowerCase();

        // If same unit, no conversion needed
        if (from === to) return quantity;

        // Weight conversions
        const weightUnits: { [key: string]: number } = {
            'kg': 1000,
            'g': 1,
            'mg': 0.001,
            'lb': 453.592,
            'oz': 28.3495,
        };

        // Volume conversions (to mL)
        const volumeUnits: { [key: string]: number } = {
            'l': 1000,
            'ml': 1,
            'gal': 3785.41,
            'qt': 946.353,
            'pt': 473.176,
            'cup': 236.588,
            'tbsp': 14.7868,
            'tsp': 4.92892,
        };

        // For "pcs", "pack", "box" - no conversion, use as-is
        if (from === 'pcs' || from === 'pack' || from === 'box' || to === 'pcs' || to === 'pack' || to === 'box') {
            // If trying to convert between count units and weight/volume, just return quantity as-is
            return quantity;
        }

        // Check if both units are in weight category
        if (weightUnits[from] && weightUnits[to]) {
            // Convert from -> grams -> to
            const inGrams = quantity * weightUnits[from];
            return inGrams / weightUnits[to];
        }

        // Check if both units are in volume category
        if (volumeUnits[from] && volumeUnits[to]) {
            // Convert from -> mL -> to
            const inML = quantity * volumeUnits[from];
            return inML / volumeUnits[to];
        }

        // If units are from different categories or unknown, return original quantity
        return quantity;
    };

    const calculateCost = (product: ProductInventoryItem, quantity: number, recipeUnit: string): number => {
        // Convert the recipe quantity to the product's unit
        const convertedQuantity = convertUnit(quantity, recipeUnit, product.unit);
        // Calculate price per unit, then multiply by converted quantity
        const pricePerUnit = product.quantity > 0 ? product.price / product.quantity : 0;
        return convertedQuantity * pricePerUnit;
    };

    // Component management functions
    const handleAddComponent = () => {
        const newId = String(Date.now());
        setComponents([...components, { id: newId, name: '', ingredients: [], cost: 0 }]);
    };

    const handleRemoveComponent = (componentId: string) => {
        setComponents(components.filter(c => c.id !== componentId));
    };

    const handleComponentNameChange = (componentId: string, newName: string) => {
        setComponents(components.map(c => c.id === componentId ? { ...c, name: newName } : c));
    };

    const handleAddIngredient = (componentId: string) => {
        setComponents(components.map(c => {
            if (c.id === componentId) {
                return {
                    ...c,
                    ingredients: [...c.ingredients, { itemId: 0, name: '', quantity: 1, unit: 'g', cost: 0 }]
                };
            }
            return c;
        }));
    };

    const handleRemoveIngredient = (componentId: string, ingredientIndex: number) => {
        setComponents(components.map(c => {
            if (c.id === componentId) {
                const newIngredients = c.ingredients.filter((_, i) => i !== ingredientIndex);
                const newCost = newIngredients.reduce((sum, ing) => sum + ing.cost, 0);
                return { ...c, ingredients: newIngredients, cost: newCost };
            }
            return c;
        }));
    };

    const handleIngredientChange = (componentId: string, ingredientIndex: number, field: keyof RecipeIngredient, value: any) => {
        setComponents(components.map(c => {
            if (c.id !== componentId) return c;

            const newIngredients = [...c.ingredients];
            const currentIngredient = { ...newIngredients[ingredientIndex] };

            if (field === 'name') {
                currentIngredient.name = value;
                currentIngredient.itemId = 0; // Reset ID on name change
                setActiveIngredientIndex(`${componentId}-${ingredientIndex}`);
                setHighlightedIndex(-1);
                if (value) {
                    // Search both products and template recipes
                    const productSuggestions = products.filter(p =>
                        p.name.toLowerCase().includes(value.toLowerCase())
                    );
                    const templateRecipes = recipes.filter(r =>
                        r.isTemplate &&
                        r.name.toLowerCase().includes(value.toLowerCase()) &&
                        r.id !== recipeToEdit?.id // Don't allow circular references
                    );
                    setSuggestions([...productSuggestions, ...templateRecipes]);
                } else {
                    setSuggestions([]);
                }
            } else if (field === 'quantity') {
                const product = products.find(p => p.id === currentIngredient.itemId);
                currentIngredient.quantity = parseFloat(value) || 0;
                if (product) {
                    currentIngredient.cost = calculateCost(product, currentIngredient.quantity, currentIngredient.unit);
                }
            } else if (field === 'unit') {
                currentIngredient.unit = value;
                const product = products.find(p => p.id === currentIngredient.itemId);
                if (product && currentIngredient.quantity > 0) {
                    currentIngredient.cost = calculateCost(product, currentIngredient.quantity, currentIngredient.unit);
                }
            }

            newIngredients[ingredientIndex] = currentIngredient;
            const newCost = newIngredients.reduce((sum, ing) => sum + ing.cost, 0);
            return { ...c, ingredients: newIngredients, cost: newCost };
        }));
    };

    const handleSuggestionClick = (componentId: string, ingredientIndex: number, suggestion: ProductInventoryItem | RecipeCosting) => {
        setComponents(components.map(c => {
            if (c.id !== componentId) return c;

            const newIngredients = [...c.ingredients];
            const currentUnit = newIngredients[ingredientIndex].unit || 'g';
            const quantity = newIngredients[ingredientIndex].quantity || 1;

            // Check if suggestion is a template recipe
            const isRecipe = 'totalCostWithAllocation' in suggestion;

            if (isRecipe) {
                // Using a template recipe as ingredient
                // Use costPerUnit if available, otherwise fallback to totalCost
                const recipeWithYield = suggestion as RecipeCosting;
                const unitCost = recipeWithYield.costPerUnit || suggestion.totalCost;
                const recipeUnit = recipeWithYield.yieldUnit || 'pcs';

                newIngredients[ingredientIndex] = {
                    itemId: suggestion.id,
                    name: suggestion.name,
                    quantity: quantity,
                    unit: recipeUnit, // Use the recipe's yield unit
                    cost: unitCost * quantity,
                };
            } else {
                // Using a regular product as ingredient
                newIngredients[ingredientIndex] = {
                    itemId: suggestion.id,
                    name: suggestion.name,
                    quantity: quantity,
                    unit: currentUnit,
                    cost: calculateCost(suggestion, quantity, currentUnit),
                };
            }

            const newCost = newIngredients.reduce((sum, ing) => sum + ing.cost, 0);
            setActiveIngredientIndex(null);
            return { ...c, ingredients: newIngredients, cost: newCost };
        }));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, componentId: string, ingredientIndex: number) => {
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
                handleSuggestionClick(componentId, ingredientIndex, suggestions[highlightedIndex]);
            }
        }
    };

    const handleAllocationPercentageChange = (index: number, newPercentage: string) => {
        const percentage = parseFloat(newPercentage) || 0;
        const newAllocations = [...allocations];
        newAllocations[index] = { ...newAllocations[index], percentage };
        setAllocations(newAllocations);
    };
    
    const validate = () => {
        const newErrors: { [key: string]: string } = {};
        if (!name.trim()) newErrors.name = "Recipe name is required";

        // Selling price is only required for non-template recipes
        if (!isTemplate && (!sellingPrice || parseFloat(sellingPrice) <= 0)) {
            newErrors.sellingPrice = "Selling price must be greater than 0";
        }

        const allIngredients = components.flatMap(c => c.ingredients);
        if (allIngredients.length === 0) newErrors.ingredients = "Please add at least one ingredient";
        if (allIngredients.some(i => i.itemId === 0 || !i.name)) newErrors.ingredients = "Please select valid ingredients from the dropdown";
        if (allIngredients.some(i => !i.unit || i.unit.trim() === '')) newErrors.ingredients = "All ingredients must have a unit";

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    const handleSave = () => {
        if (!validate()) return;

        // Sanitize components and ingredients
        const sanitizedComponents = components.map(comp => ({
            id: comp.id,
            name: comp.name || '',
            ingredients: comp.ingredients.map(ing => ({
                itemId: ing.itemId || 0,
                name: ing.name || '',
                quantity: ing.quantity || 0,
                unit: ing.unit || 'g',
                cost: ing.cost || 0,
            })),
            cost: comp.cost || 0,
        }));

        // For backward compatibility, also flatten to ingredients array
        const allIngredients = sanitizedComponents.flatMap(c => c.ingredients);

        // Calculate cost per unit if template and yield is set
        const yieldNum = parseFloat(yieldAmount);
        const costPerUnit = isTemplate && yieldNum > 0 ? totalCost / yieldNum : null;

        const recipeData: any = {
            name: name.trim(),
            sellingPrice: parseFloat(sellingPrice) || 0,
            ingredients: allIngredients, // Legacy support
            components: sanitizedComponents, // New structure
            totalCost: totalCost || 0,
            totalCostWithAllocation: totalCostWithAllocation || 0,
            foodCostPercentage: foodCostPercentage || 0,
            finalCostPercentage: finalCostPercentage || 0,
            isTemplate: isTemplate,
            yieldAmount: null, // Explicitly set to null to clear any undefined values
            yieldUnit: null,
            costPerUnit: null,
        };

        // Only add optional fields if they have valid values
        if (isTemplate && yieldNum > 0) {
            recipeData.yieldAmount = yieldNum;
            recipeData.yieldUnit = yieldUnit;
            recipeData.costPerUnit = costPerUnit;
        }

        // Only include id if editing an existing recipe
        if (recipeToEdit?.id) {
            recipeData.id = recipeToEdit.id;
        }

        onSave(recipeData);
        handleClose();
    };

    if (!isOpen && !isClosing) return null;

    return (
        <div className={`fixed inset-0 flex justify-center items-center z-50 p-4 transition-all duration-300 ${isClosing ? 'bg-black/0 backdrop-blur-none' : 'bg-black/60 backdrop-blur-sm'}`} onClick={handleClose}>
            <div className={`bg-bg-secondary w-full max-w-4xl max-h-[90vh] rounded-2xl border border-border-color shadow-2xl flex flex-col transition-all duration-300 ${isClosing ? 'opacity-0 scale-95 -translate-y-4' : 'opacity-100 scale-100 animate-pop-in'}`} onClick={e => e.stopPropagation()}>
                <form onSubmit={(e) => e.preventDefault()} className="flex flex-col flex-1 min-h-0">
                    <div className="p-6 border-b border-border-color flex justify-between items-center flex-shrink-0">
                        <div className="flex items-center gap-3">
                            <h2 className="text-xl font-semibold">{recipeToEdit ? 'Edit Recipe Costing' : 'New Recipe Costing'}</h2>
                            {recipeToEdit && (
                                <button
                                    type="button"
                                    onClick={() => setIsEditMode(!isEditMode)}
                                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                                        isEditMode
                                            ? 'bg-accent-green text-white hover:bg-accent-green/90'
                                            : 'bg-bg-tertiary text-text-secondary hover:bg-hover-bg border border-border-color'
                                    }`}
                                >
                                    {isEditMode ? 'Done Editing' : 'Edit'}
                                </button>
                            )}
                        </div>
                        <button type="button" onClick={handleClose} className="p-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Recipe Name*</label>
                                {isEditMode || !recipeToEdit ? (
                                    <>
                                        <input ref={nameInputRef} type="text" value={name} onChange={e => setName(e.target.value)} className={`w-full bg-bg-primary border rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue ${errors.name ? 'border-accent-red' : 'border-border-color'}`} />
                                        {errors.name && <p className="text-xs text-accent-red mt-1">{errors.name}</p>}
                                    </>
                                ) : (
                                    <div className="w-full p-2 text-text-primary font-medium">
                                        {name}
                                    </div>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">
                                    Selling Price (₱){!isTemplate && '*'}
                                </label>
                                {isEditMode || !recipeToEdit ? (
                                    <>
                                        <input
                                            type="number"
                                            value={sellingPrice}
                                            onChange={e => setSellingPrice(e.target.value)}
                                            disabled={isTemplate}
                                            className={`w-full bg-bg-primary border rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue ${errors.sellingPrice ? 'border-accent-red' : 'border-border-color'} ${isTemplate ? 'opacity-50 cursor-not-allowed' : ''}`}
                                        />
                                        {errors.sellingPrice && <p className="text-xs text-accent-red mt-1">{errors.sellingPrice}</p>}
                                    </>
                                ) : (
                                    <div className="w-full p-2 text-text-primary font-medium">
                                        ₱{sellingPrice}
                                    </div>
                                )}
                            </div>
                        </div>

                        {isTemplate && (
                            <div className="grid grid-cols-2 gap-4 p-3 bg-accent-blue/5 rounded-lg border border-accent-blue/30">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Yield Amount*</label>
                                    <input
                                        type="number"
                                        value={yieldAmount}
                                        onChange={e => setYieldAmount(e.target.value)}
                                        placeholder="e.g., 500"
                                        className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue"
                                    />
                                    <p className="text-xs text-text-secondary mt-1">Total amount this recipe produces</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Yield Unit*</label>
                                    <select
                                        value={yieldUnit}
                                        onChange={e => setYieldUnit(e.target.value)}
                                        className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue"
                                    >
                                        <optgroup label="Weight">
                                            <option value="g">g (grams)</option>
                                            <option value="kg">kg (kilograms)</option>
                                        </optgroup>
                                        <optgroup label="Volume">
                                            <option value="mL">mL (milliliters)</option>
                                            <option value="L">L (liters)</option>
                                        </optgroup>
                                        <optgroup label="Count">
                                            <option value="pcs">pcs (pieces)</option>
                                        </optgroup>
                                    </select>
                                    <p className="text-xs text-text-secondary mt-1">Unit of measurement</p>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
                            <div className="lg:col-span-2">
                                <h3 className="text-md font-semibold text-text-primary mb-2">Ingredients</h3>
                                {components.map((component, compIndex) => (
                                    <div key={component.id} className="mb-4">
                                        {/* Component Name Header */}
                                        {!component.name || isEditMode || !recipeToEdit ? (
                                            <div className="flex items-center gap-2 mb-2">
                                                <input
                                                    type="text"
                                                    placeholder="Component name (e.g., Pasta, Garlic Bread)..."
                                                    value={component.name}
                                                    onChange={e => handleComponentNameChange(component.id, e.target.value)}
                                                    className="flex-1 bg-bg-primary border border-border-color rounded-md px-3 py-1.5 text-sm font-semibold text-accent-blue focus:ring-accent-blue focus:border-accent-blue"
                                                />
                                                {isEditMode && components.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleRemoveComponent(component.id)}
                                                        className="p-1.5 text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-md transition-colors"
                                                        title="Remove component"
                                                    >
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between mb-3 pb-2 border-b border-border-color">
                                                <h4 className="text-lg font-bold text-text-primary tracking-wide">{component.name}</h4>
                                                {component.ingredients.length > 0 && (
                                                    <div className="flex items-baseline gap-2">
                                                        <span className="text-xs font-semibold text-text-secondary">Subtotal:</span>
                                                        <span className="font-bold text-base text-accent-blue">
                                                            {formatPeso(component.cost)}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}

                                        {/* Column Headers */}
                                        <div className="grid grid-cols-10 gap-2 mb-2">
                                            <div className="col-span-1"></div>
                                            <div className="col-span-5">
                                                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Ingredient Name</span>
                                            </div>
                                            <div className="col-span-1">
                                                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Qty</span>
                                            </div>
                                            <div className="col-span-1">
                                                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Unit</span>
                                            </div>
                                            <div className="col-span-2">
                                                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Cost</span>
                                            </div>
                                        </div>

                                        {/* Ingredients List */}
                                        <div className={isEditMode || !recipeToEdit ? "space-y-2 mb-2" : "space-y-0.5 mb-2"}>
                                            {component.ingredients.map((ing, ingIndex) => {
                                                const activeKey = `${component.id}-${ingIndex}`;
                                                const isEditing = isEditMode || !ing.itemId || !recipeToEdit;
                                                return (
                                                    <div key={ingIndex} className={`grid grid-cols-10 gap-2 items-center ${!isEditing ? 'py-0.5' : ''}`}>
                                                        <div className="col-span-1 flex justify-center">
                                                            {isEditing && (
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleRemoveIngredient(component.id, ingIndex)}
                                                                    className="p-1 text-text-secondary hover:text-accent-red hover:bg-accent-red/10 rounded-full transition-colors"
                                                                >
                                                                    <TrashIcon className="w-4 h-4" />
                                                                </button>
                                                            )}
                                                        </div>
                                                        <div className="col-span-5 relative">
                                                            {isEditing ? (
                                                                <>
                                                                    <input
                                                                        type="text"
                                                                        placeholder="Search ingredient..."
                                                                        value={ing.name}
                                                                        onChange={e => handleIngredientChange(component.id, ingIndex, 'name', e.target.value)}
                                                                        onFocus={() => setActiveIngredientIndex(activeKey)}
                                                                        onBlur={() => setTimeout(() => setActiveIngredientIndex(null), 150)}
                                                                        onKeyDown={e => handleKeyDown(e, component.id, ingIndex)}
                                                                        className="w-full bg-bg-primary border border-border-color rounded-md px-2 py-1.5 text-sm focus:ring-accent-blue focus:border-accent-blue"
                                                                    />
                                                                    {activeIngredientIndex === activeKey && suggestions.length > 0 && (
                                                                        <div className="absolute top-full left-0 right-0 bg-bg-tertiary border-x border-b border-border-color rounded-b-lg z-20 max-h-40 overflow-y-auto mt-1">
                                                                            {suggestions.map((s, sIndex) => {
                                                                                const isRecipe = 'totalCostWithAllocation' in s;
                                                                                return (
                                                                                    <div
                                                                                        key={s.id}
                                                                                        onMouseDown={() => handleSuggestionClick(component.id, ingIndex, s)}
                                                                                        onMouseEnter={() => setHighlightedIndex(sIndex)}
                                                                                        className={`p-2 text-sm cursor-pointer ${sIndex === highlightedIndex ? 'bg-hover-bg' : 'hover:bg-hover-bg'}`}
                                                                                    >
                                                                                        {s.name}{' '}
                                                                                        <span className="text-text-secondary/70">
                                                                                            {isRecipe ? (
                                                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-accent-blue/20 text-accent-blue">Template Recipe</span>
                                                                                            ) : (
                                                                                                `(${'brand' in s ? s.brand : ''})`
                                                                                            )}
                                                                                        </span>
                                                                                    </div>
                                                                                );
                                                                            })}
                                                                        </div>
                                                                    )}
                                                                </>
                                                            ) : (
                                                                <div className="px-1 py-0.5 text-xs text-text-primary">
                                                                    {ing.name}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-span-1">
                                                            {isEditing ? (
                                                                <input
                                                                    type="number"
                                                                    placeholder="Qty"
                                                                    value={ing.quantity}
                                                                    onChange={e => handleIngredientChange(component.id, ingIndex, 'quantity', e.target.value)}
                                                                    className="w-full bg-bg-primary border border-border-color rounded-md px-2 py-1.5 text-sm focus:ring-accent-blue focus:border-accent-blue"
                                                                />
                                                            ) : (
                                                                <div className="px-1 py-0.5 text-xs text-text-primary text-center">
                                                                    {ing.quantity}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-span-1">
                                                            {isEditing ? (
                                                                <select
                                                                    value={ing.unit}
                                                                    onChange={e => handleIngredientChange(component.id, ingIndex, 'unit', e.target.value)}
                                                                    className="w-full bg-bg-primary border border-border-color rounded-md px-2 py-1.5 text-sm focus:ring-accent-blue focus:border-accent-blue appearance-none bg-[length:16px] bg-[center_right_0.5rem] bg-no-repeat"
                                                                    style={{ backgroundImage: "url(\"data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e\")" }}
                                                                >
                                                                    <optgroup label="Weight">
                                                                        <option value="kg">kg</option>
                                                                        <option value="g">g</option>
                                                                        <option value="mg">mg</option>
                                                                        <option value="lb">lb</option>
                                                                        <option value="oz">oz</option>
                                                                    </optgroup>
                                                                    <optgroup label="Volume">
                                                                        <option value="L">L</option>
                                                                        <option value="mL">mL</option>
                                                                        <option value="gal">gal</option>
                                                                        <option value="qt">qt</option>
                                                                        <option value="cup">cup</option>
                                                                        <option value="tbsp">tbsp</option>
                                                                        <option value="tsp">tsp</option>
                                                                    </optgroup>
                                                                    <optgroup label="Count">
                                                                        <option value="pcs">pcs</option>
                                                                        <option value="pack">pack</option>
                                                                        <option value="box">box</option>
                                                                    </optgroup>
                                                                </select>
                                                            ) : (
                                                                <div className="px-1 py-0.5 text-xs text-text-primary text-center">
                                                                    {ing.unit}
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="col-span-2 flex items-center">
                                                            <span className={`font-semibold px-1 py-0.5 ${isEditing ? 'text-sm' : 'text-xs'} text-text-primary`}>
                                                                {formatPeso(ing.cost)}
                                                            </span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Add Ingredient Button */}
                                        {(isEditMode || !recipeToEdit) && (
                                            <button
                                                type="button"
                                                onClick={() => handleAddIngredient(component.id)}
                                                className="flex items-center gap-2 text-sm text-accent-blue font-medium hover:bg-accent-blue/10 px-2 py-1 rounded-lg transition-colors"
                                            >
                                                <PlusIcon className="w-4 h-4" /> Add Ingredient
                                            </button>
                                        )}
                                    </div>
                                ))}

                                {/* Add Component Button */}
                                {(isEditMode || !recipeToEdit) && (
                                    <button
                                        type="button"
                                        onClick={handleAddComponent}
                                        className="mt-2 flex items-center gap-2 text-sm text-text-secondary font-medium hover:bg-hover-bg px-2 py-1 rounded-lg transition-colors border border-border-color"
                                    >
                                        <PlusIcon className="w-4 h-4" /> Add Component
                                    </button>
                                )}
                                {errors.ingredients && <p className="text-xs text-accent-red mt-1">{errors.ingredients}</p>}
                            </div>
                             <div className="lg:col-span-1">
                                <h3 className="text-md font-semibold text-text-primary mb-2">Mark Up Summary</h3>
                                <div className="space-y-1.5 text-sm">
                                    {allocations.map((alloc, index) => {
                                        const amount = totalCost * (alloc.percentage / 100);
                                        const isEditing = editingAllocationIndex === index;
                                        return (
                                            <div key={alloc.name} className="flex justify-between items-center">
                                                <span className="text-text-secondary">{alloc.name}</span>
                                                <div className="flex items-baseline gap-2">
                                                    <span className="font-semibold">{formatPeso(amount)}</span>
                                                    {isEditing ? (
                                                        <input
                                                            type="number"
                                                            value={alloc.percentage}
                                                            onChange={e => handleAllocationPercentageChange(index, e.target.value)}
                                                            onBlur={() => setEditingAllocationIndex(null)}
                                                            onKeyDown={e => {
                                                                if (e.key === 'Enter') setEditingAllocationIndex(null);
                                                            }}
                                                            autoFocus
                                                            className="w-12 text-xs text-right bg-bg-primary border border-accent-blue rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-accent-blue"
                                                        />
                                                    ) : (
                                                        <span
                                                            className="text-xs text-text-secondary/70 w-12 text-right cursor-pointer hover:text-accent-blue transition-colors"
                                                            onClick={() => setEditingAllocationIndex(index)}
                                                        >
                                                            ({alloc.percentage}%)
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                    <div className="flex justify-between items-center pt-2 border-t border-border-color/50 font-semibold">
                                        <span>Total Markup</span>
                                        <div className="flex items-baseline gap-2">
                                            <span>{formatPeso(totalCostWithAllocation - totalCost)}</span>
                                            <span className="text-xs text-text-secondary/70 w-12 text-right">({totalAllocationPercentage}%)</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Template Recipe Checkbox */}
                                <div className="mt-4 flex items-start gap-2 p-3 bg-bg-tertiary/30 rounded-lg border border-border-color/50">
                                    <input
                                        type="checkbox"
                                        id="isTemplate"
                                        checked={isTemplate}
                                        onChange={e => setIsTemplate(e.target.checked)}
                                        disabled={!isEditMode && recipeToEdit}
                                        className="w-4 h-4 text-accent-blue rounded focus:ring-2 focus:ring-accent-blue mt-0.5"
                                    />
                                    <label htmlFor="isTemplate" className="text-xs text-text-primary cursor-pointer select-none">
                                        <div className="font-medium">Template Recipe</div>
                                        <div className="text-text-secondary">(Not sold individually, used as ingredient in other recipes)</div>
                                    </label>
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
                                onClick={handleClose}
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
