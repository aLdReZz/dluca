import React, { useState, useMemo, useEffect } from 'react';
import { XMarkIcon } from './Icons';
import { Employee, Schedule } from '../types';

interface WeekScheduleCreatorProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (weekStart: Date, schedules: { [employeeId: number]: { [dateKey: string]: Schedule } }) => void;
    employees: Employee[];
}

const WeekScheduleCreator: React.FC<WeekScheduleCreatorProps> = ({
    isOpen,
    onClose,
    employees,
    onSave,
}) => {
    const [selectedWeekStart, setSelectedWeekStart] = useState<Date>(() => {
        // Default to next Monday
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysUntilNextMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
        const nextMonday = new Date(today);
        nextMonday.setDate(today.getDate() + daysUntilNextMonday);
        nextMonday.setHours(0, 0, 0, 0);
        return nextMonday;
    });

    const [schedules, setSchedules] = useState<{
        [employeeId: number]: {
            [dayIndex: number]: { off: boolean; timeIn: string; timeOut: string };
        };
    }>({});

    const weekDates = useMemo(() => {
        const dates = [];
        const baseYear = selectedWeekStart.getFullYear();
        const baseMonth = selectedWeekStart.getMonth();
        const baseDay = selectedWeekStart.getDate();

        for (let i = 0; i < 7; i++) {
            const date = new Date(baseYear, baseMonth, baseDay + i);
            dates.push(date);
        }
        return dates;
    }, [selectedWeekStart]);

    const dayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Load existing schedules from employees when week changes
    useEffect(() => {
        const loadedSchedules: any = {};

        employees.forEach(emp => {
            loadedSchedules[emp.id] = {};

            weekDates.forEach((date, dayIndex) => {
                // Create date key in local timezone YYYY-MM-DD format
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateKey = `${year}-${month}-${day}`;

                const existingSchedule = emp.schedule?.[dateKey];

                if (existingSchedule) {
                    // Load existing schedule
                    loadedSchedules[emp.id][dayIndex] = {
                        off: existingSchedule.off || false,
                        timeIn: existingSchedule.timeIn || '',
                        timeOut: existingSchedule.timeOut || '',
                    };
                } else {
                    // Default to OFF for days without schedule
                    loadedSchedules[emp.id][dayIndex] = {
                        off: true,
                        timeIn: '',
                        timeOut: '',
                    };
                }
            });
        });

        setSchedules(loadedSchedules);
    }, [employees, weekDates]);

    const handleWeekChange = (direction: 'prev' | 'next') => {
        const newDate = new Date(selectedWeekStart);
        newDate.setDate(selectedWeekStart.getDate() + (direction === 'next' ? 7 : -7));
        setSelectedWeekStart(newDate);
    };

    const handleCellChange = (employeeId: number, dayIndex: number, field: 'timeIn' | 'timeOut', value: string) => {
        setSchedules(prev => {
            const currentSchedule = prev[employeeId]?.[dayIndex] || { off: true, timeIn: '', timeOut: '' };

            // If selecting "Day Off" in timeIn, mark as off
            if (field === 'timeIn' && value === 'off') {
                return {
                    ...prev,
                    [employeeId]: {
                        ...prev[employeeId],
                        [dayIndex]: {
                            off: true,
                            timeIn: '',
                            timeOut: '',
                        },
                    },
                };
            }

            // If changing timeIn to a valid time, auto-fill timeOut to 9 hours later
            if (field === 'timeIn' && value !== 'off') {
                const [startHour] = value.split(':').map(Number);
                const endHour = Math.min(startHour + 9, 22); // Cap at 10 PM (22:00)
                const suggestedTimeOut = `${endHour.toString().padStart(2, '0')}:00`;

                return {
                    ...prev,
                    [employeeId]: {
                        ...prev[employeeId],
                        [dayIndex]: {
                            off: false,
                            timeIn: value,
                            timeOut: suggestedTimeOut,
                        },
                    },
                };
            }

            return {
                ...prev,
                [employeeId]: {
                    ...prev[employeeId],
                    [dayIndex]: {
                        ...currentSchedule,
                        off: false,
                        [field]: value,
                    },
                },
            };
        });
    };

    const handleSave = () => {
        const schedulesToSave: { [employeeId: number]: { [dateKey: string]: Schedule } } = {};

        employees.forEach(emp => {
            schedulesToSave[emp.id] = {};
            weekDates.forEach((date, dayIndex) => {
                // Create date key in local timezone YYYY-MM-DD format
                const year = date.getFullYear();
                const month = String(date.getMonth() + 1).padStart(2, '0');
                const day = String(date.getDate()).padStart(2, '0');
                const dateKey = `${year}-${month}-${day}`;

                const daySchedule = schedules[emp.id]?.[dayIndex] || { off: false, timeIn: '09:00', timeOut: '17:00' };

                schedulesToSave[emp.id][dateKey] = {
                    off: daySchedule.off,
                    timeIn: daySchedule.off ? '' : daySchedule.timeIn,
                    timeOut: daySchedule.off ? '' : daySchedule.timeOut,
                };
            });
        });

        onSave(selectedWeekStart, schedulesToSave);
        onClose();
    };

    const formatDateRange = () => {
        const start = weekDates[0];
        const end = weekDates[6];
        return `${start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${end.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    };

    // Generate time options in 12-hour format with AM/PM (9:00 AM to 10:00 PM, hourly)
    const timeOptions = [{ value: 'off', label: 'OFF' }];
    for (let hour = 9; hour <= 22; hour++) {
        const timeStr24 = `${hour.toString().padStart(2, '0')}:00`;
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
        const displayStr = `${displayHour}:00 ${ampm}`;
        timeOptions.push({ value: timeStr24, label: displayStr });
    }

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-bg-secondary rounded-2xl border border-border-color shadow-2xl w-[95vw] max-w-7xl max-h-[90vh] flex flex-col animate-pop-in"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-border-color">
                    <div>
                        <h2 className="text-xl font-bold text-text-primary">Create Weekly Schedule</h2>
                        <p className="text-sm text-text-secondary mt-1">
                            Set schedule for all {employees.length} employees
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
                    >
                        <XMarkIcon className="w-5 h-5 text-text-secondary" />
                    </button>
                </div>

                {/* Week Selector */}
                <div className="px-6 py-3 border-b border-border-color bg-bg-tertiary/30">
                    <div className="flex items-center justify-center gap-3">
                        <button
                            onClick={() => handleWeekChange('prev')}
                            className="px-4 py-2 bg-bg-secondary border border-border-color rounded-lg hover:bg-hover-bg transition text-text-secondary font-medium"
                        >
                            ← Previous Week
                        </button>
                        <div className="px-6 py-2 bg-accent-blue/10 border border-accent-blue/30 rounded-lg font-bold text-accent-blue text-center min-w-[280px]">
                            {formatDateRange()}
                        </div>
                        <button
                            onClick={() => handleWeekChange('next')}
                            className="px-4 py-2 bg-bg-secondary border border-border-color rounded-lg hover:bg-hover-bg transition text-text-secondary font-medium"
                        >
                            Next Week →
                        </button>
                    </div>
                </div>

                {/* Spreadsheet Table */}
                <div className="flex-1 overflow-auto px-6 py-4">
                    <div className="inline-block min-w-full">
                        <table className="w-full border-collapse">
                            <thead>
                                <tr>
                                    {/* Employee Name Column Header */}
                                    <th className="sticky left-0 z-20 bg-bg-tertiary border border-border-color p-3 text-left font-bold text-text-primary text-sm min-w-[150px]">
                                        Employee
                                    </th>
                                    {/* Day Headers */}
                                    {weekDates.map((date, index) => {
                                        return (
                                            <th
                                                key={index}
                                                className="border border-border-color p-2 text-center font-semibold text-xs bg-bg-tertiary"
                                            >
                                                <div className="text-text-primary">{dayNames[index]}</div>
                                                <div className="text-text-secondary text-[10px] mt-0.5">
                                                    {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                                </div>
                                            </th>
                                        );
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {employees.map((emp, empIndex) => {
                                    const isEvenRow = empIndex % 2 === 0;

                                    // Calculate total hours for this employee
                                    let totalHours = 0;
                                    for (let i = 0; i < 7; i++) {
                                        const daySchedule = schedules[emp.id]?.[i];
                                        if (daySchedule && !daySchedule.off && daySchedule.timeIn && daySchedule.timeOut) {
                                            const [startHour] = daySchedule.timeIn.split(':').map(Number);
                                            const [endHour] = daySchedule.timeOut.split(':').map(Number);
                                            totalHours += (endHour - startHour);
                                        }
                                    }

                                    return (
                                        <tr key={emp.id} className="hover:bg-hover-bg/30 transition">
                                            {/* Employee Name Cell */}
                                            <td className={`sticky left-0 z-10 border border-border-color p-3 font-semibold text-text-primary text-sm ${isEvenRow ? 'bg-bg-secondary' : 'bg-bg-tertiary'}`}>
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <div>{emp.name}</div>
                                                        <div className="text-xs text-text-secondary mt-0.5">{emp.position}</div>
                                                    </div>
                                                    <div className="text-[10px] text-accent-blue font-normal">{totalHours}h</div>
                                                </div>
                                            </td>
                                            {/* Day Cells */}
                                            {weekDates.map((date, dayIndex) => {
                                                const daySchedule = schedules[emp.id]?.[dayIndex] || { off: true, timeIn: '', timeOut: '' };

                                                return (
                                                    <td
                                                        key={dayIndex}
                                                        className={`border border-border-color p-1 ${isEvenRow ? 'bg-bg-secondary' : 'bg-bg-tertiary'}`}
                                                    >
                                                        <div className="flex flex-col gap-1 min-w-[120px]">
                                                            {/* Start Time Dropdown */}
                                                            <select
                                                                value={daySchedule.off ? 'off' : daySchedule.timeIn}
                                                                onChange={(e) => handleCellChange(emp.id, dayIndex, 'timeIn', e.target.value)}
                                                                className={`w-full px-2 py-1 text-xs ${isEvenRow ? 'bg-bg-secondary' : 'bg-bg-tertiary'} border border-border-color rounded focus:outline-none focus:ring-1 focus:ring-accent-blue text-text-primary appearance-none text-center`}
                                                                style={{ backgroundImage: 'none' }}
                                                            >
                                                                {timeOptions.map(time => (
                                                                    <option key={time.value} value={time.value}>{time.label}</option>
                                                                ))}
                                                            </select>

                                                            {/* End Time Dropdown - only show if not day off */}
                                                            {!daySchedule.off && (
                                                                <select
                                                                    value={daySchedule.timeOut}
                                                                    onChange={(e) => handleCellChange(emp.id, dayIndex, 'timeOut', e.target.value)}
                                                                    className={`w-full px-2 py-1 text-xs ${isEvenRow ? 'bg-bg-secondary' : 'bg-bg-tertiary'} border border-border-color rounded focus:outline-none focus:ring-1 focus:ring-accent-blue text-text-primary appearance-none text-center`}
                                                                    style={{ backgroundImage: 'none' }}
                                                                >
                                                                    {timeOptions
                                                                        .filter(time => {
                                                                            if (time.value === 'off') return false;
                                                                            const [inHour] = daySchedule.timeIn.split(':').map(Number);
                                                                            const [outHour] = time.value.split(':').map(Number);
                                                                            return outHour > inHour;
                                                                        })
                                                                        .map(time => (
                                                                            <option key={time.value} value={time.value}>{time.label}</option>
                                                                        ))
                                                                    }
                                                                </select>
                                                            )}
                                                        </div>
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-border-color bg-bg-tertiary/30 flex justify-between items-center">
                    <div className="text-xs text-text-secondary">
                        💡 Tip: Uncheck "Day Off" to set working hours for each day
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 bg-bg-secondary hover:bg-hover-bg text-text-primary rounded-lg transition-colors font-medium border border-border-color"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleSave}
                            className="px-6 py-2.5 bg-accent-blue hover:bg-accent-blue/90 text-white rounded-lg transition-colors font-medium shadow-lg shadow-accent-blue/30"
                        >
                            Create Schedule
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default WeekScheduleCreator;
