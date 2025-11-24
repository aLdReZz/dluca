import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { PurchaseOrder, ProductInventoryItem } from '../types';
import { PlusIcon, SearchIcon, EllipsisHorizontalIcon } from '../components/Icons';
import LoadingSpinner from '../components/LoadingSpinner';
import PurchaseRequestModal from '../components/PurchaseRequestModal';
import PurchaseOrderDetailsModal from '../components/PurchaseOrderDetailsModal';
import DeleteConfirmationModal from '../components/DeleteConfirmationModal';
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
        'In Progress': 'bg-accent-orange/20 text-accent-orange',
        Completed: 'bg-accent-green/20 text-accent-green',
        Cancelled: 'bg-accent-red/20 text-accent-red',
    };
    return <span className={`inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium ${statusClasses[status]}`}>{status}</span>;
};

const PurchaseRequest: React.FC<PurchaseRequestProps> = ({ purchaseOrders: propPurchaseOrders, setPurchaseOrders: setPropPurchaseOrders, productInventoryItems: propProductInventoryItems, onAddPurchaseOrder, departments }) => {
    // Fetch purchase orders from Firebase
    const { data: firebaseOrders = [], loading: ordersLoading, error: ordersError, refetch: refetchOrders } = useFirebaseData(
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

    // Update purchase order mutation
    const { mutate: updateOrder, loading: updateLoading, error: updateError } = useFirebaseMutation(
        (data: { id: string, order: Partial<PurchaseOrder> }) => purchaseOrderService.update(data.id, data.order)
    );

    // Delete purchase order mutation
    const { mutate: deleteOrder, loading: deleteLoading, error: deleteError } = useFirebaseMutation(
        (id: string) => purchaseOrderService.delete(id)
    );

    // Use Firebase orders if available, otherwise use prop orders (for backward compatibility)
    // Once we've loaded from Firebase (even if empty), always use Firebase data
    const purchaseOrders = (!ordersLoading && Array.isArray(firebaseOrders)) ? firebaseOrders : (propPurchaseOrders || []);

    // Use Firebase product items if available, otherwise use prop data (for backward compatibility)
    const productInventoryItems = (Array.isArray(firebaseProductItems) && firebaseProductItems.length > 0) ? firebaseProductItems : (propProductInventoryItems || []);

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [openDropdownId, setOpenDropdownId] = useState<string | null>(null);
    const [viewingOrder, setViewingOrder] = useState<PurchaseOrder | null>(null);
    const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
    const [deletingOrder, setDeletingOrder] = useState<PurchaseOrder | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ top: number; right: number } | null>(null);
    const dropdownButtonRefs = useRef<{ [key: string]: HTMLButtonElement | null }>({});

    const filteredOrders = useMemo(() =>
        purchaseOrders.filter(order =>
            order.department.toLowerCase().includes(searchTerm.toLowerCase()) ||
            String(order.id).includes(searchTerm)
        ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), [purchaseOrders, searchTerm]);

    const handleSaveNewOrder = async (newOrderData: Omit<PurchaseOrder, 'id' | 'date' | 'status'>) => {
        try {
            if (editingOrder) {
                // Update existing order
                await updateOrder({
                    id: String(editingOrder.id),
                    order: newOrderData
                });
                setOperationStatus({ type: 'success', message: 'Purchase order updated successfully' });
                setEditingOrder(null);
            } else {
                // Create new order
                await addOrder(newOrderData);
                setOperationStatus({ type: 'success', message: 'Purchase order created successfully' });
            }

            setIsModalOpen(false);

            // Refetch immediately after mutation completes
            await refetchOrders();

            setTimeout(() => setOperationStatus(null), 3000);

            // Update prop for backward compatibility
            if (setPropPurchaseOrders) {
                setPropPurchaseOrders(purchaseOrders);
            }

            // Also call the callback if provided
            if (onAddPurchaseOrder && !editingOrder) {
                onAddPurchaseOrder(newOrderData);
            }
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : `Failed to ${editingOrder ? 'update' : 'create'} purchase order`;
            setOperationStatus({ type: 'error', message: errorMsg });
        }
    };

    const handleViewDetails = (order: PurchaseOrder) => {
        setViewingOrder(order);
        setOpenDropdownId(null);
    };

    const handleSaveDeliveries = async ({ orderId, delivered, status }: { orderId: number; delivered: Record<number, boolean>; status: PurchaseOrder['status'] }) => {
        try {
            await updateOrder({
                id: String(orderId),
                order: { status, delivered }
            });
            await refetchOrders();
            setViewingOrder(prev => (prev && prev.id === orderId ? { ...prev, status, delivered } : prev));
            setOperationStatus({ type: 'success', message: 'Deliveries saved' });
            setTimeout(() => setOperationStatus(null), 2000);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to update order status';
            setOperationStatus({ type: 'error', message: errorMsg });
            setTimeout(() => setOperationStatus(null), 3000);
        }
    };

    const handleEditOrder = (order: PurchaseOrder) => {
        setEditingOrder(order);
        setIsModalOpen(true);
        setOpenDropdownId(null);
    };

    const handleDeleteOrder = (order: PurchaseOrder) => {
        setDeletingOrder(order);
        setOpenDropdownId(null);
    };

    const handleConfirmDelete = async () => {
        if (!deletingOrder) return;

        try {
            await deleteOrder(String(deletingOrder.id));
            setDeletingOrder(null);

            // Refetch immediately after delete completes
            await refetchOrders();

            setOperationStatus({ type: 'success', message: 'Purchase order deleted successfully' });
            setTimeout(() => setOperationStatus(null), 3000);
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : 'Failed to delete purchase order';
            setOperationStatus({ type: 'error', message: errorMsg });
            setDeletingOrder(null);
        }
    };

    const handleNewOrder = () => {
        setEditingOrder(null);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setEditingOrder(null);
    };

    const toggleDropdown = (orderId: string) => {
        if (openDropdownId === orderId) {
            setOpenDropdownId(null);
            setDropdownPosition(null);
        } else {
            const button = dropdownButtonRefs.current[orderId];
            if (button) {
                const rect = button.getBoundingClientRect();
                setDropdownPosition({
                    top: rect.bottom + window.scrollY + 8,
                    right: window.innerWidth - rect.right + window.scrollX
                });
            }
            setOpenDropdownId(orderId);
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
        <div className="p-3 sm:p-4 lg:p-6 max-w-7xl mx-auto w-full">
            {/* Operation Status Messages */}
            {operationStatus && (
                <div className={`mb-3 p-2.5 rounded-lg border text-sm ${
                    operationStatus.type === 'success'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                }`}>
                    <p className={operationStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}>
                        {operationStatus.message}
                    </p>
                </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                 <div>
                    <h1 className="text-2xl font-bold text-text-primary">Purchase Requests</h1>
                    <p className="text-sm text-text-secondary">Manage and track your purchase orders.</p>
                </div>
                <button
                    onClick={handleNewOrder}
                    className="flex items-center gap-2 bg-accent-blue text-white px-3 py-1.5 text-sm font-medium rounded-lg shadow-md hover:bg-opacity-80 transition w-full sm:w-auto"
                >
                     <PlusIcon className="w-4 h-4" />
                    <span>New Purchase Request</span>
                </button>
            </div>
            
            <div className="bg-bg-secondary rounded-xl border border-border-color">
                <div className="p-3 flex flex-col sm:flex-row justify-between items-center gap-3 border-b border-border-color">
                    <h2 className="text-lg font-semibold">Order History</h2>
                    <div className="relative w-full sm:w-auto">
                        <SearchIcon className="w-4 h-4 text-text-secondary absolute top-1/2 left-2.5 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by department or PO#..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="bg-bg-primary border border-border-color rounded-lg py-1.5 pl-9 pr-3 text-sm focus:ring-accent-blue focus:border-accent-blue w-full sm:w-56"
                        />
                    </div>
                </div>

                {/* Mobile Card View */}
                <div className="block md:hidden divide-y divide-border-color">
                    {filteredOrders.length > 0 ? filteredOrders.map(order => (
                        <div key={order.id} className="p-3 hover:bg-hover-bg/50 transition-colors">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex-1">
                                    <div className="text-xs text-text-secondary mb-1">
                                        {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </div>
                                    <div className="font-semibold text-text-primary">{order.department}</div>
                                </div>
                                <button
                                    ref={(el) => (dropdownButtonRefs.current[order.id] = el)}
                                    onClick={() => toggleDropdown(order.id)}
                                    className="text-text-secondary hover:text-text-primary p-1"
                                >
                                    <EllipsisHorizontalIcon className="w-5 h-5"/>
                                </button>
                            </div>
                            <div className="flex justify-between items-center">
                                <div className="text-lg font-bold text-accent-blue">
                                    {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(order.totalCost)}
                                </div>
                                <StatusBadge status={order.status} />
                            </div>
                            {openDropdownId === order.id && dropdownPosition && (
                                <>
                                    <div
                                        className="fixed inset-0 z-10"
                                        onClick={() => {
                                            setOpenDropdownId(null);
                                            setDropdownPosition(null);
                                        }}
                                    />
                                    <div
                                        className="fixed w-44 bg-bg-secondary border border-border-color rounded-lg shadow-lg z-20 overflow-hidden"
                                        style={{
                                            top: `${dropdownPosition.top}px`,
                                            right: `${dropdownPosition.right}px`
                                        }}
                                    >
                                        <button
                                            onClick={() => handleViewDetails(order)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-hover-bg transition-colors text-text-primary"
                                        >
                                            View Details
                                        </button>
                                        <button
                                            onClick={() => handleEditOrder(order)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-hover-bg transition-colors text-text-primary border-t border-border-color"
                                        >
                                            Edit Order
                                        </button>
                                        <button
                                            onClick={() => handleDeleteOrder(order)}
                                            className="w-full text-left px-3 py-2 text-sm hover:bg-hover-bg transition-colors text-accent-red border-t border-border-color"
                                        >
                                            Delete Order
                                        </button>
                                    </div>
                                </>
                            )}
                        </div>
                    )) : (
                        <div className="text-center p-8 text-sm text-text-secondary">No purchase requests found.</div>
                    )}
                </div>

                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="w-full">
                        <thead className="bg-bg-tertiary/40">
                            <tr>
                                {['Date', 'Department', 'Total Cost', 'Status', 'Action'].map(header => (
                                    <th key={header} className="px-3 py-2 text-left text-xs font-medium text-text-secondary uppercase tracking-wider">{header}</th>
                                ))}
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-border-color">
                            {filteredOrders.length > 0 ? filteredOrders.map(order => (
                                <tr key={order.id} className="hover:bg-hover-bg/50 transition-colors">
                                    <td className="px-3 py-2.5 text-sm text-text-secondary">
                                        {new Date(order.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                    </td>
                                    <td className="px-3 py-2.5 text-sm font-medium">{order.department}</td>
                                    <td className="px-3 py-2.5 text-sm font-semibold">
                                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(order.totalCost)}
                                    </td>
                                    <td className="px-3 py-2.5"><StatusBadge status={order.status} /></td>
                                    <td className="px-3 py-2.5 text-sm">
                                        <button
                                            ref={(el) => (dropdownButtonRefs.current[order.id] = el)}
                                            onClick={() => toggleDropdown(order.id)}
                                            className="text-text-secondary hover:text-text-primary p-1"
                                        >
                                            <EllipsisHorizontalIcon className="w-6 h-6"/>
                                        </button>
                                        {openDropdownId === order.id && dropdownPosition && (
                                            <>
                                                <div
                                                    className="fixed inset-0 z-10"
                                                    onClick={() => {
                                                        setOpenDropdownId(null);
                                                        setDropdownPosition(null);
                                                    }}
                                                />
                                                <div
                                                    className="fixed w-44 bg-bg-secondary border border-border-color rounded-lg shadow-lg z-20 overflow-hidden"
                                                    style={{
                                                        top: `${dropdownPosition.top}px`,
                                                        right: `${dropdownPosition.right}px`
                                                    }}
                                                >
                                                    <button
                                                        onClick={() => handleViewDetails(order)}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-hover-bg transition-colors text-text-primary"
                                                    >
                                                        View Details
                                                    </button>
                                                    <button
                                                        onClick={() => handleEditOrder(order)}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-hover-bg transition-colors text-text-primary border-t border-border-color"
                                                    >
                                                        Edit Order
                                                    </button>
                                                    <button
                                                        onClick={() => handleDeleteOrder(order)}
                                                        className="w-full text-left px-3 py-2 text-sm hover:bg-hover-bg transition-colors text-accent-red border-t border-border-color"
                                                    >
                                                        Delete Order
                                                    </button>
                                                </div>
                                            </>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={5} className="text-center p-8 text-sm text-text-secondary">No purchase requests found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
            </div>
            {isModalOpen && (
                <PurchaseRequestModal
                    isOpen={isModalOpen}
                    onClose={handleCloseModal}
                    onSave={handleSaveNewOrder}
                    productInventoryItems={productInventoryItems}
                    departments={departments}
                    editingOrder={editingOrder}
                />
            )}
            <PurchaseOrderDetailsModal
                isOpen={!!viewingOrder}
                onClose={() => setViewingOrder(null)}
                order={viewingOrder}
                onSaveDeliveries={handleSaveDeliveries}
            />
            <DeleteConfirmationModal
                isOpen={!!deletingOrder}
                onClose={() => setDeletingOrder(null)}
                onConfirm={handleConfirmDelete}
                title="Delete Purchase Order"
                message={`Are you sure you want to delete this purchase order (PO# ${deletingOrder?.id})? This action cannot be undone.`}
                confirmText="Delete Order"
                isDeleting={deleteLoading}
            />
        </div>
    );
};

export default PurchaseRequest;
