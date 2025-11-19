import React, { useState, useMemo } from 'react';
import type { RecipeCosting, ProductInventoryItem } from '../types';
import { PlusIcon, PencilIcon, TrashIcon } from '../components/Icons';
import LoadingSpinner from '../components/LoadingSpinner';
import RecipeCostingModal from '../components/RecipeCostingModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { useFirebaseData, useFirebaseMutation } from '../hooks/useFirebase';
import { recipesService } from '../utils/firebaseService';

interface CostingProps {
    recipeCostings?: RecipeCosting[];
    setRecipeCostings?: React.Dispatch<React.SetStateAction<RecipeCosting[]>>;
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


const Costing: React.FC<CostingProps> = ({ recipeCostings: propRecipeCostings, setRecipeCostings: setPropRecipeCostings, productInventoryItems }) => {
    // Fetch recipes from Firebase
    const { data: firebaseRecipes = [], loading: recipesLoading, error: recipesError } = useFirebaseData(
        () => recipesService.getAll(),
        []
    );

    // Add recipe mutation
    const { mutate: addRecipe, loading: addLoading, error: addError } = useFirebaseMutation(
        (recipe: Omit<RecipeCosting, 'id'>) => recipesService.add(recipe)
    );

    // Update recipe mutation
    const { mutate: updateRecipe, loading: updateLoading, error: updateError } = useFirebaseMutation(
        (data: { id: string; updates: any }) => recipesService.update(data.id, data.updates)
    );

    // Delete recipe mutation
    const { mutate: deleteRecipe, loading: deleteLoading, error: deleteError } = useFirebaseMutation(
        (id: string) => recipesService.delete(id)
    );

    // Use Firebase recipes if available, otherwise use prop recipes (for backward compatibility)
    const recipeCostings = (Array.isArray(firebaseRecipes) && firebaseRecipes.length > 0) ? firebaseRecipes : (propRecipeCostings || []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [recipeToEdit, setRecipeToEdit] = useState<RecipeCosting | null>(null);
    const [recipeToDelete, setRecipeToDelete] = useState<RecipeCosting | null>(null);
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

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
    
    const handleConfirmDelete = async () => {
        if (recipeToDelete) {
            try {
                await deleteRecipe(String(recipeToDelete.id));
                setOperationStatus({ type: 'success', message: 'Recipe deleted successfully' });
                setIsConfirmModalOpen(false);
                setRecipeToDelete(null);
                setTimeout(() => setOperationStatus(null), 3000);

                // Update prop for backward compatibility
                if (setPropRecipeCostings) {
                    setPropRecipeCostings(recipeCostings.filter(r => String(r.id) !== String(recipeToDelete.id)));
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to delete recipe';
                setOperationStatus({ type: 'error', message: errorMsg });
            }
        }
    };

    const handleSaveRecipe = async (recipeData: Omit<RecipeCosting, 'id'> & { id?: number | string }) => {
        try {
            if (recipeData.id) {
                // Update existing
                await updateRecipe({
                    id: String(recipeData.id),
                    updates: recipeData
                });
                setOperationStatus({ type: 'success', message: 'Recipe updated successfully' });
            } else {
                // Add new
                await addRecipe(recipeData);
                setOperationStatus({ type: 'success', message: 'Recipe created successfully' });
            }
            setIsModalOpen(false);
            setTimeout(() => setOperationStatus(null), 3000);

            // Update prop for backward compatibility
            if (setPropRecipeCostings) {
                setPropRecipeCostings(recipeCostings);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to save recipe';
            setOperationStatus({ type: 'error', message: errorMsg });
        }
    };
    
    const averageFinalCost = useMemo(() => {
        if (recipeCostings.length === 0) return 0;
        const totalPercentage = recipeCostings.reduce((sum, recipe) => sum + recipe.finalCostPercentage, 0);
        return totalPercentage / recipeCostings.length;
    }, [recipeCostings]);

    // Show loading state
    if (recipesLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <LoadingSpinner message="Loading recipe costings..." />
            </div>
        );
    }

    // Show error state
    if (recipesError) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                    <p className="text-red-500 font-medium">Error loading recipe costings</p>
                    <p className="text-text-secondary text-sm mt-1">{recipesError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            {/* Operation Status Messages */}
            {operationStatus && (
                <div className={`mb-6 p-4 rounded-lg border ${
                    operationStatus.type === 'success'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                }`}>
                    <p className={operationStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}>
                        {operationStatus.message}
                    </p>
                </div>
            )}

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