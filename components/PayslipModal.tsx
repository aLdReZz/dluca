import React, { useState, useMemo, useEffect, useRef } from 'react';
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

const formatDateLong = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00Z');
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

const formatDateMonthYear = (dateString?: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString + 'T00:00:00Z');
    if (Number.isNaN(date.getTime())) return 'N/A';
    return date.toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
    });
};

const formatHours = (minutes: number) => {
    if (!Number.isFinite(minutes)) return '--';
    return `${(minutes / 60).toFixed(2)} hrs`;
};

const PayslipModal: React.FC<PayslipModalProps> = ({
    record,
    payPeriod,
    onClose,
    onSave,
}) => {
    const [deductionNotes, setDeductionNotes] = useState(record.deductionNotes || '');
    const [isDeductionEditorOpen, setIsDeductionEditorOpen] = useState(Boolean(record.deductionNotes));
    const [customDeduction, setCustomDeduction] = useState(record.customDeduction ?? 0);
    const [isCustomDeductionEditorOpen, setIsCustomDeductionEditorOpen] = useState(
        (record.customDeduction ?? 0) > 0,
    );
    const [isPrinting, setIsPrinting] = useState(false);
    const afterPrintHandlerRef = useRef<(() => void) | null>(null);
    const trimmedDeductionNotes = deductionNotes.trim();

    useEffect(() => {
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    useEffect(() => {
        return () => {
            if (afterPrintHandlerRef.current) {
                window.removeEventListener('afterprint', afterPrintHandlerRef.current);
                afterPrintHandlerRef.current = null;
            }
        };
    }, []);

    const { grossPay, netPay } = useMemo(() => {
        const gross = record.regularPay + record.overtimePay + (record.serviceCharge || 0);
        const appliedCustomDeduction = Math.max(0, customDeduction);
        const net = gross - record.deductions.total - appliedCustomDeduction;
        return { grossPay: gross, netPay: net };
    }, [record.regularPay, record.overtimePay, record.serviceCharge, record.deductions.total, customDeduction]);

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
        if (typeof window === 'undefined' || typeof document === 'undefined') {
            return;
        }

        if (typeof window.print !== 'function') {
            alert('Printing is not supported in this browser.');
            return;
        }

        const payslipElement = document.querySelector('.payslip-print-area');
        if (!payslipElement) {
            console.error('Unable to locate payslip content for printing.');
            return;
        }

        const originalTitle = document.title;
        const printTitle = `Payslip - ${record.employee}`;

        const finalizePrint = () => {
            document.title = originalTitle;
            setIsPrinting(false);
        };

        const handleAfterPrint = () => {
            finalizePrint();
            if (afterPrintHandlerRef.current) {
                window.removeEventListener('afterprint', afterPrintHandlerRef.current);
                afterPrintHandlerRef.current = null;
            }
        };

        if (afterPrintHandlerRef.current) {
            window.removeEventListener('afterprint', afterPrintHandlerRef.current);
        }

        afterPrintHandlerRef.current = handleAfterPrint;
        window.addEventListener('afterprint', handleAfterPrint);

        setIsPrinting(true);
        document.title = printTitle;

        window.setTimeout(() => {
            try {
                window.print();
            } catch (error) {
                console.error('Failed to trigger the print dialog.', error);
                if (afterPrintHandlerRef.current) {
                    window.removeEventListener('afterprint', afterPrintHandlerRef.current);
                    afterPrintHandlerRef.current = null;
                }
                finalizePrint();
            }
        }, 50);
    };

    const coverageLabel = formatDateMonthYear(payPeriod.end);
    const payDateLabel = formatDateLong(payPeriod.end);
    const payPeriodRangeLabel = `${formatDateLong(payPeriod.start)} - ${formatDateLong(payPeriod.end)}`;
    const printableCoverageLabel = coverageLabel !== 'N/A' ? coverageLabel : payPeriodRangeLabel;
    const customDeductionValue = Math.max(0, customDeduction);
    const serviceChargeDetails = useMemo(() => {
        const details = record.serviceChargeBreakdown?.details ?? [];
        return details
            .map(detail => ({
                ...detail,
                share: Math.round(detail.share * 100) / 100,
                ghostMinutes: detail.ghostMinutes ?? 0,
            }))
            .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    }, [record.serviceChargeBreakdown]);
    const formattedServiceChargeTotal = formatPeso(record.serviceCharge || 0);

    const earningsRows = useMemo(
        () =>
            [
                { label: 'Basic Salary', amount: record.regularPay },
                { label: 'Overtime Pay', amount: record.overtimePay },
                { label: 'Service Charge', amount: record.serviceCharge || 0 },
            ].filter(row => Math.abs(row.amount) > 0.009),
        [record.regularPay, record.overtimePay, record.serviceCharge],
    );

    const deductionRows = useMemo(
        () =>
            [
                { label: 'SSS Contribution', amount: record.deductions.sss },
                { label: 'PhilHealth Contribution', amount: record.deductions.philhealth },
                { label: 'Pag-IBIG Contribution', amount: record.deductions.pagibig },
                ...(customDeductionValue > 0
                    ? [{ label: 'Custom Deduction', amount: customDeductionValue }] as { label: string; amount: number }[]
                    : []),
            ].filter(row => Math.abs(row.amount) > 0.009),
        [
            record.deductions.pagibig,
            record.deductions.philhealth,
            record.deductions.sss,
            customDeductionValue,
        ],
    );

    const mandatoryDeductionsTotal = record.deductions.total;
    const combinedDeductions = mandatoryDeductionsTotal + customDeductionValue;
    const formattedGrossPay = formatPeso(grossPay);
    const formattedNetPay = formatPeso(netPay);
    const formattedMandatoryDeductions = formatPeso(mandatoryDeductionsTotal);
    const formattedCombinedDeductions = formatPeso(combinedDeductions);
    const bankAccountLabel = 'N/A';
    const paymentModeLabel = 'N/A';
    const departmentLabel = 'N/A';
    const designationLabel = record.position || 'N/A';

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
        inputDisplayValue?: string;
    }> = ({
        label,
        value,
        subValue,
        isBold,
        isInput,
        name,
        inputValue,
        onChange,
        inputVariant = 'default',
        inputDisplayValue,
    }) => {
        const baseInputClasses = 'w-28 text-right rounded-lg p-1.5 text-sm font-medium transition-colors';
        const variantClasses =
            inputVariant === 'minimal'
                ? 'bg-transparent border border-border-color/80 text-text-secondary focus:outline-none focus:ring-0 focus:border-accent-blue/60'
                : 'bg-bg-primary border border-border-color text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-blue focus:border-accent-blue';
        const shouldRenderInput = Boolean(isInput && !isPrinting);
        const displayValue = isInput ? inputDisplayValue ?? value : value;

        return (
            <div className="flex justify-between items-center py-2.5">
                <div>
                    <span className="text-sm text-text-secondary">{label}</span>
                    {subValue && <span className="block text-xs text-text-secondary/60">{subValue}</span>}
                </div>
                {shouldRenderInput ? (
                    <input
                        type="number"
                        name={name}
                        value={inputValue}
                        onChange={onChange}
                        className={`${baseInputClasses} ${variantClasses}`}
                    />
                ) : (
                    <span className={`text-sm text-right ${isBold ? 'font-semibold text-text-primary' : 'text-text-secondary'}`}>
                        {displayValue}
                    </span>
                )}
            </div>
        );
    };

    const shouldShowDeductionNotes = isDeductionEditorOpen || trimmedDeductionNotes.length > 0;
    const shouldShowCustomDeduction = isCustomDeductionEditorOpen || customDeductionValue > 0;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-lg rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                <div className="payslip-print-area">
                    <div className="payslip-export-view">
                        <div className="payslip-export-card">
                            <div className="payslip-export-header">
                                <div className="payslip-export-brand">
                                    <div className="payslip-export-logo">dlc</div>
                                    <div>
                                        <h1 className="payslip-export-brand-name">D'Luca Bistro X Cafe</h1>
                                        <p className="payslip-export-brand-address">123 Anywhere St., Any City, ST 12345</p>
                                    </div>
                                </div>
                                <div className="payslip-export-period">
                                    <span>Pay Period</span>
                                    <strong>{payPeriodRangeLabel}</strong>
                                </div>
                            </div>

                            <div className="payslip-export-title">
                                <h2>Employee Payslip</h2>
                                <p>Official Salary Statement</p>
                            </div>

                            <div className="payslip-export-info">
                                <div>
                                    <div className="payslip-export-info-row">
                                        <span>Employee Name</span>
                                        <strong>{record.employee}</strong>
                                    </div>
                                    <div className="payslip-export-info-row">
                                        <span>Department</span>
                                        <strong>{departmentLabel}</strong>
                                    </div>
                                    <div className="payslip-export-info-row">
                                        <span>Designation</span>
                                        <strong>{designationLabel}</strong>
                                    </div>
                                </div>
                                <div>
                                    <div className="payslip-export-info-row">
                                        <span>Pay Coverage</span>
                                        <strong>{printableCoverageLabel}</strong>
                                    </div>
                                    <div className="payslip-export-info-row">
                                        <span>Pay Date</span>
                                        <strong>{payDateLabel}</strong>
                                    </div>
                                    <div className="payslip-export-info-row">
                                        <span>Bank Account</span>
                                        <strong>{bankAccountLabel}</strong>
                                    </div>
                                    <div className="payslip-export-info-row">
                                        <span>Payment Mode</span>
                                        <strong>{paymentModeLabel}</strong>
                                    </div>
                                </div>
                            </div>

                            <div className="payslip-export-section">
                                <h3>Earnings</h3>
                                <table className="payslip-export-table">
                                    <thead>
                                        <tr>
                                            <th>Description</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {earningsRows.length > 0 ? (
                                            earningsRows.map(row => (
                                                <tr key={row.label}>
                                                    <td>{row.label}</td>
                                                    <td className="text-right">{formatPeso(row.amount)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={2} className="text-center text-sm text-text-secondary py-4">
                                                    No earnings recorded.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <th>Total Earnings</th>
                                            <th className="text-right">{formattedGrossPay}</th>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>

                            <div className="payslip-export-section">
                                <h3>Service Charge Allocation</h3>
                                {serviceChargeDetails.length > 0 ? (
                                    <table className="payslip-export-table">
                                        <thead>
                                            <tr>
                                                <th>Date</th>
                                                <th>Paid Hrs</th>
                                                <th>Ghost Hrs</th>
                                                <th>Attendance Hrs</th>
                                                <th>Pool</th>
                                                <th>Ghost Share</th>
                                                <th>Share</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {serviceChargeDetails.map(detail => {
                                                const ghostMinutes = detail.ghostMinutes ?? 0;
                                                const attendanceMinutes =
                                                    detail.attendanceMinutes ??
                                                    Math.max(0, detail.totalMinutes - ghostMinutes);
                                                const ghostShareEach =
                                                    detail.ghostSharePerGhost ??
                                                    (detail.ghostShareTotal && detail.ghostCount
                                                        ? detail.ghostShareTotal / detail.ghostCount
                                                        : detail.ghostShareTotal ?? detail.deductionAmount ?? 0);
                                                return (
                                                    <tr key={`${detail.dateKey}-${detail.share}`}>
                                                        <td>{formatDateForDisplay(detail.dateKey)}</td>
                                                        <td>{formatHours(detail.employeeMinutes)}</td>
                                                        <td>{formatHours(ghostMinutes)}</td>
                                                        <td>{formatHours(attendanceMinutes)}</td>
                                                        <td className="text-right">{formatPeso(detail.pool)}</td>
                                                        <td className="text-right">{formatPeso(ghostShareEach)}</td>
                                                        <td className="text-right">{formatPeso(detail.share)}</td>
                                                    </tr>
                                                );
                                            })}
                                        </tbody>
                                        <tfoot>
                                            <tr>
                                                <th colSpan={6}>Total Service Charge</th>
                                                <th className="text-right">{formattedServiceChargeTotal}</th>
                                            </tr>
                                        </tfoot>
                                    </table>
                                ) : (
                                    <p className="text-sm text-text-secondary">
                                        No service charge was allocated for this pay period.
                                    </p>
                                )}
                                <p className="text-xs text-text-secondary mt-2">
                                    Two ghost employees (12h each) are included each day to smooth allocations. Staff split 40% of the pool based on adjusted paid hours, and the remaining 60% is divided equally between the two ghost employees (shown in the Ghost Share column).
                                </p>
                            </div>

                            <div className="payslip-export-section">
                                <h3>Deductions</h3>
                                <table className="payslip-export-table">
                                    <thead>
                                        <tr>
                                            <th>Description</th>
                                            <th>Amount</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {deductionRows.length > 0 ? (
                                            deductionRows.map(row => (
                                                <tr key={row.label}>
                                                    <td>{row.label}</td>
                                                    <td className="text-right">{formatPeso(row.amount)}</td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={2} className="text-center text-sm text-text-secondary py-4">
                                                    No deductions recorded.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <th>{customDeductionValue > 0 ? 'Mandatory Deductions' : 'Total Deductions'}</th>
                                            <th className="text-right">
                                                {customDeductionValue > 0 ? formattedMandatoryDeductions : formattedCombinedDeductions}
                                            </th>
                                        </tr>
                                        {customDeductionValue > 0 && (
                                            <tr>
                                                <th>Total Deductions</th>
                                                <th className="text-right">{formattedCombinedDeductions}</th>
                                            </tr>
                                        )}
                                    </tfoot>
                                </table>
                            </div>

                            <div className="payslip-export-net">
                                <span>Net Salary</span>
                                <strong>{formattedNetPay}</strong>
                            </div>

                            <div className="payslip-export-summary">
                                <div>
                                    <span>Days Present</span>
                                    <strong>{record.daysPresent}</strong>
                                </div>
                                <div>
                                    <span>Days Absent</span>
                                    <strong>{record.daysAbsent}</strong>
                                </div>
                                <div>
                                    <span>Total Hours</span>
                                    <strong>{record.totalHours.toFixed(2)} hrs</strong>
                                </div>
                            </div>

                            {trimmedDeductionNotes && (
                                <div className="payslip-export-notes">
                                    <span>Notes</span>
                                    <p>{trimmedDeductionNotes}</p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="payslip-screen-view">
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
                                        value={formattedServiceChargeTotal}
                                        subValue={
                                            record.serviceChargeBreakdown
                                                ? `${record.serviceChargeBreakdown.coveredDays} day${
                                                      record.serviceChargeBreakdown.coveredDays === 1 ? '' : 's'
                                                  } of service pools`
                                                : 'No allocation this period'
                                        }
                                        isBold
                                    />
                                    <div className="mt-3 rounded-lg border border-dashed border-border-color/70 bg-bg-tertiary/40 p-3">
                                        <div className="flex justify-between items-center">
                                            <div>
                                                <p className="text-sm font-semibold text-text-primary">Daily Allocation Details</p>
                                                <p className="text-[11px] text-text-secondary">
                                                    Paid hrs ÷ adjusted team hrs × (service pool × 60%). The other 40% is split equally between 2 ghost employees (12h each).
                                                </p>
                                            </div>
                                            <span className="text-sm font-semibold">{formattedServiceChargeTotal}</span>
                                        </div>
                                        {serviceChargeDetails.length > 0 ? (
                                            <div className="mt-2 space-y-1 text-xs text-text-secondary">
                                                <div className="grid grid-cols-7 gap-2 font-semibold text-[11px] uppercase tracking-wide text-text-secondary/70">
                                                    <span>Date</span>
                                                    <span className="text-right">Paid</span>
                                                    <span className="text-right">Ghost</span>
                                                    <span className="text-right">Attendance</span>
                                                    <span className="text-right">Pool</span>
                                                    <span className="text-right">Ghost Share</span>
                                                    <span className="text-right">Share</span>
                                                </div>
                                                {serviceChargeDetails.map(detail => {
                                                    const ghostMinutes = detail.ghostMinutes ?? 0;
                                                    const attendanceMinutes =
                                                        detail.attendanceMinutes ??
                                                        Math.max(0, detail.totalMinutes - ghostMinutes);
                                                    const ghostShareEach =
                                                        detail.ghostSharePerGhost ??
                                                        (detail.ghostShareTotal && detail.ghostCount
                                                            ? detail.ghostShareTotal / detail.ghostCount
                                                            : detail.ghostShareTotal ?? detail.deductionAmount ?? 0);
                                                    return (
                                                        <div key={`${detail.dateKey}-${detail.share}`} className="grid grid-cols-7 gap-2">
                                                            <span>{formatDateForDisplay(detail.dateKey)}</span>
                                                            <span className="text-right">{formatHours(detail.employeeMinutes)}</span>
                                                            <span className="text-right">{formatHours(ghostMinutes)}</span>
                                                            <span className="text-right">{formatHours(attendanceMinutes)}</span>
                                                            <span className="text-right">{formatPeso(detail.pool)}</span>
                                                            <span className="text-right">{formatPeso(ghostShareEach)}</span>
                                                            <span className="text-right text-accent-green font-semibold">{formatPeso(detail.share)}</span>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="mt-2 text-xs text-text-secondary">No service charge earned during this period.</p>
                                        )}
                                    </div>
                                    {isCustomDeductionEditorOpen ? (
                                        <DetailRow
                                            label="Custom Deduction"
                                            value={formatPeso(customDeductionValue)}
                                            isInput
                                            name="customDeduction"
                                            inputValue={customDeduction}
                                            onChange={handleCustomDeductionChange}
                                            inputDisplayValue={formatPeso(customDeductionValue)}
                                        />
                                    ) : (
                                        <DetailRow label="Custom Deduction" value={formatPeso(customDeductionValue)} />
                                    )}
                                    <div className="border-t border-border-color mt-2 pt-2">
                                        <DetailRow label="Gross Pay" value={formattedGrossPay} isBold />
                                    </div>
                                    <div className="mt-3 flex flex-col gap-2">
                                        <button
                                            type="button"
                                            onClick={handleCustomDeductionToggle}
                                            className="inline-flex items-center gap-2 text-sm font-medium text-text-secondary hover:text-text-primary transition-colors"
                                            aria-expanded={isCustomDeductionEditorOpen}
                                        >
                                            <InformationCircleIcon className="w-4 h-4" />
                                            {customDeductionValue > 0 ? 'Edit deduction amount' : 'Add deduction amount'}
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
                                    {shouldShowCustomDeduction && !isCustomDeductionEditorOpen && customDeductionValue > 0 && (
                                        <p className="mt-1 text-xs text-text-secondary">
                                            Deducting {formatPeso(customDeductionValue)} from net pay.
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
                                        <span className="text-lg font-bold text-accent-green">{formattedNetPay}</span>
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
                </div>
                <div className="p-4 bg-bg-tertiary/50 border-t border-border-color flex justify-end items-center gap-4 rounded-b-2xl no-print">
                    <div className="relative group flex items-center gap-2">
                        <button
                            type="button"
                            onClick={handlePrint}
                            disabled={isPrinting}
                            className="px-4 py-2 rounded-lg font-medium text-sm bg-bg-tertiary hover:bg-hover-bg transition flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                            aria-busy={isPrinting}
                        >
                            <PrinterIcon className="w-5 h-5" /> Print / Export
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
