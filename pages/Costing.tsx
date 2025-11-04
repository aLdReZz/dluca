import React, { useState, useMemo } from 'react';
import type { RecipeCosting, ProductInventoryItem } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/Icons';
import RecipeCostingModal from '../components/RecipeCostingModal';
import ConfirmationModal from '../components/ConfirmationModal';

interface CostingProps {
    recipeCostings: RecipeCosting[];
    setRecipeCostings: React.Dispatch<React.SetStateAction<RecipeCosting[]>>;
    productInventoryItems: ProductInventoryItem[];
}

const StatCard: React.FC<{title: string, value: string}> = ({title, value}) => (
    <div className="bg-bg-secondary p-5 rounded-xl border border-border-color">
        <div className="text-sm font-medium text-text-secondary">{title}</div>
        <div className="text-3xl font-semibold text-text-primary mt-2">{value}</div>
    </div>
);

const RecipeCard: React.FC<{ recipe: RecipeCosting; onEdit: () => void; onDelete: () => void; }> = ({ recipe, onEdit, onDelete }) => {
    const formatPeso = (amount: number) => `₱${amount.toFixed(2)}`;
    
    return (
        <div className="bg-bg-secondary rounded-xl border border-border-color p-5 flex flex-col justify-between transition-shadow hover:shadow-lg hover:border-border-color/80">
            <div>
                <h3 className="text-lg font-semibold text-text-primary truncate">{recipe.name}</h3>
                <div className="mt-4 space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Ingredient Cost:</span>
                        <span className="font-medium">{formatPeso(recipe.totalCost)}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-text-secondary">Total Cost (w/ Mark Up):</span>
                        <span className="font-medium">{formatPeso(recipe.totalCostWithAllocation)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-text-secondary">Selling Price:</span>
                        <span className="font-medium">{formatPeso(recipe.sellingPrice)}</span>
                    </div>
                     <div className="flex justify-between text-xs mt-2 pt-2 border-t border-border-color/50">
                        <span className="text-text-secondary">Food Cost %:</span>
                        <span className="font-medium">{recipe.foodCostPercentage.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-text-secondary font-semibold">Final Cost %:</span>
                        <span className={`font-bold text-lg ${recipe.finalCostPercentage > 100 ? 'text-accent-red' : 'text-accent-green'}`}>{recipe.finalCostPercentage.toFixed(2)}%</span>
                    </div>
                </div>
            </div>
            <div className="mt-6 flex items-center justify-end gap-2">
                <button onClick={onEdit} className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors" title="Edit Recipe"><PencilIcon className="w-5 h-5" /></button>
                <button onClick={onDelete} className="p-2 rounded-full text-text-secondary hover:text-accent-red hover:bg-hover-bg transition-colors" title="Delete Recipe"><TrashIcon className="w-5 h-5" /></button>
            </div>
        </div>
    );
};


const Costing: React.FC<CostingProps> = ({ recipeCostings, setRecipeCostings, productInventoryItems }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [recipeToEdit, setRecipeToEdit] = useState<RecipeCosting | null>(null);
    const [recipeToDelete, setRecipeToDelete] = useState<RecipeCosting | null>(null);

    const handleOpenAddModal = () => {
        setRecipeToEdit(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (recipe: RecipeCosting) => {
        setRecipeToEdit(recipe);
        setIsModalOpen(true);
    };

    const handleDeleteClick = (recipe: RecipeCosting) => {
        setRecipeToDelete(recipe);
        setIsConfirmModalOpen(true);
    }
    
    const handleConfirmDelete = () => {
        if (recipeToDelete) {
            setRecipeCostings(prev => prev.filter(r => r.id !== recipeToDelete.id));
            setIsConfirmModalOpen(false);
            setRecipeToDelete(null);
        }
    };

    const handleSaveRecipe = (recipeData: Omit<RecipeCosting, 'id'> & { id?: number }) => {
        if (recipeData.id) {
            // Update existing
            setRecipeCostings(prev => prev.map(r => r.id === recipeData.id ? { ...r, ...recipeData, id: r.id } : r));
        } else {
            // Add new
            const newRecipe: RecipeCosting = {
                ...recipeData,
                id: Date.now(),
            };
            setRecipeCostings(prev => [...prev, newRecipe]);
        }
        setIsModalOpen(false);
    };
    
    const averageFinalCost = useMemo(() => {
        if (recipeCostings.length === 0) return 0;
        const totalPercentage = recipeCostings.reduce((sum, recipe) => sum + recipe.finalCostPercentage, 0);
        return totalPercentage / recipeCostings.length;
    }, [recipeCostings]);

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                 <div>
                    <h2 className="text-3xl font-semibold">Costing Analysis</h2>
                    <p className="text-text-secondary mt-1">Analyze the cost and profitability of your recipes.</p>
                </div>
                <button onClick={handleOpenAddModal} className="flex items-center gap-2 bg-accent-blue text-white px-4 py-2 rounded-lg font-medium text-sm shadow-md hover:bg-opacity-80 transition w-full sm:w-auto">
                    <PlusIcon className="w-5 h-5"/>
                    Add Recipe Costing
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard title="Avg. Final Cost %" value={`${averageFinalCost.toFixed(2)}%`} />
                <StatCard title="Beverage Cost %" value="0.00%" />
                <StatCard title="Pastry Cost %" value="0.00%" />
                <StatCard title="Total Recipes" value={String(recipeCostings.length)} />
            </div>
            
            {recipeCostings.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {recipeCostings.map(recipe => (
                        <RecipeCard 
                            key={recipe.id} 
                            recipe={recipe} 
                            onEdit={() => handleOpenEditModal(recipe)}
                            onDelete={() => handleDeleteClick(recipe)}
                        />
                    ))}
                </div>
            ) : (
                <div className="bg-bg-secondary rounded-xl border border-border-color">
                    <p className="p-16 text-center text-text-secondary">No recipe costings found. Click "Add Recipe Costing" to begin.</p>
                </div>
            )}

            {isModalOpen && (
                <RecipeCostingModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveRecipe}
                    recipeToEdit={recipeToEdit}
                    products={productInventoryItems}
                />
            )}
            
            {isConfirmModalOpen && recipeToDelete && (
                <ConfirmationModal 
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Recipe"
                    message={`Are you sure you want to delete "${recipeToDelete.name}"? This will permanently remove its costing data.`}
                    confirmText="Delete"
                    iconType="danger"
                />
            )}
        </div>
    );
};

export default Costing;