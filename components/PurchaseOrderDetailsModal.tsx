import React, { useEffect, useMemo, useState } from 'react';
import type { PurchaseOrder } from '../types';
import { XMarkIcon } from './Icons';

interface PurchaseOrderDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    order: PurchaseOrder | null;
    onSaveDeliveries?: (args: { orderId: number; delivered: Record<number, boolean>; status: PurchaseOrder['status'] }) => void;
}

const StatusBadge: React.FC<{ status: PurchaseOrder['status'] }> = ({ status }) => {
    const statusClasses = {
        Pending: 'bg-accent-yellow/20 text-accent-yellow border-accent-yellow/30',
        Completed: 'bg-accent-green/20 text-accent-green border-accent-green/30',
        Cancelled: 'bg-accent-red/20 text-accent-red border-accent-red/30',
        'In Progress': 'bg-accent-orange/20 text-accent-orange border-accent-orange/30',
    };
    return (
        <span className={`status-badge inline-flex items-center px-3 py-1.5 rounded-lg text-sm font-semibold border ${statusClasses[status]}`}>
            {status}
        </span>
    );
};

const PurchaseOrderDetailsModal: React.FC<PurchaseOrderDetailsModalProps> = ({ isOpen, onClose, order, onSaveDeliveries }) => {
    const [deliveredMap, setDeliveredMap] = useState<Record<number, boolean>>({});
    const [isClosing, setIsClosing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const handlePrint = () => {
        window.print();
    };

    // Print-friendly styles: minimalist white shopping list
    const printStyles = `
        @media print {
          body {
            background: white !important;
            color: #111 !important;
            -webkit-print-color-adjust: exact !important;
            color-adjust: exact !important;
            font-family: Arial, sans-serif !important;
          }
          body * { visibility: hidden !important; }
          #po-print-root, #po-print-root * { visibility: visible !important; }
          #po-print-root {
            position: static !important;
            inset: auto !important;
            width: auto !important;
            height: auto !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
          }
          #po-print-area {
            position: static !important;
            background: white !important;
            color: #111 !important;
            box-shadow: none !important;
            border: 1px solid #ccc !important;
            max-height: none !important;
          }
          #po-print-area * {
            background: transparent !important;
            color: #111 !important;
            border-color: #ddd !important;
            box-shadow: none !important;
          }
          #po-print-area .print-table {
            width: 100%;
            border-collapse: collapse;
          }
          #po-print-area .print-table th,
          #po-print-area .print-table td {
            border: 1px solid #ddd !important;
            padding: 6px !important;
            font-size: 12px !important;
          }
          #po-print-area .print-table th {
            background: #f4f4f4 !important;
            font-weight: 700 !important;
          }
          #po-print-area .status-badge {
            background: transparent !important;
            border: 0 !important;
            padding: 0 !important;
            color: #111 !important;
          }
          .no-print { display: none !important; }
        }
    `;

    useEffect(() => {
        if (!order) return;
        const initial: Record<number, boolean> = {};
        order.items.forEach((_, idx) => {
            initial[idx] = order.delivered?.[idx] ?? false;
        });
        setDeliveredMap(initial);
    }, [order]);

    const derivedStatus: PurchaseOrder['status'] = useMemo(() => {
        const values = Object.values(deliveredMap);
        const allChecked = values.length > 0 && values.every(Boolean);
        const anyChecked = values.some(Boolean);
        if (allChecked) return 'Completed';
        if (anyChecked) return 'In Progress';
        return 'Pending';
    }, [deliveredMap]);

    const handleToggleDelivered = (idx: number) => {
        setDeliveredMap(prev => ({
            ...prev,
            [idx]: !prev[idx],
        }));
    };

    const handleSave = async () => {
        if (!order || !onSaveDeliveries || isSaving) return;
        setIsSaving(true);
        try {
            await onSaveDeliveries({ orderId: order.id, delivered: deliveredMap, status: derivedStatus });
            setIsClosing(true);
            setTimeout(() => {
                onClose();
                setIsClosing(false);
            }, 180);
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen || !order) return null;

    const orderDate = new Date(order.date);

    return (
        <div
            id="po-print-root"
            className={`fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-3 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}
            onClick={() => !isSaving && onClose()}
        >
            <style>{printStyles}</style>
            <div
                id="po-print-area"
                className={`bg-bg-secondary w-full max-w-4xl max-h-[92vh] rounded-xl border border-border-color shadow-2xl flex flex-col animate-pop-in transition-all duration-200 ${
                    isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
                }`}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-border-color flex justify-between items-start flex-shrink-0 bg-gradient-to-r from-bg-secondary to-bg-tertiary/30">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                            <h2 className="text-xl font-bold text-text-primary">Purchase Order Details</h2>
                            <StatusBadge status={derivedStatus} />
                        </div>
                        <div className="flex items-center gap-4 text-sm text-text-secondary">
                            <div>
                                <span className="font-medium">PO#:</span> {order.id}
                            </div>
                            <div>
                                <span className="font-medium">Date:</span> {orderDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </div>
                            <div>
                                <span className="font-medium">Department:</span> {order.department}
                            </div>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-hover-bg hover:text-text-primary transition-all no-print">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Items List */}
                <div className="p-4 flex-1 overflow-y-auto">
                    <h3 className="text-base font-bold text-text-primary mb-3 flex items-center gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-blue"></span>
                        Order Items
                    </h3>
                    <div className="bg-bg-tertiary/30 rounded-lg border border-border-color overflow-hidden">
                        <table className="w-full print-table">
                            <thead className="bg-bg-tertiary/50">
                                <tr>
                                    <th className="px-3 py-2 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">Item Name</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">Unit</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">Quantity</th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Unit Cost</th>
                                    <th className="px-3 py-2 text-right text-xs font-semibold text-text-secondary uppercase tracking-wider">Total</th>
                                    <th className="px-3 py-2 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider">Delivered</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color">
                                {order.items.map((item, index) => {
                                    const itemTotal = item.quantity * item.cost;
                                    return (
                                        <tr key={index} className="hover:bg-hover-bg/30 transition-colors">
                                            <td className="px-3 py-2 text-sm font-medium text-text-primary">
                                                {item.itemName}
                                                {item.itemId === undefined && (
                                                    <span className="ml-2 text-xs text-accent-green bg-accent-green/10 px-1.5 py-0.5 rounded">Custom</span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-center text-text-secondary">{item.unit || '-'}</td>
                                            <td className="px-3 py-2 text-sm text-center font-medium text-text-primary">{item.quantity}</td>
                                            <td className="px-3 py-2 text-sm text-right text-text-secondary">
                                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(item.cost)}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-right font-semibold text-text-primary">
                                                {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(itemTotal)}
                                            </td>
                                            <td className="px-3 py-2 text-sm text-center">
                                                <input
                                                    type="checkbox"
                                                    checked={!!deliveredMap[index]}
                                                    onChange={() => handleToggleDelivered(index)}
                                                    className="h-4 w-4 rounded border-border-color text-accent-blue focus:ring-accent-blue cursor-pointer"
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                            <tfoot className="bg-gradient-to-r from-bg-tertiary/40 to-bg-tertiary/20 border-t-2 border-border-color">
                                <tr>
                                    <td colSpan={5} className="px-3 py-2.5 text-right font-bold text-text-primary uppercase text-xs tracking-wide">
                                        Grand Total:
                                    </td>
                                    <td className="px-3 py-2.5 text-right font-bold text-xl text-accent-blue">
                                        {new Intl.NumberFormat('en-PH', { style: 'currency', currency: 'PHP' }).format(order.totalCost)}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    {/* Summary Cards */}
                    <div className="grid grid-cols-3 gap-3 mt-4">
                        <div className="bg-bg-tertiary/30 rounded-lg p-3 border border-border-color">
                            <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-0.5">Total Items</div>
                            <div className="text-xl font-bold text-text-primary">{order.items.length}</div>
                        </div>
                        <div className="bg-bg-tertiary/30 rounded-lg p-3 border border-border-color">
                            <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-0.5">Total Quantity</div>
                            <div className="text-xl font-bold text-text-primary">
                                {order.items.reduce((sum, item) => sum + item.quantity, 0)}
                            </div>
                        </div>
                        <div className="bg-bg-tertiary/30 rounded-lg p-3 border border-border-color">
                            <div className="text-xs font-medium text-text-secondary uppercase tracking-wide mb-0.5">Custom Items</div>
                            <div className="text-xl font-bold text-text-primary">
                                {order.items.filter(item => item.itemId === undefined).length}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-3 bg-gradient-to-r from-bg-tertiary/50 to-bg-tertiary/30 border-t border-border-color flex justify-end rounded-b-xl flex-shrink-0 gap-2">
                    <button
                        onClick={handlePrint}
                        className="px-4 py-2 rounded-lg font-semibold text-sm bg-bg-secondary text-text-primary hover:bg-hover-bg transition-all border border-border-color no-print"
                    >
                        Print List
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className={`px-4 py-2 rounded-lg font-semibold text-sm bg-accent-blue text-white transition-all shadow-lg shadow-accent-blue/30 hover:shadow-accent-blue/50 no-print ${
                            isSaving ? 'opacity-70 cursor-not-allowed' : 'hover:bg-opacity-90'
                        }`}
                    >
                        {isSaving ? 'Saving...' : 'Save'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseOrderDetailsModal;
