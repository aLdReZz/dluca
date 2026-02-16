import React, { useState, useMemo, useEffect, useCallback } from 'react';
import type { Employee } from '../types';
import { CalendarDaysIcon, ClockIcon, BanknotesIcon } from '../components/Icons';
import CalendarPopup from '../components/CalendarPopup';
import { getRateForDate } from '../utils/rateHistory';

interface ScheduleSimulatorProps {
    employees: Employee[];
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
    const match24 = timeStr.trim().match(/^(\d{1,2}):(\d{2})$/);
    if (match24) {
        return parseInt(match24[1], 10) * 60 + parseInt(match24[2], 10);
    }
    return null;
};

const formatPeso = (amount: number) => {
    return '₱' + amount.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDateKeyLocal = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const HOUR_OPTIONS = [0, 4, 5, 6, 7, 8, 9, 10, 11, 12];

const HOUR_TEMPLATES = [
    { label: '8 Hours/day', hours: 8 },
    { label: '9 Hours/day', hours: 9 },
    { label: '10 Hours/day', hours: 10 },
    { label: '12 Hours/day', hours: 12 },
];

const UsersIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 0 0 2.625.372 9.337 9.337 0 0 0 4.121-.952 4.125 4.125 0 0 0-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 0 1 8.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0 1 11.964-3.07M12 6.375a3.375 3.375 0 1 1-6.75 0 3.375 3.375 0 0 1 6.75 0Zm8.25 2.25a2.625 2.625 0 1 1-5.25 0 2.625 2.625 0 0 1 5.25 0Z" />
    </svg>
);

const EllipsisIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM12.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM18.75 12a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0Z" />
    </svg>
);

const SummaryCard: React.FC<{ title: string; value: string; icon: React.FC<{ className?: string }> }> = ({ title, value, icon: Icon }) => (
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

const ScheduleSimulator: React.FC<ScheduleSimulatorProps> = ({ employees }) => {
    // Default to next pay period
    const [simPeriod, setSimPeriod] = useState<{ start: string; end: string }>(() => {
        const today = new Date();
        const day = today.getDate();
        let start: Date, end: Date;
        if (day <= 15) {
            start = new Date(today.getFullYear(), today.getMonth(), 16);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        } else {
            start = new Date(today.getFullYear(), today.getMonth() + 1, 1);
            end = new Date(today.getFullYear(), today.getMonth() + 1, 15);
        }
        return { start: formatDateKeyLocal(start), end: formatDateKeyLocal(end) };
    });

    // Hours per employee per date (0 = off)
    const [simHours, setSimHours] = useState<Record<number, Record<string, number>>>({});
    const [isCalendarOpen, setIsCalendarOpen] = useState(false);
    const [openMenuId, setOpenMenuId] = useState<number | null>(null);

    // Generate array of date keys for the period
    const periodDates = useMemo(() => {
        const dates: string[] = [];
        const start = new Date(simPeriod.start + 'T00:00:00');
        const end = new Date(simPeriod.end + 'T00:00:00');
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
            dates.push(formatDateKeyLocal(d));
        }
        return dates;
    }, [simPeriod]);

    // Pre-populate hours from existing employee schedule data
    useEffect(() => {
        const newHours: Record<number, Record<string, number>> = {};
        for (const emp of employees) {
            newHours[emp.id] = {};
            for (const dateKey of periodDates) {
                const existing = emp.schedule?.[dateKey];
                if (existing && !existing.off && existing.timeIn && existing.timeOut) {
                    const inMin = timeStringToMinutes(existing.timeIn);
                    const outMin = timeStringToMinutes(existing.timeOut);
                    if (inMin !== null && outMin !== null && outMin > inMin) {
                        const totalDuration = outMin - inMin;
                        // Deduct 1hr break if shift > 4hrs
                        const paidMinutes = totalDuration > 4 * 60 ? totalDuration - 60 : totalDuration;
                        newHours[emp.id][dateKey] = Math.round(paidMinutes / 60);
                    } else {
                        newHours[emp.id][dateKey] = 0;
                    }
                } else {
                    newHours[emp.id][dateKey] = 0;
                }
            }
        }
        setSimHours(newHours);
    }, [employees, periodDates]);

    // Update a single cell's hours
    const updateCell = useCallback((employeeId: number, dateKey: string, hours: number) => {
        setSimHours(prev => {
            const updated = { ...prev };
            updated[employeeId] = { ...updated[employeeId], [dateKey]: hours };
            return updated;
        });
    }, []);

    // Quick actions
    const applyTemplate = useCallback((employeeId: number, hours: number) => {
        setSimHours(prev => {
            const updated = { ...prev };
            updated[employeeId] = { ...updated[employeeId] };
            for (const dateKey of periodDates) {
                updated[employeeId][dateKey] = hours;
            }
            return updated;
        });
        setOpenMenuId(null);
    }, [periodDates]);

    const markAllOff = useCallback((employeeId: number) => {
        setSimHours(prev => {
            const updated = { ...prev };
            updated[employeeId] = { ...updated[employeeId] };
            for (const dateKey of periodDates) {
                updated[employeeId][dateKey] = 0;
            }
            return updated;
        });
        setOpenMenuId(null);
    }, [periodDates]);

    const copyFromPrevious = useCallback((employeeId: number) => {
        const employee = employees.find(e => e.id === employeeId);
        if (!employee) return;
        setSimHours(prev => {
            const updated = { ...prev };
            updated[employeeId] = { ...updated[employeeId] };
            const periodLength = periodDates.length;
            for (let i = 0; i < periodLength; i++) {
                const currentDate = new Date(periodDates[i] + 'T00:00:00');
                currentDate.setDate(currentDate.getDate() - periodLength);
                const prevDateKey = formatDateKeyLocal(currentDate);
                const prevSchedule = employee.schedule?.[prevDateKey];
                if (prevSchedule && !prevSchedule.off && prevSchedule.timeIn && prevSchedule.timeOut) {
                    const inMin = timeStringToMinutes(prevSchedule.timeIn);
                    const outMin = timeStringToMinutes(prevSchedule.timeOut);
                    if (inMin !== null && outMin !== null && outMin > inMin) {
                        const totalDuration = outMin - inMin;
                        const paidMinutes = totalDuration > 4 * 60 ? totalDuration - 60 : totalDuration;
                        updated[employeeId][periodDates[i]] = Math.round(paidMinutes / 60);
                    } else {
                        updated[employeeId][periodDates[i]] = 0;
                    }
                } else {
                    updated[employeeId][periodDates[i]] = 0;
                }
            }
            return updated;
        });
        setOpenMenuId(null);
    }, [employees, periodDates]);

    // Payroll projection calculation
    const projectedPayroll = useMemo(() => {
        return employees.map(employee => {
            let totalHours = 0;
            let regularPay = 0;
            let daysScheduled = 0;

            for (const dateKey of periodDates) {
                const hours = simHours[employee.id]?.[dateKey] || 0;
                if (hours <= 0) continue;

                daysScheduled++;
                totalHours += hours;
                const dailyRate = getRateForDate(employee, dateKey);
                regularPay += hours * dailyRate;
            }

            return {
                id: employee.id,
                name: employee.name,
                position: employee.position,
                department: employee.department,
                rate: employee.rate,
                totalHours,
                regularPay,
                daysScheduled,
                daysOff: periodDates.length - daysScheduled,
            };
        });
    }, [employees, periodDates, simHours]);

    // Summary stats
    const summaryStats = useMemo(() => {
        return projectedPayroll.reduce(
            (acc, record) => {
                acc.totalProjectedCost += record.regularPay;
                acc.totalScheduledHours += record.totalHours;
                acc.totalEmployeesScheduled += record.daysScheduled > 0 ? 1 : 0;
                return acc;
            },
            { totalProjectedCost: 0, totalScheduledHours: 0, totalEmployeesScheduled: 0 },
        );
    }, [projectedPayroll]);

    // Format date for column header
    const formatColumnDate = (dateKey: string) => {
        const date = new Date(dateKey + 'T00:00:00');
        return {
            dayShort: date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase(),
            dateFormatted: date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' }),
            isWeekend: date.getDay() === 0 || date.getDay() === 6,
        };
    };

    const formatDateRange = () => {
        const start = new Date(simPeriod.start + 'T00:00:00');
        const end = new Date(simPeriod.end + 'T00:00:00');
        const fmt = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        return `${fmt(start)} - ${fmt(end)}`;
    };

    // Daily totals for footer
    const dailyTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const dateKey of periodDates) {
            let total = 0;
            for (const emp of employees) {
                total += simHours[emp.id]?.[dateKey] || 0;
            }
            totals[dateKey] = total;
        }
        return totals;
    }, [periodDates, employees, simHours]);

    // Per-employee total hours
    const employeeTotalHours = useMemo(() => {
        const totals: Record<number, number> = {};
        for (const emp of employees) {
            let total = 0;
            for (const dateKey of periodDates) {
                total += simHours[emp.id]?.[dateKey] || 0;
            }
            totals[emp.id] = total;
        }
        return totals;
    }, [employees, periodDates, simHours]);

    // Quick action menu content (shared between desktop and mobile)
    const renderMenu = (employeeId: number) => (
        <>
            <div className="fixed inset-0 z-20" onClick={() => setOpenMenuId(null)} />
            <div className="absolute right-0 top-full mt-1 z-30 bg-bg-secondary border border-border-color rounded-lg shadow-xl py-1 w-48">
                <div className="px-3 py-1.5 text-[10px] font-semibold text-text-secondary uppercase tracking-wider">Set Hours</div>
                {HOUR_TEMPLATES.map(tmpl => (
                    <button
                        key={tmpl.label}
                        onClick={() => applyTemplate(employeeId, tmpl.hours)}
                        className="w-full text-left px-3 py-1.5 text-xs hover:bg-hover-bg transition-colors text-text-primary"
                    >
                        {tmpl.label}
                    </button>
                ))}
                <div className="border-t border-border-color/50 my-1" />
                <button
                    onClick={() => copyFromPrevious(employeeId)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-hover-bg transition-colors text-text-primary"
                >
                    Copy From Previous Period
                </button>
                <button
                    onClick={() => markAllOff(employeeId)}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-hover-bg transition-colors text-accent-red"
                >
                    Mark All As Off
                </button>
            </div>
        </>
    );

    return (
        <div className="p-3 sm:p-4 lg:p-6 xl:p-8 max-w-[1600px] mx-auto w-full">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-3">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl sm:text-2xl lg:text-3xl font-semibold">Schedule Simulator</h2>
                        <span className="px-2 py-0.5 text-xs font-medium bg-accent-blue/10 text-accent-blue rounded-full border border-accent-blue/20">Simulation</span>
                    </div>
                    <p className="text-text-secondary mt-1 text-xs sm:text-sm">Simulate future schedules and project payroll costs.</p>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setIsCalendarOpen(!isCalendarOpen)}
                        className="flex items-center gap-2 bg-bg-secondary border border-border-color rounded-lg px-4 py-2 text-sm font-medium hover:bg-hover-bg transition-colors"
                    >
                        <CalendarDaysIcon className="w-5 h-5 text-accent-blue" />
                        {formatDateRange()}
                    </button>
                    {isCalendarOpen && (
                        <div className="absolute right-0 top-full mt-2 z-50">
                            <CalendarPopup
                                initialRange={simPeriod}
                                onRangeComplete={(range) => {
                                    setSimPeriod(range);
                                    setIsCalendarOpen(false);
                                }}
                                onClose={() => setIsCalendarOpen(false)}
                            />
                        </div>
                    )}
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <SummaryCard title="Total Projected Labor Cost" value={formatPeso(summaryStats.totalProjectedCost)} icon={BanknotesIcon} />
                <SummaryCard title="Employees Scheduled" value={String(summaryStats.totalEmployeesScheduled)} icon={UsersIcon} />
                <SummaryCard title="Total Scheduled Hours" value={`${summaryStats.totalScheduledHours.toFixed(1)} hrs`} icon={ClockIcon} />
            </div>

            {/* Schedule Grid */}
            <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden mb-6">
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full border-collapse table-fixed">
                        <thead>
                            <tr className="bg-gradient-to-r from-bg-tertiary/50 to-bg-tertiary/30">
                                <th className="px-3 py-2.5 text-left text-xs font-bold text-text-secondary sticky left-0 bg-gradient-to-r from-bg-tertiary/50 to-bg-tertiary/30 z-10 w-36 uppercase tracking-wide">Employee</th>
                                {periodDates.map(dateKey => {
                                    const { dayShort, dateFormatted, isWeekend } = formatColumnDate(dateKey);
                                    return (
                                        <th key={dateKey} className={`px-1 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider border-l border-border-color transition-colors ${isWeekend ? 'bg-bg-tertiary/40 text-accent-red' : 'text-text-secondary'}`}>
                                            {dayShort}
                                            <div className="font-medium text-[9px] mt-0.5">{dateFormatted}</div>
                                        </th>
                                    );
                                })}
                                <th className="w-20 px-2 py-2.5 text-center text-xs font-bold text-text-secondary uppercase border-l border-border-color tracking-wide">Total</th>
                                <th className="w-10 px-1 py-2.5 border-l border-border-color"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border-color">
                            {employees.map(employee => (
                                <tr key={employee.id} className="group/row hover:bg-hover-bg/30 border-b border-border-color/50">
                                    <td className="px-3 py-2 font-semibold text-sm sticky left-0 bg-bg-secondary group-hover/row:bg-hover-bg/30 z-10 w-36">
                                        <div className="truncate">{employee.name}</div>
                                    </td>
                                    {periodDates.map(dateKey => {
                                        const hours = simHours[employee.id]?.[dateKey] || 0;
                                        const isOff = hours === 0;
                                        const { isWeekend } = formatColumnDate(dateKey);
                                        return (
                                            <td key={dateKey} className={`text-center border-l border-border-color/50 ${isWeekend ? 'bg-bg-tertiary/10' : ''} p-0.5 align-middle`}>
                                                {isOff ? (
                                                    <button
                                                        onClick={() => updateCell(employee.id, dateKey, 8)}
                                                        className="flex items-center justify-center py-1.5 w-full cursor-pointer group/off"
                                                    >
                                                        <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-bg-tertiary/70 text-text-secondary font-bold text-[10px] uppercase group-hover/off:bg-hover-bg group-hover/off:text-text-primary transition-colors">OFF</span>
                                                    </button>
                                                ) : (
                                                    <select
                                                        value={hours}
                                                        onChange={e => updateCell(employee.id, dateKey, Number(e.target.value))}
                                                        className="w-full bg-transparent border-0 text-center text-xs font-semibold text-accent-blue cursor-pointer hover:bg-hover-bg/50 rounded py-1.5 transition-colors appearance-none"
                                                    >
                                                        {HOUR_OPTIONS.map(h => (
                                                            <option key={h} value={h}>{h === 0 ? 'OFF' : `${h}h`}</option>
                                                        ))}
                                                    </select>
                                                )}
                                            </td>
                                        );
                                    })}
                                    <td className="text-center text-xs font-bold border-l border-border-color/50 px-2 py-2">
                                        <span className="text-text-primary">
                                            {employeeTotalHours[employee.id] > 0 ? `${employeeTotalHours[employee.id]}h` : '-'}
                                        </span>
                                    </td>
                                    <td className="px-1 py-1 text-center relative border-l border-border-color/50">
                                        <button
                                            onClick={() => setOpenMenuId(openMenuId === employee.id ? null : employee.id)}
                                            className="p-1 rounded hover:bg-hover-bg transition-colors"
                                        >
                                            <EllipsisIcon className="w-4 h-4 text-text-secondary" />
                                        </button>
                                        {openMenuId === employee.id && renderMenu(employee.id)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr className="bg-gradient-to-r from-bg-tertiary/40 to-bg-tertiary/20 border-t-2 border-border-color">
                                <td className="px-3 py-2.5 font-bold text-xs uppercase text-text-secondary sticky left-0 bg-gradient-to-r from-bg-tertiary/40 to-bg-tertiary/20 z-10 tracking-wide">Total</td>
                                {periodDates.map(dateKey => (
                                    <td key={`total-${dateKey}`} className="px-1 py-2.5 text-center text-[10px] font-bold text-text-primary border-l border-border-color/50">
                                        {dailyTotals[dateKey] > 0 ? `${dailyTotals[dateKey]}h` : '-'}
                                    </td>
                                ))}
                                <td className="text-center text-xs font-bold text-accent-blue border-l border-border-color/50 px-2 py-2.5">
                                    {summaryStats.totalScheduledHours > 0 ? `${summaryStats.totalScheduledHours}h` : '-'}
                                </td>
                                <td className="border-l border-border-color/50"></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* Mobile Card View for Schedule */}
                <div className="lg:hidden divide-y divide-border-color">
                    {employees.map(employee => (
                        <div key={employee.id} className="p-3">
                            <div className="flex justify-between items-center mb-2">
                                <div className="font-semibold text-sm text-text-primary">{employee.name}</div>
                                <div className="relative">
                                    <button
                                        onClick={() => setOpenMenuId(openMenuId === employee.id ? null : employee.id)}
                                        className="p-1 rounded hover:bg-hover-bg transition-colors"
                                    >
                                        <EllipsisIcon className="w-4 h-4 text-text-secondary" />
                                    </button>
                                    {openMenuId === employee.id && renderMenu(employee.id)}
                                </div>
                            </div>
                            <div className="grid grid-cols-5 gap-1">
                                {periodDates.map(dateKey => {
                                    const hours = simHours[employee.id]?.[dateKey] || 0;
                                    const { dayShort, isWeekend } = formatColumnDate(dateKey);
                                    const dateNum = new Date(dateKey + 'T00:00:00').getDate();
                                    return (
                                        <div key={dateKey} className={`text-center p-1 rounded ${isWeekend ? 'bg-bg-tertiary/30' : ''}`}>
                                            <div className={`text-[9px] font-bold ${isWeekend ? 'text-accent-red' : 'text-text-secondary'}`}>{dayShort} {dateNum}</div>
                                            {hours === 0 ? (
                                                <button onClick={() => updateCell(employee.id, dateKey, 8)} className="text-[10px] text-text-secondary/50 font-medium mt-0.5">OFF</button>
                                            ) : (
                                                <div className="text-[10px] text-accent-blue font-semibold mt-0.5">{hours}h</div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                            <div className="mt-1.5 text-right text-xs font-semibold text-text-secondary">
                                Total: {employeeTotalHours[employee.id] > 0 ? `${employeeTotalHours[employee.id]}h` : '0h'}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Projected Payroll Table */}
            <div className="bg-bg-secondary rounded-xl border border-border-color overflow-hidden">
                <div className="p-3 border-b border-border-color flex justify-between items-center">
                    <h3 className="text-sm font-semibold text-text-primary">Projected Payroll</h3>
                    <p className="text-xs text-text-secondary/70">Service charge not included in projection</p>
                </div>

                {/* Desktop Table */}
                <div className="overflow-x-auto hidden lg:block">
                    <table className="w-full">
                        <thead className="bg-bg-tertiary/40">
                            <tr>
                                {['Staff', 'Rate/hr', 'Hours', 'Days', 'Projected Pay'].map(h => (
                                    <th key={h} className="p-2 px-3 text-left text-xs font-semibold text-text-secondary uppercase tracking-wider">{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {projectedPayroll.map(record => (
                                <tr key={record.id} className="border-t border-border-color/50 hover:bg-hover-bg/30">
                                    <td className="p-2 px-3">
                                        <div className="text-sm font-medium text-text-primary">{record.name}</div>
                                        <div className="text-xs text-text-secondary">{record.position}</div>
                                    </td>
                                    <td className="p-2 px-3 text-sm text-text-secondary">{formatPeso(record.rate)}</td>
                                    <td className="p-2 px-3 text-sm text-text-primary">{record.totalHours}</td>
                                    <td className="p-2 px-3 text-sm text-text-primary">{record.daysScheduled}</td>
                                    <td className="p-2 px-3 text-sm font-semibold text-accent-green">{formatPeso(record.regularPay)}</td>
                                </tr>
                            ))}
                            {/* Totals Row */}
                            <tr className="border-t-2 border-border-color bg-bg-tertiary/30">
                                <td className="p-2 px-3 text-sm font-semibold text-text-primary">Total</td>
                                <td className="p-2 px-3"></td>
                                <td className="p-2 px-3 text-sm font-semibold">{projectedPayroll.reduce((s, r) => s + r.totalHours, 0)}</td>
                                <td className="p-2 px-3 text-sm font-semibold">{projectedPayroll.reduce((s, r) => s + r.daysScheduled, 0)}</td>
                                <td className="p-2 px-3 text-sm font-bold text-accent-green">{formatPeso(summaryStats.totalProjectedCost)}</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden divide-y divide-border-color/50">
                    {projectedPayroll.map(record => (
                        <div key={record.id} className="p-3">
                            <div className="flex justify-between items-start mb-1">
                                <div>
                                    <div className="font-medium text-text-primary text-sm">{record.name}</div>
                                    <div className="text-xs text-text-secondary">{record.position} &middot; {formatPeso(record.rate)}/hr</div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-semibold text-accent-green">{formatPeso(record.regularPay)}</div>
                                    <div className="text-xs text-text-secondary">{record.totalHours}h / {record.daysScheduled} days</div>
                                </div>
                            </div>
                        </div>
                    ))}
                    {/* Mobile Total */}
                    <div className="p-3 bg-bg-tertiary/30">
                        <div className="flex justify-between items-center">
                            <span className="font-semibold text-sm">Total Projected Cost</span>
                            <span className="font-bold text-lg text-accent-green">{formatPeso(summaryStats.totalProjectedCost)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ScheduleSimulator;
