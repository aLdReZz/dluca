import React, { useState, useMemo, useEffect } from 'react';
import type { PayrollRecord } from '../types';
import { XMarkIcon, PrinterIcon, InformationCircleIcon } from './Icons';

interface PayslipModalProps {
    record: PayrollRecord;
    payPeriod: { start: string; end: string };
    onClose: () => void;
    onSave: (updatedRecord: PayrollRecord) => void;
}

const formatPeso = (amount: number) => {
    return '\u20B1 ' + amount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

const PayslipModal: React.FC<PayslipModalProps> = ({ record, payPeriod, onClose, onSave }) => {
    const [serviceCharge, setServiceCharge] = useState(record.serviceCharge || 0);
    const [deductionNotes, setDeductionNotes] = useState(record.deductionNotes || '');
    const [isDeductionEditorOpen, setIsDeductionEditorOpen] = useState(Boolean(record.deductionNotes));
    const [customDeduction, setCustomDeduction] = useState(record.customDeduction ?? 0);
    const [isCustomDeductionEditorOpen, setIsCustomDeductionEditorOpen] = useState(
        (record.customDeduction ?? 0) > 0,
    );

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const { grossPay, netPay } = useMemo(() => {
        const gross = record.regularPay + record.overtimePay + serviceCharge;
        const appliedCustomDeduction = Math.max(0, customDeduction);
        const net = gross - record.deductions.total - appliedCustomDeduction;
        return { grossPay: gross, netPay: net };
    }, [serviceCharge, record.regularPay, record.overtimePay, record.deductions.total, customDeduction]);

    const handleServiceChargeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setServiceCharge(parseFloat(e.target.value) || 0);
    };

    const handleDeductionToggle = () => setIsDeductionEditorOpen(prev => !prev);
    const handleDeductionNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) =>
        setDeductionNotes(e.target.value);
    const handleCustomDeductionToggle = () => setIsCustomDeductionEditorOpen(prev => !prev);
    const handleCustomDeductionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseFloat(e.target.value);
        setCustomDeduction(Number.isFinite(value) ? Math.max(0, value) : 0);
    };

    const handleSave = () => {
        const cleanedNotes = deductionNotes.trim();
        const updatedRecord = {
            ...record,
            serviceCharge,
            grossPay,
            netPay,
            deductions: record.deductions,
            deductionNotes: cleanedNotes || undefined,
            customDeduction: Math.max(0, customDeduction),
        };
        onSave(updatedRecord);
        setDeductionNotes(cleanedNotes);
        if (!cleanedNotes) setIsDeductionEditorOpen(false);
        if ((customDeduction ?? 0) <= 0) setIsCustomDeductionEditorOpen(false);
    };

    const handlePrint = () => {
        alert("Printing is disabled in this sandboxed environment. Please use your computer's screenshot functionality to save a copy of the payslip.");
    };

    const DetailRow: React.FC<{
        label: string;
        value: string;
        subValue?: string;
        isBold?: boolean;
        isInput?: boolean;
        name?: string;
        inputValue?: number;
        onChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
        inputVariant?: 'default' | 'minimal';
    }> = ({ label, value, subValue, isBold, isInput, name, inputValue, onChange, inputVariant = 'default' }) => {
        const baseInputClasses = 'w-28 text-right rounded-lg p-1.5 text-sm font-medium transition-colors';
        const variantClasses =
            inputVariant === 'minimal'
                ? 'bg-transparent border border-border-color/80 text-text-secondary focus:outline-none focus:ring-0 focus:border-accent-blue/60'
                : 'bg-bg-primary border border-border-color text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue';

        return (
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
                        className={`${baseInputClasses} ${variantClasses}`}
                    />
                ) : (
                    <span className={`text-sm text-right ${isBold ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                        {value}
                    </span>
                )}
            </div>
        );
    };

    const trimmedDeductionNotes = deductionNotes.trim();
    const shouldShowDeductionNotes = isDeductionEditorOpen || trimmedDeductionNotes.length > 0;
    const shouldShowCustomDeduction = isCustomDeductionEditorOpen || customDeduction > 0;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-lg rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                <div className="payslip-print-area">
                    <div className="p-6 border-b border-border-color">
                        <div className="flex justify-between items-start">
                            <div>
                                <h2 className="text-2xl font-semibold">Payslip</h2>
                                <p className="text-sm text-text-secondary">
                                    For period {formatDateForDisplay(payPeriod.start)} to {formatDateForDisplay(payPeriod.end)}
                                </p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 -mt-2 -mr-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors no-print"
                            >
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
                                    subValue={`Regular ${formatPeso(record.regularPay)} | OT ${formatPeso(record.overtimePay)}`}
                                />
                                <DetailRow
                                    label="Service Charge"
                                    value=""
                                    isInput
                                    name="serviceCharge"
                                    inputValue={serviceCharge}
                                    onChange={handleServiceChargeChange}
                                    inputVariant="minimal"
                                />
                                {isCustomDeductionEditorOpen ? (
                                    <DetailRow
                                        label="Custom Deduction"
                                        value=""
                                        isInput
                                        name="customDeduction"
                                        inputValue={customDeduction}
                                        onChange={handleCustomDeductionChange}
                                    />
                                ) : (
                                    <DetailRow label="Custom Deduction" value={formatPeso(customDeduction)} />
                                )}
                                <div className="border-t border-border-color mt-2 pt-2">
                                    <DetailRow label="Gross Pay" value={formatPeso(grossPay)} isBold />
                                </div>
                                <div className="mt-3 flex flex-col gap-2">
                                    <button
                                        type="button"
                                        onClick={handleCustomDeductionToggle}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                                        aria-expanded={isCustomDeductionEditorOpen}
                                    >
                                        <InformationCircleIcon className="w-4 h-4" />
                                        {customDeduction > 0 ? 'Edit deduction amount' : 'Add deduction amount'}
                                    </button>
                                    <button
                                        type="button"
                                        onClick={handleDeductionToggle}
                                        className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                                        aria-expanded={isDeductionEditorOpen}
                                    >
                                        <InformationCircleIcon className="w-4 h-4" />
                                        {trimmedDeductionNotes ? 'Edit deduction details' : 'Add deduction details'}
                                    </button>
                                </div>
                                {shouldShowCustomDeduction && !isCustomDeductionEditorOpen && customDeduction > 0 && (
                                    <p className="mt-1 text-xs text-text-secondary">
                                        Deducting {formatPeso(customDeduction)} from net pay.
                                    </p>
                                )}
                                {shouldShowDeductionNotes && (
                                    <div className="mt-3 space-y-2">
                                        <label htmlFor="deduction-notes" className="text-xs font-semibold uppercase tracking-wide text-text-secondary">
                                            Deduction Notes
                                        </label>
                                        {isDeductionEditorOpen ? (
                                            <textarea
                                                id="deduction-notes"
                                                value={deductionNotes}
                                                onChange={handleDeductionNotesChange}
                                                rows={4}
                                                className="w-full rounded-lg border border-border-color bg-bg-primary px-3 py-2 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue"
                                                placeholder="Provide details about salary deductions (e.g., cash advance, penalties, allowances)."
                                            />
                                        ) : (
                                            <p className="rounded-lg border border-border-color bg-bg-tertiary px-3 py-2 text-sm text-text-secondary whitespace-pre-wrap">
                                                {trimmedDeductionNotes}
                                            </p>
                                        )}
                                    </div>
                                )}
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
                                    <div>
                                        <div className="text-xl font-bold">{record.daysPresent}</div>
                                        <div className="text-xs text-text-secondary">Present</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold">{record.daysAbsent}</div>
                                        <div className="text-xs text-text-secondary">Absent</div>
                                    </div>
                                    <div>
                                        <div className="text-xl font-bold">{record.daysLate}</div>
                                        <div className="text-xs text-text-secondary">Late</div>
                                    </div>
                                </div>
                                <div className="border-t border-border-color mt-4 pt-2">
                                    <DetailRow label="Total Hours" value={`${record.totalHours.toFixed(2)} hrs`} isBold />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-bg-tertiary/50 border-t border-border-color flex justify-end items-center gap-4 rounded-b-2xl no-print">
                    <div className="relative group flex items-center gap-2">
                        <button
                            onClick={handlePrint}
                            className="px-4 py-2 rounded-lg font-medium text-sm bg-bg-tertiary hover:bg-hover-bg transition flex items-center gap-2"
                        >
                            <PrinterIcon className="w-5 h-5" /> Save as Image
                        </button>
                    </div>
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 rounded-lg font-semibold bg-accent-blue text-white hover:bg-opacity-80 transition"
                    >
                        Save & Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PayslipModal;
