import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { InventoryItem, PurchaseOrder, ProductInventoryItem } from '../types';
import { PlusIcon, SearchIcon, FilterIcon, PencilIcon, TrashIcon, ViewDetailsIcon, EllipsisHorizontalIcon, ClockIcon, ExclamationCircleIcon, ClipboardDocumentListIcon, ArchiveBoxXMarkIcon, CheckIcon, XMarkIcon, UploadIcon } from '../components/Icons';
import LoadingSpinner from '../components/LoadingSpinner';
import ProductItemModal from '../components/ProductItemModal';
import ConfirmationModal from '../components/ConfirmationModal';
import { useFirebaseData, useFirebaseMutation } from '../hooks/useFirebase';
import { inventoryService, productInventoryService } from '../utils/firebaseService';


interface InventoryProps {
    inventoryItems?: InventoryItem[];
    setInventoryItems?: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    purchaseOrders?: PurchaseOrder[];
    setPurchaseOrders?: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
    productInventoryItems?: ProductInventoryItem[];
    setProductInventoryItems?: React.Dispatch<React.SetStateAction<ProductInventoryItem[]>>;
    activeView: 'supplies' | 'product';
    productCategories: string[];
    productBrands: string[];
    productUnits: string[];
    productSuppliers: string[];
    onAddProduct?: (product: Omit<ProductInventoryItem, 'id'>) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; description: string; icon: React.FC<{ className?: string }>; iconClasses: string }> = ({ title, value, description, icon: Icon, iconClasses }) => {
    const [bgColor, textColor] = iconClasses.split(' ');
    return (
        <div className="bg-bg-secondary p-3 sm:p-4 rounded-lg sm:rounded-xl border border-border-color">
            <div className="flex items-center gap-2 sm:gap-3">
                <div className={`p-1.5 sm:p-2 rounded-lg ${bgColor}`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${textColor}`} />
                </div>
                <h3 className="text-sm sm:text-base font-semibold">{title}</h3>
            </div>
            <p className="text-xl sm:text-2xl lg:text-3xl font-bold mt-2 sm:mt-4">{value}</p>
            <p className="text-[10px] sm:text-xs text-text-secondary">{description}</p>
        </div>
    );
};

const StatusBadge: React.FC<{ item: InventoryItem }> = ({ item }) => {
    const now = new Date();
    if (item.expirationDate && new Date(item.expirationDate) < now) {
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-accent-red/20 text-accent-red">Expired</span>;
    }
    if (item.stock === 0) {
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-accent-orange/20 text-accent-orange">Out of Stock</span>;
    }
    if (item.stock <= item.minStock) {
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-accent-yellow/20 text-accent-yellow">Low Stock</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-accent-green/20 text-accent-green">Good</span>;
};

const ProductInventoryView: React.FC<{
    products: ProductInventoryItem[];
    onUpdateProduct: (product: ProductInventoryItem) => void;
    onAddItemClick: () => void;
    productUnits: string[];
    onDeleteProduct: (product: ProductInventoryItem) => void;
    onUploadClick: () => void;
    onMigrateClick?: () => void;
    isMigrating?: boolean;
    migrationProgress?: { current: number; total: number };
}> = ({ products, onUpdateProduct, onAddItemClick, productUnits, onDeleteProduct, onUploadClick, onMigrateClick, isMigrating, migrationProgress }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [editingProductId, setEditingProductId] = useState<number | null>(null);
    const [editingProductData, setEditingProductData] = useState<ProductInventoryItem | null>(null);

    const handleEditClick = (product: ProductInventoryItem) => {
        setEditingProductId(product.id);
        setEditingProductData({ ...product });
    };

    const handleCancelClick = () => {
        setEditingProductId(null);
        setEditingProductData(null);
    };

    const handleSaveClick = () => {
        if (editingProductData) {
            onUpdateProduct(editingProductData);
            handleCancelClick();
        }
    };

    const handleFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        if (!editingProductData) return;
        const { name, value } = e.target;
        setEditingProductData({
            ...editingProductData,
            [name]: (name === 'price' || name === 'quantity') ? parseFloat(value) || 0 : value
        });
    };

    const filteredProducts = useMemo(() =>
        products.filter(product =>
            product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.brand.toLowerCase().includes(searchTerm.toLowerCase()) ||
            product.supplier.toLowerCase().includes(searchTerm.toLowerCase())
        ), [products, searchTerm]);
    
    const formatPeso = (amount: number) => {
        return new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(amount);
    };

    // Check if there are products with numeric IDs
    const hasLocalProducts = products.some(p => typeof p.id === 'number' || !isNaN(Number(p.id)));

    return (
        <div className="bg-bg-secondary rounded-lg sm:rounded-xl border border-border-color overflow-hidden shadow-lg">
            {/* Migration Progress Bar */}
            {isMigrating && migrationProgress && (
                <div className="bg-accent-blue/10 border-b border-accent-blue/30 px-3 sm:px-5 py-2 sm:py-3">
                    <div className="flex items-center justify-between mb-1 sm:mb-2">
                        <span className="text-xs sm:text-sm font-medium text-accent-blue">Migrating to Firebase...</span>
                        <span className="text-[10px] sm:text-xs text-text-secondary">{migrationProgress.current} / {migrationProgress.total}</span>
                    </div>
                    <div className="w-full bg-bg-primary rounded-full h-1.5 sm:h-2 overflow-hidden">
                        <div
                            className="bg-accent-blue h-full transition-all duration-300"
                            style={{ width: `${(migrationProgress.current / migrationProgress.total) * 100}%` }}
                        />
                    </div>
                </div>
            )}

            <div className="px-3 sm:px-4 lg:px-5 py-3 sm:py-4 flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3 border-b border-border-color bg-gradient-to-r from-bg-secondary to-bg-tertiary/20">
                <h2 className="text-sm sm:text-base lg:text-lg font-bold">Product Pricelist</h2>
                <div className="flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
                    <div className="relative flex-1 sm:flex-initial">
                        <SearchIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-text-secondary absolute top-1/2 left-2 sm:left-3 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search item..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-bg-primary border border-border-color rounded-lg py-1.5 sm:py-2 pl-7 sm:pl-9 pr-2 sm:pr-3 text-xs sm:text-sm focus:ring-2 focus:ring-accent-blue/50 focus:border-accent-blue w-full sm:w-48 lg:w-56 transition-all"
                        />
                    </div>
                    {hasLocalProducts && onMigrateClick && (
                        <button
                            onClick={onMigrateClick}
                            disabled={isMigrating}
                            className="flex items-center gap-1 sm:gap-1.5 bg-accent-blue text-white px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg hover:bg-opacity-90 transition-all hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
                        >
                            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                            </svg>
                            <span className="hidden md:inline">Migrate</span>
                        </button>
                    )}
                    <button onClick={onUploadClick} className="flex items-center gap-1 sm:gap-1.5 bg-bg-tertiary text-text-primary px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg hover:bg-hover-bg transition-all hover:scale-102 border border-border-color">
                        <UploadIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden md:inline">Upload</span>
                    </button>
                    <button onClick={onAddItemClick} className="flex items-center gap-1 sm:gap-1.5 bg-accent-green text-white px-2 sm:px-3 py-1.5 sm:py-2 text-[11px] sm:text-xs font-semibold rounded-lg shadow-md hover:bg-opacity-90 transition-all hover:scale-105">
                        <PlusIcon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                        <span className="hidden md:inline">Add</span>
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                    <thead className="bg-bg-tertiary/50 border-b border-border-color">
                        <tr>
                            {['Category', 'Item Name', 'Brand', 'Unit', 'Qty', 'Price', 'Price per Unit', 'Supplier', 'Action'].map(header => (
                                <th key={header} className="px-3 py-2.5 text-left text-xs font-bold text-text-secondary uppercase tracking-wider">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color/50">
                        {filteredProducts.length > 0 ? filteredProducts.map(product => {
                            const isEditing = editingProductId === product.id;
                            return (
                                <tr key={product.id} className={`transition-all ${isEditing ? 'bg-accent-blue/5 border-l-2 border-accent-blue' : 'hover:bg-hover-bg/30'}`}>
                                    {isEditing && editingProductData ? (
                                        <>
                                            <td className="px-3 py-2 text-sm"><input type="text" name="category" value={editingProductData.category} onChange={handleFieldChange} className="bg-bg-primary border border-border-color rounded-md px-2 py-1 w-full text-xs focus:ring-2 focus:ring-accent-blue/50"/></td>
                                            <td className="px-3 py-2 text-sm font-medium"><input type="text" name="name" value={editingProductData.name} onChange={handleFieldChange} className="bg-bg-primary border border-border-color rounded-md px-2 py-1 w-full text-xs focus:ring-2 focus:ring-accent-blue/50"/></td>
                                            <td className="px-3 py-2 text-sm"><input type="text" name="brand" value={editingProductData.brand} onChange={handleFieldChange} className="bg-bg-primary border border-border-color rounded-md px-2 py-1 w-full text-xs focus:ring-2 focus:ring-accent-blue/50"/></td>
                                            <td className="px-3 py-2 text-sm">
                                                <select name="unit" value={editingProductData.unit} onChange={handleFieldChange} autoComplete="off" className="bg-bg-primary border border-border-color rounded-md px-2 py-1 w-full text-xs focus:ring-2 focus:ring-accent-blue/50 appearance-none">
                                                    {!productUnits.includes(editingProductData.unit) && editingProductData.unit && (
                                                        <option value={editingProductData.unit}>{editingProductData.unit}</option>
                                                    )}
                                                    {productUnits.map(unit => (
                                                        <option key={unit} value={unit}>{unit}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="px-3 py-2 text-sm"><input type="number" name="quantity" value={editingProductData.quantity} onChange={handleFieldChange} className="bg-bg-primary border border-border-color rounded-md px-2 py-1 w-full text-xs focus:ring-2 focus:ring-accent-blue/50"/></td>
                                            <td className="px-3 py-2 text-sm"><input type="number" name="price" value={editingProductData.price} onChange={handleFieldChange} className="bg-bg-primary border border-border-color rounded-md px-2 py-1 w-full text-xs focus:ring-2 focus:ring-accent-blue/50"/></td>
                                            <td className="px-3 py-2 text-xs text-text-secondary">
                                                {editingProductData.quantity > 0 && editingProductData.price > 0
                                                    ? formatPeso(editingProductData.price / editingProductData.quantity) + '/' + editingProductData.unit
                                                    : '-'}
                                            </td>
                                            <td className="px-3 py-2 text-sm"><input type="text" name="supplier" value={editingProductData.supplier} onChange={handleFieldChange} className="bg-bg-primary border border-border-color rounded-md px-2 py-1 w-full text-xs focus:ring-2 focus:ring-accent-blue/50"/></td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={handleSaveClick} className="text-accent-green hover:bg-accent-green/20 p-1.5 rounded-md transition-all" title="Save"><CheckIcon className="w-4 h-4"/></button>
                                                    <button onClick={handleCancelClick} className="text-accent-red hover:bg-accent-red/20 p-1.5 rounded-md transition-all" title="Cancel"><XMarkIcon className="w-4 h-4"/></button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="px-3 py-3 text-xs">
                                                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-bg-tertiary/50 text-text-secondary font-medium">{product.category}</span>
                                            </td>
                                            <td className="px-3 py-3 text-sm font-semibold text-text-primary">{product.name}</td>
                                            <td className="px-3 py-3 text-xs text-text-secondary">{product.brand}</td>
                                            <td className="px-3 py-3 text-xs text-text-secondary">{product.unit}</td>
                                            <td className="px-3 py-3 text-sm font-bold text-accent-blue">{product.quantity}</td>
                                            <td className="px-3 py-3 text-sm font-bold text-text-primary">{formatPeso(product.price)}</td>
                                            <td className="px-3 py-3 text-xs text-text-secondary">
                                                {product.quantity > 0 && product.price > 0
                                                    ? formatPeso(product.price / product.quantity) + '/' + product.unit
                                                    : '-'}
                                            </td>
                                            <td className="px-3 py-3 text-xs text-text-secondary truncate max-w-[150px]" title={product.supplier}>{product.supplier}</td>
                                            <td className="px-3 py-3">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleEditClick(product)} className="text-text-secondary hover:text-accent-blue hover:bg-accent-blue/10 p-1.5 rounded-md transition-all" title="Edit">
                                                        <PencilIcon className="w-4 h-4" />
                                                    </button>
                                                    <button onClick={() => onDeleteProduct(product)} className="text-text-secondary hover:text-accent-red hover:bg-accent-red/10 p-1.5 rounded-md transition-all" title="Delete">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={9} className="text-center py-12 text-text-secondary text-sm">
                                    <div className="flex flex-col items-center gap-2">
                                        <svg className="w-12 h-12 text-text-secondary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                                        </svg>
                                        <p>No items found.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};


const InventoryAndSuppliesView: React.FC<{ inventoryItems: InventoryItem[] }> = ({ inventoryItems }) => {
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedDepartment, setSelectedDepartment] = useState('All');
    const [selectedItems, setSelectedItems] = useState<number[]>([]);
    const [activeActionMenu, setActiveActionMenu] = useState<number | null>(null);

    const actionMenuRef = useRef<HTMLDivElement>(null);
    const departments = ['All', 'Kitchen', 'Kitchen (Staff Meal)', 'Bakery', 'Dining', 'Bar'];


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as HTMLElement;
            if (
                activeActionMenu !== null &&
                !target.closest(`[data-action-menu-button="${activeActionMenu}"]`) &&
                !target.closest(`[data-action-menu="${activeActionMenu}"]`)
            ) {
                setActiveActionMenu(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [activeActionMenu]);
    
    const lowStockItems = inventoryItems.filter(item => item.stock > 0 && item.stock <= item.minStock).length;
    const outOfStockItems = inventoryItems.filter(item => item.stock === 0).length;

    const filteredItems = useMemo(() => 
        inventoryItems.filter(item =>
            (selectedDepartment === 'All' || item.department === selectedDepartment) &&
            item.name.toLowerCase().includes(searchTerm.toLowerCase())
        ), [inventoryItems, searchTerm, selectedDepartment]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedItems(filteredItems.map(item => item.id));
        } else {
            setSelectedItems([]);
        }
    };

    const handleSelectItem = (id: number) => {
        setSelectedItems(prev =>
            prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
        );
    };

    return (
        <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
                 <StatCard 
                    title="Low Stock Items" 
                    value={lowStockItems} 
                    description="Number of items that are running low"
                    icon={ClockIcon}
                    iconClasses="bg-accent-yellow/20 text-accent-yellow"
                />
                 <StatCard 
                    title="Out of Stock Items" 
                    value={outOfStockItems} 
                    description="Count of items currently out of stock"
                    icon={ArchiveBoxXMarkIcon}
                    iconClasses="bg-accent-orange/20 text-accent-orange"
                />
            </div>

            <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                <div className="px-4 border-b border-border-color">
                    <div className="flex items-center gap-2 -mb-px">
                        {departments.map(dept => (
                            <button
                                key={dept}
                                onClick={() => setSelectedDepartment(dept)}
                                className={`px-3 py-3 text-sm font-medium transition-all duration-200 ease-in-out border-b-2 ${
                                    selectedDepartment === dept
                                        ? 'border-accent-blue text-text-primary'
                                        : 'border-transparent text-text-secondary hover:text-text-primary'
                                }`}
                            >
                                {dept}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="p-6 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-border-color">
                    <h2 className="text-xl font-semibold">Inventory & Supplies Overview</h2>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                        <div className="relative w-full sm:w-auto">
                            <SearchIcon className="w-5 h-5 text-text-secondary absolute top-1/2 left-3 -translate-y-1/2" />
                            <input 
                                type="text"
                                placeholder="Search item..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="bg-bg-primary border border-border-color rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-accent-blue focus:border-accent-blue w-full sm:w-64"
                            />
                        </div>
                        <button className="flex items-center gap-2 bg-bg-tertiary px-4 py-2 text-sm font-medium rounded-lg hover:bg-hover-bg transition">
                            <FilterIcon className="w-4 h-4"/>
                            <span>Filter</span>
                        </button>
                        <button className="flex items-center gap-2 bg-accent-green text-white px-4 py-2 text-sm font-medium rounded-lg shadow-md hover:bg-opacity-80 transition">
                             <PlusIcon className="w-4 h-4" />
                            <span>Add Item</span>
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[1000px]">
                        <thead className="bg-bg-tertiary/40">
                            <tr>
                                <th className="p-4 w-12 text-left">
                                    <input 
                                        type="checkbox" 
                                        className="rounded bg-bg-primary border-border-color text-accent-blue focus:ring-accent-blue/50"
                                        checked={selectedItems.length > 0 && selectedItems.length === filteredItems.length}
                                        onChange={handleSelectAll}
                                    />
                                </th>
                                {['Item Name', 'Quantity', 'Storage Location', 'Last Updated', 'Status', 'Action'].map(header => (
                                    <th key={header} className="p-4 text-left text-sm font-medium text-text-secondary uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-border-color">
                            {filteredItems.length > 0 ? filteredItems.map(item => (
                                <tr key={item.id} className="hover:bg-hover-bg/50 transition-colors">
                                    <td className="p-4">
                                        <input 
                                            type="checkbox" 
                                            className="rounded bg-bg-primary border-border-color text-accent-blue focus:ring-accent-blue/50"
                                            checked={selectedItems.includes(item.id)}
                                            onChange={() => handleSelectItem(item.id)}
                                        />
                                    </td>
                                    <td className="p-4 text-sm font-medium">{item.name}</td>
                                    <td className="p-4 text-sm font-semibold">{item.stock}{item.unit}</td>
                                    <td className="p-4 text-sm text-text-secondary">{item.storageLocation}</td>
                                    <td className="p-4 text-sm text-text-secondary">
                                        {new Date(item.lastUpdated).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false })}
                                    </td>
                                    <td className="p-4"><StatusBadge item={item} /></td>
                                    <td className="p-4 text-sm relative">
                                        <button className="text-text-secondary hover:text-text-primary p-1" data-action-menu-button={item.id} onClick={() => setActiveActionMenu(activeActionMenu === item.id ? null : item.id)}>
                                            <EllipsisHorizontalIcon className="w-6 h-6"/>
                                        </button>
                                         {activeActionMenu === item.id && (
                                            <div ref={actionMenuRef} data-action-menu={item.id} className="absolute right-8 top-1/2 -translate-y-1/2 mt-1 w-40 bg-bg-tertiary border border-border-color rounded-lg shadow-lg z-10 animate-fade-in-up">
                                                <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-hover-bg rounded-t-lg">
                                                    <PencilIcon className="w-4 h-4" /> Edit
                                                </a>
                                                <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-text-primary hover:bg-hover-bg">
                                                    <ViewDetailsIcon className="w-4 h-4" /> View Details
                                                </a>
                                                <a href="#" className="flex items-center gap-3 px-4 py-2 text-sm text-accent-red hover:bg-hover-bg rounded-b-lg">
                                                    <TrashIcon className="w-4 h-4" /> Delete
                                                </a>
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={7} className="text-center p-16 text-text-secondary">No inventory items found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
        </>
    );
};

const Inventory: React.FC<InventoryProps> = ({ inventoryItems: propInventoryItems, setInventoryItems: setPropInventoryItems, purchaseOrders: propPurchaseOrders, setPurchaseOrders: setPropPurchaseOrders, productInventoryItems: propProductInventoryItems, setProductInventoryItems: setPropProductInventoryItems, activeView, productCategories, productBrands, productUnits, productSuppliers, onAddProduct }) => {
    // Refresh counter to trigger data re-fetch after mutations
    const [refreshCounter, setRefreshCounter] = useState(0);

    // Fetch inventory items from Firebase
    const { data: firebaseInventoryItems = [], loading: inventoryLoading, error: inventoryError } = useFirebaseData(
        () => inventoryService.getAll(),
        [refreshCounter]
    );

    // Fetch product inventory items from Firebase
    const { data: firebaseProductItems = [], loading: productLoading, error: productError } = useFirebaseData(
        () => productInventoryService.getAll(),
        [refreshCounter]
    );

    // Update product mutation
    const { mutate: updateProduct, loading: updateLoading, error: updateError } = useFirebaseMutation(
        (data: { id: string; product: Partial<ProductInventoryItem> }) =>
            productInventoryService.update(data.id, data.product)
    );

    // Delete product mutation
    const { mutate: deleteProduct, loading: deleteLoading, error: deleteError } = useFirebaseMutation(
        (id: string) => productInventoryService.delete(id)
    );

    // Add product mutation
    const { mutate: addProduct, loading: addLoading, error: addError } = useFirebaseMutation(
        (product: Omit<ProductInventoryItem, 'id'>) => productInventoryService.add(product)
    );

    // Use Firebase data if available, otherwise use prop data (for backward compatibility)
    const inventoryItems = (Array.isArray(firebaseInventoryItems) && firebaseInventoryItems.length > 0) ? firebaseInventoryItems : (propInventoryItems || []);
    const productInventoryItems = (Array.isArray(firebaseProductItems) && firebaseProductItems.length > 0) ? firebaseProductItems : (propProductInventoryItems || []);
    const purchaseOrders = propPurchaseOrders || [];

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<ProductInventoryItem | null>(null);
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isMigrating, setIsMigrating] = useState(false);
    const [migrationProgress, setMigrationProgress] = useState({ current: 0, total: 0 });
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formattedDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date());

    const pageTitle = activeView === 'product' ? 'Product Pricelist' : 'Inventory Management';

    const handleUpdateProduct = async (updatedProduct: ProductInventoryItem) => {
        try {
            const { id, ...productData } = updatedProduct;

            // Check if this is a Firebase document ID (string) or a local numeric ID
            const isFirebaseId = typeof id === 'string' && isNaN(Number(id));

            if (isFirebaseId) {
                // Update in Firebase
                await updateProduct({ id: String(id), product: productData });
                setOperationStatus({ type: 'success', message: 'Product updated successfully' });
            } else {
                // Local data only - update props
                setOperationStatus({ type: 'success', message: 'Product updated locally (not synced to Firebase)' });
            }

            // Trigger data refresh for both Firebase and local data
            setRefreshCounter(prev => prev + 1);
            setTimeout(() => setOperationStatus(null), 3000);

            // Update prop for backward compatibility
            if (setPropProductInventoryItems) {
                setPropProductInventoryItems(prev =>
                    prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
                );
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to update product';
            setOperationStatus({ type: 'error', message: errorMsg });
        }
    };

    const handleDeleteProduct = (product: ProductInventoryItem) => {
        setItemToDelete(product);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = async () => {
        if (itemToDelete) {
            try {
                const { id } = itemToDelete;

                // Check if this is a Firebase document ID (string) or a local numeric ID
                const isFirebaseId = typeof id === 'string' && isNaN(Number(id));

                if (isFirebaseId) {
                    // Delete from Firebase
                    await deleteProduct(String(id));
                    setOperationStatus({ type: 'success', message: 'Product deleted successfully' });
                    // Trigger data refresh
                    setRefreshCounter(prev => prev + 1);
                } else {
                    // Local data only - update props
                    setOperationStatus({ type: 'success', message: 'Product deleted locally (not synced to Firebase)' });
                }

                setTimeout(() => setOperationStatus(null), 3000);
                setIsConfirmModalOpen(false);
                setItemToDelete(null);

                // Update prop for backward compatibility
                if (setPropProductInventoryItems) {
                    setPropProductInventoryItems(prev => prev.filter(p => p.id !== itemToDelete.id));
                }
            } catch (err) {
                const errorMsg = err instanceof Error ? err.message : 'Failed to delete product';
                setOperationStatus({ type: 'error', message: errorMsg });
            }
        }
    };

    const handleSaveNewProduct = async (newProductData: Omit<ProductInventoryItem, 'id'>) => {
        try {
            // Add to Firebase
            await addProduct(newProductData);
            setOperationStatus({ type: 'success', message: 'Product added successfully' });
            setIsAddModalOpen(false);

            // Trigger data refresh
            setRefreshCounter(prev => prev + 1);
            setTimeout(() => setOperationStatus(null), 3000);

            // Call onAddProduct for backward compatibility
            if (onAddProduct) {
                onAddProduct(newProductData);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to add product';
            setOperationStatus({ type: 'error', message: errorMsg });
        }
    };

    const parseCsvLine = (line: string): string[] => {
        const values: string[] = [];
        let current = '';
        let inQuotes = false;
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
                if (inQuotes && i < line.length - 1 && line[i + 1] === '"') {
                    current += '"';
                    i++; 
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (char === ',' && !inQuotes) {
                values.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        values.push(current.trim());
        return values;
    };

    const parseAndAddProducts = (csvText: string) => {
        const allLines = csvText.split(/\r?\n/).filter(line => line.trim() !== '');
        if (allLines.length < 2) {
            alert('CSV file must have a header row and at least one data row.');
            return;
        }

        const headers = parseCsvLine(allLines[0].replace(/^\uFEFF/, '')).map(h => h.trim().toUpperCase());
        const nameIndex = headers.indexOf('ITEM');
        const brandIndex = headers.indexOf('BRAND');
        const categoryIndex = headers.indexOf('CATEGORY');
        const quantityIndex = headers.indexOf('QUANTITY');
        const unitIndex = headers.indexOf('UNIT');
        const priceIndex = headers.indexOf('PRICE');
        const supplierIndex = headers.indexOf('SUPPLIER');

        if (nameIndex === -1 || categoryIndex === -1) {
            alert('CSV must contain "ITEM" and "CATEGORY" columns.');
            return;
        }

        const dataLines = allLines.slice(1).filter(line => {
            const firstCell = parseCsvLine(line)[0];
            return firstCell && firstCell.toUpperCase() !== 'ITEM';
        });

        const productsToAdd: Omit<ProductInventoryItem, 'id'>[] = [];
        const skippedProducts: string[] = [];

        const existingProductsMap = new Map<string, ProductInventoryItem>();
        productInventoryItems.forEach(p => {
            const key = `${p.name.toLowerCase().trim()}-${(p.brand || '').toLowerCase().trim()}`;
            existingProductsMap.set(key, p);
        });

        dataLines.forEach(line => {
            const values = parseCsvLine(line);
            const name = values[nameIndex];
            if (!name) return;

            const brand = brandIndex > -1 ? values[brandIndex] : '';
            const category = values[categoryIndex];
            if (!category) return;

            const productKey = `${name.toLowerCase().trim()}-${brand.toLowerCase().trim()}`;

            const unit = unitIndex > -1 ? values[unitIndex] : 'pcs';
            const quantity = quantityIndex > -1 ? parseFloat(values[quantityIndex]) : 0;
            const price = priceIndex > -1 ? parseFloat(values[priceIndex]) : 0;
            const supplier = supplierIndex > -1 ? values[supplierIndex] : '';

            const productData = {
                name,
                brand,
                category,
                unit: unit || 'pcs',
                quantity: isNaN(quantity) ? 0 : quantity,
                price: isNaN(price) ? 0 : price,
                supplier: supplier || '',
            };

            const existingProduct = existingProductsMap.get(productKey);

            if (existingProduct) {
                // Skip existing products - don't update them
                skippedProducts.push(name);
            } else {
                // Only add new products
                productsToAdd.push(productData);
            }
        });

        if (productsToAdd.length > 0) {
            setPropProductInventoryItems?.(prevItems => {
                let maxId = prevItems.reduce((max, item) => Math.max(item.id, max), 0);

                const newItems = productsToAdd.map(newItem => ({
                    ...newItem,
                    id: ++maxId,
                }));

                return [...prevItems, ...newItems];
            });

            alert(`${productsToAdd.length} new products added successfully.${skippedProducts.length > 0 ? `\n${skippedProducts.length} existing products were skipped (not updated).` : ''}`);
        } else {
            alert('No new products to add. All products in the CSV already exist.');
        }
    };

    const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (file.type !== 'text/csv') {
            alert('Please upload a valid CSV file.');
            return;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            if (text) {
                parseAndAddProducts(text);
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    };

    const handleUploadClick = () => {
        fileInputRef.current?.click();
    };

    const handleMigrateToFirebase = async () => {
        // Find all products with numeric IDs (CSV-imported data)
        const productsToMigrate = productInventoryItems.filter(product => {
            return typeof product.id === 'number' || !isNaN(Number(product.id));
        });

        if (productsToMigrate.length === 0) {
            setOperationStatus({ type: 'success', message: 'No products to migrate. All products are already in Firebase.' });
            setTimeout(() => setOperationStatus(null), 3000);
            return;
        }

        const confirmed = confirm(`Found ${productsToMigrate.length} products with local IDs. Migrate them to Firebase?`);
        if (!confirmed) return;

        setIsMigrating(true);
        setMigrationProgress({ current: 0, total: productsToMigrate.length });

        let successCount = 0;
        let errorCount = 0;

        for (let i = 0; i < productsToMigrate.length; i++) {
            const product = productsToMigrate[i];
            const { id, ...productData } = product;

            try {
                await addProduct(productData);
                successCount++;
            } catch (err) {
                console.error(`Failed to migrate product ${product.name}:`, err);
                errorCount++;
            }

            setMigrationProgress({ current: i + 1, total: productsToMigrate.length });
        }

        setIsMigrating(false);
        setMigrationProgress({ current: 0, total: 0 });

        if (successCount > 0) {
            setOperationStatus({
                type: 'success',
                message: `Migration complete! ${successCount} products migrated to Firebase${errorCount > 0 ? `, ${errorCount} failed` : ''}.`
            });

            // Clear local data after successful migration
            if (setPropProductInventoryItems) {
                setPropProductInventoryItems([]);
            }

            // Refresh to show Firebase data
            setRefreshCounter(prev => prev + 1);
        } else {
            setOperationStatus({ type: 'error', message: 'Migration failed. No products were migrated.' });
        }

        setTimeout(() => setOperationStatus(null), 5000);
    };

    // Show loading state
    if (inventoryLoading || productLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <LoadingSpinner message="Loading inventory items..." />
            </div>
        );
    }

    // Show error state
    if (inventoryError || productError) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                    <p className="text-red-500 font-medium">Error loading inventory items</p>
                    <p className="text-text-secondary text-sm mt-1">{inventoryError || productError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-7xl mx-auto w-full">
            {/* Operation Status Messages */}
            {operationStatus && (
                <div className={`mb-4 sm:mb-6 p-3 sm:p-4 rounded-lg border ${
                    operationStatus.type === 'success'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                }`}>
                    <p className={`text-xs sm:text-sm ${operationStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}`}>
                        {operationStatus.message}
                    </p>
                </div>
            )}
            <input
                type="file"
                ref={fileInputRef}
                className="hidden"
                accept=".csv"
                onChange={handleFileUpload}
            />
            <div className="mb-4 sm:mb-6 lg:mb-8">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-text-primary">{pageTitle}</h1>
                <p className="text-text-secondary text-xs sm:text-sm mt-0.5 sm:mt-1">Today, {formattedDate}</p>
            </div>
            
            {activeView === 'product' ? (
                <ProductInventoryView
                    key={`product-view-${refreshCounter}`}
                    products={productInventoryItems}
                    onUpdateProduct={handleUpdateProduct}
                    onAddItemClick={() => setIsAddModalOpen(true)}
                    productUnits={productUnits}
                    onDeleteProduct={handleDeleteProduct}
                    onUploadClick={handleUploadClick}
                    onMigrateClick={handleMigrateToFirebase}
                    isMigrating={isMigrating}
                    migrationProgress={migrationProgress}
                />
            ) : (
                <InventoryAndSuppliesView inventoryItems={inventoryItems} />
            )}

            {isAddModalOpen && (
                <ProductItemModal
                    isOpen={isAddModalOpen}
                    onClose={() => setIsAddModalOpen(false)}
                    onSave={handleSaveNewProduct}
                    categories={productCategories}
                    brands={productBrands}
                    units={productUnits}
                    suppliers={productSuppliers}
                />
            )}

            {isConfirmModalOpen && itemToDelete && (
                <ConfirmationModal
                    isOpen={isConfirmModalOpen}
                    onClose={() => setIsConfirmModalOpen(false)}
                    onConfirm={handleConfirmDelete}
                    title="Delete Product"
                    message={`Are you sure you want to delete "${itemToDelete.name}"? This action cannot be undone.`}
                    confirmText="Delete"
                    iconType="danger"
                />
            )}
        </div>
    );
};

export default Inventory;
