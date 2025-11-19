import React, { useState, useMemo } from 'react';
import type { PurchaseOrder, ProductInventoryItem } from '../types';
import { PlusIcon, SearchIcon, EllipsisHorizontalIcon } from '../components/Icons';
import LoadingSpinner from '../components/LoadingSpinner';
import PurchaseRequestModal from '../components/PurchaseRequestModal';
import { useFirebaseData, useFirebaseMutation } from '../hooks/useFirebase';
import { purchaseOrderService, productInventoryService } from '../utils/firebaseService';

interface PurchaseRequestProps {
    purchaseOrders?: PurchaseOrder[];
    setPurchaseOrders?: React.Dispatch<React.SetStateAction<PurchaseOrder[]>>;
    productInventoryItems: ProductInventoryItem[];
    onAddPurchaseOrder?: (order: Omit<PurchaseOrder, 'id' | 'date' | 'status'>) => void;
    departments: string[];
}

const StatusBadge: React.FC<{ status: PurchaseOrder['status'] }> = ({ status }) => {
    const statusClasses = {
        Pending: 'bg-accent-yellow/20 text-accent-yellow',
        Completed: 'bg-accent-green/20 text-accent-green',
        Cancelled: 'bg-accent-red/20 text-accent-red',
    };
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusClasses[status]}`}>{status}</span>;
};

const PurchaseRequest: React.FC<PurchaseRequestProps> = ({ purchaseOrders: propPurchaseOrders, setPurchaseOrders: setPropPurchaseOrders, productInventoryItems: propProductInventoryItems, onAddPurchaseOrder, departments }) => {
    // Fetch purchase orders from Firebase
    const { data: firebaseOrders = [], loading: ordersLoading, error: ordersError } = useFirebaseData(
        () => purchaseOrderService.getAll(),
        []
    );

    // Fetch product inventory from Firebase
    const { data: firebaseProductItems = [], loading: productsLoading, error: productsError } = useFirebaseData(
        () => productInventoryService.getAll(),
        []
    );

    // Add purchase order mutation
    const { mutate: addOrder, loading: addLoading, error: addError } = useFirebaseMutation(
        (order: Omit<PurchaseOrder, 'id' | 'date' | 'status'>) => purchaseOrderService.add(order)
    );

    // Use Firebase orders if available, otherwise use prop orders (for backward compatibility)
    const purchaseOrders = (Array.isArray(firebaseOrders) && firebaseOrders.length > 0) ? firebaseOrders : (propPurchaseOrders || []);

    // Use Firebase product items if available, otherwise use prop data (for backward compatibility)
    const productInventoryItems = (Array.isArray(firebaseProductItems) && firebaseProductItems.length > 0) ? firebaseProductItems : (propProductInventoryItems || []);

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);

    const filteredOrders = useMemo(() =>
        purchaseOrders.filter(order =>
            order.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(order.id).includes(searchTerm)
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [purchaseOrders, searchTerm]);

    const handleSaveNewOrder = async (newOrderData: Omit<PurchaseOrder, 'id' | 'date' | 'status'>) => {
        try {
            await addOrder(newOrderData);
            setOperationStatus({ type: 'success', message: 'Purchase order created successfully' });
            setIsModalOpen(false);
            setTimeout(() => setOperationStatus(null), 3000);

            // Update prop for backward compatibility
            if (setPropPurchaseOrders) {
                setPropPurchaseOrders(purchaseOrders);
            }

            // Also call the callback if provided
            if (onAddPurchaseOrder) {
                onAddPurchaseOrder(newOrderData);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to create purchase order';
            setOperationStatus({ type: 'error', message: errorMsg });
        }
    };
    
    // Show loading state
    if (ordersLoading || productsLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <LoadingSpinner message="Loading data..." />
            </div>
        );
    }

    // Show error state
    if (ordersError || productsError) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                    <p className="text-red-500 font-medium">Error loading data</p>
                    <p className="text-text-secondary text-sm mt-1">{ordersError || productsError}</p>
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
                    <h1 className="text-3xl font-bold text-text-primary">Purchase Requests</h1>
                    <p className="text-text-secondary">Manage and track your purchase orders.</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 bg-accent-blue text-white px-4 py-2 text-sm font-medium rounded-lg shadow-md hover:bg-opacity-80 transition w-full sm:w-auto"
                >
                     <PlusIcon className="w-4 h-4" />
                    <span>New Purchase Request</span>
                </button>
            </div>
            
            <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-border-color">
                    <h2 className="text-xl font-semibold">Order History</h2>
                    <div className="relative w-full sm:w-auto">
                        <SearchIcon className="w-5 h-5 text-text-secondary absolute top-1/2 left-3 -translate-y-1/2" />
                        <input 
                            type="text"
                            placeholder="Search by department or PO#..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-bg-primary border border-border-color rounded-lg py-2 pl-10 pr-4 text-sm focus:ring-accent-blue focus:border-accent-blue w-full sm:w-64"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[800px]">
                        <thead className="bg-bg-tertiary/40">
                            <tr>
                                {['Date', 'Department', 'Total Cost', 'Status', 'Action'].map(header => (
                                    <th key={header} className="p-4 text-left text-sm font-medium text-text-secondary uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-border-color">
                            {filteredOrders.length > 0 ? filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-hover-bg/50 transition-colors">
                                    <td className="p-4 text-sm text-text-secondary">
                                        {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="p-4 text-sm font-medium">{order.department}</td>
                                    <td className="p-4 text-sm font-semibold">
                                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(order.totalCost)}
                                    </td>
                                    <td className="p-4"><StatusBadge status={order.status} /></td>
                                    <td className="p-4 text-sm">
                                        <button className="text-text-secondary hover:text-text-primary p-1">
                                            <EllipsisHorizontalIcon className="w-6 h-6"/>
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center p-16 text-text-secondary">No purchase requests found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
            {isModalOpen && (
                <PurchaseRequestModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveNewOrder}
                    productInventoryItems={productInventoryItems}
                    departments={departments}
                />
            )}
        </div>
    );
};

export default PurchaseRequest;