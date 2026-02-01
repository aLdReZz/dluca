
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { PayrollRecord, Employee, AttendanceRecord, SalesData } from '../types';
import CalendarPopup from '../components/CalendarPopup';
import LoadingSpinner from '../components/LoadingSpinner';
import { CalendarDaysIcon, CurrencyPesoIcon, ClockIcon, BanknotesIcon } from '../components/Icons';
import PayslipModal from '../components/PayslipModal';
import { useFirebaseData, useFirebaseMutation } from '../hooks/useFirebase';
import { payrollService, employeesService, attendanceService } from '../utils/firebaseService';
import {
    extractDateKey,
    extractServiceCharge,
    parseSalesDate,
} from '../utils/salesData';
import { calculateServiceChargeDistribution } from '../utils/serviceChargeAllocation';
import { generateConsolidatedPayslipsPdf, PayslipPdfData } from '../utils/payslipPdf';
import { getRateForDate } from '../utils/rateHistory';


interface PayrollProps {
    employees: Employee[];
    attendanceRecords: AttendanceRecord[];
    payrollRecords?: PayrollRecord[];
    setPayrollRecords?: React.Dispatch<React.SetStateAction<PayrollRecord[]>>;
    salesData: SalesData[];
    manualPaidMinutes: Record<string, Record<number, number>>;
    manualGhostMinutes: Record<string, number>;
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

const Payroll: React.FC<PayrollProps> = ({ employees: propEmployees, attendanceRecords: propAttendanceRecords, payrollRecords: propPayrollRecords, setPayrollRecords: setPropPayrollRecords, salesData, manualPaidMinutes, manualGhostMinutes }) => {
    // Fetch employees from Firebase
    const { data: firebaseEmployees = [], loading: employeesLoading, error: employeesError } = useFirebaseData(
        () => employeesService.getAll(),
        []
    );

    // Fetch attendance records from Firebase
    const { data: firebaseAttendanceRecords = [], loading: attendanceLoading, error: attendanceError } = useFirebaseData(
        () => attendanceService.getAll(),
        []
    );

    // Fetch payroll records from Firebase
    const { data: firebasePayrollRecords = [], loading: payrollLoading, error: payrollError } = useFirebaseData(
        () => payrollService.getAll(),
        []
    );

    // Update payroll record mutation
    const { mutate: updateRecord, loading: updateLoading, error: updateError } = useFirebaseMutation(
        (data: { id: string; updates: any }) => payrollService.update(data.id, data.updates)
    );

    // Use Firebase data if available, otherwise use prop data (for backward compatibility)
    const employees = (Array.isArray(firebaseEmployees) && firebaseEmployees.length > 0) ? firebaseEmployees : (propEmployees || []);
    const attendanceRecords = (Array.isArray(firebaseAttendanceRecords) && firebaseAttendanceRecords.length > 0) ? firebaseAttendanceRecords : (propAttendanceRecords || []);
    const payrollRecords = (Array.isArray(firebasePayrollRecords) && firebasePayrollRecords.length > 0) ? firebasePayrollRecords : (propPayrollRecords || []);

    const [payPeriod, setPayPeriod] = useState(() => {
        const today = new Date();
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        const end = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        return {
            start: formatDateKeyLocal(start),
            end: formatDateKeyLocal(end),
        };
    });
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [selectedRecord, setSelectedRecord] = useState<PayrollRecord | null>(null);
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
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
            if (setPropPayrollRecords) {
                setPropPayrollRecords([]);
            }
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
            let totalLateMinutes = 0;
            let regularPay = 0;
            let overtimePay = 0;

            for (let d = new Date(startDate); d <= endDate; d.setUTCDate(d.getUTCDate() + 1)) {
                const dateKey = d.toISOString().split('T')[0];
                const schedule = employee.schedule[dateKey];
                const record = attendanceRecords.find(r => r.employee.toLowerCase() === employee.name.toLowerCase() && r.date === dateKey);
                const dailyRate = getRateForDate(employee, dateKey);

                const scheduledInMinutes = schedule?.timeIn ? timeStringToMinutes(schedule.timeIn) : null;
                let workedMinutesForDay = 0;

                if (schedule && !schedule.off && schedule.timeIn) {
                    if (record && record.timeIn) {
                        daysPresent++;
                        const actualInMinutes = timeStringToMinutes(record.timeIn);
                        if (scheduledInMinutes !== null && actualInMinutes !== null && actualInMinutes > scheduledInMinutes) {
                            daysLate++;
                            totalLateMinutes += (actualInMinutes - scheduledInMinutes);
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

                        const dailyRegularHours = dailyPaidRegularMinutes / 60;
                        totalRegularHours += dailyRegularHours;
                        regularPay += dailyRegularHours * dailyRate;
                        workedMinutesForDay += dailyPaidRegularMinutes;

                        const approvedOTMinutes = employee.approvedOvertime?.[dateKey] || 0;
                        const dailyOTHours = approvedOTMinutes / 60;
                        totalOvertimeHours += dailyOTHours;
                        overtimePay += dailyOTHours * dailyRate * OVERTIME_RATE_MULTIPLIER;
                        workedMinutesForDay += approvedOTMinutes;
                    }
                }

            }

            // Calculate total additional income - filter by pay period
            const totalAdditionalIncome = (employee.additionalIncome || [])
                .filter(income => {
                    if (!income.date) return true; // Include items without dates
                    return income.date >= payPeriod.start && income.date <= payPeriod.end;
                })
                .reduce((sum, i) => sum + i.amount, 0);

            const grossPay = regularPay + overtimePay + totalAdditionalIncome;

            // Calculate total salary deductions - filter by pay period
            const totalSalaryDeductions = (employee.salaryDeductions || [])
                .filter(deduction => {
                    if (!deduction.date) return true; // Include items without dates
                    return deduction.date >= payPeriod.start && deduction.date <= payPeriod.end;
                })
                .reduce((sum, d) => sum + d.amount, 0);

            // Calculate late deduction (0.02 per minute)
            const lateDeduction = totalLateMinutes * 0.02;

            const deductions = {
                sss: 0,
                philhealth: 0,
                pagibig: 0,
                total: 0
            };

            const netPay = grossPay - deductions.total - totalSalaryDeductions - lateDeduction;

            // Calculate effective rate for display (based on actual pay / hours)
            const effectiveRate = totalRegularHours > 0
                ? regularPay / totalRegularHours
                : employee.rate;

            return {
                id: employee.id,
                employee: employee.name,
                position: employee.position,
                department: employee.department,
                bankAccount: employee.bankAccount,
                paymentMode: employee.paymentMode,
                rate: effectiveRate,
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
                additionalIncome: totalAdditionalIncome,
                deductionNotes: '',
                customDeduction: totalSalaryDeductions,
                lateMinutes: totalLateMinutes,
                lateDeduction: lateDeduction
            };
        });

        const { allocations } = calculateServiceChargeDistribution({
            employees,
            attendanceRecords,
            salesData,
            start: payPeriod.start,
            end: payPeriod.end,
            dailyServiceChargeTotals: dailyServiceCharges,
            manualPaidMinutes,
            manualGhostMinutes,
        });

        const roundCurrency = (value: number) => Math.round(value * 100) / 100;

        const finalRecords = baseRecords.map(record => {
            const allocation = allocations[record.id];
            const serviceChargeShare = allocation ? roundCurrency(allocation.totalShare) : 0;
            const grossPayWithService = record.regularPay + record.overtimePay + serviceChargeShare + (record.additionalIncome || 0);
            const appliedCustomDeduction = Math.max(0, record.customDeduction ?? 0);
            const appliedLateDeduction = Math.max(0, record.lateDeduction ?? 0);
            const netPayWithService = grossPayWithService - record.deductions.total - appliedCustomDeduction - appliedLateDeduction;
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

        if (setPropPayrollRecords) {
            setPropPayrollRecords(finalRecords);
        }
    }, [employees, attendanceRecords, payPeriod, setPropPayrollRecords, dailyServiceCharges, dailyAttendanceTotals]);

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
        if (setPropPayrollRecords) {
            setPropPayrollRecords(updatedPayroll);
        }
        setSelectedRecord(null);
    };

    const handleExportAllPayslips = async () => {
        if (payrollRecords.length === 0) {
            alert('No payroll records to export. Please ensure there are employees with attendance data.');
            return;
        }

        const payslipsData: PayslipPdfData[] = payrollRecords.map(record => {
            const earnings: { description: string; amount: number }[] = [];

            // Add Basic Salary (regular pay)
            if (record.regularPay > 0) {
                earnings.push({ description: 'Basic Salary', amount: record.regularPay });
            }

            // Add Overtime Pay
            if (record.overtimeHours > 0 && record.overtimePay > 0) {
                earnings.push({ description: 'Overtime Pay', amount: record.overtimePay });
            }

            // Add Service Charge
            if (record.serviceCharge > 0) {
                earnings.push({ description: 'Service Charge', amount: record.serviceCharge });
            }

            // Add aggregated Additional Income (will be replaced with individual items by PDF generator)
            if (record.additionalIncome && record.additionalIncome > 0) {
                earnings.push({ description: 'Additional Income', amount: record.additionalIncome });
            }

            const deductions: { description: string; amount: number }[] = [];
            if (record.deductions.sss > 0) {
                deductions.push({ description: 'SSS Contribution', amount: record.deductions.sss });
            }
            if (record.deductions.philhealth > 0) {
                deductions.push({ description: 'PhilHealth Contribution', amount: record.deductions.philhealth });
            }
            if (record.deductions.pagibig > 0) {
                deductions.push({ description: 'Pag-IBIG Contribution', amount: record.deductions.pagibig });
            }

            // Add aggregated Custom Deduction (will be replaced with individual items by PDF generator)
            if (record.customDeduction && record.customDeduction > 0) {
                deductions.push({ description: 'Custom Deduction', amount: record.customDeduction });
            }

            // Get employee data for individual items
            // Match by name since employee.id from Firebase is a string but record.id is typed as number
            const employee = employees.find(e => e.name === record.employee);

            // Filter additional income and deductions by pay period
            const filteredAdditionalIncome = employee?.additionalIncome?.filter(income => {
                if (!income.date) return true; // Include items without dates
                return income.date >= payPeriod.start && income.date <= payPeriod.end;
            }) || [];

            const filteredSalaryDeductions = employee?.salaryDeductions?.filter(deduction => {
                if (!deduction.date) return true; // Include items without dates
                return deduction.date >= payPeriod.start && deduction.date <= payPeriod.end;
            }) || [];

            // Build salary deduction items including late deduction
            const salaryDeductionItems = [];
            if (record.lateMinutes && record.lateMinutes > 0) {
                salaryDeductionItems.push({
                    description: `Late Deduction (${record.lateMinutes} min)`,
                    amount: record.lateDeduction || 0
                });
            }
            salaryDeductionItems.push(...filteredSalaryDeductions.map(deduction => ({
                description: deduction.date ? `${deduction.description} (${formatDateForDisplay(deduction.date)})` : deduction.description,
                amount: deduction.amount,
            })));

            console.log('Export All PDFs - Employee:', {
                name: record.employee,
                recordId: record.id,
                hasEmployee: !!employee,
                employeeFound: employee?.name,
                employeeId: employee?.id,
                hasAdditionalIncome: !!employee?.additionalIncome,
                additionalIncomeCount: employee?.additionalIncome?.length || 0,
                filteredAdditionalIncomeCount: filteredAdditionalIncome.length,
                additionalIncomeItems: filteredAdditionalIncome,
                hasSalaryDeductions: !!employee?.salaryDeductions,
                salaryDeductionsCount: employee?.salaryDeductions?.length || 0,
                filteredSalaryDeductionsCount: filteredSalaryDeductions.length,
                salaryDeductionItems: filteredSalaryDeductions,
            });

            return {
                companyName: "D'Luca Bistro X Cafe",
                companyAddress: "2nd flr. Soho Bldg. Governors's Drive, Brgy. Cabuco, Trece Martires Cavite",
                employeeName: record.employee,
                department: record.department || 'N/A',
                designation: record.position,
                payCoverage: `${formatDateForDisplay(payPeriod.start)} - ${formatDateForDisplay(payPeriod.end)}`,
                payDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
                bankAccount: record.bankAccount || 'N/A',
                paymentMode: record.paymentMode || 'Cash',
                earnings,
                deductions,
                totalEarnings: record.grossPay,
                totalDeductions: record.deductions.total + (record.customDeduction || 0) + (record.lateDeduction || 0),
                netSalary: record.netPay,
                daysPresent: record.daysPresent,
                daysPresentAmount: record.regularPay + record.overtimePay,
                daysAbsent: record.daysAbsent,
                daysLate: record.daysLate,
                totalHours: record.totalHours,
                additionalIncomeItems: filteredAdditionalIncome.map(income => ({
                    description: income.date ? `${income.description} (${formatDateForDisplay(income.date)})` : income.description,
                    amount: income.amount,
                })),
                salaryDeductionItems: salaryDeductionItems,
                lateMinutes: record.lateMinutes,
                lateDeduction: record.lateDeduction,
                regularHours: record.regularHours,
                overtimeHours: record.overtimeHours,
            };
        });

        await generateConsolidatedPayslipsPdf(payslipsData);
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

    const tableHeaders = ['Staff', 'Rate', 'Regular Hrs', 'OT Hrs', 'Period Earning', 'Service Charge', 'Net Pay', 'Present', 'Absent', 'Late', 'Actions'];

    // Show loading state
    if (employeesLoading || attendanceLoading || payrollLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <LoadingSpinner message="Loading payroll data..." />
            </div>
        );
    }

    // Show error state
    if (employeesError || attendanceError || payrollError) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                    <p className="text-red-500 font-medium">Error loading payroll data</p>
                    <p className="text-text-secondary text-sm mt-1">
                        {employeesError || attendanceError || payrollError}
                    </p>
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
                    <h2 className="text-3xl font-semibold">Payroll</h2>
                    <p className="text-text-secondary mt-1">Automatically generated for the selected pay period.</p>
                </div>
                 <div className="flex items-center gap-2 flex-wrap">
                    <button
                        onClick={handleExportAllPayslips}
                        disabled={payrollRecords.length === 0}
                        className="bg-accent-blue text-white border border-accent-blue rounded-lg px-4 py-2 text-sm font-medium flex items-center gap-2 hover:bg-accent-blue/90 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span>Export All PDFs</span>
                    </button>
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

            <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                 {/* Desktop Table View */}
                 <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full min-w-[1000px]">
                        <thead className="bg-bg-tertiary/40">
                            <tr>
                                {tableHeaders.map(header => (
                                    <th key={header} className={`p-2 px-3 text-left text-xs font-medium text-text-secondary ${header === 'Actions' || header === 'Present' || header === 'Absent' || header === 'Late' ? 'text-center' : ''}`}>{header}</th>
                                ))}
                            </tr>
                        </thead>
                         <tbody className="divide-y divide-border-color">
                            {payrollRecords.length > 0 ? payrollRecords.map(record => {
                                const periodEarning = record.regularPay + record.overtimePay;
                                const serviceCharge = record.serviceCharge || 0;
                                const netPay = periodEarning + serviceCharge;

                                return (
                                    <tr key={record.id} className="hover:bg-hover-bg/50 transition-colors">
                                        <td className="p-2 px-3">
                                            <div className="font-medium text-text-primary text-sm">{record.employee}</div>
                                            <div className="text-xs text-text-secondary">{record.position}</div>
                                        </td>
                                        <td className="p-2 px-3 text-xs text-text-secondary">{formatPeso(record.rate)}/hr</td>
                                        <td className="p-2 px-3 text-xs text-text-secondary">{record.regularHours.toFixed(2)}</td>
                                        <td className="p-2 px-3 text-xs text-text-secondary">{record.overtimeHours.toFixed(2)}</td>
                                        <td className="p-2 px-3 text-sm font-medium text-text-primary">{formatPeso(periodEarning)}</td>
                                        <td className="p-2 px-3 text-sm font-medium text-accent-blue">{formatPeso(serviceCharge)}</td>
                                        <td className="p-2 px-3 text-sm font-semibold text-accent-green">{formatPeso(netPay)}</td>
                                        <td className="p-2 px-3 text-xs text-text-secondary text-center">{record.daysPresent}</td>
                                        <td className="p-2 px-3 text-xs text-text-secondary text-center">{record.daysAbsent}</td>
                                        <td className="p-2 px-3 text-xs text-text-secondary text-center">{record.daysLate}</td>
                                        <td className="p-2 px-3 text-center">
                                            <button
                                                onClick={() => setSelectedRecord(record)}
                                                className="text-accent-blue hover:underline text-xs font-medium"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                );
                            }) : (
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
                            {payrollRecords.map(record => {
                                const periodEarning = record.regularPay + record.overtimePay;
                                const serviceCharge = record.serviceCharge || 0;
                                const netPay = periodEarning + serviceCharge;

                                return (
                                    <div key={record.id} className="bg-bg-tertiary/60 p-4 rounded-lg">
                                        <div className="flex justify-between items-start">
                                            <div>
                                                <h3 className="font-semibold text-text-primary">{record.employee}</h3>
                                                <p className="text-sm text-text-secondary">{record.position}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold text-lg text-accent-green">{formatPeso(netPay)}</p>
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
                                        <div className="mt-4 pt-4 border-t border-border-color space-y-1">
                                            <div className="flex justify-between text-sm">
                                                <span className="text-text-secondary">Period Earning</span>
                                                <span className="font-medium">{formatPeso(periodEarning)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
                                                <span className="text-text-secondary">Service Charge</span>
                                                <span className="font-medium text-accent-blue">{formatPeso(serviceCharge)}</span>
                                            </div>
                                            <div className="flex justify-between text-sm">
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
                                );
                            })}
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
                    employee={employees.find(e => e.id === selectedRecord.id)}
                />
            )}
        </div>
    );
};

export default Payroll;
