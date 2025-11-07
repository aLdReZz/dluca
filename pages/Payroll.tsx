
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { PayrollRecord, Employee, AttendanceRecord, SalesData } from '../types';
import CalendarPopup from '../components/CalendarPopup';
import { CalendarDaysIcon, CurrencyPesoIcon, ClockIcon, BanknotesIcon } from '../components/Icons';
import PayslipModal from '../components/PayslipModal';
import {
    extractDateKey,
    extractServiceCharge,
    parseSalesDate,
} from '../utils/salesData';
import { calculateServiceChargeDistribution } from '../utils/serviceChargeAllocation';


interface PayrollProps {
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    payrollRecords: PayrollRecord[];
    setPayrollRecords: React.Dispatch<React.SetStateAction<PayrollRecord[]>>;
    salesData: SalesData[];
}

const timeStringToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const normalizedTime = timeStr.trim().toUpperCase();

    const ampmMatch = normalizedTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);
    if (ampmMatch) {
        let hours = parseInt(ampmMatch[1], 10);
        const minutes = parseInt(ampmMatch[2], 10);
        const period = ampmMatch[3];
        if (period === 'PM' && hours < 12) hours += 12;
        if (period === 'AM' && hours === 12) hours = 0;
        return hours * 60 + minutes;
    }
    
    const twentyFourHourMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
        if (twentyFourHourMatch) {
        const hours = parseInt(twentyFourHourMatch[1], 10);
        const minutes = parseInt(twentyFourHourMatch[2], 10);
        return hours * 60 + minutes;
    }
    
    return null;
};

const formatPeso = (amount: number) => {
    return '₱' + amount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    });
};

const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const formatDateKeyLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const normalizeAttendanceDate = (value?: string): string | null => {
    if (!value) return null;
    const trimmed = value.trim();
    if (!trimmed) return null;

    if (trimmed.includes('T')) {
        const isoDate = new Date(trimmed);
        if (!Number.isNaN(isoDate.getTime())) {
            return formatDateKeyLocal(isoDate);
        }
    }

    const parsed = parseSalesDate(trimmed);
    if (parsed) {
        return formatDateKeyLocal(parsed);
    }

    const fallback = new Date(trimmed);
    if (!Number.isNaN(fallback.getTime())) {
        return formatDateKeyLocal(fallback);
    }

    return trimmed;
};

const SummaryCard: React.FC<{title: string, value: string, icon: React.FC<{className?:string}>}> = ({title, value, icon: Icon}) => (
    <div className="bg-bg-secondary p-5 rounded-xl border border-border-color">
         <div className="flex justify-between items-start">
            <div>
                <div className="text-sm font-medium text-text-secondary">{title}</div>
                <div className="text-3xl font-semibold text-text-primary mt-2">{value}</div>
            </div>
             <div className="p-3 rounded-lg bg-bg-tertiary">
                <Icon className="w-6 h-6 text-accent-blue" />
            </div>
        </div>
    </div>
);


const OVERTIME_RATE_MULTIPLIER = 1.5;

const Payroll: React.FC<PayrollProps> = ({ employees, attendanceRecords, payrollRecords, setPayrollRecords, salesData }) => {
    const [payPeriod, setPayPeriod] = useState(() => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
        };
    });
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
    const calendarRef = useRef<HTMLDivElement>(null);

    const dailyServiceCharges = useMemo(() => {
        const map: Record<string, number> = {};
        for (const row of salesData) {
            const dateKey = extractDateKey(row);
            if (!dateKey) continue;
            const amount = extractServiceCharge(row);
            if (!Number.isFinite(amount) || amount <= 0) continue;
            map[dateKey] = (map[dateKey] || 0) + amount;
        }
        return map;
    }, [salesData]);

    const dailyAttendanceTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const record of attendanceRecords) {
            if (!record.timeIn || !record.timeOut) continue;
            const normalizedDate = normalizeAttendanceDate(record.date);
            if (!normalizedDate) continue;
            const inMinutes = timeStringToMinutes(record.timeIn);
            const outMinutes = timeStringToMinutes(record.timeOut);
            if (inMinutes === null || outMinutes === null || outMinutes <= inMinutes) continue;
            totals[normalizedDate] = (totals[normalizedDate] || 0) + (outMinutes - inMinutes);
        }
        return totals;
    }, [attendanceRecords]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
                setIsCalendarOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const generatePayroll = useCallback(() => {
        if (employees.length === 0 || attendanceRecords.length === 0) {
            setPayrollRecords([]);
            return;
        }

        const startDate = new Date(payPeriod.start + 'T00:00:00Z');
        const endDate = new Date(payPeriod.end + 'T00:00:00Z');

        const baseRecords = employees.map(employee => {
            let totalRegularHours = 0;
            let totalOvertimeHours = 0;
            let daysPresent = 0;
            let daysAbsent = 0;
            let daysLate = 0;

            for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
                const dateKey = d.toISOString().split('T')[0];
                const schedule = employee.schedule[dateKey];
                const record = attendanceRecords.find(r => r.employee.toLowerCase() === employee.name.toLowerCase() && r.date === dateKey);

                const scheduledInMinutes = schedule?.timeIn ? timeStringToMinutes(schedule.timeIn) : null;
                let workedMinutesForDay = 0;

                if (schedule && !schedule.off && schedule.timeIn) {
                    if (record && record.timeIn) {
                        daysPresent++;
                        const actualInMinutes = timeStringToMinutes(record.timeIn);
                        if (scheduledInMinutes !== null && actualInMinutes !== null && actualInMinutes > scheduledInMinutes) {
                            daysLate++;
                        }
                    } else {
                        const today = new Date();
                        const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
                        if (d < todayUTC) {
                            daysAbsent++;
                        }
                    }
                }

                if (record && record.timeIn && record.timeOut && schedule?.timeIn && schedule?.timeOut) {
                    const actualInMinutes = timeStringToMinutes(record.timeIn);
                    const actualOutMinutes = timeStringToMinutes(record.timeOut);
                    const scheduledOutMinutes = timeStringToMinutes(schedule.timeOut);

                    if (actualInMinutes !== null && actualOutMinutes !== null && scheduledInMinutes !== null && scheduledOutMinutes !== null) {
                        const effectiveInMinutes = Math.max(actualInMinutes, scheduledInMinutes);
                        const baseWorkedMinutes = Math.max(0, Math.min(actualOutMinutes, scheduledOutMinutes) - effectiveInMinutes);

                        const totalDailyLoginDuration = actualOutMinutes - actualInMinutes;

                        let dailyPaidRegularMinutes = baseWorkedMinutes;
                        if (totalDailyLoginDuration > 4 * 60) { // More than 4 hours
                            dailyPaidRegularMinutes = Math.max(0, baseWorkedMinutes - 60); // Deduct 1 hour break
                        }

                        totalRegularHours += dailyPaidRegularMinutes / 60;
                        workedMinutesForDay += dailyPaidRegularMinutes;

                        const approvedOTMinutes = employee.approvedOvertime?.[dateKey] || 0;
                        totalOvertimeHours += approvedOTMinutes / 60;
                        workedMinutesForDay += approvedOTMinutes;
                    }
                }

            }

            const regularPay = totalRegularHours * employee.rate;
            const overtimePay = totalOvertimeHours * employee.rate * OVERTIME_RATE_MULTIPLIER;
            const grossPay = regularPay + overtimePay;
            
            const deductions = {
                sss: 0,
                philhealth: 0,
                pagibig: 0,
                total: 0
            };
            
            const netPay = grossPay - deductions.total;

            return {
                id: employee.id,
                employee: employee.name,
                position: employee.position,
                rate: employee.rate,
                regularHours: totalRegularHours,
                overtimeHours: totalOvertimeHours,
                totalHours: totalRegularHours + totalOvertimeHours,
                regularPay,
                overtimePay,
                serviceCharge: 0,
                grossPay,
                deductions,
                netPay,
                daysPresent,
                daysAbsent,
                daysLate,
                deductionNotes: '',
                customDeduction: 0
            };
        });

        const { allocations } = calculateServiceChargeDistribution({
            employees,
            attendanceRecords,
            salesData,
            start: payPeriod.start,
            end: payPeriod.end,
            dailyServiceChargeTotals: dailyServiceCharges,
        });

        const roundCurrency = (value: number) => Math.round(value * 100) / 100;

        const finalRecords = baseRecords.map(record => {
            const allocation = allocations[record.id];
            const serviceChargeShare = allocation ? roundCurrency(allocation.totalShare) : 0;
            const grossPayWithService = record.regularPay + record.overtimePay + serviceChargeShare;
            const appliedCustomDeduction = Math.max(0, record.customDeduction ?? 0);
            const netPayWithService = grossPayWithService - record.deductions.total - appliedCustomDeduction;
            const normalizedBreakdown = allocation
                ? {
                      ...allocation,
                      totalShare: serviceChargeShare,
                      details: allocation.details.map(detail => {
                    return {
                        ...detail,
                        share: roundCurrency(detail.share),
                        attendanceMinutes: dailyAttendanceTotals[detail.dateKey],
                    };
                }),
            }
                : undefined;

            return {
                ...record,
                serviceCharge: serviceChargeShare,
                grossPay: grossPayWithService,
                netPay: netPayWithService,
                serviceChargeBreakdown: normalizedBreakdown,
            };
        });

        setPayrollRecords(finalRecords);
    }, [employees, attendanceRecords, payPeriod, setPayrollRecords, dailyServiceCharges, dailyAttendanceTotals]);

    useEffect(() => {
        generatePayroll();
    }, [generatePayroll]);
    
    const handleRangeComplete = (newRange: { start: string, end: string }) => {
        if (newRange.start && newRange.end) {
            setPayPeriod(newRange);
        }
        setIsCalendarOpen(false);
    };

    const handleSavePayslip = (updatedRecord: PayrollRecord) => {
        const updatedPayroll = payrollRecords.map(r => r.id === updatedRecord.id ? updatedRecord : r);
        setPayrollRecords(updatedPayroll);
        setSelectedRecord(null);
    };

    const summaryStats = useMemo(() => {
        return payrollRecords.reduce(
            (acc, record) => {
                acc.totalGross += record.grossPay;
                acc.totalNet += record.netPay;
                acc.totalHours += record.totalHours;
                return acc;
            },
            { totalGross: 0, totalNet: 0, totalHours: 0 },
        );
    }, [payrollRecords]);

    const serviceChargeEntries = useMemo(() => {
        if (!payPeriod.start || !payPeriod.end) return [];
        return Object.entries(dailyServiceCharges)
            .filter(([dateKey]) => dateKey >= payPeriod.start && dateKey <= payPeriod.end)
            .map(([dateKey, amount]) => ({ dateKey, amount }))
            .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    }, [dailyServiceCharges, payPeriod.start, payPeriod.end]);

    const serviceChargePoolTotal = useMemo(() => {
        return Math.round(
            serviceChargeEntries.reduce((sum, entry) => sum + (entry.amount > 0 ? entry.amount : 0), 0) * 100,
        ) / 100;
    }, [serviceChargeEntries]);

    const tableHeaders = ['Staff', 'Rate', 'Regular Hrs', 'OT Hrs', 'Gross Pay', 'Net Pay', 'Present', 'Absent', 'Late', 'Actions'];

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                <div>
                    <h2 className="text-3xl font-semibold">Payroll</h2>
                    <p className="text-text-secondary mt-1">Automatically generated for the selected pay period.</p>
                </div>
                 <div className="flex items-center gap-2 flex-wrap">
                    <div className="relative" ref={calendarRef}>
                        <button 
                            onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                            className="bg-bg-tertiary border border-border-color rounded-lg p-2 text-sm font-medium flex items-center gap-2 hover:bg-hover-bg transition"
                        >
                            <CalendarDaysIcon className="w-5 h-5 text-text-secondary"/>
                            <span>{`${formatDateForDisplay(payPeriod.start)} - ${formatDateForDisplay(payPeriod.end)}`}</span>
                        </button>
                        {isCalendarOpen && (
                            <CalendarPopup 
                                initialRange={payPeriod}
                                onRangeComplete={handleRangeComplete}
                                onClose={() => setIsCalendarOpen(false)}
                            />
                        )}
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                <SummaryCard title="Total Gross Pay" value={formatPeso(summaryStats.totalGross)} icon={BanknotesIcon} />
                <SummaryCard title="Total Hours" value={`${summaryStats.totalHours.toFixed(2)} hrs`} icon={ClockIcon} />
                <SummaryCard title="Total Net Pay" value={formatPeso(summaryStats.totalNet)} icon={CurrencyPesoIcon} />
                <SummaryCard
                    title="Service Charge Pool"
                    value={formatPeso(serviceChargePoolTotal)}
                    icon={CurrencyPesoIcon}
                />
            </div>

            <div className="bg-bg-secondary border border-border-color rounded-xl p-6 mb-8">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h3 className="text-xl font-semibold text-text-primary">Service Charge Data</h3>
                        <p className="text-sm text-text-secondary">
                            Raw sales amounts for {formatDateForDisplay(payPeriod.start)} - {formatDateForDisplay(payPeriod.end)}
                        </p>
                    </div>
                    <div className="text-right">
                        <p className="text-sm text-text-secondary">Total for period</p>
                        <p className="text-2xl font-bold text-text-primary">{formatPeso(serviceChargePoolTotal)}</p>
                    </div>
                </div>
                {serviceChargeEntries.length > 0 ? (
                    <div className="mt-4 border border-border-color rounded-lg overflow-hidden">
                        <table className="w-full">
                            <thead className="bg-bg-tertiary/40 text-sm text-text-secondary">
                                <tr>
                                    <th className="p-3 text-left">Date</th>
                                    <th className="p-3 text-right">Service Amount</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border-color/60 text-sm">
                                {serviceChargeEntries.map(entry => (
                                    <tr key={`${entry.dateKey}-${entry.amount}`} className="hover:bg-hover-bg/30 transition-colors">
                                        <td className="p-3">{formatDateForDisplay(entry.dateKey)}</td>
                                        <td className="p-3 text-right font-medium">{formatPeso(entry.amount)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ) : (
                    <p className="mt-4 text-sm text-text-secondary">No service charge data found for this period.</p>
                )}
                <p className="text-xs text-text-secondary mt-3">
                    These figures are reference-only. They are not automatically applied to employee pay.
                </p>
            </div>

            <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                 {/* Desktop Table View */}
                 <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full min-w-[1000px]">
                        <thead className="bg-bg-tertiary/40">
                            <tr>
                                {tableHeaders.map(header => (
                                    <th key={header} className={`p-4 text-left text-sm font-medium text-text-secondary ${header === 'Actions' ? 'text-center' : ''}`}>{header}</th>
                                ))}
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-border-color">
                            {payrollRecords.length > 0 ? payrollRecords.map(record => (
                                <tr key={record.id} className="hover:bg-hover-bg/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-medium text-text-primary">{record.employee}</div>
                                        <div className="text-xs text-text-secondary">{record.position}</div>
                                    </td>
                                    <td className="p-4 text-sm text-text-secondary">{formatPeso(record.rate)}/hr</td>
                                    <td className="p-4 text-sm text-text-secondary">{record.regularHours.toFixed(2)}</td>
                                    <td className="p-4 text-sm text-text-secondary">{record.overtimeHours.toFixed(2)}</td>
                                    <td className="p-4 font-medium text-text-primary">{formatPeso(record.grossPay)}</td>
                                    <td className="p-4 font-semibold text-accent-green">{formatPeso(record.netPay)}</td>
                                    <td className="p-4 text-sm text-text-secondary">{record.daysPresent}</td>
                                    <td className="p-4 text-sm text-text-secondary">{record.daysAbsent}</td>
                                    <td className="p-4 text-sm text-text-secondary">{record.daysLate}</td>
                                    <td className="p-4 text-center">
                                        <button 
                                            onClick={() => setSelectedRecord(record)}
                                            className="text-accent-blue hover:underline text-sm font-medium"
                                        >
                                            View Details
                                        </button>
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={tableHeaders.length} className="text-center p-16 text-text-secondary">
                                       Payroll for the selected period will be displayed here. Ensure attendance records are uploaded.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                 </div>
                {/* Mobile Card View */}
                <div className="block lg:hidden">
                    {payrollRecords.length > 0 ? (
                        <div className="p-4 space-y-4">
                            {payrollRecords.map(record => (
                                <div key={record.id} className="bg-bg-tertiary/60 p-4 rounded-lg">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <h3 className="font-semibold text-text-primary">{record.employee}</h3>
                                            <p className="text-sm text-text-secondary">{record.position}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-semibold text-lg text-accent-green">{formatPeso(record.netPay)}</p>
                                            <p className="text-xs text-text-secondary">Net Pay</p>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-4 text-center mt-4 pt-4 border-t border-border-color">
                                        <div>
                                            <p className="font-semibold">{record.daysPresent}</p>
                                            <p className="text-xs text-text-secondary">Present</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-accent-red">{record.daysAbsent}</p>
                                            <p className="text-xs text-text-secondary">Absent</p>
                                        </div>
                                        <div>
                                            <p className="font-semibold text-accent-orange">{record.daysLate}</p>
                                            <p className="text-xs text-text-secondary">Late</p>
                                        </div>
                                    </div>
                                    <div className="mt-4 pt-4 border-t border-border-color">
                                        <div className="flex justify-between text-sm">
                                            <span className="text-text-secondary">Gross Pay</span>
                                            <span className="font-medium">{formatPeso(record.grossPay)}</span>
                                        </div>
                                        <div className="flex justify-between text-sm mt-1">
                                            <span className="text-text-secondary">Total Hours</span>
                                            <span>{record.totalHours.toFixed(2)} hrs</span>
                                        </div>
                                    </div>
                                    <div className="flex justify-end mt-4">
                                        <button 
                                            onClick={() => setSelectedRecord(record)}
                                            className="text-accent-blue hover:underline text-sm font-medium"
                                        >
                                            View Details
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-center p-16 text-text-secondary">
                            Payroll for the selected period will be displayed here. Ensure attendance records are uploaded.
                        </p>
                    )}
                </div>
            </div>

            {selectedRecord && (
                <PayslipModal 
                    record={selectedRecord}
                    payPeriod={payPeriod}
                    onClose={() => setSelectedRecord(null)}
                    onSave={handleSavePayslip}
                />
            )}
        </div>
    );
};

export default Payroll;
