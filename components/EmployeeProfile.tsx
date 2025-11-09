
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Employee, AttendanceRecord, PayrollRecord, SalesData } from '../types';
import { 
    XMarkIcon, CreditCardIcon, PencilIcon, TrashIcon, 
    CalendarDaysIcon, CheckIcon
} from './Icons';
import CalendarPopup from './CalendarPopup';
import PayslipModal from './PayslipModal';
import {
    extractDateKey,
    extractServiceCharge,
} from '../utils/salesData';
import { calculateServiceChargeDistribution } from '../utils/serviceChargeAllocation';

interface EmployeeProfileProps {
    employee: Employee;
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    salesData: SalesData[];
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onUpdateEmployee: (employee: Employee) => void;
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

const formatDuration = (minutes: number, withSign = false) => {
    if (isNaN(minutes)) return '--';
    const sign = minutes < 0 ? '-' : (withSign ? '+' : '');
    const absMinutes = Math.abs(minutes);
    const hrs = Math.floor(absMinutes / 60);
    const mins = absMinutes % 60;

    const hrsPart = hrs > 0 ? `${hrs}h` : '';
    const minsPart = mins > 0 ? `${mins}m` : '';
    
    if (hrs === 0 && mins === 0) {
        return withSign ? '-' : '0h';
    }
    
    if (hrs > 0 && mins === 0) return `${sign}${hrsPart}`;

    return `${sign}${hrsPart}${hrsPart && minsPart ? ' ' : ''}${minsPart}`;
};


const formatDateForDisplay = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString + 'T00:00:00Z');
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
};

const formatTime12Hour = (timeStr: string): string => {
    if (!timeStr || timeStr === '--:--') return '--:--';

    if (timeStr.toUpperCase().includes('AM') || timeStr.toUpperCase().includes('PM')) {
        return timeStr.trim();
    }

    const twentyFourHourMatch = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (twentyFourHourMatch) {
        let hours = parseInt(twentyFourHourMatch[1], 10);
        const minutes = parseInt(twentyFourHourMatch[2], 10);
        const ampm = hours >= 12 ? 'PM' : 'AM';
        hours = hours % 12;
        hours = hours || 12; 
        const minutesStr = minutes < 10 ? '0' + minutes : String(minutes);
        return `${hours}:${minutesStr} ${ampm}`;
    }
    return timeStr;
};

const formatHoursLabel = (minutes: number) => {
    if (!Number.isFinite(minutes)) return '--';
    return `${(minutes / 60).toFixed(2)} hrs`;
};

const formatPeso = (amount: number) => {
    return '₱' + (Number.isFinite(amount) ? amount : 0).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });
};

const OVERTIME_RATE_MULTIPLIER = 1.5;

const Tag: React.FC<{text: string, type: 'present' | 'off' | 'absent' | 'late'}> = ({text, type}) => {
    const classes = { 
        present: 'bg-accent-green/20 text-accent-green',
        off: 'bg-bg-tertiary text-text-secondary',
        absent: 'bg-accent-red/20 text-accent-red',
        late: 'bg-accent-yellow/20 text-accent-yellow',
    };
    return <span className={`inline-block text-center px-2 py-1 text-xs font-medium rounded-md uppercase ${classes[type]}`}>{text}</span>
};

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ employee, employees, attendanceRecords, salesData, onClose, onEdit, onDelete, onUpdateEmployee }) => {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);
    const [editingOtDateKey, setEditingOtDateKey] = useState<string | null>(null);
    const [payslipRecord, setPayslipRecord] = useState<PayrollRecord | null>(null);
    
    const [committedRange, setCommittedRange] = useState(() => {
        // FIX: Corrected typo `new date()` to `new Date()`.
        const date = new Date();
        const start = new Date(Date.UTC(date.getFullYear(), date.getMonth(), 1));
        const end = new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0));
        return {
            start: start.toISOString().split('T')[0],
            end: end.toISOString().split('T')[0],
        };
    });
    
    const handleOvertimeDecision = (dateKey: string, overtimeMinutes: number, approved: boolean) => {
        const currentApprovedOT = employee.approvedOvertime || {};
        const newApprovedOT = { ...currentApprovedOT };
        if (approved) {
            newApprovedOT[dateKey] = overtimeMinutes;
        } else {
            newApprovedOT[dateKey] = 0; // Explicitly rejected
        }
        onUpdateEmployee({ ...employee, approvedOvertime: newApprovedOT });
        setEditingOtDateKey(null);
    };

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) setIsCalendarOpen(false);
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, [calendarRef]);

    const dailyLog = useMemo(() => {
        if (!committedRange.start || !committedRange.end) return [];

        const log: any[] = [];
        const start = new Date(committedRange.start + 'T00:00:00Z');
        const end = new Date(committedRange.end + 'T00:00:00Z');

        const now = new Date();
        const todayUTC = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        const employeeRecords = attendanceRecords.filter(r => r.employee.toLowerCase() === employee.name.toLowerCase());

        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            const currentDate = new Date(d);
            const dateKey = currentDate.toISOString().split('T')[0];
            const schedule = employee.schedule[dateKey];
            const record = employeeRecords.find(r => r.date === dateKey);

            let dailyRecord: any = {
                date: currentDate,
                status: '',
                scheduled: 'N/A',
                timeIn: '--:--',
                timeOut: '--:--',
                worked: 0,
                overtime: 0,
            };
            
            if (schedule?.timeIn && schedule.timeOut) {
                dailyRecord.scheduled = `${formatTime12Hour(schedule.timeIn)} - ${formatTime12Hour(schedule.timeOut)}`;
            }
            if (record) {
                dailyRecord.timeIn = formatTime12Hour(record.timeIn || '--:--');
                dailyRecord.timeOut = formatTime12Hour(record.timeOut || '--:--');
            }

            const isFuture = currentDate > todayUTC;

            if (isFuture) {
                dailyRecord.status = 'Future';
            } else if (schedule?.off) {
                dailyRecord.status = 'OFF';
            } else if (record && record.timeIn && record.timeOut && schedule?.timeIn && schedule?.timeOut) {
                dailyRecord.status = 'Present';
                const actualInMinutes = timeStringToMinutes(record.timeIn);
                const actualOutMinutes = timeStringToMinutes(record.timeOut);
                const scheduledInMinutes = timeStringToMinutes(schedule.timeIn);
                const scheduledOutMinutes = timeStringToMinutes(schedule.timeOut);

                if (actualInMinutes !== null && actualOutMinutes !== null && scheduledInMinutes !== null && scheduledOutMinutes !== null) {
                    if (actualInMinutes > scheduledInMinutes) {
                        dailyRecord.status = 'Late';
                    }

                    const effectiveInMinutes = Math.max(actualInMinutes, scheduledInMinutes);
                    const baseWorkedMinutes = Math.max(0, Math.min(actualOutMinutes, scheduledOutMinutes) - effectiveInMinutes);
                    const potentialOt = Math.max(0, actualOutMinutes - scheduledOutMinutes);
                    
                    dailyRecord.worked = baseWorkedMinutes;
                    dailyRecord.overtime = potentialOt;
                }
            } else if (schedule?.timeIn) {
                dailyRecord.status = 'Absent';
            } else {
                dailyRecord.status = 'Not Scheduled';
            }
            
            log.push(dailyRecord);
        }
        return log.sort((a,b) => a.date - b.date);
    }, [employee, attendanceRecords, committedRange]);

    const serviceChargesByDate = useMemo(() => {
        if (!committedRange.start || !committedRange.end) return {};
        const startKey = committedRange.start;
        const endKey = committedRange.end;
        const map: Record<string, number> = {};
        for (const row of salesData) {
            const dateKey = extractDateKey(row);
            if (!dateKey) continue;
            if (dateKey < startKey || dateKey > endKey) continue;
            const amount = extractServiceCharge(row);
            if (amount > 0) {
                map[dateKey] = (map[dateKey] || 0) + amount;
            }
        }
        return map;
    }, [salesData, committedRange]);

    const serviceChargeTotal = useMemo(
        () => Object.values(serviceChargesByDate).reduce((sum, amount) => sum + amount, 0),
        [serviceChargesByDate],
    );

    const serviceChargeDistribution = useMemo(() => {
        if (!committedRange.start || !committedRange.end) {
            return { allocations: {}, dailyServiceChargeTotals: {}, dailyMinutes: {} };
        }
        return calculateServiceChargeDistribution({
            employees,
            attendanceRecords,
            salesData,
            start: committedRange.start,
            end: committedRange.end,
            dailyServiceChargeTotals: serviceChargesByDate,
        });
    }, [employees, attendanceRecords, salesData, committedRange.start, committedRange.end, serviceChargesByDate]);

    const employeeServiceChargeBreakdown = useMemo(() => {
        const allocation = serviceChargeDistribution.allocations[employee.id];
        if (!allocation) return undefined;
        const details = allocation.details
            .map(detail => ({
                ...detail,
                share: Math.round(detail.share * 100) / 100,
            }))
            .sort((a, b) => a.dateKey.localeCompare(b.dateKey));
        return {
            ...allocation,
            totalShare: Math.round(allocation.totalShare * 100) / 100,
            details,
        };
    }, [serviceChargeDistribution, employee.id]);

    const employeeServiceChargeShare = employeeServiceChargeBreakdown?.totalShare ?? 0;
    const employeeServiceChargeDetails = employeeServiceChargeBreakdown?.details ?? [];

    const summary = useMemo(() => {
        let scheduled = 0, worked = 0, totalDelay = 0, absence = 0, approvedOT = 0, paidMinutes = 0, totalLoginMinutes = 0;
        let lateCount = 0;
        
        dailyLog.forEach(log => {
            if (log.scheduled !== 'N/A' && log.scheduled.includes(' - ')) {
                const [start, end] = log.scheduled.split(' - ');
                const scheduledInMinutes = timeStringToMinutes(start);
                const scheduledOutMinutes = timeStringToMinutes(end);

                if(scheduledInMinutes !== null && scheduledOutMinutes !== null) {
                    scheduled += scheduledOutMinutes - scheduledInMinutes;
                }
            }

            const actualInMinutes = timeStringToMinutes(log.timeIn);
            const actualOutMinutes = timeStringToMinutes(log.timeOut);
            let totalDailyLoginDuration = 0;
            if (actualInMinutes !== null && actualOutMinutes !== null) {
                totalDailyLoginDuration = actualOutMinutes - actualInMinutes;
            }
            totalLoginMinutes += totalDailyLoginDuration;

            if(log.status === 'Late') {
                 lateCount++;
                 const [start] = log.scheduled.split(' - ');
                 const scheduledInMinutes = timeStringToMinutes(start);
                 if(scheduledInMinutes !== null && actualInMinutes !== null) {
                     const delay = actualInMinutes - scheduledInMinutes;
                     if (delay > 0) totalDelay += delay;
                 }
            }
            
            const dateKey = log.date.toISOString().split('T')[0];
            const approvedOtForDay = employee.approvedOvertime?.[dateKey] || 0;
            
            worked += log.worked;
            approvedOT += approvedOtForDay;
            
            let dailyPaidRegularMinutes = log.worked;
            if (totalDailyLoginDuration > 4 * 60) { // > 4 hours
                dailyPaidRegularMinutes = Math.max(0, log.worked - 60); // deduct 1 hour break from worked hours
            }
            paidMinutes += dailyPaidRegularMinutes;
            
            if (log.status === 'Absent' && log.scheduled !== 'N/A') absence++;
        });

        paidMinutes += approvedOT;

        const difference = (worked + approvedOT) - scheduled;

        return { scheduled, worked, difference, totalDelay, absence, approvedOT, lateCount, paidMinutes, totalLoginMinutes };
    }, [dailyLog, employee.approvedOvertime]);


    const handleRangeComplete = (newRange: { start: string, end: string }) => {
        if(newRange.start && newRange.end) setCommittedRange(newRange);
        setIsCalendarOpen(false);
    };
    
    const handleGenerateAndShowPayslip = () => {
        let totalRegularHours = 0;
        let totalOvertimeHours = 0;
        let daysPresent = 0;
        let daysAbsent = 0;
        let daysLate = 0;
        let paidRegularMinutes = 0;

        dailyLog.forEach(log => {
            if (log.status === 'Present' || log.status === 'Late') daysPresent++;
            if (log.status === 'Late') daysLate++;
            if (log.status === 'Absent') daysAbsent++;
            
            const dateKey = log.date.toISOString().split('T')[0];
            const approvedOTMinutes = employee.approvedOvertime?.[dateKey] || 0;

            const actualInMinutes = timeStringToMinutes(log.timeIn);
            const actualOutMinutes = timeStringToMinutes(log.timeOut);
            let totalDailyLoginDuration = 0;
            if (actualInMinutes !== null && actualOutMinutes !== null) {
                totalDailyLoginDuration = actualOutMinutes - actualInMinutes;
            }

            let dailyPaidRegularMinutes = log.worked;
            if (totalDailyLoginDuration > 4 * 60) {
                dailyPaidRegularMinutes = Math.max(0, log.worked - 60);
            }
            
            paidRegularMinutes += dailyPaidRegularMinutes;
            totalOvertimeHours += approvedOTMinutes / 60;
        });
        
        totalRegularHours = paidRegularMinutes / 60;
        
        const regularPay = totalRegularHours * employee.rate;
        const overtimePay = totalOvertimeHours * employee.rate * OVERTIME_RATE_MULTIPLIER;
        const serviceChargeShare = employeeServiceChargeBreakdown?.totalShare ?? 0;
        const grossPay = regularPay + overtimePay + serviceChargeShare;
        
        const deductions = { sss: 0, philhealth: 0, pagibig: 0, total: 0 };
        const netPay = grossPay - deductions.total;

        const newRecord: PayrollRecord = {
            id: employee.id,
            employee: employee.name,
            position: employee.position,
            rate: employee.rate,
            regularHours: totalRegularHours,
            overtimeHours: totalOvertimeHours,
            totalHours: totalRegularHours + totalOvertimeHours,
            regularPay,
            overtimePay,
            serviceCharge: serviceChargeShare,
            grossPay,
            deductions,
            netPay,
            daysPresent,
            daysAbsent,
            daysLate,
            deductionNotes: '',
            customDeduction: 0,
            serviceChargeBreakdown: employeeServiceChargeBreakdown,
        };
        
        setPayslipRecord(newRecord);
    };

    const StatCard: React.FC<{title: string, value: string, subValue?: string, colorClass?: string}> = ({title, value, subValue, colorClass=""}) => (
        <div className="bg-bg-primary p-3 rounded-lg text-center">
            <p className="text-xs text-text-secondary whitespace-nowrap">{title}</p>
            <p className={`text-xl font-bold mt-1 whitespace-nowrap ${colorClass}`}>{value}</p>
            {subValue && <p className="text-xs text-text-secondary/70 mt-0.5 whitespace-nowrap">{subValue}</p>}
        </div>
    );
    
    const tableHeaders = ['Date', 'Status', 'Scheduled', 'Time In/Out', 'Login Hours', 'Overtime'];
    const rightAlignedHeaders = ['Login Hours', 'Overtime'];
    const centerAlignedHeaders = ['Status'];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-6xl h-full max-h-[90vh] rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
               <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-border-color">
                    <h2 className="text-xl font-semibold">Employee Profile</h2>
                     <div className="flex items-center gap-2">
                        <button onClick={onEdit} className="flex items-center justify-center gap-2 bg-hover-bg text-text-primary px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-opacity-80">
                            <PencilIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button onClick={onDelete} className="flex items-center justify-center gap-2 bg-accent-red/20 text-accent-red px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-accent-red/30">
                            <TrashIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Delete</span>
                        </button>
                        <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                </div>
               <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 overflow-y-auto">
                   <aside className="lg:col-span-4 lg:sticky lg:top-0 lg:self-start">
                        <div className="bg-bg-tertiary rounded-xl p-6">
                           <div className="text-center">
                                <div className="w-24 h-24 rounded-full bg-bg-primary flex items-center justify-center font-bold text-5xl text-text-primary mx-auto">
                                    {employee.name.charAt(0)}
                                </div>
                                <h3 className="text-2xl font-semibold mt-4">{employee.name}</h3>
                                <p className="text-md text-text-secondary">{employee.position}</p>
                            </div>
                             <div className="mt-6 pt-6 border-t border-border-color text-center px-4">
                                <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-4">Performance Overview</h4>
                                 <div className="grid grid-cols-2 gap-4">
                                    <StatCard title="Scheduled" value={formatDuration(summary.scheduled)} />
                                    <StatCard title="Login Hours" value={formatDuration(summary.totalLoginMinutes)} />
                                    <StatCard title="Paid Hours" value={formatDuration(summary.paidMinutes)} />
                                    <StatCard title="Difference" value={formatDuration(summary.difference, true)} colorClass={summary.difference === 0 ? '' : summary.difference > 0 ? 'text-accent-green' : 'text-accent-red'} />
                                    <StatCard title="Approved OT" value={formatDuration(summary.approvedOT)} />
                                    <StatCard title="Absences" value={String(summary.absence)} colorClass={summary.absence > 0 ? 'text-accent-red' : ''} />
                                    <StatCard title="Lates" value={String(summary.lateCount)} subValue={summary.totalDelay > 0 ? `${formatDuration(summary.totalDelay)} total` : ''} colorClass={summary.lateCount > 0 ? 'text-accent-yellow' : ''} />
                                </div>
                            </div>
                        </div>
                   </aside>

                   <main className="lg:col-span-8 bg-bg-tertiary rounded-xl flex flex-col">
                        <div className="flex-shrink-0 p-4 flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-border-color">
                            <h3 className="text-xl font-semibold">Daily Activity Log</h3>
                            <div className="flex items-center gap-2 flex-wrap justify-end">
                                <div className="relative" ref={calendarRef}>
                                    <button onClick={() => setIsCalendarOpen(!isCalendarOpen)} className="bg-bg-secondary border border-border-color rounded-lg p-2 text-sm font-medium flex items-center gap-2 hover:bg-hover-bg transition">
                                        <CalendarDaysIcon className="w-5 h-5 text-text-secondary"/>
                                        <span>{`${formatDateForDisplay(committedRange.start)} - ${formatDateForDisplay(committedRange.end)}`}</span>
                                    </button>
                                    {isCalendarOpen && <CalendarPopup initialRange={committedRange} onRangeComplete={handleRangeComplete} onClose={() => setIsCalendarOpen(false)} />}
                                </div>
                                 <button onClick={handleGenerateAndShowPayslip} className="bg-bg-secondary border border-border-color rounded-lg p-2 text-sm font-medium flex items-center gap-2 hover:bg-hover-bg transition" title="View Payslip for this period">
                                    <CreditCardIcon className="w-5 h-5 text-text-secondary"/>
                                    <span>Payslip</span>
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 p-4 space-y-4">
                            <div className="bg-bg-secondary border border-border-color rounded-xl p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                    <div>
                                        <h4 className="text-lg font-semibold text-text-primary">Service Charge Allocation</h4>
                                        <p className="text-xs text-text-secondary">
                                            {formatDateForDisplay(committedRange.start)} - {formatDateForDisplay(committedRange.end)}
                                        </p>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <p className="text-xs text-text-secondary uppercase tracking-wide">Pool Total</p>
                                        <p className="text-xl font-bold text-text-primary">{formatPeso(serviceChargeTotal)}</p>
                                    </div>
                                    <div className="flex flex-col text-right">
                                        <p className="text-xs text-text-secondary uppercase tracking-wide">Your Share</p>
                                        <p className="text-xl font-bold text-accent-green">{formatPeso(employeeServiceChargeShare)}</p>
                                    </div>
                                </div>
                                {employeeServiceChargeDetails.length > 0 ? (
                                    <div className="mt-3 border border-border-color rounded-lg overflow-hidden">
                                        <table className="w-full text-sm">
                                            <thead className="bg-bg-tertiary/40 text-text-secondary text-xs uppercase tracking-wide">
                                                <tr>
                                                    <th className="p-2 text-left">Date</th>
                                                    <th className="p-2 text-right">Paid Hrs</th>
                                                    <th className="p-2 text-right">Ghost Hrs</th>
                                                    <th className="p-2 text-right">Pool</th>
                                                    <th className="p-2 text-right">Your Share</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border-color/50">
                                                {employeeServiceChargeDetails.map(detail => (
                                                    <tr key={`${detail.dateKey}-${detail.share}`}>
                                                        <td className="p-2">{formatDateForDisplay(detail.dateKey)}</td>
                                                        <td className="p-2 text-right">{formatHoursLabel(detail.employeeMinutes)}</td>
                                                        <td className="p-2 text-right">{formatHoursLabel(detail.ghostMinutes)}</td>
                                                        <td className="p-2 text-right">{formatPeso(detail.pool)}</td>
                                                        <td className="p-2 text-right font-semibold text-accent-green">
                                                            {formatPeso(detail.share)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                ) : (
                                    <p className="mt-3 text-sm text-text-secondary">No service charge recorded for this employee in the selected range.</p>
                                )}
                                <p className="text-xs text-text-secondary mt-3">
                                    Two ghost employees (12h each) are included in the team total each day to smooth allocations. A 40% daily deduction is applied before the share shown here is credited.
                                </p>
                            </div>
                            <div className="animate-fade-in-up">
                                <div className="overflow-x-auto hidden md:block">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border-color">
                                                {tableHeaders.map(h => (
                                                    <th key={h} className={`py-2 px-2 text-xs font-semibold text-text-secondary uppercase tracking-wider ${
                                                        rightAlignedHeaders.includes(h) ? 'text-right' : 
                                                        centerAlignedHeaders.includes(h) ? 'text-center' : 'text-left'
                                                    }`}>{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-color/50">
                                            {dailyLog.map(log => {
                                                const dateKey = log.date.toISOString().split('T')[0];
                                                const approvedMinutes = employee.approvedOvertime?.[dateKey];
                                                return (
                                                    <tr key={log.date.toISOString()} className="hover:bg-bg-secondary/50">
                                                        <td className="px-2 py-1.5 font-medium">{log.date.toLocaleDateString('en-US', {day: '2-digit', month: 'short', timeZone: 'UTC'})}</td>
                                                        <td className="px-2 py-1.5 text-center">
                                                            {log.status === 'Present' && <Tag text="Present" type="present"/>}
                                                            {log.status === 'Late' && <Tag text="Late" type="late"/>}
                                                            {log.status === 'OFF' && <Tag text="OFF" type="off"/>}
                                                            {log.status === 'Absent' && <Tag text="Absent" type="absent"/>}
                                                            {(log.status === 'Future' || log.status === 'Not Scheduled') && <span className="text-text-secondary/70">--</span>}
                                                        </td>
                                                        <td className="px-2 py-1.5 text-text-secondary text-xs">{log.scheduled}</td>
                                                        <td className="px-2 py-1.5 text-text-secondary text-xs">{log.timeIn === '--:--' ? '--:--' : `${log.timeIn} - ${log.timeOut}`}</td>
                                                        <td className="px-2 py-1.5 font-semibold text-right">{log.worked > 0 ? formatDuration(log.worked) : '--'}</td>
                                                        <td className="px-2 py-1.5 font-semibold text-right">
                                                            {log.overtime > 0 ? (
                                                                <div className="flex items-center justify-end gap-2">
                                                                    {editingOtDateKey === dateKey ? (
                                                                        <>
                                                                            <span>{formatDuration(log.overtime)}</span>
                                                                            <button onClick={() => handleOvertimeDecision(dateKey, log.overtime, true)} className="p-1 rounded-full text-text-secondary/60 hover:text-accent-green hover:bg-accent-green/20" title="Approve OT"><CheckIcon className="w-4 h-4" /></button>
                                                                            <button onClick={() => handleOvertimeDecision(dateKey, log.overtime, false)} className="p-1 rounded-full text-text-secondary/60 hover:text-accent-red hover:bg-accent-red/20" title="Reject OT"><XMarkIcon className="w-4 h-4" /></button>
                                                                        </>
                                                                    ) : (
                                                                        <button 
                                                                            onClick={() => setEditingOtDateKey(dateKey)} 
                                                                            className="flex items-center justify-end gap-2 text-right hover:bg-bg-primary/50 px-2 py-1 rounded-md transition-colors w-full"
                                                                        >
                                                                            <span>{formatDuration(log.overtime)}</span>
                                                                            {approvedMinutes > 0 && <CheckIcon className="w-4 h-4 text-accent-green" title="Approved"/>}
                                                                            {approvedMinutes === 0 && <XMarkIcon className="w-4 h-4 text-accent-red" title="Rejected"/>}
                                                                            {approvedMinutes === undefined && <PencilIcon className="w-3 h-3 text-text-secondary/70" />}
                                                                        </button>
                                                                    )}
                                                                </div>
                                                            ) : '--'}
                                                        </td>
                                                    </tr>
                                                )
                                            })}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="block md:hidden space-y-2">
                                    {dailyLog.map(log => {
                                        const dateKey = log.date.toISOString().split('T')[0];
                                        const approvedMinutes = employee.approvedOvertime?.[dateKey];
                                        return (
                                            <div key={log.date.toISOString()} className="bg-bg-secondary p-2.5 rounded-lg text-sm">
                                                <div className="flex justify-between items-center mb-1.5 pb-1.5 border-b border-border-color">
                                                    <span className="font-semibold">{log.date.toLocaleDateString('en-US', { weekday: 'short', day: '2-digit', month: 'short', timeZone: 'UTC'})}</span>
                                                    <span>
                                                        {log.status === 'Present' && <Tag text="Present" type="present"/>}
                                                        {log.status === 'Late' && <Tag text="Late" type="late"/>}
                                                        {log.status === 'OFF' && <Tag text="OFF" type="off"/>}
                                                        {log.status === 'Absent' && <Tag text="Absent" type="absent"/>}
                                                        {(log.status === 'Future' || log.status === 'Not Scheduled') && <span className="text-text-secondary/70 text-xs">--</span>}
                                                    </span>
                                                </div>
                                                <div className="space-y-1 text-xs">
                                                    <div className="flex justify-between"><span className="text-text-secondary">Scheduled:</span><span>{log.scheduled}</span></div>
                                                    <div className="flex justify-between"><span className="text-text-secondary">Clocked:</span><span>{log.timeIn} - {log.timeOut}</span></div>
                                                    <div className="flex justify-between"><span className="text-text-secondary">Login Hours:</span><span className="font-semibold">{log.worked > 0 ? formatDuration(log.worked) : '--'}</span></div>
                                                    <div className="flex justify-between items-center">
                                                        <span className="text-text-secondary">Overtime:</span>
                                                        <div className="flex items-center justify-end gap-2">
                                                            {log.overtime > 0 ? (
                                                                editingOtDateKey === dateKey ? (
                                                                <>
                                                                    <span>{formatDuration(log.overtime)}</span>
                                                                    <button onClick={() => handleOvertimeDecision(dateKey, log.overtime, true)} className="p-1 rounded-full bg-accent-green/20" title="Approve OT"><CheckIcon className="w-4 h-4 text-accent-green" /></button>
                                                                    <button onClick={() => handleOvertimeDecision(dateKey, log.overtime, false)} className="p-1 rounded-full bg-accent-red/20" title="Reject OT"><XMarkIcon className="w-4 h-4 text-accent-red" /></button>
                                                                </>
                                                            ) : (
                                                                <button onClick={() => setEditingOtDateKey(dateKey)} className="flex items-center gap-2 hover:bg-hover-bg/50 px-2 py-1 rounded-md transition-colors">
                                                                    <span>{formatDuration(log.overtime)}</span>
                                                                    {approvedMinutes > 0 && <CheckIcon className="w-4 h-4 text-accent-green" title="Approved" />}
                                                                    {approvedMinutes === 0 && <XMarkIcon className="w-4 h-4 text-accent-red" title="Rejected" />}
                                                                    {approvedMinutes === undefined && <PencilIcon className="w-3 h-3 text-text-secondary/70" />}
                                                                </button>
                                                            )
                                                            ) : <span>--</span>}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                        </div>
                   </main>
               </div>
            </div>
            
            {payslipRecord && (
                <PayslipModal
                    record={payslipRecord}
                    payPeriod={committedRange}
                    onClose={() => setPayslipRecord(null)}
                    onSave={(updatedRecord) => {
                        alert("Payslip updated for this view. Changes are not saved to the main payroll records.");
                        setPayslipRecord(null);
                    }}
                />
            )}

        </div>
    );
};

export default EmployeeProfile;
