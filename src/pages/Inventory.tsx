import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { InventoryItem, PurchaseOrder, ProductInventoryItem } from '../types';
import { PlusIcon, SearchIcon, FilterIcon, PencilIcon, TrashIcon, ViewDetailsIcon, EllipsisHorizontalIcon, ClockIcon, ExclamationCircleIcon, ClipboardDocumentListIcon, ArchiveBoxXMarkIcon, CheckIcon, XMarkIcon, UploadIcon } from '../components/Icons';
import ProductItemModal from '../components/ProductItemModal';
import ConfirmationModal from '../components/ConfirmationModal';


interface InventoryProps {
    inventoryItems: InventoryItem[];
    setInventoryItems: React.Dispatch<React.SetStateAction<InventoryItem[]>>;
    purchaseOrders: PurchaseOrder[];
    setPurchaseOrders: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
    productInventoryItems: ProductInventoryItem[];
    setProductInventoryItems: React.Dispatch<React.SetStateAction<ProductInventoryItem[]>>;
    activeView: 'supplies' | 'product';
    productCategories: string[];
    productBrands: string[];
    productUnits: string[];
    productSuppliers: string[];
    onAddProduct: (product: Omit<ProductInventoryItem, 'id'>) => void;
}

const StatCard: React.FC<{ title: string; value: string | number; description: string; icon: React.FC<{ className?: string }>; iconClasses: string }> = ({ title, value, description, icon: Icon, iconClasses }) => {
    const [bgColor, textColor] = iconClasses.split(' ');
    return (
        <div className="bg-bg-secondary p-4 rounded-xl border border-border-color">
            <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${bgColor}`}>
                    <Icon className={`w-5 h-5 ${textColor}`} />
                </div>
                <h3 className="font-semibold">{title}</h3>
            </div>
            <p className="text-3xl font-bold mt-4">{value}</p>
            <p className="text-xs text-text-secondary">{description}</p>
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
}> = ({ products, onUpdateProduct, onAddItemClick, productUnits, onDeleteProduct, onUploadClick }) => {
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
            [name]: name === 'price' ? parseFloat(value) || 0 : value 
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
    
    return (
        <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
            <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-border-color">
                <h2 className="text-xl font-semibold">Product Pricelist</h2>
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
                    <button onClick={onUploadClick} className="flex items-center gap-2 bg-bg-tertiary text-text-primary px-4 py-2 text-sm font-medium rounded-lg hover:bg-hover-bg transition">
                        <UploadIcon className="w-4 h-4" />
                        <span>Upload CSV</span>
                    </button>
                    <button onClick={onAddItemClick} className="flex items-center gap-2 bg-accent-green text-white px-4 py-2 text-sm font-medium rounded-lg shadow-md hover:bg-opacity-80 transition">
                        <PlusIcon className="w-4 h-4" />
                        <span>Add Item</span>
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1000px]">
                    <thead className="bg-bg-tertiary/40">
                        <tr>
                            {['Category', 'Item Name', 'Brand', 'Unit', 'Price', 'Supplier', 'Action'].map(header => (
                                <th key={header} className="p-4 text-left text-sm font-medium text-text-secondary uppercase tracking-wider">{header}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border-color">
                        {filteredProducts.length > 0 ? filteredProducts.map(product => {
                            const isEditing = editingProductId === product.id;
                            return (
                                <tr key={product.id} className={`transition-colors ${isEditing ? 'bg-hover-bg' : 'hover:bg-hover-bg/50'}`}>
                                    {isEditing && editingProductData ? (
                                        <>
                                            <td className="p-2 text-sm"><input type="text" name="category" value={editingProductData.category} onChange={handleFieldChange} className="bg-bg-primary border border-border-color rounded-md p-1.5 w-full text-sm"/></td>
                                            <td className="p-2 text-sm font-medium"><input type="text" name="name" value={editingProductData.name} onChange={handleFieldChange} className="bg-bg-primary border border-border-color rounded-md p-1.5 w-full text-sm"/></td>
                                            <td className="p-2 text-sm"><input type="text" name="brand" value={editingProductData.brand} onChange={handleFieldChange} className="bg-bg-primary border border-border-color rounded-md p-1.5 w-full text-sm"/></td>
                                            <td className="p-2 text-sm text-text-secondary">
                                                <select name="unit" value={editingProductData.unit} onChange={handleFieldChange} className="bg-bg-primary border border-border-color rounded-md p-1.5 w-full text-sm">
                                                    {!productUnits.includes(editingProductData.unit) && editingProductData.unit && (
                                                        <option value={editingProductData.unit}>{editingProductData.unit}</option>
                                                    )}
                                                    {productUnits.map(unit => (
                                                        <option key={unit} value={unit}>{unit}</option>
                                                    ))}
                                                </select>
                                            </td>
                                            <td className="p-2 text-sm font-semibold"><input type="number" name="price" value={editingProductData.price} onChange={handleFieldChange} className="bg-bg-primary border border-border-color rounded-md p-1.5 w-full text-sm"/></td>
                                            <td className="p-2 text-sm"><input type="text" name="supplier" value={editingProductData.supplier} onChange={handleFieldChange} className="bg-bg-primary border border-border-color rounded-md p-1.5 w-full text-sm"/></td>
                                            <td className="p-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <button onClick={handleSaveClick} className="text-accent-green hover:bg-accent-green/20 p-2 rounded-full" title="Save"><CheckIcon className="w-5 h-5"/></button>
                                                    <button onClick={handleCancelClick} className="text-accent-red hover:bg-accent-red/20 p-2 rounded-full" title="Cancel"><XMarkIcon className="w-5 h-5"/></button>
                                                </div>
                                            </td>
                                        </>
                                    ) : (
                                        <>
                                            <td className="p-4 text-sm">{product.category}</td>
                                            <td className="p-4 text-sm font-medium">{product.name}</td>
                                            <td className="p-4 text-sm">{product.brand}</td>
                                            <td className="p-4 text-sm text-text-secondary">{product.unit}</td>
                                            <td className="p-4 text-sm font-semibold">{formatPeso(product.price)}</td>
                                            <td className="p-4 text-sm">{product.supplier}</td>
                                            <td className="p-4 text-sm">
                                                <div className="flex items-center gap-1">
                                                    <button onClick={() => handleEditClick(product)} className="text-text-secondary hover:text-text-primary p-2 hover:bg-hover-bg rounded-full" title="Edit">
                                                        <PencilIcon className="w-5 h-5" />
                                                    </button>
                                                    <button onClick={() => onDeleteProduct(product)} className="text-text-secondary hover:text-accent-red p-2 hover:bg-hover-bg rounded-full" title="Delete">
                                                        <TrashIcon className="w-5 h-5" />
                                                    </button>
                                                </div>
                                            </td>
                                        </>
                                    )}
                                </tr>
                            )
                        }) : (
                            <tr>
                                <td colSpan={7} className="text-center p-16 text-text-secondary">No items found.</td>
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
    const departments = ['All', 'Kitchen', 'Bakery', 'Dining', 'Bar'];


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

const Inventory: React.FC<InventoryProps> = ({ inventoryItems, setInventoryItems, purchaseOrders, setPurchaseOrders, productInventoryItems, setProductInventoryItems, activeView, productCategories, productBrands, productUnits, productSuppliers, onAddProduct }) => {
    
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isConfirmModalOpen, setIsConfirmModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<ProductInventoryItem | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const formattedDate = new Intl.DateTimeFormat('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).format(new Date());

    const pageTitle = activeView === 'product' ? 'Product Pricelist' : 'Inventory Management';

    const handleUpdateProduct = (updatedProduct: ProductInventoryItem) => {
        setProductInventoryItems(prev => 
            prev.map(p => p.id === updatedProduct.id ? updatedProduct : p)
        );
    };

    const handleDeleteProduct = (product: ProductInventoryItem) => {
        setItemToDelete(product);
        setIsConfirmModalOpen(true);
    };

    const handleConfirmDelete = () => {
        if (itemToDelete) {
            setProductInventoryItems(prev => prev.filter(p => p.id !== itemToDelete.id));
            setIsConfirmModalOpen(false);
            setItemToDelete(null);
        }
    };

    const handleSaveNewProduct = (newProductData: Omit<ProductInventoryItem, 'id'>) => {
        onAddProduct(newProductData);
        setIsAddModalOpen(false);
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

        if (nameIndex === -1 || categoryIndex === -1) {
            alert('CSV must contain "ITEM" and "CATEGORY" columns.');
            return;
        }

        const dataLines = allLines.slice(1).filter(line => {
            const firstCell = parseCsvLine(line)[0];
            return firstCell && firstCell.toUpperCase() !== 'ITEM';
        });

        const productsToUpdate: { [key: number]: Partial<ProductInventoryItem> } = {};
        const productsToAdd: Omit<ProductInventoryItem, 'id'>[] = [];

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
            const price = priceIndex > -1 ? parseFloat(values[priceIndex]) : 0;
            
            const productData = {
                name,
                brand,
                category,
                unit: unit || 'pcs',
                price: isNaN(price) ? 0 : price,
                supplier: '', // Supplier not in CSV, can be edited later
            };

            const existingProduct = existingProductsMap.get(productKey);

            if (existingProduct) {
                productsToUpdate[existingProduct.id] = {
                    unit: productData.unit,
                    price: productData.price,
                };
            } else {
                productsToAdd.push(productData);
            }
        });
        
        if (Object.keys(productsToUpdate).length > 0 || productsToAdd.length > 0) {
            setProductInventoryItems(prevItems => {
                let maxId = prevItems.reduce((max, item) => Math.max(item.id, max), 0);
                
                const updatedItems = prevItems.map(item => 
                    productsToUpdate[item.id] ? { ...item, ...productsToUpdate[item.id] } : item
                );

                const newItems = productsToAdd.map(newItem => ({
                    ...newItem,
                    id: ++maxId,
                }));

                return [...updatedItems, ...newItems];
            });

            alert(`${Object.keys(productsToUpdate).length} products updated and ${productsToAdd.length} new products added successfully.`);
        } else {
            alert('No new products to add or existing products to update from the CSV file.');
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

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".csv"
                onChange={handleFileUpload}
            />
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-text-primary">{pageTitle}</h1>
                <p className="text-text-secondary">Today, {formattedDate}</p>
            </div>
            
            {activeView === 'product' ? (
                <ProductInventoryView 
                    products={productInventoryItems} 
                    onUpdateProduct={handleUpdateProduct}
                    onAddItemClick={() => setIsAddModalOpen(true)}
                    productUnits={productUnits}
                    onDeleteProduct={handleDeleteProduct}
                    onUploadClick={handleUploadClick}
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
