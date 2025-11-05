
import React, { useState, useMemo, useEffect } from 'react';
import type { PayrollRecord } from '../types';
import { XMarkIcon, PrinterIcon, InformationCircleIcon } from './Icons';

interface PayslipModalProps {
    record: PayrollRecord;
    payPeriod: { start: string, end: string };
    onClose: () => void;
    onSave: (updatedRecord: PayrollRecord) => void;
}

const formatPeso = (amount: number) => {
    return '₱ ' + amount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
};

const PayslipModal: React.FC<PayslipModalProps> = ({ record, payPeriod, onClose, onSave }) => {
    const [serviceCharge, setServiceCharge] = useState(record.serviceCharge || 0);

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const { grossPay, netPay } = useMemo(() => {
        const gross = record.regularPay + record.overtimePay + serviceCharge;
        const net = gross - record.deductions.total;
        return { grossPay: gross, netPay: net };
    }, [serviceCharge, record.regularPay, record.overtimePay, record.deductions.total]);
    
    const handleServiceChargeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setServiceCharge(parseFloat(e.target.value) || 0);
    };

    const handleSave = () => {
        const updatedRecord = {
            ...record,
            serviceCharge,
            grossPay,
            netPay,
            deductions: record.deductions
        };
        onSave(updatedRecord);
    };

    const handlePrint = () => {
        alert("Printing is disabled in this sandboxed environment. Please use your computer's screenshot functionality to save a copy of the payslip.");
    };
    
    const DetailRow: React.FC<{
        label: string, 
        value: string, 
        subValue?: string, 
        isBold?: boolean, 
        isInput?: boolean, 
        name?: string, 
        inputValue?: number
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    }> = ({ label, value, subValue, isBold, isInput, name, inputValue, onChange }) => (
        <div className="flex justify-between items-center py-2.5">
            <div>
                <span className="text-sm text-text-secondary">{label}</span>
                {subValue && <span className="block text-xs text-text-secondary/60">{subValue}</span>}
            </div>
            {isInput ? (
                 <input 
                    type="number"
                    name={name}
                    value={inputValue}
                    onChange={onChange}
                    className={`w-28 text-right bg-bg-primary border border-border-color rounded-lg p-1.5 text-sm font-medium ${isBold ? 'text-text-primary' : 'text-text-secondary'}`}
                 />
            ) : (
                <span className={`text-sm text-right ${isBold ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>{value}</span>
            )}
        </div>
    );

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-lg rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                <div className="payslip-print-area">
                    <div className="p-6 border-b border-border-color">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-semibold">Payslip</h2>
                                <p className="text-sm text-text-secondary">For period {formatDateForDisplay(payPeriod.start)} to {formatDateForDisplay(payPeriod.end)}</p>
                            </div>
                            <button onClick={onClose} className="p-2 -mt-2 -mr-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors no-print">
                                <XMarkIcon className="w-6 h-6" />
                            </button>
                        </div>
                        <div className="mt-4">
                            <p className="font-semibold text-lg">{record.employee}</p>
                            <p className="text-sm text-text-secondary">{record.position}</p>
                        </div>
                    </div>
                    <div className="p-6 max-h-[50vh] overflow-y-auto">
                        <div className="space-y-6">
                             <div>
                                <h3 className="font-semibold text-text-primary mb-2 border-b border-border-color pb-2">Pay Calculation</h3>
                                <DetailRow 
                                    label="Period Earnings" 
                                    value={formatPeso(record.regularPay + record.overtimePay)} 
                                    subValue={`Regular ${formatPeso(record.regularPay)} · OT ${formatPeso(record.overtimePay)}`} 
                                />
                                <DetailRow 
                                    label="Service Charge"
                                    value=""
                                    isInput
                                    name="serviceCharge"
                                    inputValue={serviceCharge}
                                    onChange={handleServiceChargeChange}
                                />
                                <div className="border-t border-border-color mt-2">
                                    <DetailRow label="Gross Pay" value={formatPeso(grossPay)} isBold/>
                                </div>
                            </div>
                        </div>
                         <div className="mt-6 bg-bg-tertiary p-4 rounded-xl">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-semibold">Net Pay</span>
                                <span className="text-lg font-bold text-accent-green">{formatPeso(netPay)}</span>
                            </div>
                        </div>
                        <div className="mt-6">
                            <h3 className="font-semibold text-text-primary mb-2 border-b border-border-color pb-2">Summary</h3>
                             <div className="grid grid-cols-3 text-center mt-4">
                                <div><div className="text-xl font-bold">{record.daysPresent}</div><div className="text-xs text-text-secondary">Present</div></div>
                                <div><div className="text-xl font-bold">{record.daysAbsent}</div><div className="text-xs text-text-secondary">Absent</div></div>
                                <div><div className="text-xl font-bold">{record.daysLate}</div><div className="text-xs text-text-secondary">Late</div></div>
                            </div>
                             <div className="border-t border-border-color mt-4 pt-2">
                                <DetailRow label="Total Hours" value={`${record.totalHours.toFixed(2)} hrs`} isBold/>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-bg-tertiary/50 border-t border-border-color flex justify-end items-center gap-4 rounded-b-2xl no-print">
                    <div className="relative group flex items-center gap-2">
                        <button onClick={handlePrint} className="px-4 py-2 rounded-lg font-medium text-sm bg-bg-tertiary hover:bg-hover-bg transition flex items-center gap-2">
                            <PrinterIcon className="w-5 h-5"/> Save as Image
                        </button>
                    </div>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg font-semibold bg-accent-blue text-white hover:bg-opacity-80 transition">
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PayslipModal;


