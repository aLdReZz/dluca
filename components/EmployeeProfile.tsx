
import React, { useState, useMemo, useEffect, useRef } from 'react';
import type { Employee, AttendanceRecord, PayrollRecord, SalesData, SalaryDeduction, AdditionalIncome, RateHistoryEntry } from '../types';
import {
    XMarkIcon, CreditCardIcon, PencilIcon, TrashIcon,
    CalendarDaysIcon, CheckIcon, PlusIcon, ChevronDownIcon
} from './Icons';
import CalendarPopup from './CalendarPopup';
import PayslipModal from './PayslipModal';
import {
    extractDateKey,
    extractServiceCharge,
} from '../utils/salesData';
import { calculateServiceChargeDistribution } from '../utils/serviceChargeAllocation';
import { getRateForDate } from '../utils/rateHistory';

interface EmployeeProfileProps {
    employee: Employee;
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    salesData: SalesData[];
    payrollRecords?: PayrollRecord[];
    setPayrollRecords?: React.Dispatch<React.SetStateAction<PayrollRecord[]>>;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onUpdateEmployee: (employee: Employee) => void;
    onUpdateAttendance?: (records: AttendanceRecord[]) => void;
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

const OVERTIME_RATE_MULTIPLIER = 1.25;

const Tag: React.FC<{text: string, type: 'present' | 'off' | 'absent' | 'late'}> = ({text, type}) => {
    const classes = { 
        present: 'bg-accent-green/20 text-accent-green',
        off: 'bg-bg-tertiary text-text-secondary',
        absent: 'bg-accent-red/20 text-accent-red',
        late: 'bg-accent-yellow/20 text-accent-yellow',
    };
    return <span className={`inline-block text-center px-2 py-1 text-xs font-medium rounded-md uppercase ${classes[type]}`}>{text}</span>
};

const EmployeeProfile: React.FC<EmployeeProfileProps> = ({ employee, employees, attendanceRecords, salesData, payrollRecords, setPayrollRecords, onClose, onEdit, onDelete, onUpdateEmployee, onUpdateAttendance }) => {
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const calendarRef = useRef<HTMLDivElement>(null);
    const [editingOtDateKey, setEditingOtDateKey] = useState<string | null>(null);
    const [payslipRecord, setPayslipRecord] = useState<PayrollRecord | null>(null);
    const [isAddingDeduction, setIsAddingDeduction] = useState(false);
    const [newDeductionReason, setNewDeductionReason] = useState('');
    const [newDeductionAmount, setNewDeductionAmount] = useState('');
    const [newDeductionDate, setNewDeductionDate] = useState('');
    const [editingDeductionId, setEditingDeductionId] = useState<string | null>(null);
    const [isAddingIncome, setIsAddingIncome] = useState(false);
    const [newIncomeReason, setNewIncomeReason] = useState('');
    const [newIncomeAmount, setNewIncomeAmount] = useState('');
    const [newIncomeDate, setNewIncomeDate] = useState('');
    const [editingIncomeId, setEditingIncomeId] = useState<string | null>(null);
    const [isServiceChargeExpanded, setIsServiceChargeExpanded] = useState(false);
    const [editingSchedule, setEditingSchedule] = useState<string | null>(null);
    const [editingTimeIn, setEditingTimeIn] = useState<string | null>(null);
    const [editingTimeOut, setEditingTimeOut] = useState<string | null>(null);
    const [editingTimeBoth, setEditingTimeBoth] = useState<string | null>(null);
    const [tempScheduleIn, setTempScheduleIn] = useState('');
    const [tempScheduleOut, setTempScheduleOut] = useState('');
    const [tempTimeIn, setTempTimeIn] = useState('');
    const [tempTimeOut, setTempTimeOut] = useState('');
    const [editingRateDateKey, setEditingRateDateKey] = useState<string | null>(null);
    const [tempRate, setTempRate] = useState('');

    const [localEmployee, setLocalEmployee] = useState<Employee>(employee);
    const [isDirty, setIsDirty] = useState(false);

    const updateLocal = (updated: Employee) => {
        setLocalEmployee(updated);
        setIsDirty(true);
    };

    useEffect(() => {
        setLocalEmployee(employee);
        setIsDirty(false);
        setIsEditMode(false);
    }, [employee.id]);

    const [isEditMode, setIsEditMode] = useState(false);
    const [editFields, setEditFields] = useState({ name: '', position: '', rate: '', rateEffectiveDate: '', phone: '', email: '', department: '', bankAccount: '', paymentMode: '' });

    const handleEnterEditMode = () => {
        setEditFields({
            name: localEmployee.name,
            position: localEmployee.position,
            rate: String(localEmployee.rate),
            rateEffectiveDate: new Date().toISOString().split('T')[0],
            phone: localEmployee.phone || '',
            email: localEmployee.email || '',
            department: localEmployee.department || '',
            bankAccount: localEmployee.bankAccount || '',
            paymentMode: localEmployee.paymentMode || '',
        });
        setIsEditMode(true);
    };

    const handleSaveAll = () => {
        let final = localEmployee;
        if (isEditMode) {
            const newRate = parseFloat(editFields.rate);
            const rateChanged = !isNaN(newRate) && newRate > 0 && newRate !== localEmployee.rate;

            let updatedRateHistory = localEmployee.rateHistory || [];
            let appliedRate = localEmployee.rate;

            if (rateChanged) {
                const effectiveDate = editFields.rateEffectiveDate || new Date().toISOString().split('T')[0];
                const newEntry: RateHistoryEntry = {
                    id: Date.now().toString(),
                    rate: newRate,
                    effectiveDate,
                    notes: 'Rate updated from employee profile',
                };
                const existingIndex = updatedRateHistory.findIndex(e => e.effectiveDate === effectiveDate);
                if (existingIndex >= 0) {
                    updatedRateHistory = updatedRateHistory.map((e, i) => i === existingIndex ? { ...e, rate: newRate } : e);
                } else {
                    updatedRateHistory = [...updatedRateHistory, newEntry].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate));
                }
                const today = new Date().toISOString().split('T')[0];
                const latest = [...updatedRateHistory]
                    .filter(e => e.effectiveDate <= today)
                    .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];
                appliedRate = latest?.rate ?? newRate;
            }

            final = {
                ...localEmployee,
                name: editFields.name.trim() || localEmployee.name,
                position: editFields.position.trim() || localEmployee.position,
                rate: appliedRate,
                rateHistory: updatedRateHistory,
                phone: editFields.phone.trim() || undefined,
                email: editFields.email.trim() || undefined,
                department: editFields.department.trim() || undefined,
                bankAccount: editFields.bankAccount.trim() || undefined,
                paymentMode: editFields.paymentMode.trim() || undefined,
            };
        }
        onUpdateEmployee(final);
        setLocalEmployee(final);
        setIsDirty(false);
        setIsEditMode(false);
    };

    const handleCancelAll = () => {
        setLocalEmployee(employee);
        setIsDirty(false);
        setIsEditMode(false);
    };

    const [committedRange, setCommittedRange] = useState(() => {
        const date = new Date();
        const start = new Date(date.getFullYear(), date.getMonth(), 1);
        const end = new Date(date.getFullYear(), date.getMonth(), date.getDate());

        const formatDateKeyLocal = (d: Date): string => {
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        return {
            start: formatDateKeyLocal(start),
            end: formatDateKeyLocal(end),
        };
    });
    
    const handleOvertimeDecision = (dateKey: string, overtimeMinutes: number, approved: boolean) => {
        const currentApprovedOT = localEmployee.approvedOvertime || {};
        const newApprovedOT = { ...currentApprovedOT };
        if (approved) {
            newApprovedOT[dateKey] = overtimeMinutes;
        } else {
            newApprovedOT[dateKey] = 0;
        }
        updateLocal({ ...localEmployee, approvedOvertime: newApprovedOT });
        setEditingOtDateKey(null);
    };

    const handleAddDeduction = () => {
        if (!newDeductionReason.trim() || !newDeductionAmount.trim()) return;

        const amount = parseFloat(newDeductionAmount);
        if (isNaN(amount) || amount <= 0) return;

        const currentDeductions = localEmployee.salaryDeductions || [];
        const newDeduction: SalaryDeduction = {
            id: Date.now().toString(),
            description: newDeductionReason.trim(),
            amount: amount,
            date: newDeductionDate || new Date().toISOString().split('T')[0],
        };

        updateLocal({
            ...localEmployee,
            salaryDeductions: [...currentDeductions, newDeduction],
        });

        setNewDeductionReason('');
        setNewDeductionAmount('');
        setNewDeductionDate('');
        setIsAddingDeduction(false);
    };

    const handleEditDeduction = (deduction: SalaryDeduction) => {
        setEditingDeductionId(deduction.id);
        setNewDeductionReason(deduction.description);
        setNewDeductionAmount(deduction.amount.toString());
        setNewDeductionDate(deduction.date);
        setIsAddingDeduction(false);
    };

    const handleSaveDeduction = () => {
        if (!editingDeductionId || !newDeductionReason.trim() || !newDeductionAmount.trim()) return;

        const amount = parseFloat(newDeductionAmount);
        if (isNaN(amount) || amount <= 0) return;

        const currentDeductions = localEmployee.salaryDeductions || [];
        const updatedDeductions = currentDeductions.map(d =>
            d.id === editingDeductionId
                ? {
                      ...d,
                      description: newDeductionReason.trim(),
                      amount: amount,
                      date: newDeductionDate || d.date,
                  }
                : d
        );

        updateLocal({
            ...localEmployee,
            salaryDeductions: updatedDeductions,
        });

        setEditingDeductionId(null);
        setNewDeductionReason('');
        setNewDeductionAmount('');
        setNewDeductionDate('');
    };

    const handleCancelEditDeduction = () => {
        setEditingDeductionId(null);
        setNewDeductionReason('');
        setNewDeductionAmount('');
        setNewDeductionDate('');
    };

    const handleRemoveDeduction = (deductionId: number) => {
        const currentDeductions = localEmployee.salaryDeductions || [];
        updateLocal({
            ...localEmployee,
            salaryDeductions: currentDeductions.filter(d => d.id !== deductionId),
        });
    };

    const handleAddIncome = () => {
        if (!newIncomeReason.trim() || !newIncomeAmount.trim()) return;

        const amount = parseFloat(newIncomeAmount);
        if (isNaN(amount) || amount <= 0) return;

        const currentIncome = localEmployee.additionalIncome || [];
        const newIncome: AdditionalIncome = {
            id: Date.now().toString(),
            description: newIncomeReason.trim(),
            amount: amount,
            date: newIncomeDate || new Date().toISOString().split('T')[0],
        };

        updateLocal({
            ...localEmployee,
            additionalIncome: [...currentIncome, newIncome],
        });

        setNewIncomeReason('');
        setNewIncomeAmount('');
        setNewIncomeDate('');
        setIsAddingIncome(false);
    };

    const handleEditIncome = (income: AdditionalIncome) => {
        setEditingIncomeId(income.id);
        setNewIncomeReason(income.description);
        setNewIncomeAmount(income.amount.toString());
        setNewIncomeDate(income.date);
        setIsAddingIncome(false);
    };

    const handleSaveIncome = () => {
        if (!editingIncomeId || !newIncomeReason.trim() || !newIncomeAmount.trim()) return;

        const amount = parseFloat(newIncomeAmount);
        if (isNaN(amount) || amount <= 0) return;

        const currentIncome = localEmployee.additionalIncome || [];
        const updatedIncome = currentIncome.map(i =>
            i.id === editingIncomeId
                ? {
                      ...i,
                      description: newIncomeReason.trim(),
                      amount: amount,
                      date: newIncomeDate || i.date,
                  }
                : i
        );

        updateLocal({
            ...localEmployee,
            additionalIncome: updatedIncome,
        });

        setEditingIncomeId(null);
        setNewIncomeReason('');
        setNewIncomeAmount('');
        setNewIncomeDate('');
    };

    const handleCancelEditIncome = () => {
        setEditingIncomeId(null);
        setNewIncomeReason('');
        setNewIncomeAmount('');
        setNewIncomeDate('');
    };

    const handleRemoveIncome = (incomeId: string) => {
        const currentIncome = localEmployee.additionalIncome || [];
        updateLocal({
            ...localEmployee,
            additionalIncome: currentIncome.filter(i => i.id !== incomeId),
        });
    };

    const handleScheduleEdit = (dateKey: string) => {
        const schedule = localEmployee.schedule[dateKey];
        if (schedule?.off) {
            setTempScheduleIn('OFF');
            setTempScheduleOut('OFF');
        } else {
            setTempScheduleIn(schedule?.timeIn || '');
            setTempScheduleOut(schedule?.timeOut || '');
        }
        setEditingSchedule(dateKey);
    };

    const handleScheduleSave = (dateKey: string) => {
        if (tempScheduleIn === 'OFF' || tempScheduleOut === 'OFF') {
            const updatedSchedule = {
                ...localEmployee.schedule,
                [dateKey]: { timeIn: '', timeOut: '', off: true }
            };
            updateLocal({ ...localEmployee, schedule: updatedSchedule });
            setEditingSchedule(null);
            setTempScheduleIn('');
            setTempScheduleOut('');
            return;
        }

        if (!tempScheduleIn || !tempScheduleOut) return;

        const updatedSchedule = {
            ...localEmployee.schedule,
            [dateKey]: { timeIn: tempScheduleIn, timeOut: tempScheduleOut, off: false }
        };
        updateLocal({ ...localEmployee, schedule: updatedSchedule });
        setEditingSchedule(null);
        setTempScheduleIn('');
        setTempScheduleOut('');
    };

    const handleRateEdit = (dateKey: string) => {
        const currentRate = getRateForDate(localEmployee, dateKey);
        setTempRate(String(currentRate));
        setEditingRateDateKey(dateKey);
    };

    const handleRateSave = (dateKey: string) => {
        const newRate = parseFloat(tempRate);
        if (isNaN(newRate) || newRate <= 0) {
            setEditingRateDateKey(null);
            setTempRate('');
            return;
        }

        const newEntry: RateHistoryEntry = {
            id: Date.now().toString(),
            rate: newRate,
            effectiveDate: dateKey,
            notes: 'Updated from Daily Activity Log',
        };

        const currentHistory = localEmployee.rateHistory || [];
        const existingIndex = currentHistory.findIndex(e => e.effectiveDate === dateKey);

        let updatedHistory: RateHistoryEntry[];
        if (existingIndex >= 0) {
            updatedHistory = currentHistory.map((e, i) =>
                i === existingIndex ? { ...e, rate: newRate } : e
            );
        } else {
            updatedHistory = [...currentHistory, newEntry].sort(
                (a, b) => a.effectiveDate.localeCompare(b.effectiveDate)
            );
        }

        const today = new Date().toISOString().split('T')[0];
        const latestEffectiveRate = [...updatedHistory]
            .filter(entry => entry.effectiveDate <= today)
            .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))[0];

        updateLocal({
            ...localEmployee,
            rateHistory: updatedHistory,
            rate: latestEffectiveRate?.rate ?? localEmployee.rate,
        });

        setEditingRateDateKey(null);
        setTempRate('');
    };

    const handleAttendanceEdit = (dateKey: string, type: 'in' | 'out' | 'both') => {
        const record = attendanceRecords.find(r => r.employee.toLowerCase() === localEmployee.name.toLowerCase() && r.date === dateKey);

        if (type === 'both') {
            setTempTimeIn(record?.timeIn || '');
            setTempTimeOut(record?.timeOut || '');
            setEditingTimeBoth(dateKey);
        } else if (type === 'in') {
            setTempTimeIn(record?.timeIn || '');
            setEditingTimeIn(dateKey);
        } else {
            setTempTimeOut(record?.timeOut || '');
            setEditingTimeOut(dateKey);
        }
    };

    const handleAttendanceSave = (dateKey: string, type: 'in' | 'out' | 'both') => {
        if (!onUpdateAttendance) return;

        if (type === 'both') {
            if (!tempTimeIn && !tempTimeOut) return;

            const existingRecord = attendanceRecords.find(r => r.employee.toLowerCase() === localEmployee.name.toLowerCase() && r.date === dateKey);
            let updatedRecords = [...attendanceRecords];

            if (existingRecord) {
                updatedRecords = updatedRecords.map(r => {
                    if (r.employee.toLowerCase() === localEmployee.name.toLowerCase() && r.date === dateKey) {
                        return {
                            ...r,
                            timeIn: tempTimeIn,
                            timeOut: tempTimeOut
                        };
                    }
                    return r;
                });
            } else {
                updatedRecords.push({
                    employee: localEmployee.name,
                    date: dateKey,
                    timeIn: tempTimeIn,
                    timeOut: tempTimeOut
                });
            }

            onUpdateAttendance(updatedRecords);
            setEditingTimeBoth(null);
            setTempTimeIn('');
            setTempTimeOut('');
        } else {
            const value = type === 'in' ? tempTimeIn : tempTimeOut;
            if (!value) return;

            const existingRecord = attendanceRecords.find(r => r.employee.toLowerCase() === localEmployee.name.toLowerCase() && r.date === dateKey);

            let updatedRecords = [...attendanceRecords];

            if (existingRecord) {
                updatedRecords = updatedRecords.map(r => {
                    if (r.employee.toLowerCase() === localEmployee.name.toLowerCase() && r.date === dateKey) {
                        return {
                            ...r,
                            [type === 'in' ? 'timeIn' : 'timeOut']: value
                        };
                    }
                    return r;
                });
            } else {
                updatedRecords.push({
                    employee: localEmployee.name,
                    date: dateKey,
                    timeIn: type === 'in' ? value : '',
                    timeOut: type === 'out' ? value : ''
                });
            }

            onUpdateAttendance(updatedRecords);

            if (type === 'in') {
                setEditingTimeIn(null);
                setTempTimeIn('');
            } else {
                setEditingTimeOut(null);
                setTempTimeOut('');
            }
        }
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
        const employeeRecords = attendanceRecords.filter(r => r.employee.toLowerCase() === localEmployee.name.toLowerCase());

        for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
            const currentDate = new Date(d);
            const dateKey = currentDate.toISOString().split('T')[0];
            const schedule = localEmployee.schedule[dateKey];
            const record = employeeRecords.find(r => r.date === dateKey);

            let dailyRecord: any = {
                date: currentDate,
                status: '',
                scheduled: 'N/A',
                scheduleDuration: 0,
                timeIn: '--:--',
                timeOut: '--:--',
                worked: 0,
                overtime: 0,
                paidHours: 0,
            };

            if (schedule?.timeIn && schedule.timeOut) {
                dailyRecord.scheduled = `${formatTime12Hour(schedule.timeIn)} - ${formatTime12Hour(schedule.timeOut)}`;
                const schedInMin = timeStringToMinutes(schedule.timeIn);
                const schedOutMin = timeStringToMinutes(schedule.timeOut);
                if (schedInMin !== null && schedOutMin !== null) {
                    dailyRecord.scheduleDuration = schedOutMin - schedInMin;
                }
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

                    // Calculate paid hours: worked minutes minus lunch break if login > 6 hours
                    const totalLoginMinutes = actualOutMinutes - actualInMinutes;
                    let paidMinutes = baseWorkedMinutes;
                    if (totalLoginMinutes > 6 * 60) {
                        paidMinutes = Math.max(0, paidMinutes - 60);
                    }
                    const approvedOtForDay = localEmployee.approvedOvertime?.[dateKey] || 0;
                    dailyRecord.paidHours = paidMinutes + approvedOtForDay;
                }
            } else if (schedule?.timeIn) {
                dailyRecord.status = 'Absent';
            } else {
                dailyRecord.status = 'Not Scheduled';
            }
            
            log.push(dailyRecord);
        }
        return log.sort((a,b) => a.date - b.date);
    }, [localEmployee, attendanceRecords, committedRange]);

    const serviceChargesByDate = useMemo(() => {
        if (!committedRange.start || !committedRange.end) return {};
        const startKey = committedRange.start;
        const endKey = committedRange.end;
        const map: Record<string, number> = {};
        console.log('Service Charge Debug:', {
            totalSalesRows: salesData.length,
            dateRange: { start: startKey, end: endKey },
            sampleRow: salesData[0]
        });
        for (const row of salesData) {
            const dateKey = extractDateKey(row);
            if (!dateKey) continue;
            if (dateKey < startKey || dateKey > endKey) continue;
            const amount = extractServiceCharge(row);
            console.log('Service charge found:', { dateKey, amount, row });
            if (amount > 0) {
                map[dateKey] = (map[dateKey] || 0) + amount;
            }
        }
        console.log('Service charges by date:', map);
        return map;
    }, [salesData, committedRange]);

    const serviceChargeTotal = useMemo(
        () => Object.values(serviceChargesByDate).reduce((sum, amount) => (sum as number) + (amount as number), 0),
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
        const allocation = serviceChargeDistribution.allocations[localEmployee.id];
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
    }, [serviceChargeDistribution, localEmployee.id]);

    const employeeServiceChargeShare = employeeServiceChargeBreakdown?.totalShare ?? 0;
    const employeeServiceChargeDetails = employeeServiceChargeBreakdown?.details ?? [];

    const periodEarnings = useMemo(() => {
        if (!committedRange.start || !committedRange.end) return { regularPay: 0, overtimePay: 0, serviceCharge: 0, total: 0 };

        // Calculate regular and overtime pay from daily log for the filtered date range
        const OVERTIME_RATE_MULTIPLIER = 1.25;
        let totalRegularPay = 0;
        let totalOvertimePay = 0;

        dailyLog.forEach(day => {
            const dateKey = day.date.toISOString().split('T')[0];
            // Only include days within the committed range
            if (dateKey >= committedRange.start && dateKey <= committedRange.end) {
                const dailyRate = getRateForDate(localEmployee, dateKey);
                const approvedOT = localEmployee.approvedOvertime?.[dateKey] || 0;
                const paidMinutes = day.paidHours - approvedOT;

                if (paidMinutes > 0) {
                    totalRegularPay += (paidMinutes / 60) * dailyRate;
                }
                if (approvedOT > 0) {
                    totalOvertimePay += (approvedOT / 60) * dailyRate * OVERTIME_RATE_MULTIPLIER;
                }
            }
        });

        const total = totalRegularPay + totalOvertimePay;

        return {
            regularPay: Math.round(totalRegularPay * 100) / 100,
            overtimePay: Math.round(totalOvertimePay * 100) / 100,
            serviceCharge: 0,
            total: Math.round(total * 100) / 100,
        };
    }, [dailyLog, localEmployee, localEmployee.approvedOvertime, committedRange]);

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
            const approvedOtForDay = localEmployee.approvedOvertime?.[dateKey] || 0;

            worked += log.worked;
            approvedOT += approvedOtForDay;
            
            // Calculate paid hours: only time within scheduled hours, minus lunch break if > 6 hours
            let dailyPaidMinutes = log.worked;
            if (totalDailyLoginDuration > 6 * 60) {
                dailyPaidMinutes = Math.max(0, dailyPaidMinutes - 60);
            }
            paidMinutes += dailyPaidMinutes;

            if (log.status === 'Absent' && log.scheduled !== 'N/A') absence++;
        });

        paidMinutes += approvedOT;

        const difference = (worked + approvedOT) - scheduled;

        return { scheduled, worked, difference, totalDelay, absence, approvedOT, lateCount, paidMinutes, totalLoginMinutes };
    }, [dailyLog, localEmployee.approvedOvertime]);


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
        let totalLateMinutes = 0;
        let regularPay = 0;
        let overtimePay = 0;

        dailyLog.forEach(log => {
            if (log.status === 'Present' || log.status === 'Late') daysPresent++;
            if (log.status === 'Late') {
                daysLate++;

                // Calculate late minutes
                const [start] = log.scheduled.split(' - ');
                const scheduledInMinutes = timeStringToMinutes(start);
                const actualInMinutes = timeStringToMinutes(log.timeIn);

                if (scheduledInMinutes !== null && actualInMinutes !== null && actualInMinutes > scheduledInMinutes) {
                    totalLateMinutes += (actualInMinutes - scheduledInMinutes);
                }
            }
            if (log.status === 'Absent') daysAbsent++;

            const dateKey = log.date.toISOString().split('T')[0];
            const dailyRate = getRateForDate(localEmployee, dateKey);
            const approvedOTMinutes = localEmployee.approvedOvertime?.[dateKey] || 0;

            const actualInMinutes = timeStringToMinutes(log.timeIn);
            const actualOutMinutes = timeStringToMinutes(log.timeOut);
            let totalDailyLoginDuration = 0;
            if (actualInMinutes !== null && actualOutMinutes !== null) {
                totalDailyLoginDuration = actualOutMinutes - actualInMinutes;
            }

            let dailyPaidRegularMinutes = log.worked;
            if (totalDailyLoginDuration > 6 * 60) {
                dailyPaidRegularMinutes = Math.max(0, log.worked - 60);
            }

            const dailyRegularHours = dailyPaidRegularMinutes / 60;
            const dailyOTHours = approvedOTMinutes / 60;

            totalRegularHours += dailyRegularHours;
            totalOvertimeHours += dailyOTHours;
            regularPay += dailyRegularHours * dailyRate;
            overtimePay += dailyOTHours * dailyRate * OVERTIME_RATE_MULTIPLIER;
        });
        const serviceChargeShare = employeeServiceChargeBreakdown?.totalShare ?? 0;
        const grossPay = regularPay + overtimePay + serviceChargeShare;

        // Calculate late deduction
        const lateDeduction = totalLateMinutes * 0.02;

        // Calculate total salary deductions
        const totalSalaryDeductions = (localEmployee.salaryDeductions || []).reduce((sum, d) => sum + d.amount, 0);

        const deductions = { sss: 0, philhealth: 0, pagibig: 0, total: 0 };
        const netPay = grossPay - deductions.total - totalSalaryDeductions;

        const newRecord: PayrollRecord = {
            id: localEmployee.id,
            employee: localEmployee.name,
            position: localEmployee.position,
            rate: localEmployee.rate,
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
            customDeduction: totalSalaryDeductions,
            serviceChargeBreakdown: employeeServiceChargeBreakdown,
            lateMinutes: totalLateMinutes,
            lateDeduction: lateDeduction,
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
    
    const tableHeaders = ['Date', 'Status', 'Scheduled', 'Schedule Duration', 'Time In/Out', 'Login Hours', 'Overtime', 'Paid Hours', 'Rate'];
    const rightAlignedHeaders = ['Schedule Duration', 'Login Hours', 'Overtime', 'Rate'];
    const centerAlignedHeaders = ['Status'];

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-7xl h-full max-h-[90vh] rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
               <div className="flex-shrink-0 flex justify-between items-center p-4 border-b border-border-color">
                    <h2 className="text-xl font-semibold">Employee Profile</h2>
                     <div className="flex items-center gap-2">
                        {(isDirty || isEditMode) ? (
                            <>
                                <button onClick={handleCancelAll} className="flex items-center justify-center gap-2 bg-hover-bg text-text-primary px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-opacity-80">
                                    <span>Discard</span>
                                </button>
                                <button onClick={handleSaveAll} className="flex items-center justify-center gap-2 bg-accent-blue text-white px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-accent-blue/80">
                                    <CheckIcon className="w-4 h-4" />
                                    <span>Save Changes</span>
                                </button>
                            </>
                        ) : (
                            <>
                                <button onClick={handleEnterEditMode} className="flex items-center justify-center gap-2 bg-hover-bg text-text-primary px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-opacity-80">
                                    <PencilIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">Edit</span>
                                </button>
                                <button onClick={onDelete} className="flex items-center justify-center gap-2 bg-accent-red/20 text-accent-red px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors hover:bg-accent-red/30">
                                    <TrashIcon className="w-4 h-4" />
                                    <span className="hidden sm:inline">Delete</span>
                                </button>
                            </>
                        )}
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
                                    {(isEditMode ? editFields.name : localEmployee.name).charAt(0)}
                                </div>
                                {isEditMode ? (
                                    <div className="mt-4 space-y-2">
                                        <input
                                            type="text"
                                            value={editFields.name}
                                            onChange={e => setEditFields(f => ({ ...f, name: e.target.value }))}
                                            placeholder="Name"
                                            className="w-full text-center text-xl font-semibold bg-bg-primary border border-border-color rounded-lg px-3 py-1.5 text-text-primary focus:outline-none focus:border-accent-blue"
                                        />
                                        <input
                                            type="text"
                                            value={editFields.position}
                                            onChange={e => setEditFields(f => ({ ...f, position: e.target.value }))}
                                            placeholder="Position"
                                            className="w-full text-center text-sm bg-bg-primary border border-border-color rounded-lg px-3 py-1.5 text-text-secondary focus:outline-none focus:border-accent-blue"
                                        />
                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                            <div>
                                                <label className="text-xs text-text-secondary mb-1 block">Daily Rate (₱)</label>
                                                <input
                                                    type="number"
                                                    value={editFields.rate}
                                                    onChange={e => setEditFields(f => ({ ...f, rate: e.target.value }))}
                                                    placeholder="Rate"
                                                    className="w-full text-sm bg-bg-primary border border-border-color rounded-lg px-2 py-1.5 text-text-primary focus:outline-none focus:border-accent-blue"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-xs text-text-secondary mb-1 block">Department</label>
                                                <input
                                                    type="text"
                                                    value={editFields.department}
                                                    onChange={e => setEditFields(f => ({ ...f, department: e.target.value }))}
                                                    placeholder="Dept"
                                                    className="w-full text-sm bg-bg-primary border border-border-color rounded-lg px-2 py-1.5 text-text-primary focus:outline-none focus:border-accent-blue"
                                                />
                                            </div>
                                        </div>
                                        {parseFloat(editFields.rate) > 0 && parseFloat(editFields.rate) !== localEmployee.rate && (
                                            <div className="bg-accent-blue/10 border border-accent-blue/30 rounded-lg px-3 py-2">
                                                <label className="text-xs font-medium text-accent-blue mb-1 block">Rate change effective from</label>
                                                <input
                                                    type="date"
                                                    value={editFields.rateEffectiveDate}
                                                    onChange={e => setEditFields(f => ({ ...f, rateEffectiveDate: e.target.value }))}
                                                    className="w-full text-sm bg-bg-primary border border-border-color rounded-lg px-2 py-1.5 text-text-primary focus:outline-none focus:border-accent-blue"
                                                />
                                                <p className="text-[10px] text-text-secondary mt-1">The new rate will apply from this date forward</p>
                                            </div>
                                        )}
                                        <div>
                                            <label className="text-xs text-text-secondary mb-1 block">Phone</label>
                                            <input
                                                type="text"
                                                value={editFields.phone}
                                                onChange={e => setEditFields(f => ({ ...f, phone: e.target.value }))}
                                                placeholder="Phone"
                                                className="w-full text-sm bg-bg-primary border border-border-color rounded-lg px-2 py-1.5 text-text-primary focus:outline-none focus:border-accent-blue"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-secondary mb-1 block">Email</label>
                                            <input
                                                type="email"
                                                value={editFields.email}
                                                onChange={e => setEditFields(f => ({ ...f, email: e.target.value }))}
                                                placeholder="Email"
                                                className="w-full text-sm bg-bg-primary border border-border-color rounded-lg px-2 py-1.5 text-text-primary focus:outline-none focus:border-accent-blue"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-secondary mb-1 block">Bank Account</label>
                                            <input
                                                type="text"
                                                value={editFields.bankAccount}
                                                onChange={e => setEditFields(f => ({ ...f, bankAccount: e.target.value }))}
                                                placeholder="Bank Account"
                                                className="w-full text-sm bg-bg-primary border border-border-color rounded-lg px-2 py-1.5 text-text-primary focus:outline-none focus:border-accent-blue"
                                            />
                                        </div>
                                        <div>
                                            <label className="text-xs text-text-secondary mb-1 block">Payment Mode</label>
                                            <input
                                                type="text"
                                                value={editFields.paymentMode}
                                                onChange={e => setEditFields(f => ({ ...f, paymentMode: e.target.value }))}
                                                placeholder="Cash / Bank / GCash"
                                                className="w-full text-sm bg-bg-primary border border-border-color rounded-lg px-2 py-1.5 text-text-primary focus:outline-none focus:border-accent-blue"
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <h3 className="text-2xl font-semibold mt-4">{localEmployee.name}</h3>
                                        <p className="text-md text-text-secondary">{localEmployee.position}</p>
                                        {(localEmployee.phone || localEmployee.email || localEmployee.department || localEmployee.bankAccount || localEmployee.paymentMode) && (
                                            <div className="mt-2 space-y-1 text-xs text-text-secondary">
                                                {localEmployee.department && <p>{localEmployee.department}</p>}
                                                {localEmployee.phone && <p>{localEmployee.phone}</p>}
                                                {localEmployee.email && <p>{localEmployee.email}</p>}
                                                {localEmployee.bankAccount && <p>Bank: {localEmployee.bankAccount}</p>}
                                                {localEmployee.paymentMode && <p>Pay via: {localEmployee.paymentMode}</p>}
                                            </div>
                                        )}
                                    </>
                                )}
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

                            <div className="mt-6 pt-6 border-t border-border-color">
                                <h4 className="text-sm font-semibold text-text-secondary uppercase tracking-wider mb-3">Settings</h4>
                                <div className="bg-bg-primary rounded-lg p-3 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-text-primary">Service Charge</p>
                                            <p className="text-xs text-text-secondary">Include in distribution</p>
                                        </div>
                                        <button
                                            onClick={() => {
                                                updateLocal({
                                                    ...localEmployee,
                                                    serviceChargeEnabled: localEmployee.serviceChargeEnabled !== false ? false : true
                                                });
                                            }}
                                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                                                localEmployee.serviceChargeEnabled !== false ? 'bg-accent-blue' : 'bg-gray-600'
                                            }`}
                                        >
                                            <span
                                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                                                    localEmployee.serviceChargeEnabled !== false ? 'translate-x-6' : 'translate-x-1'
                                                }`}
                                            />
                                        </button>
                                    </div>
                                    {localEmployee.serviceChargeEnabled !== false && (
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-text-secondary whitespace-nowrap">Start date</span>
                                            <input
                                                type="date"
                                                value={localEmployee.serviceChargeStartDate || ''}
                                                onChange={(e) => {
                                                    updateLocal({
                                                        ...localEmployee,
                                                        serviceChargeStartDate: e.target.value || undefined,
                                                    });
                                                }}
                                                className="flex-1 text-xs bg-bg-secondary border border-border-color rounded px-2 py-1 text-text-primary focus:outline-none focus:border-accent-blue"
                                            />
                                            {localEmployee.serviceChargeStartDate && (
                                                <button
                                                    onClick={() => updateLocal({ ...localEmployee, serviceChargeStartDate: undefined })}
                                                    className="text-text-secondary hover:text-accent-red transition-colors text-xs"
                                                    title="Clear start date"
                                                >✕</button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <div className="mt-6 pt-6 border-t border-border-color">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wide">Deductions</h4>
                                    {!isAddingDeduction && !editingDeductionId && (
                                        <button
                                            onClick={() => setIsAddingDeduction(true)}
                                            className="text-accent-blue hover:text-accent-blue/80 transition-colors"
                                            title="Add Deduction"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {isAddingDeduction && (
                                    <div className="mb-2 p-2 bg-bg-primary/30 rounded-lg border border-border-color space-y-1.5">
                                        <input
                                            type="text"
                                            placeholder="Reason"
                                            value={newDeductionReason}
                                            onChange={(e) => setNewDeductionReason(e.target.value)}
                                            className="w-full px-2 py-1 bg-bg-secondary border border-border-color rounded text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                                            autoFocus
                                        />
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs">₱</span>
                                            <input
                                                type="number"
                                                placeholder="Amount"
                                                value={newDeductionAmount}
                                                onChange={(e) => setNewDeductionAmount(e.target.value)}
                                                className="w-full pl-5 pr-2 py-1 bg-bg-secondary border border-border-color rounded text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                        <input
                                            type="date"
                                            placeholder="Date"
                                            value={newDeductionDate}
                                            onChange={(e) => setNewDeductionDate(e.target.value)}
                                            className="w-full px-2 py-1 bg-bg-secondary border border-border-color rounded text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                                        />
                                        <div className="flex gap-1">
                                            <button
                                                onClick={handleAddDeduction}
                                                className="flex-1 px-2 py-1 bg-accent-blue text-white rounded text-xs font-medium hover:bg-accent-blue/90"
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsAddingDeduction(false);
                                                    setNewDeductionReason('');
                                                    setNewDeductionAmount('');
                                                    setNewDeductionDate('');
                                                }}
                                                className="px-2 py-1 bg-bg-secondary text-text-secondary rounded text-xs hover:bg-hover-bg border border-border-color"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {editingDeductionId && (
                                    <div className="mb-2 p-2 bg-bg-primary/30 rounded-lg border border-border-color space-y-1.5">
                                        <input
                                            type="text"
                                            placeholder="Reason"
                                            value={newDeductionReason}
                                            onChange={(e) => setNewDeductionReason(e.target.value)}
                                            className="w-full px-2 py-1 bg-bg-secondary border border-border-color rounded text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                                            autoFocus
                                        />
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs">₱</span>
                                            <input
                                                type="number"
                                                placeholder="Amount"
                                                value={newDeductionAmount}
                                                onChange={(e) => setNewDeductionAmount(e.target.value)}
                                                className="w-full pl-5 pr-2 py-1 bg-bg-secondary border border-border-color rounded text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                        <input
                                            type="date"
                                            placeholder="Date"
                                            value={newDeductionDate}
                                            onChange={(e) => setNewDeductionDate(e.target.value)}
                                            className="w-full px-2 py-1 bg-bg-secondary border border-border-color rounded text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                                        />
                                        <div className="flex gap-1">
                                            <button
                                                onClick={handleSaveDeduction}
                                                className="flex-1 px-2 py-1 bg-accent-blue text-white rounded text-xs font-medium hover:bg-accent-blue/90"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={handleCancelEditDeduction}
                                                className="px-2 py-1 bg-bg-secondary text-text-secondary rounded text-xs hover:bg-hover-bg border border-border-color"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {localEmployee.salaryDeductions && localEmployee.salaryDeductions.length > 0 ? (
                                        localEmployee.salaryDeductions
                                            .filter(deduction => {
                                                if (!deduction.date) return true;
                                                return deduction.date >= committedRange.start && deduction.date <= committedRange.end;
                                            })
                                            .map((deduction, index) => (
                                                <div
                                                    key={deduction.id}
                                                    className="group flex items-center justify-between p-1.5 bg-bg-secondary rounded border border-border-color hover:border-accent-red/30 cursor-pointer"
                                                    onClick={() => handleEditDeduction(deduction)}
                                                >
                                                    <div className="flex-1 min-w-0 mr-2">
                                                        <p className="text-xs text-text-primary truncate">{deduction.description}</p>
                                                        {deduction.date && (
                                                            <p className="text-[10px] text-text-secondary/60">{formatDateForDisplay(deduction.date)}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-semibold text-accent-red whitespace-nowrap">
                                                            {formatPeso(deduction.amount)}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveDeduction(deduction.id);
                                                            }}
                                                            className="p-0.5 rounded text-text-secondary/40 hover:text-accent-red opacity-0 group-hover:opacity-100"
                                                            title="Remove"
                                                        >
                                                            <XMarkIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                    ) : (
                                        <p className="text-xs text-text-secondary/60 text-center py-2">No deductions</p>
                                    )}
                                </div>

                                {localEmployee.salaryDeductions && localEmployee.salaryDeductions.filter(d => !d.date || (d.date >= committedRange.start && d.date <= committedRange.end)).length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border-color flex items-center justify-between">
                                        <span className="text-[10px] font-medium text-text-secondary uppercase">Total</span>
                                        <span className="text-sm font-bold text-accent-red">
                                            {formatPeso(localEmployee.salaryDeductions.filter(d => !d.date || (d.date >= committedRange.start && d.date <= committedRange.end)).reduce((sum, d) => sum + d.amount, 0))}
                                        </span>
                                    </div>
                                )}
                            </div>

                            <div className="mt-4 pt-4 border-t border-border-color">
                                <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wide">Additional Income</h4>
                                    {!isAddingIncome && !editingIncomeId && (
                                        <button
                                            onClick={() => setIsAddingIncome(true)}
                                            className="text-accent-blue hover:text-accent-blue/80 transition-colors"
                                            title="Add Income"
                                        >
                                            <PlusIcon className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>

                                {isAddingIncome && (
                                    <div className="mb-2 p-2 bg-bg-primary/30 rounded-lg border border-border-color space-y-1.5">
                                        <input
                                            type="text"
                                            placeholder="Reason"
                                            value={newIncomeReason}
                                            onChange={(e) => setNewIncomeReason(e.target.value)}
                                            className="w-full px-2 py-1 bg-bg-secondary border border-border-color rounded text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                                            autoFocus
                                        />
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs">₱</span>
                                            <input
                                                type="number"
                                                placeholder="Amount"
                                                value={newIncomeAmount}
                                                onChange={(e) => setNewIncomeAmount(e.target.value)}
                                                className="w-full pl-5 pr-2 py-1 bg-bg-secondary border border-border-color rounded text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                        <input
                                            type="date"
                                            placeholder="Date"
                                            value={newIncomeDate}
                                            onChange={(e) => setNewIncomeDate(e.target.value)}
                                            className="w-full px-2 py-1 bg-bg-secondary border border-border-color rounded text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                                        />
                                        <div className="flex gap-1">
                                            <button
                                                onClick={handleAddIncome}
                                                className="flex-1 px-2 py-1 bg-accent-blue text-white rounded text-xs font-medium hover:bg-accent-blue/90"
                                            >
                                                Add
                                            </button>
                                            <button
                                                onClick={() => {
                                                    setIsAddingIncome(false);
                                                    setNewIncomeReason('');
                                                    setNewIncomeAmount('');
                                                    setNewIncomeDate('');
                                                }}
                                                className="px-2 py-1 bg-bg-secondary text-text-secondary rounded text-xs hover:bg-hover-bg border border-border-color"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {editingIncomeId && (
                                    <div className="mb-2 p-2 bg-bg-primary/30 rounded-lg border border-border-color space-y-1.5">
                                        <input
                                            type="text"
                                            placeholder="Reason"
                                            value={newIncomeReason}
                                            onChange={(e) => setNewIncomeReason(e.target.value)}
                                            className="w-full px-2 py-1 bg-bg-secondary border border-border-color rounded text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                                            autoFocus
                                        />
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-text-secondary text-xs">₱</span>
                                            <input
                                                type="number"
                                                placeholder="Amount"
                                                value={newIncomeAmount}
                                                onChange={(e) => setNewIncomeAmount(e.target.value)}
                                                className="w-full pl-5 pr-2 py-1 bg-bg-secondary border border-border-color rounded text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                                                step="0.01"
                                                min="0"
                                            />
                                        </div>
                                        <input
                                            type="date"
                                            placeholder="Date"
                                            value={newIncomeDate}
                                            onChange={(e) => setNewIncomeDate(e.target.value)}
                                            className="w-full px-2 py-1 bg-bg-secondary border border-border-color rounded text-xs text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-accent-blue"
                                        />
                                        <div className="flex gap-1">
                                            <button
                                                onClick={handleSaveIncome}
                                                className="flex-1 px-2 py-1 bg-accent-blue text-white rounded text-xs font-medium hover:bg-accent-blue/90"
                                            >
                                                Save
                                            </button>
                                            <button
                                                onClick={handleCancelEditIncome}
                                                className="px-2 py-1 bg-bg-secondary text-text-secondary rounded text-xs hover:bg-hover-bg border border-border-color"
                                            >
                                                Cancel
                                            </button>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {localEmployee.additionalIncome && localEmployee.additionalIncome.length > 0 ? (
                                        localEmployee.additionalIncome
                                            .filter(income => {
                                                if (!income.date) return true;
                                                return income.date >= committedRange.start && income.date <= committedRange.end;
                                            })
                                            .map((income, index) => (
                                                <div
                                                    key={income.id}
                                                    className="group flex items-center justify-between p-1.5 bg-bg-secondary rounded border border-border-color hover:border-accent-green/30 cursor-pointer"
                                                    onClick={() => handleEditIncome(income)}
                                                >
                                                    <div className="flex-1 min-w-0 mr-2">
                                                        <p className="text-xs text-text-primary truncate">{income.description}</p>
                                                        {income.date && (
                                                            <p className="text-[10px] text-text-secondary/60">{formatDateForDisplay(income.date)}</p>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <span className="text-xs font-semibold text-accent-green whitespace-nowrap">
                                                            {formatPeso(income.amount)}
                                                        </span>
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveIncome(income.id);
                                                            }}
                                                            className="p-0.5 rounded text-text-secondary/40 hover:text-accent-red opacity-0 group-hover:opacity-100"
                                                            title="Remove"
                                                        >
                                                            <XMarkIcon className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            ))
                                    ) : (
                                        <p className="text-xs text-text-secondary/60 text-center py-2">No additional income</p>
                                    )}
                                </div>

                                {localEmployee.additionalIncome && localEmployee.additionalIncome.filter(i => !i.date || (i.date >= committedRange.start && i.date <= committedRange.end)).length > 0 && (
                                    <div className="mt-2 pt-2 border-t border-border-color flex items-center justify-between">
                                        <span className="text-[10px] font-medium text-text-secondary uppercase">Total</span>
                                        <span className="text-sm font-bold text-accent-green">
                                            {formatPeso(localEmployee.additionalIncome.filter(i => !i.date || (i.date >= committedRange.start && i.date <= committedRange.end)).reduce((sum, i) => sum + i.amount, 0))}
                                        </span>
                                    </div>
                                )}
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
                            <div className="bg-bg-secondary border border-border-color rounded-xl overflow-hidden">
                                <button
                                    onClick={() => setIsServiceChargeExpanded(!isServiceChargeExpanded)}
                                    className="w-full p-4 flex items-center justify-between transition-colors"
                                >
                                    <div className="flex flex-wrap items-center gap-3 flex-1">
                                        <div>
                                            <h4 className="text-lg font-semibold text-text-primary text-left">Service Charge Allocation</h4>
                                            <p className="text-xs text-text-secondary text-left">
                                                {formatDateForDisplay(committedRange.start)} - {formatDateForDisplay(committedRange.end)}
                                            </p>
                                        </div>
                                        <div className="flex flex-col text-right ml-auto">
                                            <p className="text-xs text-text-secondary uppercase tracking-wide">Pool Total</p>
                                            <p className="text-xl font-bold text-text-primary">{formatPeso(serviceChargeTotal)}</p>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <p className="text-xs text-text-secondary uppercase tracking-wide">Your Share</p>
                                            <p className="text-xl font-bold text-accent-green">{formatPeso(employeeServiceChargeShare)}</p>
                                        </div>
                                        <div className="flex flex-col text-right">
                                            <p className="text-xs text-text-secondary uppercase tracking-wide">Period Earning</p>
                                            <p className="text-xl font-bold text-accent-blue">{formatPeso(periodEarnings.total)}</p>
                                        </div>
                                    </div>
                                    <ChevronDownIcon className={`w-5 h-5 text-text-secondary ml-3 transition-transform ${isServiceChargeExpanded ? 'rotate-180' : ''}`} />
                                </button>

                                <div
                                    className={`transition-all duration-500 ease-in-out overflow-hidden ${
                                        isServiceChargeExpanded ? 'max-h-[2000px]' : 'max-h-0'
                                    }`}
                                >
                                    <div className={`px-4 pb-4 transition-opacity duration-500 ${isServiceChargeExpanded ? 'opacity-100' : 'opacity-0'}`}>
                                        {employeeServiceChargeDetails.length > 0 ? (
                                            <div className="border border-border-color rounded-lg overflow-hidden">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-bg-tertiary/40 text-text-secondary text-xs uppercase tracking-wide">
                                                        <tr>
                                                            <th className="p-2 text-left">Date</th>
                                                            <th className="p-2 text-right">Paid Hrs</th>
                                                            <th className="p-2 text-right">Ghost Hrs</th>
                                                            <th className="p-2 text-right">Pool</th>
                                                            <th className="p-2 text-right">Ghost Share</th>
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
                                                                <td className="p-2 text-right">
                                                                    {formatPeso(
                                                                        detail.ghostSharePerGhost ??
                                                                            (detail.ghostShareTotal && detail.ghostCount
                                                                                ? detail.ghostShareTotal / detail.ghostCount
                                                                                : detail.ghostShareTotal ?? detail.deductionAmount ?? 0),
                                                                    )}
                                                                </td>
                                                                <td className="p-2 text-right font-semibold text-accent-green">
                                                                    {formatPeso(detail.share)}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="text-sm text-text-secondary">No service charge recorded for this employee in the selected range.</p>
                                        )}
                                        <p className="text-xs text-text-secondary mt-3">
                                            Two ghost employees (12h each) are included in the team total each day to smooth allocations. Staff split 40% of the pool based on adjusted paid hours, while the remaining 60% is divided equally between the ghost employees (see Ghost Share).
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="animate-fade-in-up">
                                <div className="overflow-x-auto hidden md:block">
                                    <table className="w-full text-sm">
                                        <thead>
                                            <tr className="border-b border-border-color">
                                                {tableHeaders.map(h => (
                                                    <th key={h} className="py-2 px-2 text-xs font-semibold text-text-secondary uppercase tracking-wider text-center">{h}</th>
                                                ))}
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-border-color/50">
                                            {dailyLog.map(log => {
                                                const dateKey = log.date.toISOString().split('T')[0];
                                                const approvedMinutes = localEmployee.approvedOvertime?.[dateKey];
                                                return (
                                                    <tr key={log.date.toISOString()} className="hover:bg-bg-secondary/50">
                                                        <td className="px-2 py-1.5 font-medium whitespace-nowrap text-center">{log.date.toLocaleDateString('en-US', {day: '2-digit', month: 'short', timeZone: 'UTC'})}</td>
                                                        <td className="px-2 py-1.5 text-center whitespace-nowrap">
                                                            {log.status === 'Present' && <Tag text="Present" type="present"/>}
                                                            {log.status === 'Late' && <Tag text="Late" type="late"/>}
                                                            {log.status === 'OFF' && <Tag text="OFF" type="off"/>}
                                                            {log.status === 'Absent' && <Tag text="Absent" type="absent"/>}
                                                            {(log.status === 'Future' || log.status === 'Not Scheduled') && <span className="text-text-secondary/70">--</span>}
                                                        </td>
                                                        <td className="px-2 py-1.5 text-text-secondary text-xs whitespace-nowrap text-center">
                                                            {editingSchedule === dateKey ? (
                                                                <div className="flex items-center gap-1 justify-center">
                                                                    <div className="relative">
                                                                        <select
                                                                            value={tempScheduleIn}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                setTempScheduleIn(value);
                                                                                if (value === 'OFF') {
                                                                                    setTempScheduleOut('OFF');
                                                                                }
                                                                            }}
                                                                            className="pl-2 pr-5 py-0.5 bg-bg-primary border border-border-color rounded text-[9px] appearance-none cursor-pointer w-[72px]"
                                                                        >
                                                                            <option value="">--</option>
                                                                            <option value="OFF">OFF</option>
                                                                            {Array.from({ length: 24 }, (_, i) => {
                                                                                const hour = i.toString().padStart(2, '0');
                                                                                const display = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`;
                                                                                return <option key={hour} value={`${hour}:00`}>{display}</option>;
                                                                            })}
                                                                        </select>
                                                                    </div>
                                                                    <span>-</span>
                                                                    <div className="relative">
                                                                        <select
                                                                            value={tempScheduleOut}
                                                                            onChange={(e) => {
                                                                                const value = e.target.value;
                                                                                setTempScheduleOut(value);
                                                                                if (value === 'OFF') {
                                                                                    setTempScheduleIn('OFF');
                                                                                }
                                                                            }}
                                                                            className="pl-2 pr-5 py-0.5 bg-bg-primary border border-border-color rounded text-[9px] appearance-none cursor-pointer w-[72px]"
                                                                            disabled={tempScheduleIn === 'OFF'}
                                                                        >
                                                                            <option value="">--</option>
                                                                            <option value="OFF">OFF</option>
                                                                            {Array.from({ length: 24 }, (_, i) => {
                                                                                const hour = i.toString().padStart(2, '0');
                                                                                const display = i === 0 ? '12:00 AM' : i < 12 ? `${i}:00 AM` : i === 12 ? '12:00 PM' : `${i - 12}:00 PM`;
                                                                                return <option key={hour} value={`${hour}:00`}>{display}</option>;
                                                                            })}
                                                                        </select>
                                                                    </div>
                                                                    <button onClick={() => handleScheduleSave(dateKey)} className="text-accent-green hover:text-accent-green/80" title="Save">
                                                                        <CheckIcon className="w-3 h-3" />
                                                                    </button>
                                                                    <button onClick={() => setEditingSchedule(null)} className="text-accent-red hover:text-accent-red/80" title="Cancel">
                                                                        <XMarkIcon className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleScheduleEdit(dateKey)}
                                                                    className="hover:text-accent-blue transition-colors"
                                                                    disabled={log.status === 'Future'}
                                                                >
                                                                    {log.scheduled}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-1.5 font-semibold whitespace-nowrap text-center">{log.scheduleDuration > 0 ? formatDuration(log.scheduleDuration) : '--'}</td>
                                                        <td className="px-2 py-1.5 text-text-secondary text-xs whitespace-nowrap text-center">
                                                            {editingTimeBoth === dateKey ? (
                                                                <div className="flex items-center gap-1 justify-center">
                                                                    <input
                                                                        type="time"
                                                                        value={tempTimeIn}
                                                                        onChange={(e) => setTempTimeIn(e.target.value)}
                                                                        className="w-20 px-1 py-0.5 bg-bg-primary border border-border-color rounded text-[10px]"
                                                                        autoFocus
                                                                    />
                                                                    <span>-</span>
                                                                    <input
                                                                        type="time"
                                                                        value={tempTimeOut}
                                                                        onChange={(e) => setTempTimeOut(e.target.value)}
                                                                        className="w-20 px-1 py-0.5 bg-bg-primary border border-border-color rounded text-[10px]"
                                                                    />
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            handleAttendanceSave(dateKey, 'both');
                                                                        }}
                                                                        className="text-accent-green hover:text-accent-green/80"
                                                                        title="Save"
                                                                    >
                                                                        <CheckIcon className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={(e) => {
                                                                            e.preventDefault();
                                                                            e.stopPropagation();
                                                                            setEditingTimeBoth(null);
                                                                            setTempTimeIn('');
                                                                            setTempTimeOut('');
                                                                        }}
                                                                        className="text-accent-red hover:text-accent-red/80"
                                                                        title="Cancel"
                                                                    >
                                                                        <XMarkIcon className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleAttendanceEdit(dateKey, 'both')}
                                                                    className="hover:text-accent-blue transition-colors"
                                                                    disabled={log.status === 'OFF' || log.status === 'Future'}
                                                                >
                                                                    {log.timeIn} - {log.timeOut}
                                                                </button>
                                                            )}
                                                        </td>
                                                        <td className="px-2 py-1.5 font-semibold whitespace-nowrap text-center">{log.worked > 0 ? formatDuration(log.worked) : '--'}</td>
                                                        <td className="px-2 py-1.5 font-semibold whitespace-nowrap text-center">
                                                            {log.overtime > 0 ? (
                                                                <div className="flex items-center justify-center gap-2 whitespace-nowrap">
                                                                    {editingOtDateKey === dateKey ? (
                                                                        <>
                                                                            <span>{formatDuration(log.overtime)}</span>
                                                                            <button onClick={() => handleOvertimeDecision(dateKey, log.overtime, true)} className="p-1 rounded-full text-text-secondary/60 hover:text-accent-green hover:bg-accent-green/20" title="Approve OT"><CheckIcon className="w-4 h-4" /></button>
                                                                            <button onClick={() => handleOvertimeDecision(dateKey, log.overtime, false)} className="p-1 rounded-full text-text-secondary/60 hover:text-accent-red hover:bg-accent-red/20" title="Reject OT"><XMarkIcon className="w-4 h-4" /></button>
                                                                        </>
                                                                    ) : (
                                                                        <button
                                                                            onClick={() => setEditingOtDateKey(dateKey)}
                                                                            className="flex items-center justify-center gap-2 hover:bg-bg-primary/50 px-2 py-1 rounded-md transition-colors w-full"
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
                                                        <td className="px-2 py-1.5 font-semibold whitespace-nowrap text-center">{log.paidHours > 0 ? formatDuration(log.paidHours) : '--'}</td>
                                                        <td className="px-2 py-1.5 font-semibold whitespace-nowrap text-center">
                                                            {editingRateDateKey === dateKey ? (
                                                                <div className="flex items-center gap-1 justify-center">
                                                                    <span className="text-xs">₱</span>
                                                                    <input
                                                                        type="number"
                                                                        value={tempRate}
                                                                        onChange={(e) => setTempRate(e.target.value)}
                                                                        className="w-16 px-1 py-0.5 bg-bg-primary border border-border-color rounded text-[10px] text-center"
                                                                        autoFocus
                                                                        step="0.01"
                                                                    />
                                                                    <button
                                                                        onClick={() => handleRateSave(dateKey)}
                                                                        className="text-accent-green hover:text-accent-green/80"
                                                                        title="Save"
                                                                    >
                                                                        <CheckIcon className="w-3 h-3" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => {
                                                                            setEditingRateDateKey(null);
                                                                            setTempRate('');
                                                                        }}
                                                                        className="text-accent-red hover:text-accent-red/80"
                                                                        title="Cancel"
                                                                    >
                                                                        <XMarkIcon className="w-3 h-3" />
                                                                    </button>
                                                                </div>
                                                            ) : (
                                                                <button
                                                                    onClick={() => handleRateEdit(dateKey)}
                                                                    className="hover:text-accent-blue transition-colors"
                                                                    title="Click to edit rate for this date"
                                                                >
                                                                    ₱{getRateForDate(employee, dateKey).toFixed(2)}
                                                                </button>
                                                            )}
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
                                        const approvedMinutes = localEmployee.approvedOvertime?.[dateKey];
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
                                                    <div className="flex justify-between"><span className="text-text-secondary">Schedule Duration:</span><span className="font-semibold">{log.scheduleDuration > 0 ? formatDuration(log.scheduleDuration) : '--'}</span></div>
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
                                                    <div className="flex justify-between"><span className="text-text-secondary">Paid Hours:</span><span className="font-semibold">{log.paidHours > 0 ? formatDuration(log.paidHours) : '--'}</span></div>
                                                    <div className="flex justify-between"><span className="text-text-secondary">Rate:</span><span className="font-semibold">₱{getRateForDate(employee, dateKey).toFixed(2)}</span></div>
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
                    employee={employee}
                />
            )}

        </div>
    );
};

export default EmployeeProfile;
