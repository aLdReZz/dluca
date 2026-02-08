import React, { useState, useMemo } from 'react';
import type { RecipeCosting, ProductInventoryItem } from '../types';
import { PlusIcon, EyeIcon, TrashIcon, Squares2X2Icon, TableCellsIcon } from '../components/Icons';
import LoadingSpinner from '../components/LoadingSpinner';
import RecipeCostingModal from '../components/RecipeCostingModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { useFirebaseData, useFirebaseMutation } from '../hooks/useFirebase';
import { recipesService, productInventoryService } from '../utils/firebaseService';

interface CostingProps {
    recipeCostings?: RecipeCosting[];
    setRecipeCostings?: React.Dispatch<React.SetStateAction<RecipeCosting[]>>;
    productInventoryItems: ProductInventoryItem[];
}

const StatCard: React.FC<{title: string, value: string}> = ({title, value}) => (
    <div className="bg-bg-secondary p-3 sm:p-4 lg:p-5 rounded-lg sm:rounded-xl border border-border-color">
        <div className="text-xs sm:text-sm font-medium text-text-secondary">{title}</div>
        <div className="text-xl sm:text-2xl lg:text-3xl font-semibold text-text-primary mt-1 sm:mt-2">{value}</div>
    </div>
);

const RecipeCard: React.FC<{ recipe: RecipeCosting; onEdit: () => void; onDelete: () => void; }> = ({ recipe, onEdit, onDelete }) => {
    const formatPeso = (amount: number) => `₱${amount.toFixed(2)}`;

    return (
        <div className="bg-bg-secondary rounded-lg sm:rounded-xl border border-border-color p-3 sm:p-4 lg:p-5 flex flex-col justify-between transition-shadow hover:shadow-lg hover:border-border-color/80">
            <div>
                <div className="flex items-center justify-between mb-3 sm:mb-4">
                    <h3 className="text-base sm:text-lg font-semibold text-text-primary truncate flex-1">{recipe.name}</h3>
                    <div className="flex items-center gap-1 ml-2">
                        <button onClick={onEdit} className="p-2 rounded-full text-text-secondary hover:text-text-primary hover:bg-hover-bg transition-colors" title="View Recipe"><EyeIcon className="w-5 h-5" /></button>
                        <button onClick={onDelete} className="p-2 rounded-full text-text-secondary hover:text-accent-red hover:bg-hover-bg transition-colors" title="Delete Recipe"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                </div>
                <div className="space-y-1.5 sm:space-y-2 text-xs sm:text-sm">
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
                        <span className="text-text-secondary">Mark Up:</span>
                        <span className="font-medium">{recipe.foodCostPercentage.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-text-secondary font-semibold">Profit:</span>
                        <span className={`font-bold text-lg ${(recipe.sellingPrice - recipe.totalCost) > 0 ? 'text-accent-green' : 'text-accent-red'}`}>{formatPeso(recipe.sellingPrice - recipe.totalCost)}</span>
                    </div>
                    {recipe.isTemplate && recipe.yieldAmount && recipe.costPerUnit !== undefined && (
                        <div className="flex justify-between items-center mt-2 pt-2 border-t border-border-color/50">
                            <span className="text-text-secondary text-xs">Cost per {recipe.yieldUnit || 'unit'}:</span>
                            <span className="font-semibold text-sm text-accent-blue">{formatPeso(recipe.costPerUnit)}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const RecipeListItem: React.FC<{ recipe: RecipeCosting; onEdit: () => void; onDelete: () => void; }> = ({ recipe, onEdit, onDelete }) => {
    const formatPeso = (amount: number) => `₱${amount.toFixed(2)}`;
    const profit = recipe.sellingPrice - recipe.totalCost;

    return (
        <div className="bg-bg-secondary border border-border-color rounded-lg p-3 hover:shadow-md hover:border-border-color/80 transition-all">
            <div className="flex items-center gap-3">
                {/* Recipe Name */}
                <div className="w-48 min-w-0 flex-shrink-0">
                    <h3 className="font-semibold text-text-primary text-sm truncate">{recipe.name}</h3>
                    {recipe.isTemplate && recipe.yieldAmount && recipe.costPerUnit !== undefined && (
                        <p className="text-xs text-accent-blue mt-0.5">
                            {formatPeso(recipe.costPerUnit)}/{recipe.yieldUnit || 'unit'}
                        </p>
                    )}
                </div>

                {/* Cost Details */}
                <div className="flex-1 grid grid-cols-4 gap-4 text-xs">
                    <div>
                        <div className="text-text-secondary mb-0.5">Ingredient Cost</div>
                        <div className="font-semibold text-text-primary">{formatPeso(recipe.totalCost)}</div>
                    </div>
                    <div>
                        <div className="text-text-secondary mb-0.5">Total Cost</div>
                        <div className="font-semibold text-text-primary">{formatPeso(recipe.totalCostWithAllocation)}</div>
                    </div>
                    <div>
                        <div className="text-text-secondary mb-0.5">Selling Price</div>
                        <div className="font-semibold text-text-primary">{formatPeso(recipe.sellingPrice)}</div>
                    </div>
                    <div>
                        <div className="text-text-secondary mb-0.5">Profit</div>
                        <div className={`font-bold ${profit > 0 ? 'text-accent-green' : 'text-accent-red'}`}>
                            {formatPeso(profit)}
                        </div>
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                        onClick={onEdit}
                        className="p-1.5 rounded text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 transition-colors"
                        title="View Recipe"
                    >
                        <EyeIcon className="w-4 h-4" />
                    </button>
                    <button
                        onClick={onDelete}
                        className="p-1.5 rounded text-text-secondary hover:text-accent-red hover:bg-accent-red/10 transition-colors"
                        title="Delete Recipe"
                    >
                        <TrashIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        </div>
    );
};


const Costing: React.FC<CostingProps> = ({ recipeCostings: propRecipeCostings, setRecipeCostings: setPropRecipeCostings, productInventoryItems: propProductInventoryItems }) => {
    // Fetch recipes from Firebase
    const { data: firebaseRecipes = [], loading: recipesLoading, error: recipesError, refetch } = useFirebaseData(
        () => recipesService.getAll(),
        []
    );

    // Fetch products from Firebase
    const { data: firebaseProducts = [], loading: productsLoading, error: productsError } = useFirebaseData(
        () => productInventoryService.getAll(),
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

    // Use Firebase products if available, otherwise use prop products (for backward compatibility)
    const productInventoryItems = (Array.isArray(firebaseProducts) && firebaseProducts.length > 0) ? firebaseProducts : (propProductInventoryItems || []);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [recipeToEdit, setRecipeToEdit] = useState<RecipeCosting | null>(null);
    const [recipeToDelete, setRecipeToDelete] = useState<RecipeCosting | null>(null);
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [viewMode, setViewMode] = useState<'card' | 'list'>('card');

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

                // Refetch data from Firebase
                refetch();

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

            // Refetch data from Firebase
            refetch();

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
    if (recipesLoading || productsLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <LoadingSpinner message="Loading data..." />
            </div>
        );
    }

    // Show error state
    if (recipesError || productsError) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                    <p className="text-red-500 font-medium">Error loading data</p>
                    <p className="text-text-secondary text-sm mt-1">{recipesError || productsError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto w-full">
            {/* Operation Status Messages */}
            {operationStatus && (
                <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border text-xs sm:text-sm ${
                    operationStatus.type === 'success'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                }`}>
                    <p className={operationStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}>
                        {operationStatus.message}
                    </p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 lg:mb-8 gap-3 sm:gap-4">
                 <div>
                    <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold">Costing Analysis</h2>
                    <p className="text-text-secondary mt-0.5 sm:mt-1 text-xs sm:text-sm">Analyze the cost and profitability of your recipes.</p>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
                    <div className="flex items-center bg-bg-secondary border border-border-color rounded-lg p-1">
                        <button
                            onClick={() => setViewMode('card')}
                            className={`p-2 rounded transition-colors ${viewMode === 'card' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'}`}
                            title="Card View"
                        >
                            <Squares2X2Icon className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded transition-colors ${viewMode === 'list' ? 'bg-accent-blue text-white' : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'}`}
                            title="List View"
                        >
                            <TableCellsIcon className="w-5 h-5" />
                        </button>
                    </div>
                    <button onClick={handleOpenAddModal} className="flex items-center gap-1.5 sm:gap-2 bg-accent-blue text-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg font-medium text-xs sm:text-sm shadow-md hover:bg-opacity-80 transition flex-1 sm:flex-initial justify-center">
                        <PlusIcon className="w-4 h-4 sm:w-5 sm:h-5"/>
                        Add Recipe Costing
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 lg:gap-4 xl:gap-6 mb-4 sm:mb-6 lg:mb-8">
                <StatCard title="Avg. Final Cost %" value={`${averageFinalCost.toFixed(2)}%`} />
                <StatCard title="Beverage Cost %" value="0.00%" />
                <StatCard title="Pastry Cost %" value="0.00%" />
                <StatCard title="Total Recipes" value={String(recipeCostings.length)} />
            </div>

            {/* Regular Recipes (not templates) */}
            {recipeCostings.filter(r => !r.isTemplate).length > 0 ? (
                viewMode === 'card' ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                        {recipeCostings.filter(r => !r.isTemplate).map(recipe => (
                            <RecipeCard
                                key={recipe.id}
                                recipe={recipe}
                                onEdit={() => handleOpenEditModal(recipe)}
                                onDelete={() => handleDeleteClick(recipe)}
                            />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recipeCostings.filter(r => !r.isTemplate).map(recipe => (
                            <RecipeListItem
                                key={recipe.id}
                                recipe={recipe}
                                onEdit={() => handleOpenEditModal(recipe)}
                                onDelete={() => handleDeleteClick(recipe)}
                            />
                        ))}
                    </div>
                )
            ) : (
                <div className="bg-bg-secondary rounded-xl border border-border-color">
                    <p className="p-16 text-center text-text-secondary">No recipe costings found. Click "Add Recipe Costing" to begin.</p>
                </div>
            )}

            {/* Template Recipes Section */}
            {recipeCostings.filter(r => r.isTemplate).length > 0 && (
                <>
                    <div className="mt-8 mb-4 border-t border-border-color pt-6">
                        <h3 className="text-lg font-semibold text-text-primary">Template Recipes</h3>
                        <p className="text-sm text-text-secondary mt-1">Reusable recipe components for other recipes</p>
                    </div>
                    {viewMode === 'card' ? (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 lg:gap-6">
                            {recipeCostings.filter(r => r.isTemplate).map(recipe => (
                                <RecipeCard
                                    key={recipe.id}
                                    recipe={recipe}
                                    onEdit={() => handleOpenEditModal(recipe)}
                                    onDelete={() => handleDeleteClick(recipe)}
                                />
                            ))}
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recipeCostings.filter(r => r.isTemplate).map(recipe => (
                                <RecipeListItem
                                    key={recipe.id}
                                    recipe={recipe}
                                    onEdit={() => handleOpenEditModal(recipe)}
                                    onDelete={() => handleDeleteClick(recipe)}
                                />
                            ))}
                        </div>
                    )}
                </>
            )}

            {isModalOpen && (
                <RecipeCostingModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveRecipe}
                    recipeToEdit={recipeToEdit}
                    products={productInventoryItems}
                    recipes={recipeCostings}
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