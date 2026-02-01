
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Employee, AttendanceRecord, PayrollRecord, Schedule, SalesData, RateHistoryEntry } from '../types';
import { UploadIcon, DownloadIcon, CalendarDaysIcon, PencilSquareIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon, PlusIcon, CheckIcon, XMarkIcon } from '../components/Icons';
import LoadingSpinner from '../components/LoadingSpinner';
import EmployeeProfile from '../components/EmployeeProfile';
import ScheduleEditModal from '../components/ScheduleEditModal';
import AttendanceEditModal from '../components/AttendanceEditModal';
import html2canvas from 'html2canvas';
import WeekScheduleCreator from '../components/WeekScheduleCreator';
import { useFirebaseData, useFirebaseMutation } from '../hooks/useFirebase';
import { attendanceService, salesService, employeesService } from '../utils/firebaseService';
import { parsePaidHoursCsv, mapPaidHoursToEmployees, parseCsvText } from '../utils/paidHours';
import { addRateChange, removeRateChange } from '../utils/rateHistory';

interface AttendanceProps {
    employees?: Employee[];
    setEmployees?: React.Dispatch<React.SetStateAction<Employee[]>>;
    attendanceRecords?: AttendanceRecord[];
    setAttendanceRecords?: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
    payrollRecords?: PayrollRecord[];
    setPayrollRecords?: React.Dispatch<React.SetStateAction<PayrollRecord[]>>;
    salesData?: SalesData[];
    setManualPaidMinutes?: React.Dispatch<React.SetStateAction<Record<string, Record<number, number>>>>;
    setManualGhostMinutes?: React.Dispatch<React.SetStateAction<Record<string, number>>>;
}

const StatusTag: React.FC<{text: string, type: 'off' | 'absent'}> = ({text, type}) => {
    const classes = { 
        off: 'bg-bg-tertiary text-text-secondary',
        absent: 'bg-accent-red/20 text-accent-red',
    };
    return <span className={`inline-block text-center px-2 py-1 text-xs font-medium rounded-md uppercase ${classes[type]}`}>{text}</span>
};

const DatePickerPopup: React.FC<{
    initialDate: string;
    onDateSelect: (date: string) => void;
}> = ({ initialDate, onDateSelect }) => {
    const [viewDate, setViewDate] = useState(() => new Date(initialDate + 'T00:00:00Z'));

    const calendarGrid = useMemo(() => {
        const year = viewDate.getUTCFullYear();
        const month = viewDate.getUTCMonth();
        const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay(); // 0 = Sunday
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
        
        const days = [];
        const emptyCells = (firstDayOfMonth + 6) % 7; // Adjust for Monday start
        for (let i = 0; i < emptyCells; i++) {
            days.push({ key: `empty-${i}`, isEmpty: true });
        }
        for (let day = 1; day <= daysInMonth; day++) {
            days.push({ key: day, day, date: new Date(Date.UTC(year, month, day)) });
        }
        return days;
    }, [viewDate]);

    const changeMonth = (amount: number) => {
        setViewDate(prev => {
            const newDate = new Date(prev);
            newDate.setUTCMonth(newDate.getUTCMonth() + amount);
            return newDate;
        });
    };
    
    const isSameDayUTC = (d1?: Date, d2Str?: string) => {
        if (!d1 || !d2Str) return false;
        const d2 = new Date(d2Str + 'T00:00:00Z');
        return d1.getUTCFullYear() === d2.getUTCFullYear() && 
               d1.getUTCMonth() === d2.getUTCMonth() && 
               d1.getUTCDate() === d2.getUTCDate();
    };
    
    const now = new Date();
    const todayStr = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().split('T')[0];

    return (
        <div className="absolute top-full right-0 mt-2 bg-bg-secondary border border-border-color rounded-xl shadow-lg p-4 z-50 w-80 animate-fade-in-up">
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-1 rounded-full hover:bg-hover-bg transition-colors"><ChevronLeftIcon className="w-5 h-5"/></button>
                <div className="font-bold text-lg">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</div>
                <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-hover-bg transition-colors"><ChevronRightIcon className="w-5 h-5"/></button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-text-secondary/70 mb-3">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1">
                {calendarGrid.map(item => {
                    if (item.isEmpty) return <div key={item.key}></div>;
                    const { day, date } = item;
                    if (!date) return <div key={item.key}></div>;
                    
                    const isSelected = isSameDayUTC(date, initialDate);
                    const isToday = isSameDayUTC(date, todayStr);

                    return (
                        <div key={item.key} className="flex items-center justify-center">
                             <button 
                                onClick={() => onDateSelect(date.toISOString().split('T')[0])} 
                                className={`
                                    relative w-9 h-9 flex items-center justify-center rounded-full cursor-pointer transition-colors text-sm
                                    ${ isSelected ? 'bg-hover-bg text-text-primary font-bold' : 'hover:bg-hover-bg' }
                                `}
                            >
                                {day}
                                {isToday && !isSelected && (
                                    <span className="absolute bottom-1.5 h-1 w-1 rounded-full bg-text-secondary"></span>
                                )}
                            </button>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};


const toISODate = (date: Date) => date.toISOString().split('T')[0];

const getMondayDateString = (date: Date) => {
    const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    const day = utcDate.getUTCDay(); // 0 = Sunday, 1 = Monday
    const diffToMonday = day === 0 ? -6 : 1 - day;
    utcDate.setUTCDate(utcDate.getUTCDate() + diffToMonday);
    return toISODate(utcDate);
};

const Attendance: React.FC<AttendanceProps> = ({
    employees: propEmployees = [],
    setEmployees: setPropEmployees,
    attendanceRecords: propAttendanceRecords,
    setAttendanceRecords: setPropAttendanceRecords,
    payrollRecords: propPayrollRecords,
    setPayrollRecords: setPropPayrollRecords,
    salesData: propSalesData = [],
    setManualPaidMinutes,
    setManualGhostMinutes,
}) => {
    const [attendanceDataVersion, setAttendanceDataVersion] = useState(0);

    // Fetch employees from Firebase with refetch capability
    const { data: firebaseEmployees = [], loading: employeesLoading, error: employeesError, refetch: refetchEmployees } = useFirebaseData(
        () => employeesService.getAll(),
        []
    );

    // Use Firebase employees if available, otherwise use prop employees
    const employees = (Array.isArray(firebaseEmployees) && firebaseEmployees.length > 0) ? firebaseEmployees : propEmployees;

    // Wrapper function to update both local Firebase state and parent prop state
    const setEmployees = (newEmployees: Employee[] | ((prev: Employee[]) => Employee[])) => {
        if (setPropEmployees) {
            setPropEmployees(newEmployees);
        }
    };

    // Fetch attendance records from Firebase with refetch capability
    const { data: firebaseAttendanceRecords = [], loading: attendanceLoading, error: attendanceError, refetch: refetchAttendance } = useFirebaseData(
        () => attendanceService.getAll(),
        [attendanceDataVersion]
    );

    // Fetch sales data from Firebase
    const { data: firebaseSalesData = [], loading: salesLoading, error: salesError } = useFirebaseData(
        () => salesService.getAll(),
        []
    );

    // Batch upload mutation for attendance records
    const { mutate: batchUploadAttendance, loading: uploadingAttendance } = useFirebaseMutation(
        (records: AttendanceRecord[]) => attendanceService.batch(records)
    );

    // Individual attendance record update mutation (for modal edits)
    const { mutate: updateSingleAttendance } = useFirebaseMutation(
        (record: AttendanceRecord) => attendanceService.batch([record])
    );

    // Employee schedule sync mutation (for schedule edits)
    const { mutate: syncEmployees } = useFirebaseMutation(
        (employees: Employee[]) => employeesService.batchUpsert(employees)
    );

    // Store pending optimistic updates separately
    const [pendingUpdates, setPendingUpdates] = useState<Map<string, AttendanceRecord>>(new Map());

    // Clean up pending updates when Firebase data includes them
    useEffect(() => {
        if (pendingUpdates.size === 0 || !firebaseAttendanceRecords || firebaseAttendanceRecords.length === 0) {
            return;
        }

        const firebaseRecordKeys = new Set(
            firebaseAttendanceRecords.map(r => `${r.employee.toLowerCase()}_${r.date}`)
        );

        setPendingUpdates(prev => {
            const newMap = new Map(prev);
            let removedCount = 0;

            // Remove pending updates that now exist in Firebase data with matching values
            prev.forEach((pendingRecord, key) => {
                if (firebaseRecordKeys.has(key)) {
                    const firebaseRecord = firebaseAttendanceRecords.find(
                        r => `${r.employee.toLowerCase()}_${r.date}` === key
                    );

                    if (firebaseRecord &&
                        firebaseRecord.timeIn === pendingRecord.timeIn &&
                        firebaseRecord.timeOut === pendingRecord.timeOut) {
                        newMap.delete(key);
                        removedCount++;
                        console.log('🧹 Cleaned up pending update:', key);
                    }
                }
            });

            if (removedCount > 0) {
                console.log(`✨ Cleaned ${removedCount} pending updates, remaining:`, newMap.size);
            }

            return newMap.size !== prev.size ? newMap : prev;
        });
    }, [firebaseAttendanceRecords, pendingUpdates]);

    // Merge Firebase data with pending updates for display
    const attendanceRecords = useMemo(() => {
        const baseRecords = (Array.isArray(firebaseAttendanceRecords) && firebaseAttendanceRecords.length > 0)
            ? firebaseAttendanceRecords
            : (propAttendanceRecords || []);

        console.log('📊 Merging attendance records:', {
            baseRecordsCount: baseRecords.length,
            pendingUpdatesCount: pendingUpdates.size,
            pendingKeys: Array.from(pendingUpdates.keys())
        });

        if (pendingUpdates.size === 0) {
            return baseRecords;
        }

        // Create a map of existing records
        const recordMap = new Map<string, AttendanceRecord>();
        baseRecords.forEach(record => {
            const key = `${record.employee.toLowerCase()}_${record.date}`;
            recordMap.set(key, record);
        });

        // Apply pending updates
        pendingUpdates.forEach((update, key) => {
            console.log('🔄 Applying pending update:', key, update);
            if (!update.timeIn && !update.timeOut) {
                // Remove the record if times are cleared
                recordMap.delete(key);
            } else {
                recordMap.set(key, update);
            }
        });

        const merged = Array.from(recordMap.values());
        console.log('✅ Merged records:', merged.length);
        return merged;
    }, [firebaseAttendanceRecords, propAttendanceRecords, pendingUpdates]);

    // Wrapper function to update attendance records (updates parent state if available)
    const setAttendanceRecords = (newRecords: AttendanceRecord[] | ((prev: AttendanceRecord[]) => AttendanceRecord[])) => {
        if (setPropAttendanceRecords) {
            setPropAttendanceRecords(newRecords);
        }
    };

    const salesData = (Array.isArray(firebaseSalesData) && firebaseSalesData.length > 0) ? firebaseSalesData : (propSalesData || []);
    const payrollRecords = propPayrollRecords || [];
    const [operationStatus, setOperationStatus] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'add' | 'edit'>('add');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [viewedEmployee, setViewedEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState({
        id: 0,
        name: '',
        position: '',
        department: '',
        rate: '',
        phone: '',
        email: '',
        bankAccount: '',
        paymentMode: '',
    });
    const [rateHistoryForm, setRateHistoryForm] = useState<RateHistoryEntry[]>([]);
    const [isAddingRateChange, setIsAddingRateChange] = useState(false);
    const [newRateChange, setNewRateChange] = useState({ rate: '', effectiveDate: '', notes: '' });
    const [isScheduleLocked, setIsScheduleLocked] = useState(true);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isScheduleTotalHrsVisible, setScheduleTotalHrsVisible] = useState(false);
    const [isAttendanceTotalHrsVisible, setAttendanceTotalHrsVisible] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const scheduleTableRef = useRef<HTMLDivElement>(null);
    const [editingScheduleContext, setEditingScheduleContext] = useState<{ emp: Employee, dateKey: string, date: Date } | null>(null);
    const [isAttendanceLocked, setIsAttendanceLocked] = useState(true);
    const [editingAttendanceContext, setEditingAttendanceContext] = useState<{ emp: Employee, dateKey: string, date: Date } | null>(null);
    const [isWeekScheduleCreatorOpen, setIsWeekScheduleCreatorOpen] = useState(false);
    const [isEditMode, setIsEditMode] = useState(false);
    const prevEditModeRef = useRef(false);
    const employeesOnEditStartRef = useRef<Employee[]>([]);

    const getEmployeeListKey = (employee: Employee, index: number) => {
        const baseIdentifier = employee?.id ?? employee?.name ?? index;
        return `${baseIdentifier}-${index}`;
    };

    const [scheduleWeekStart, setScheduleWeekStart] = useState(() => getMondayDateString(new Date()));
    const [slideDirection, setSlideDirection] = useState<'left' | 'right' | null>(null);
    const [draggedEmployee, setDraggedEmployee] = useState<number | null>(null);
    const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

    useEffect(() => {
        const isAnyModalOpen = isModalOpen || !!viewedEmployee || !!editingScheduleContext || !!editingAttendanceContext;
        if (isAnyModalOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isModalOpen, viewedEmployee, editingScheduleContext, editingAttendanceContext]);

    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isModalOpen) {
                setIsModalOpen(false);
            }
        };
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsDatePickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    // Auto-save when exiting edit mode
    useEffect(() => {
        const wasInEditMode = prevEditModeRef.current;
        const isNowInEditMode = isEditMode;

        // When entering edit mode, save the current state
        if (!wasInEditMode && isNowInEditMode) {
            employeesOnEditStartRef.current = JSON.parse(JSON.stringify(employees));
            console.log('📝 Entering edit mode, tracking changes...');
        }

        // If we were in edit mode and now we're not, save the changes
        if (wasInEditMode && !isNowInEditMode) {
            const saveChanges = async () => {
                try {
                    // Check if there were any changes
                    const hasChanges = JSON.stringify(employeesOnEditStartRef.current) !== JSON.stringify(employees);

                    if (hasChanges) {
                        await syncEmployees(employees);
                        // Refetch employees from Firebase to ensure we have the latest data
                        await refetchEmployees();
                        console.log('✅ Schedule changes auto-saved when exiting edit mode');
                        setOperationStatus({
                            type: 'success',
                            message: 'Schedule changes saved successfully!'
                        });
                    } else {
                        console.log('ℹ️ No changes detected, skipping auto-save');
                    }
                } catch (error) {
                    console.error('Error auto-saving schedule changes:', error);
                    setOperationStatus({
                        type: 'error',
                        message: 'Failed to save schedule changes. Please try again.'
                    });
                }
            };
            saveChanges();
        }

        // Update the ref for next render
        prevEditModeRef.current = isEditMode;
    }, [isEditMode, employees, syncEmployees, refetchEmployees, setOperationStatus]);

    const weekDates = useMemo(() => {
        const [year, month, day] = scheduleWeekStart.split('-').map(Number);
        const startDate = new Date(Date.UTC(year, month - 1, day));
        const today = new Date();
        const todayUTCString = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().split('T')[0];

        return Array.from({ length: 7 }, (_, i) => {
            const date = new Date(startDate);
            date.setUTCDate(startDate.getUTCDate() + i);
            const dayOfWeek = date.getUTCDay(); // Sunday = 0, Saturday = 6
            return {
                date: date,
                key: date.toISOString(),
                isToday: date.toISOString().split('T')[0] === todayUTCString,
                isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
            };
        });
    }, [scheduleWeekStart]);

    const dateToKey = (date: Date) => date.toISOString().split('T')[0];

    const attendanceRecordsByDate = useMemo(() => {
        const map: Record<string, AttendanceRecord[]> = {};
        for (const record of attendanceRecords) {
            (map[record.date] ||= []).push(record);
        }
        return map;
    }, [attendanceRecords]);

    const dailyScheduleTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const dateInfo of weekDates) {
            const dateKey = dateToKey(dateInfo.date);
            let minutes = 0;
            for (const emp of employees) {
                const schedule = emp.schedule[dateKey];
                if (schedule && !schedule.off && schedule.timeIn && schedule.timeOut) {
                    const inMinutes = timeStringToMinutes(schedule.timeIn);
                    const outMinutes = timeStringToMinutes(schedule.timeOut);
                    if (inMinutes !== null && outMinutes !== null && outMinutes > inMinutes) {
                        minutes += outMinutes - inMinutes;
                    }
                }
            }
            totals[dateKey] = minutes / 60;
        }
        return totals;
    }, [weekDates, employees]);

    const weeklyScheduleTotalHours = useMemo(() => {
        return Object.values(dailyScheduleTotals).reduce((sum: number, hours: number) => {
            return sum + (Number.isFinite(hours) ? hours : 0);
        }, 0);
    }, [dailyScheduleTotals]);

    const dailyAttendanceTotals = useMemo(() => {
        const totals: Record<string, number> = {};
        for (const dateInfo of weekDates) {
            const dateKey = dateToKey(dateInfo.date);
            const recordsForDay = attendanceRecordsByDate[dateKey] || [];
            let minutes = 0;
            for (const record of recordsForDay) {
                if (!record.timeIn || !record.timeOut) continue;
                const timeInMinutes = timeStringToMinutes(record.timeIn);
                const timeOutMinutes = timeStringToMinutes(record.timeOut);
                if (timeInMinutes !== null && timeOutMinutes !== null && timeOutMinutes > timeInMinutes) {
                    minutes += timeOutMinutes - timeInMinutes;
                }
            }
            totals[dateKey] = minutes / 60;
        }
        return totals;
    }, [weekDates, attendanceRecordsByDate]);

    const weeklyAttendanceTotalHours = useMemo(() => {
        return Object.values(dailyAttendanceTotals).reduce((sum: number, hours: number) => {
            return sum + (Number.isFinite(hours) ? hours : 0);
        }, 0);
    }, [dailyAttendanceTotals]);
    
    const handleDateSelect = (dateStr: string) => {
        const selectedDate = new Date(dateStr + 'T00:00:00Z');
        setScheduleWeekStart(getMondayDateString(selectedDate));
        setIsDatePickerOpen(false);
    };

    const openAddModal = () => {
        setModalType('add');
        setSelectedEmployee(null);
        setFormData({
            id: 0,
            name: '',
            position: '',
            department: '',
            rate: '',
            phone: '',
            email: '',
            bankAccount: '',
            paymentMode: '',
        });
        setRateHistoryForm([]);
        setIsAddingRateChange(false);
        setNewRateChange({ rate: '', effectiveDate: '', notes: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (employee: Employee) => {
        setModalType('edit');
        setSelectedEmployee(employee);
        setFormData({
            id: employee.id,
            name: employee.name,
            position: employee.position,
            department: employee.department || '',
            rate: String(employee.rate),
            phone: employee.phone || '',
            email: employee.email || '',
            bankAccount: employee.bankAccount || '',
            paymentMode: employee.paymentMode || '',
        });
        setRateHistoryForm(employee.rateHistory || []);
        setIsAddingRateChange(false);
        setNewRateChange({ rate: '', effectiveDate: '', notes: '' });
        setIsModalOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Drag and drop handlers for employee reordering
    const handleDragStart = (index: number) => {
        setDraggedEmployee(index);
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        setDragOverIndex(index);
    };

    const handleDragLeave = () => {
        setDragOverIndex(null);
    };

    const handleDrop = async (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        if (draggedEmployee === null || draggedEmployee === targetIndex) {
            setDraggedEmployee(null);
            setDragOverIndex(null);
            return;
        }

        // Reorder employees
        const newEmployees = [...employees];
        const [draggedEmp] = newEmployees.splice(draggedEmployee, 1);
        newEmployees.splice(targetIndex, 0, draggedEmp);
        setEmployees(newEmployees);

        // Save to Firebase
        try {
            await syncEmployees(newEmployees);
            console.log('✅ Employee order updated and saved to Firebase');
        } catch (error) {
            console.warn('Could not save employee order to Firebase:', error);
        }

        setDraggedEmployee(null);
        setDragOverIndex(null);
    };

    // Navigate to previous week
    const handlePreviousWeek = () => {
        setSlideDirection('left');
        const [year, month, day] = scheduleWeekStart.split('-').map(Number);
        const currentDate = new Date(Date.UTC(year, month - 1, day));
        currentDate.setUTCDate(currentDate.getUTCDate() - 7);
        setScheduleWeekStart(toISODate(currentDate));
        // Reset direction after animation
        setTimeout(() => setSlideDirection(null), 350);
    };

    // Navigate to next week
    const handleNextWeek = () => {
        setSlideDirection('right');
        const [year, month, day] = scheduleWeekStart.split('-').map(Number);
        const currentDate = new Date(Date.UTC(year, month - 1, day));
        currentDate.setUTCDate(currentDate.getUTCDate() + 7);
        setScheduleWeekStart(toISODate(currentDate));
        // Reset direction after animation
        setTimeout(() => setSlideDirection(null), 350);
    };

    const handleSaveEmployee = async () => {
        if (!formData.name || !formData.position || !formData.rate) {
            alert('Please fill in Name, Position, and Rate.');
            return;
        }

        let updatedEmployees: Employee[] = [];

        if (modalType === 'add') {
            const newEmployee: Employee = {
                id: Date.now(),
                name: formData.name,
                position: formData.position,
                department: formData.department,
                rate: parseFloat(formData.rate) || 0,
                rateHistory: rateHistoryForm.length > 0 ? rateHistoryForm : undefined,
                schedule: {},
                phone: formData.phone,
                email: formData.email,
                bankAccount: formData.bankAccount,
                paymentMode: formData.paymentMode,
            };
            updatedEmployees = [...employees, newEmployee];
            setEmployees(updatedEmployees);
        } else if (selectedEmployee) {
            const newRate = parseFloat(formData.rate) || 0;
            const oldRate = selectedEmployee.rate;
            const rateChanged = newRate !== oldRate;

            updatedEmployees = employees.map(emp =>
                emp.id === selectedEmployee.id
                    ? {
                          ...emp,
                          name: formData.name,
                          position: formData.position,
                          department: formData.department,
                          rate: newRate,
                          rateHistory: rateHistoryForm.length > 0 ? rateHistoryForm : undefined,
                          phone: formData.phone,
                          email: formData.email,
                          bankAccount: formData.bankAccount,
                          paymentMode: formData.paymentMode,
                          // Preserve existing fields like schedule, approvedOvertime, salaryDeductions
                      }
                    : emp
            );
            setEmployees(updatedEmployees);

            // Update payroll records if rate or other employee details changed
            if (payrollRecords && payrollRecords.length > 0 && setPropPayrollRecords) {
                setPropPayrollRecords(
                    payrollRecords.map(record => {
                        if (record.employee.toLowerCase() === selectedEmployee.name.toLowerCase()) {
                            const updatedRecord = { ...record };

                            // Update rate-dependent fields if rate changed
                            if (rateChanged) {
                                const OVERTIME_RATE_MULTIPLIER = 1.25;
                                const newRegularPay = record.regularHours * newRate;
                                const newOvertimePay = record.overtimeHours * newRate * OVERTIME_RATE_MULTIPLIER;
                                const newGrossPay = newRegularPay + newOvertimePay;

                                updatedRecord.rate = newRate;
                                updatedRecord.regularPay = newRegularPay;
                                updatedRecord.overtimePay = newOvertimePay;
                                updatedRecord.grossPay = newGrossPay;
                            }

                            // Update other employee details
                            updatedRecord.position = formData.position;
                            updatedRecord.department = formData.department;
                            updatedRecord.phone = formData.phone;
                            updatedRecord.email = formData.email;
                            updatedRecord.bankAccount = formData.bankAccount;
                            updatedRecord.paymentMode = formData.paymentMode;

                            return updatedRecord;
                        }
                        return record;
                    })
                );
            }
        }

        // Save employee changes to Firebase
        try {
            if (updatedEmployees.length > 0) {
                await syncEmployees(updatedEmployees);
                console.log('✅ Employee changes saved to Firebase');
            }
        } catch (error) {
            console.warn('Could not save employee changes to Firebase:', error);
            alert('Warning: Employee was edited locally but may not have been saved to Firebase.');
        }

        setIsModalOpen(false);
    };
    
    const handleClearAllData = async () => {
        const confirmed = window.confirm('Are you sure you want to clear all employee and attendance data? This action cannot be undone.');
        if (!confirmed) {
            return;
        }

        try {
            setOperationStatus(null);

            await Promise.all([
                employeesService.clearAll(),
                attendanceService.clearAll(),
            ]);

            setEmployees([]);
            if (setPropAttendanceRecords) {
                setPropAttendanceRecords([]);
            }
            if (setManualPaidMinutes) {
                setManualPaidMinutes({});
            }
            if (setManualGhostMinutes) {
                setManualGhostMinutes({});
            }

            setAttendanceDataVersion(prev => prev + 1);
            setOperationStatus({ type: 'success', message: 'All employee and attendance data have been cleared.' });
        } catch (error) {
            console.error('Error clearing employee and attendance data:', error);
            setOperationStatus({ type: 'error', message: 'Failed to clear data. Please try again.' });
        }
    };

    const deleteEmployee = async (employeeId: number) => {
        try {
            // Delete from Firebase
            await employeesService.delete(String(employeeId));
            // Update local state for immediate feedback
            setEmployees(employees.filter(emp => emp.id !== employeeId));
            // Refetch employees from Firebase to ensure UI is in sync
            await refetchEmployees();
            setOperationStatus({ type: 'success', message: 'Employee deleted successfully!' });
        } catch (error) {
            console.error('Error deleting employee:', error);
            setOperationStatus({ type: 'error', message: 'Failed to delete employee. Please try again.' });
        }
    };
    
    const handleSaveSchedules = async () => {
        try {
            // Save all employees to Firebase
            await syncEmployees(employees);
            // Refetch employees from Firebase to ensure we have the latest data
            await refetchEmployees();
            setOperationStatus({ type: 'success', message: 'All schedule changes have been saved!' });
            console.log('✅ Schedule changes saved successfully');
        } catch (error) {
            console.error('Error saving schedule changes:', error);
            setOperationStatus({ type: 'error', message: 'Failed to save schedule changes. Please try again.' });
        }
    };

    const handleEditSchedules = () => {
        setIsScheduleLocked(false);
    };

    const handleCreateWeekSchedule = async (weekStart: Date, schedules: { [employeeId: number]: { [dateKey: string]: Schedule } }) => {
        // Update all employees with the new schedule
        const updatedEmployees = employees.map(emp => {
            const empSchedules = schedules[emp.id] || {};
            return {
                ...emp,
                schedule: {
                    ...emp.schedule,
                    ...empSchedules,
                },
            };
        });

        // Update local state immediately
        setEmployees(updatedEmployees);

        // Save to Firebase
        await syncEmployees(updatedEmployees);

        // Navigate to the created week - use local timezone
        const year = weekStart.getFullYear();
        const month = String(weekStart.getMonth() + 1).padStart(2, '0');
        const day = String(weekStart.getDate()).padStart(2, '0');
        const mondayDateString = `${year}-${month}-${day}`;
        setScheduleWeekStart(mondayDateString);

        setOperationStatus({
            type: 'success',
            message: `Successfully created schedule for the week of ${weekStart.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
        });
        setTimeout(() => setOperationStatus(null), 5000);
    };

    const handleExportSchedule = async () => {
        try {
            // Format time to 12-hour format
            const formatTime = (time: string) => {
                if (!time) return '';
                const [hours, minutes] = time.split(':');
                const hour = parseInt(hours, 10);
                const ampm = hour >= 12 ? 'PM' : 'AM';
                const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
                return `${displayHour}:${minutes} ${ampm}`;
            };

            // Create canvas
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d');
            if (!ctx) return;

            // Excel-like styling with 1080p resolution
            const scale = 3; // High DPI for crisp 1080p output
            const cellWidth = 140 * scale;
            const cellHeight = 35 * scale; // Reduced height
            const headerHeight = 40 * scale; // Reduced header height
            const nameColumnWidth = 180 * scale;
            const totalWidth = nameColumnWidth + (weekDates.length * cellWidth);
            const totalHeight = headerHeight + (employees.length * cellHeight);

            canvas.width = totalWidth;
            canvas.height = totalHeight;

            // White background (Excel-like)
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, totalWidth, totalHeight);

            // Set font (scaled) - Apple-style font
            ctx.font = `${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;

            // Draw header row
            ctx.fillStyle = '#4472C4'; // Excel blue
            ctx.fillRect(0, 0, totalWidth, headerHeight);

            // Header text - Employee
            ctx.fillStyle = '#FFFFFF';
            ctx.font = `600 ${14 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('EMPLOYEE', nameColumnWidth / 2, headerHeight / 2);

            // Draw vertical line after employee column
            ctx.strokeStyle = '#FFFFFF';
            ctx.lineWidth = 2 * scale;
            ctx.beginPath();
            ctx.moveTo(nameColumnWidth, 0);
            ctx.lineTo(nameColumnWidth, headerHeight);
            ctx.stroke();

            // Header text - Days
            weekDates.forEach((dateInfo, idx) => {
                const x = nameColumnWidth + (idx * cellWidth);
                const dayStr = dateInfo.date.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
                const dateStr = dateInfo.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit' });

                // Draw vertical line
                ctx.strokeStyle = '#FFFFFF';
                ctx.lineWidth = 2 * scale;
                ctx.beginPath();
                ctx.moveTo(x, 0);
                ctx.lineTo(x, headerHeight);
                ctx.stroke();

                // Draw day text
                ctx.fillStyle = '#FFFFFF';
                ctx.font = `600 ${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
                ctx.fillText(dayStr, x + cellWidth / 2, headerHeight / 2 - (10 * scale));
                ctx.font = `${11 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
                ctx.fillText(dateStr, x + cellWidth / 2, headerHeight / 2 + (10 * scale));
            });

            // Draw employee rows
            employees.forEach((emp, empIdx) => {
                const y = headerHeight + (empIdx * cellHeight);

                // Alternating row colors (Excel-like)
                ctx.fillStyle = empIdx % 2 === 0 ? '#FFFFFF' : '#F2F2F2';
                ctx.fillRect(0, y, totalWidth, cellHeight);

                // Draw horizontal line
                ctx.strokeStyle = '#D0D0D0';
                ctx.lineWidth = 1 * scale;
                ctx.beginPath();
                ctx.moveTo(0, y);
                ctx.lineTo(totalWidth, y);
                ctx.stroke();

                // Employee name
                ctx.fillStyle = '#000000';
                ctx.font = `600 ${13 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
                ctx.textAlign = 'left';
                ctx.fillText(emp.name, 10 * scale, y + cellHeight / 2);

                // Draw vertical line after name
                ctx.strokeStyle = '#D0D0D0';
                ctx.lineWidth = 1 * scale;
                ctx.beginPath();
                ctx.moveTo(nameColumnWidth, y);
                ctx.lineTo(nameColumnWidth, y + cellHeight);
                ctx.stroke();

                // Schedule cells
                weekDates.forEach((dateInfo, dayIdx) => {
                    const x = nameColumnWidth + (dayIdx * cellWidth);
                    const dateKey = dateToKey(dateInfo.date);
                    const schedule = emp.schedule[dateKey];

                    // Draw vertical line
                    ctx.strokeStyle = '#D0D0D0';
                    ctx.lineWidth = 1 * scale;
                    ctx.beginPath();
                    ctx.moveTo(x, y);
                    ctx.lineTo(x, y + cellHeight);
                    ctx.stroke();

                    ctx.textAlign = 'center';
                    if (schedule?.off) {
                        ctx.fillStyle = '#000000';
                        ctx.font = `600 ${12 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
                        ctx.fillText('OFF', x + cellWidth / 2, y + cellHeight / 2);
                    } else if (schedule?.timeIn && schedule?.timeOut) {
                        ctx.fillStyle = '#2C3E50';
                        ctx.font = `${10 * scale}px -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`;
                        const timeText = `${formatTime(schedule.timeIn)} - ${formatTime(schedule.timeOut)}`;
                        ctx.fillText(timeText, x + cellWidth / 2, y + cellHeight / 2);
                    }
                });
            });

            // Draw bottom border
            ctx.strokeStyle = '#D0D0D0';
            ctx.lineWidth = 1 * scale;
            ctx.beginPath();
            ctx.moveTo(0, totalHeight);
            ctx.lineTo(totalWidth, totalHeight);
            ctx.stroke();

            // Draw right border
            ctx.beginPath();
            ctx.moveTo(totalWidth, 0);
            ctx.lineTo(totalWidth, totalHeight);
            ctx.stroke();

            // Convert to blob and download
            canvas.toBlob((blob) => {
                if (!blob) {
                    alert('Failed to generate image. Please try again.');
                    return;
                }

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');

                const weekStart = weekDates[0].date;
                const weekEnd = weekDates[6].date;
                const fileName = `schedule_${weekStart.toISOString().split('T')[0]}_to_${weekEnd.toISOString().split('T')[0]}.png`;

                link.setAttribute('href', url);
                link.setAttribute('download', fileName);
                link.style.visibility = 'hidden';
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                URL.revokeObjectURL(url);

                console.log('✅ Schedule exported successfully as PNG');
            }, 'image/png');
        } catch (error) {
            console.error('Error exporting schedule:', error);
            alert('Failed to export schedule. Please try again.');
        }
    };

    const handleOpenScheduleModal = (emp: Employee, dateKey: string, date: Date) => {
        setEditingScheduleContext({ emp, dateKey, date });
    };

    const handleSaveScheduleFromModal = async (newScheduleData: Schedule) => {
        if (!editingScheduleContext) return;
        const { emp, dateKey } = editingScheduleContext;

        // Update local state immediately
        const updatedEmployees = employees.map(e => {
            if (e.id === emp.id) {
                const newSchedule = { ...e.schedule, [dateKey]: newScheduleData };
                return { ...e, schedule: newSchedule };
            }
            return e;
        });

        setEmployees(updatedEmployees);

        // Close modal immediately
        setEditingScheduleContext(null);

        // Save to Firebase and refetch to ensure persistence
        try {
            await syncEmployees(updatedEmployees);
            // Add a small delay to ensure Firebase has completed the write
            await new Promise(resolve => setTimeout(resolve, 500));
            // Refetch employees to confirm data persisted
            await refetchEmployees();
        } catch (error) {
            console.error('Error saving schedule:', error);
        }
    };
    
    const handleOpenAttendanceModal = (emp: Employee, dateKey: string, date: Date) => {
        setEditingAttendanceContext({ emp, dateKey, date });
    };

    const handleSaveAttendanceFromModal = async (newAttendanceData: { timeIn: string; timeOut: string; }) => {
        if (!editingAttendanceContext) return;
        const { emp, dateKey } = editingAttendanceContext;

        const recordToSave: AttendanceRecord = {
            employee: emp.name,
            date: dateKey,
            timeIn: newAttendanceData.timeIn,
            timeOut: newAttendanceData.timeOut,
        };

        console.log('💾 Saving attendance:', { emp: emp.name, dateKey, recordToSave });

        // Close modal immediately
        setEditingAttendanceContext(null);

        // Add to pending updates immediately for instant UI feedback
        const updateKey = `${emp.name.toLowerCase()}_${dateKey}`;
        console.log('🔑 Update key:', updateKey);

        setPendingUpdates(prev => {
            const newMap = new Map(prev);
            newMap.set(updateKey, recordToSave);
            console.log('📝 Pending updates after set:', newMap.size, Array.from(newMap.keys()));
            return newMap;
        });

        // Also update prop state for backward compatibility
        if (setPropAttendanceRecords) {
            setPropAttendanceRecords(prevRecords => {
                const existingRecordIndex = prevRecords.findIndex(
                    r => r.employee.toLowerCase() === emp.name.toLowerCase() && r.date === dateKey
                );

                const updatedRecords = [...prevRecords];

                if (!newAttendanceData.timeIn && !newAttendanceData.timeOut) {
                    if (existingRecordIndex > -1) {
                        updatedRecords.splice(existingRecordIndex, 1);
                    }
                } else {
                    const newRecord: AttendanceRecord = {
                        employee: emp.name,
                        date: dateKey,
                        timeIn: newAttendanceData.timeIn,
                        timeOut: newAttendanceData.timeOut,
                    };
                    if (existingRecordIndex > -1) {
                        updatedRecords[existingRecordIndex] = newRecord;
                    } else {
                        updatedRecords.push(newRecord);
                    }
                }
                return updatedRecords;
            });
        }

        // Save to Firebase in the background
        try {
            console.log('🔥 Starting Firebase save...');
            await updateSingleAttendance(recordToSave);
            console.log('✅ Firebase save complete');

            // Small delay to ensure Firebase has processed the write
            await new Promise(resolve => setTimeout(resolve, 500));

            // Refetch attendance records from Firebase to ensure we have the latest data
            await refetchAttendance();
            console.log('🔄 Attendance records refetched');

            // Clear pending update after successful save and refetch
            setPendingUpdates(prev => {
                const newMap = new Map(prev);
                newMap.delete(updateKey);
                console.log('🧹 Cleared pending update for:', updateKey);
                return newMap;
            });
        } catch (error) {
            console.error('❌ Error saving attendance:', error);
            // Keep in pending updates on error so user can retry
        }
    };
    
    const convertTo24Hour = (timeStr: string): string => {
        if (!timeStr || timeStr.toUpperCase() === 'OFF') return '';
        
        const time = timeStr.trim().toUpperCase();
        const match = time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/);

        if (match) {
            let [_, hours, minutes, period] = match;
            let h = parseInt(hours, 10);

            if (period === 'PM' && h < 12) h += 12;
            if (period === 'AM' && h === 12) h = 0;
            
            return `${String(h).padStart(2, '0')}:${minutes}`;
        }
        return timeStr;
    };

    const handleScheduleUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            const text = e.target?.result as string;
            await parseScheduleCSV(text);
            event.target.value = '';
        };
        reader.readAsText(file);
    };

    const parseScheduleCSV = async (csvText: string) => {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 5) {
            alert("Invalid CSV format. It should have at least 5 rows (including headers and employee data).");
            return;
        }
    
        const dateRow = lines[1].split(',');
        const dateMap: { [key: number]: string } = {};
    
        const parseDateFromCSV = (dateStr: string): Date | null => {
            const cleanedDateStr = dateStr.trim();
            const parts = cleanedDateStr.split('/');
            if (parts.length === 3) {
                const month = parseInt(parts[0], 10);
                const day = parseInt(parts[1], 10);
                const year = parseInt(parts[2], 10);
                if (!isNaN(month) && !isNaN(day) && !isNaN(year) && year > 1900) {
                    const date = new Date(Date.UTC(year, month - 1, day));
                    if (date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day) {
                        return date;
                    }
                }
            }
            return null;
        };
        
        dateRow.forEach((dateStr, index) => {
            if (dateStr.trim()) {
                const date = parseDateFromCSV(dateStr.trim());
                if (date) {
                    const year = date.getUTCFullYear();
                    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
                    const day = String(date.getUTCDate()).padStart(2, '0');
                    dateMap[index] = `${year}-${month}-${day}`;
                }
            }
        });

        if (Object.keys(dateMap).length === 0) {
            alert("Could not parse any dates from the CSV file. Please check the date format (MM/DD/YYYY) in the second row.");
            return;
        }
    
        let updatedEmployees = [...employees];
        let createdCount = 0;
        let updatedCount = 0;
    
        const employeeRows = lines.slice(4);
    
        employeeRows.forEach(line => {
            const values = line.split(',').map(v => v.trim());
            const employeeName = values[0];
            if (!employeeName) return;
    
            let employeeIndex = updatedEmployees.findIndex(e => e.name.toLowerCase() === employeeName.toLowerCase());
            let employee: Employee;
    
            if (employeeIndex === -1) {
                employee = { id: Date.now() + Math.random(), name: employeeName, position: 'Staff', rate: 0, schedule: {} };
                createdCount++;
            } else {
                employee = { ...updatedEmployees[employeeIndex], schedule: JSON.parse(JSON.stringify(updatedEmployees[employeeIndex].schedule)) };
                updatedCount++;
            }
    
            Object.keys(dateMap).forEach(key => {
                const colIndex = parseInt(key, 10);
                const dateKey = dateMap[colIndex];
                if (dateKey) {
                    // Check if schedule already exists for this date - if so, preserve it
                    const existingSchedule = employee.schedule[dateKey];
                    if (existingSchedule && (existingSchedule.timeIn || existingSchedule.timeOut || existingSchedule.off)) {
                        // Schedule already exists for this date - skip to preserve manual edits
                        return;
                    }

                    const timeIn = values[colIndex] || '';
                    const timeOut = values[colIndex + 1] || '';

                    if (timeIn.toUpperCase() === 'OFF') {
                        employee.schedule[dateKey] = { timeIn: '', timeOut: '', off: true };
                    } else if (timeIn && timeOut) {
                        employee.schedule[dateKey] = { timeIn: convertTo24Hour(timeIn), timeOut: convertTo24Hour(timeOut), off: false };
                    } else {
                        employee.schedule[dateKey] = { timeIn: '', timeOut: '', off: false };
                    }
                }
            });
            
            if (employeeIndex === -1) {
                updatedEmployees.push(employee);
            } else {
                updatedEmployees[employeeIndex] = employee;
            }
        });
    
        setEmployees(updatedEmployees);

        // Clear old attendance records when uploading a new schedule
        // This prevents confusion between schedule and attendance data
        if (setPropAttendanceRecords) {
            setPropAttendanceRecords([]);
        }

        // Clear from Firebase and save the new schedule
        try {
            // Clear old attendance records
            await attendanceService.clearAll();

            // Save the updated employees with schedules to Firebase
            await syncEmployees(updatedEmployees);

            console.log('✅ Schedule uploaded and saved to Firebase');
        } catch (error) {
            console.warn('Could not complete schedule upload to Firebase:', error);
            alert('Warning: Schedule was imported locally but may not have been saved to Firebase. Click "Save Schedules" to ensure they are persisted.');
        }

        setIsScheduleLocked(true);
        alert(`Schedule import complete!\n\n${updatedCount} existing employees updated.\n${createdCount} new employees created.\n\nSchedule has been saved to database. Upload attendance CSV separately.`);
    };

    const handleAttendanceUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            const text = e.target?.result as string;
            parseAttendanceCSV(text);
            event.target.value = '';
        };
        reader.readAsText(file);
    };

    const parseAttendanceCSV = async (csvText: string) => {
        const lines = csvText.split('\n').filter(line => line.trim() !== '');
        if (lines.length < 2) {
            alert("Invalid Attendance CSV. It must contain a header row and at least one data row.");
            return;
        }

        let headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
        headers[0] = headers[0].replace(/^\uFEFF/, '');
        
        const staffIndex = headers.indexOf('Staff');
        const inDateIndex = headers.indexOf('In Date');
        const inTimeIndex = headers.indexOf('In Time');
        const outTimeIndex = headers.indexOf('Out time');

        if (staffIndex === -1 || inDateIndex === -1 || inTimeIndex === -1 || outTimeIndex === -1) {
            alert("CSV is missing required headers: 'Staff', 'In Date', 'In Time', 'Out time'.");
            return;
        }
        
        const newRecords: AttendanceRecord[] = [];
        lines.slice(1).forEach(line => {
            const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
            const employee = values[staffIndex];
            const date = values[inDateIndex];
            const timeIn = values[inTimeIndex];

            if (employee && date && timeIn) {
                newRecords.push({
                    employee,
                    date,
                    timeIn,
                    timeOut: values[outTimeIndex] || '',
                });
            }
        });

        // Save to Firebase (only adds new records, skips duplicates)
        try {
            await batchUploadAttendance(newRecords);

            // Refresh Firebase data to get the updated records
            setAttendanceDataVersion(prev => prev + 1);

            // Show success message (actual count logged in console by service)
            alert(`Attendance records processed successfully. Check console for details on new vs existing records.`);
        } catch (error) {
            console.error('Error uploading attendance records:', error);
            alert('Failed to save attendance records to database. Please try again.');
        }
    };

    const handlePaidHoursUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = e => {
            const text = e.target?.result;
            if (typeof text === 'string') {
                parsePaidHoursCSV(text);
            }
            event.target.value = '';
        };
        reader.readAsText(file);
    };

    const parsePaidHoursCSV = (csvText: string) => {
        const parsed = parsePaidHoursCsv(csvText);
        if (Object.keys(parsed.paidMinutesByDate).length === 0) {
            alert('No paid hours data found in the CSV.');
            return;
        }
        const { manualPaidMinutes: mappedPaid, manualGhostMinutes: mappedGhost } = mapPaidHoursToEmployees(parsed, employees);
        setManualPaidMinutes(mappedPaid);
        setManualGhostMinutes(mappedGhost);
        alert(`Paid hours imported for ${Object.keys(mappedPaid).length} days.`);
    };

    const clearManualPaidHours = () => {
        setManualPaidMinutes({});
        setManualGhostMinutes({});
        alert('Paid hours overrides cleared.');
    };

    const formatTimeForDisplay = (time: string) => {
        if (!time) return 'Not Set';
        const [hours, minutes] = time.split(':');
        const h = parseInt(hours, 10);
        if (isNaN(h)) return 'Not Set';

        const ampm = h >= 12 ? 'PM' : 'AM';
        const formattedHour = h % 12 || 12;
        return `${String(formattedHour).padStart(2, '0')}:${minutes} ${ampm}`;
    };

    const formatTime12Hour = (timeStr: string): string => {
        if (!timeStr || timeStr === 'Not Set') return 'Not Set';
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
            return `${String(hours).padStart(2,'0')}:${minutesStr} ${ampm}`;
        }
        return timeStr;
    };
    
    function timeStringToMinutes(timeStr: string): number | null {
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

        const twentyFourHourMatch = normalizedTime.match(/^(\d{1,2}):(\d{2})$/);
        if (twentyFourHourMatch) {
            const hours = parseInt(twentyFourHourMatch[1], 10);
            const minutes = parseInt(twentyFourHourMatch[2], 10);
            return hours * 60 + minutes;
        }

        return null;
    }

    const handleUpdateEmployee = async (updatedEmployee: Employee) => {
        // Update local state immediately for instant UI feedback
        setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
        if (viewedEmployee && viewedEmployee.id === updatedEmployee.id) {
            setViewedEmployee(updatedEmployee);
        }

        // Save to Firebase in the background
        try {
            await employeesService.update(String(updatedEmployee.id), updatedEmployee);
            console.log('✅ Employee updated in Firebase:', updatedEmployee.name);
        } catch (error) {
            console.error('❌ Error updating employee in Firebase:', error);
            alert('Warning: Changes were made locally but may not have been saved to Firebase. Please try again.');
        }
    };

    const handleUpdateAttendance = (updatedRecords: AttendanceRecord[]) => {
        setAttendanceRecords(updatedRecords);
    };

    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));

    // Show loading state
    if (attendanceLoading) {
        return (
            <div className="fixed inset-0 flex items-center justify-center">
                <LoadingSpinner message="Loading attendance records..." />
            </div>
        );
    }

    // Show error state
    if (attendanceError) {
        return (
            <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
                <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
                    <p className="text-red-500 font-medium">Error loading attendance records</p>
                    <p className="text-text-secondary text-sm mt-1">{attendanceError}</p>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
            {/* Operation Status Messages */}
            {operationStatus && (
                <div className={`p-4 rounded-lg border ${
                    operationStatus.type === 'success'
                        ? 'bg-green-500/10 border-green-500/30'
                        : 'bg-red-500/10 border-red-500/30'
                }`}>
                    <p className={operationStatus.type === 'success' ? 'text-green-500' : 'text-red-500'}>
                        {operationStatus.message}
                    </p>
                </div>
            )}
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary">Employee Management</h2>
                        <p className="text-sm text-text-secondary mt-0.5">{employees.length} {employees.length === 1 ? 'employee' : 'employees'} registered</p>
                    </div>
                     <div className="flex items-center gap-2">
                        <button onClick={handleClearAllData} className="flex items-center gap-1.5 bg-accent-red/10 text-accent-red px-3 py-2 rounded-lg font-medium text-xs hover:bg-accent-red/20 transition border border-accent-red/20">
                            <TrashIcon className="w-4 h-4" />
                            <span className="hidden sm:inline">Clear All</span>
                        </button>
                        <button onClick={openAddModal} className="flex items-center gap-1.5 bg-accent-blue text-white px-4 py-2 rounded-lg font-semibold text-xs shadow-lg shadow-accent-blue/30 hover:bg-opacity-90 transition hover:scale-105">
                            <PlusIcon className="w-4 h-4" />
                            Add Employee
                        </button>
                    </div>
                </div>
                <div className="bg-gradient-to-br from-bg-secondary to-bg-tertiary/30 rounded-xl border border-border-color p-6 shadow-sm">
                   <div className="relative">
                     <div className="grid grid-cols-[repeat(auto-fill,minmax(80px,1fr))] gap-6 justify-items-center">
                         {employees.length > 0 ? employees.map((emp, empIndex) => {
                            const employeeKey = getEmployeeListKey(emp, empIndex);
                            return (
                            <div
                                key={employeeKey}
                                draggable
                                onDragStart={() => handleDragStart(empIndex)}
                                onDragOver={(e) => handleDragOver(e, empIndex)}
                                onDragLeave={handleDragLeave}
                                onDrop={(e) => handleDrop(e, empIndex)}
                                className={`relative flex flex-col items-center group w-full max-w-[90px] cursor-move transition-all ${draggedEmployee === empIndex ? 'opacity-50 scale-95' : ''} ${dragOverIndex === empIndex ? 'scale-105 ring-2 ring-accent-blue rounded-lg' : ''}`}
                            >
                               <button
                                    onClick={() => setViewedEmployee(emp)}
                                    className="relative w-16 h-16 rounded-full bg-gradient-to-br from-accent-blue/20 to-accent-blue/10 text-accent-blue flex items-center justify-center font-bold text-xl transition-all hover:scale-110 hover:shadow-xl hover:shadow-accent-blue/40 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-secondary focus:ring-accent-blue border-2 border-accent-blue/30"
                                >
                                    {emp.name.charAt(0).toUpperCase()}
                                </button>
                                <p className="mt-2 text-xs font-semibold text-text-primary text-center truncate w-full group-hover:text-accent-blue transition-colors">{emp.name}</p>
                                <p className="text-[10px] text-text-secondary text-center truncate w-full capitalize mt-0.5">{emp.position}</p>
                            </div>
                         )}) : (
                             <div className="col-span-full flex flex-col items-center justify-center py-8 text-text-secondary w-full">
                                <PlusIcon className="w-10 h-10 mb-2 opacity-30" />
                                <p className="text-sm font-medium">No employees added yet</p>
                                <p className="text-xs mt-1 opacity-70">Click "Add Employee" to get started</p>
                             </div>
                         )}
                       </div>
                   </div>
                </div>
            </div>

            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-3">
                    <div>
                        <h2 className="text-2xl font-bold text-text-primary">Schedule & Attendance</h2>
                        <p className="text-sm text-text-secondary mt-0.5">View schedules and actual attendance together</p>
                    </div>
                     <div className="flex items-center gap-1 flex-wrap justify-start w-full sm:w-auto">
                        {/* Previous Week Button */}
                        <button
                            onClick={handlePreviousWeek}
                            className="w-8 h-8 rounded-md bg-bg-tertiary border border-border-color hover:bg-hover-bg hover:border-accent-blue/30 transition flex items-center justify-center text-text-secondary hover:text-text-primary group"
                            title="Previous week"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
                            </svg>
                        </button>

                        <div className="relative" ref={datePickerRef}>
                             <button
                                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                className="flex items-center gap-1.5 bg-bg-tertiary border border-border-color rounded-md py-1.5 px-3 text-xs font-medium hover:bg-hover-bg transition"
                            >
                                <CalendarDaysIcon className="w-3.5 h-3.5 text-text-secondary" />
                                <span className={slideDirection === 'left' ? 'date-slide-left' : slideDirection === 'right' ? 'date-slide-right' : ''}>{new Date(scheduleWeekStart + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>
                            </button>
                            {isDatePickerOpen && (
                                <DatePickerPopup
                                    initialDate={scheduleWeekStart}
                                    onDateSelect={handleDateSelect}
                                />
                            )}
                        </div>

                        {/* Next Week Button */}
                        <button
                            onClick={handleNextWeek}
                            className="w-8 h-8 rounded-md bg-bg-tertiary border border-border-color hover:bg-hover-bg hover:border-accent-blue/30 transition flex items-center justify-center text-text-secondary hover:text-text-primary group"
                            title="Next week"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
                            </svg>
                        </button>
                        <button
                            onClick={() => setIsEditMode(!isEditMode)}
                            className={`px-3 py-1.5 rounded-md font-medium text-xs transition flex items-center gap-1.5 ${
                                isEditMode
                                    ? 'bg-accent-blue text-white hover:bg-opacity-90'
                                    : 'bg-bg-tertiary border border-border-color text-text-primary hover:bg-hover-bg'
                            }`}
                        >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                            </svg>
                            <span className="hidden sm:inline">{isEditMode ? 'Exit Edit' : 'Edit Mode'}</span>
                        </button>
                        {isEditMode && (
                            <button
                                onClick={handleSaveSchedules}
                                className="bg-accent-green text-white px-3 py-1.5 rounded-md font-medium text-xs hover:bg-accent-green/90 transition flex items-center gap-1.5"
                            >
                                <CheckIcon className="w-3.5 h-3.5" />
                                <span className="hidden sm:inline">Save Changes</span>
                            </button>
                        )}
                        <button
                            onClick={handleExportSchedule}
                            className="bg-bg-tertiary border border-border-color text-text-primary px-3 py-1.5 rounded-md font-medium text-xs hover:bg-hover-bg transition flex items-center gap-1.5"
                        >
                            <DownloadIcon className="w-3.5 h-3.5"/>
                            <span className="hidden sm:inline">Export Schedule</span>
                        </button>
                        <label htmlFor="attendance-csv-input" className="cursor-pointer bg-accent-blue text-white px-3 py-1.5 rounded-md font-medium text-xs hover:bg-opacity-90 transition flex items-center gap-1.5">
                            <UploadIcon className="w-3.5 h-3.5"/>
                            <span className="hidden sm:inline">Attendance CSV</span>
                        </label>
                        <input type="file" id="attendance-csv-input" accept=".csv" className="hidden" onChange={handleAttendanceUpload} />
                        <button
                            onClick={() => setIsWeekScheduleCreatorOpen(true)}
                            className="bg-accent-blue text-white px-3 py-1.5 rounded-md font-medium text-xs hover:bg-opacity-90 transition flex items-center gap-1.5"
                        >
                            <PlusIcon className="w-3.5 h-3.5"/>
                            <span className="hidden sm:inline">Create Schedule</span>
                        </button>
                    </div>
                </div>
                <div className="relative" ref={scheduleTableRef}>
                    <div className={`bg-bg-secondary rounded-xl border overflow-hidden transition-all duration-300 ${slideDirection === 'left' ? 'table-slide-left' : slideDirection === 'right' ? 'table-slide-right' : ''} ${!isScheduleLocked ? 'border-accent-blue ring-2 ring-accent-blue/30' : 'border-border-color'}`}>
                        {/* Desktop Table View */}
                        <div className="overflow-x-auto hidden lg:block">
                            <table className="w-full border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-gradient-to-r from-bg-tertiary/50 to-bg-tertiary/30">
                                        <th className="px-3 py-2.5 text-left text-xs font-bold text-text-secondary sticky left-0 bg-gradient-to-r from-bg-tertiary/50 to-bg-tertiary/30 z-10 w-32 uppercase tracking-wide">Employee</th>
                                        {weekDates.map(dateInfo => (
                                            <th key={dateInfo.key} className={`px-2 py-2.5 text-center text-[10px] font-bold uppercase tracking-wider border-l border-border-color transition-colors ${dateInfo.isToday ? 'bg-accent-blue/10 text-accent-blue' : 'text-text-secondary'} ${dateInfo.isWeekend ? 'bg-bg-tertiary/40' : ''}`}>
                                                {dateInfo.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()}
                                                <div className="font-medium text-[9px] mt-0.5">{dateInfo.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', timeZone: 'UTC' })}</div>
                                            </th>
                                        ))}
                                        <th className={`text-center text-xs font-bold text-text-secondary uppercase border-l border-border-color transition-all duration-300 ease-in-out ${isScheduleTotalHrsVisible ? 'w-24 px-2 py-2.5' : 'w-0 p-0'}`}>
                                            <div className={`whitespace-nowrap overflow-hidden tracking-wide ${isScheduleTotalHrsVisible ? 'opacity-100' : 'opacity-0'}`}>
                                                Total Hrs
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-color">
                                   {employees.length > 0 ? (
                                       employees.map((emp, empIndex) => {
                                            const employeeKey = getEmployeeListKey(emp, empIndex);
                                            const totalScheduledHours = weekDates.reduce((total, dateInfo) => {
                                                const currentDayKey = dateToKey(dateInfo.date);
                                                const schedule = emp.schedule[currentDayKey];
                                                if (schedule && !schedule.off && schedule.timeIn && schedule.timeOut) {
                                                    const timeInMinutes = timeStringToMinutes(schedule.timeIn);
                                                    const timeOutMinutes = timeStringToMinutes(schedule.timeOut);
                                                    if (timeInMinutes !== null && timeOutMinutes !== null) {
                                                        total += (timeOutMinutes - timeInMinutes);
                                                    }
                                                }
                                                return total;
                                            }, 0) / 60;

                                            return (
                                                <tr
                                                    key={employeeKey}
                                                    draggable={!isScheduleLocked}
                                                    onDragStart={() => !isScheduleLocked && handleDragStart(empIndex)}
                                                    onDragOver={(e) => !isScheduleLocked && handleDragOver(e, empIndex)}
                                                    onDragLeave={handleDragLeave}
                                                    onDrop={(e) => !isScheduleLocked && handleDrop(e, empIndex)}
                                                    className={`group/row transition-colors border-b border-border-color/50 ${!isScheduleLocked ? 'employee-row-draggable' : ''} ${draggedEmployee === empIndex ? 'employee-row-dragging' : ''} ${dragOverIndex === empIndex ? 'employee-row-drag-over' : 'hover:bg-hover-bg/30'}`}
                                                >
                                                    <td className="px-3 py-2.5 font-semibold text-sm sticky left-0 bg-bg-secondary group-hover/row:bg-hover-bg/30 z-10 w-32">{emp.name}</td>
                                                    {weekDates.map(dateInfo => {
                                                        const currentDayKey = dateToKey(dateInfo.date);
                                                        const schedule = emp.schedule[currentDayKey];
                                                        const record = attendanceRecords.find(r => r.employee.toLowerCase() === emp.name.toLowerCase() && r.date === currentDayKey);
                                                        const cellClasses = `text-center border-l border-border-color/50 ${dateInfo.isToday ? 'bg-accent-blue/5' : ''} ${dateInfo.isWeekend ? 'bg-bg-tertiary/10' : ''}`;
                                                        const isFuture = dateInfo.date > todayUTC;

                                                        const renderCombinedContent = (editable: 'none' | 'schedule' | 'attendance' = 'none') => {
                                                            if (schedule?.off) {
                                                                return (
                                                                    <div className="flex flex-col items-center justify-center py-2">
                                                                        <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-bg-tertiary/70 text-text-secondary font-bold text-xs uppercase">OFF</span>
                                                                    </div>
                                                                );
                                                            }

                                                            // Render schedule line
                                                            const scheduleDisplay = schedule?.timeIn && schedule?.timeOut
                                                                ? `${formatTimeForDisplay(schedule.timeIn)} - ${formatTimeForDisplay(schedule.timeOut)}`
                                                                : '-';

                                                            // Render attendance line
                                                            let attendanceDisplay = '-';
                                                            let attendanceColorClass = 'text-text-secondary/50';

                                                            if (record?.timeIn) {
                                                                const timeOutDisplay = record.timeOut ? ` - ${formatTime12Hour(record.timeOut)}` : '';
                                                                attendanceDisplay = `${formatTime12Hour(record.timeIn)}${timeOutDisplay}`;

                                                                // Color code based on punctuality
                                                                if (record.timeIn && schedule?.timeIn) {
                                                                    const scheduledMinutes = timeStringToMinutes(schedule.timeIn);
                                                                    const actualMinutes = timeStringToMinutes(record.timeIn);
                                                                    if (scheduledMinutes !== null && actualMinutes !== null) {
                                                                        if (actualMinutes > scheduledMinutes) {
                                                                            attendanceColorClass = 'text-accent-red';
                                                                        } else {
                                                                            attendanceColorClass = 'text-accent-green';
                                                                        }
                                                                    }
                                                                }
                                                            } else if (schedule?.timeIn && !isFuture) {
                                                                // Highlight absences without adding an extra label
                                                                attendanceColorClass = 'text-accent-red';
                                                            }

                                                            const attendanceTextClass =
                                                                record?.timeIn || (schedule?.timeIn && !isFuture)
                                                                    ? attendanceColorClass
                                                                    : 'text-text-secondary/50';

                                                            return (
                                                                <div className="flex flex-col items-center justify-center py-2 gap-1">
                                                                    <div className={`text-xs leading-tight font-semibold ${attendanceTextClass}`}>
                                                                        {attendanceDisplay}
                                                                    </div>
                                                                    <div className={`text-xs leading-tight font-medium ${editable === 'schedule' ? 'text-text-primary' : 'text-text-secondary/80'}`}>
                                                                        {scheduleDisplay}
                                                                    </div>
                                                                </div>
                                                            );
                                                        };

                                                        const isEditing = !isScheduleLocked || !isAttendanceLocked;
                                                        const highlightMode: 'none' | 'schedule' | 'attendance' =
                                                            !isScheduleLocked && isAttendanceLocked
                                                                ? 'schedule'
                                                                : isScheduleLocked && !isAttendanceLocked
                                                                    ? 'attendance'
                                                                    : 'none';

                                                        return (
                                                            <td
                                                                key={`${emp.id}-${currentDayKey}`}
                                                                className={`${cellClasses} ${isEditMode ? 'p-1' : 'p-0'} align-middle`}
                                                            >
                                                                <div className={`flex flex-col items-center justify-center ${isEditMode ? 'gap-1 px-1 py-1' : 'px-1 py-1'}`}>
                                                                    {renderCombinedContent(highlightMode)}

                                                                    {/* Edit buttons - only show in edit mode */}
                                                                    {isEditMode && (
                                                                        <div className="flex flex-col gap-0.5 w-full">
                                                                            <button
                                                                                onClick={() => handleOpenScheduleModal(emp, currentDayKey, dateInfo.date)}
                                                                                className="w-full text-center bg-accent-orange/10 border border-accent-orange/30 rounded-md hover:bg-accent-orange/20 transition-all px-1 py-0.5 text-[9px] text-accent-orange font-semibold"
                                                                            >
                                                                                Edit Schedule
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleOpenAttendanceModal(emp, currentDayKey, dateInfo.date)}
                                                                                className="w-full text-center bg-accent-blue/10 border border-accent-blue/30 rounded-md hover:bg-accent-blue/20 transition-all px-1 py-0.5 text-[9px] text-accent-blue font-semibold"
                                                                            >
                                                                                Edit Attendance
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className={`text-center text-xs font-bold border-l border-border-color/50 transition-all duration-300 ${isScheduleTotalHrsVisible ? 'px-2 py-2.5' : 'p-0 w-0'}`}>
                                                        <div className={`transition-opacity duration-150 whitespace-nowrap overflow-hidden ${isScheduleTotalHrsVisible ? 'opacity-100' : 'opacity-0'}`}>
                                                            {(() => {
                                                                const totalAttendedHours = weekDates.reduce((total, dateInfo) => {
                                                                    const currentDayKey = dateToKey(dateInfo.date);
                                                                    const record = attendanceRecords.find((r: AttendanceRecord) => r.employee.toLowerCase() === emp.name.toLowerCase() && r.date === currentDayKey);
                                                                    if (record && record.timeIn && record.timeOut) {
                                                                        const timeInMinutes = timeStringToMinutes(record.timeIn);
                                                                        const timeOutMinutes = timeStringToMinutes(record.timeOut);
                                                                        if (timeInMinutes !== null && timeOutMinutes !== null) {
                                                                            total += (timeOutMinutes - timeInMinutes);
                                                                        }
                                                                    }
                                                                    return total;
                                                                }, 0) / 60;

                                                                return (
                                                                    <div className="flex flex-col items-center gap-1">
                                                                        <div className="text-xs text-text-secondary/60">
                                                                            {totalScheduledHours > 0 ? `${totalScheduledHours.toFixed(1)}h` : '-'}
                                                                        </div>
                                                                        <div className="text-xs font-bold text-accent-blue">
                                                                            {totalAttendedHours > 0 ? `${totalAttendedHours.toFixed(1)}h` : '-'}
                                                                        </div>
                                                                    </div>
                                                                );
                                                            })()}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                   ) : (
                                    <tr>
                                        <td colSpan={9} className="text-center p-16 text-text-secondary">
                                            Upload a schedule CSV or add an employee to begin.
                                        </td>
                                    </tr>
                                   )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-gradient-to-r from-bg-tertiary/40 to-bg-tertiary/20 border-t-2 border-border-color">
                                        <td className="px-3 py-2.5 font-bold text-xs uppercase text-text-secondary sticky left-0 bg-gradient-to-r from-bg-tertiary/40 to-bg-tertiary/20 z-10 tracking-wide">
                                            Total
                                        </td>
                                        {weekDates.map(dateInfo => {
                                            const totalHours = dailyScheduleTotals[dateToKey(dateInfo.date)];
                                            return (
                                                <td
                                                    key={`schedule-total-${dateInfo.key}`}
                                                    className="px-2 py-2.5 text-center text-[10px] font-bold text-text-primary border-l border-border-color/50"
                                                >
                                                    {totalHours && totalHours > 0 ? `${totalHours.toFixed(1)}h` : '-'}
                                                </td>
                                            );
                                        })}
                                        <td
                                            className={`text-center text-xs font-bold text-accent-blue border-l border-border-color/50 transition-all duration-300 ${
                                                isAttendanceTotalHrsVisible ? 'px-2 py-2.5' : 'p-0 w-0'
                                            }`}
                                        >
                                            <div
                                                className={`whitespace-nowrap overflow-hidden ${
                                                    isAttendanceTotalHrsVisible ? 'opacity-100' : 'opacity-0'
                                                }`}
                                            >
                                                {weeklyScheduleTotalHours > 0 ? `${weeklyScheduleTotalHours.toFixed(1)}h` : '-'}
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                         {/* Mobile/Tablet Card View */}
                        <div className="block lg:hidden p-4 space-y-4">
                            {employees.length > 0 ? (
                                employees.map((emp, empIndex) => {
                                     const employeeKey = getEmployeeListKey(emp, empIndex);
                                     const totalScheduledHours = weekDates.reduce((total, dateInfo) => {
                                        const currentDayKey = dateToKey(dateInfo.date);
                                        const schedule = emp.schedule[currentDayKey];
                                        if (schedule && !schedule.off && schedule.timeIn && schedule.timeOut) {
                                            const timeInMinutes = timeStringToMinutes(schedule.timeIn);
                                            const timeOutMinutes = timeStringToMinutes(schedule.timeOut);
                                            if (timeInMinutes !== null && timeOutMinutes !== null) {
                                                total += (timeOutMinutes - timeInMinutes);
                                            }
                                        }
                                        return total;
                                    }, 0) / 60;
                                    return (
                                        <div key={employeeKey} className="bg-bg-tertiary/60 p-4 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-semibold text-text-primary">{emp.name}</h3>
                                                {totalScheduledHours > 0 &&
                                                    <div className="text-right">
                                                        <p className="text-sm font-medium text-text-primary">{totalScheduledHours.toFixed(2)} hrs</p>
                                                        <p className="text-xs text-text-secondary">Scheduled</p>
                                                    </div>
                                                }
                                            </div>
                                            <div className="mt-3 space-y-1">
                                                {weekDates.map(dateInfo => {
                                                    const currentDayKey = dateToKey(dateInfo.date);
                                                    const schedule = emp.schedule[currentDayKey];
                                                    const dayClasses = `flex justify-between items-center p-2 rounded-md transition-colors ${dateInfo.isToday ? 'bg-border-color/20' : ''} ${dateInfo.isWeekend ? 'bg-black/10' : ''}`;
                                                    
                                                    const renderCellContent = () => {
                                                        if (schedule?.off) {
                                                            return <span className="bg-bg-tertiary text-text-secondary font-semibold text-xs uppercase px-3 py-1 rounded-md">OFF</span>;
                                                        } else if (schedule?.timeIn && schedule?.timeOut) {
                                                            return <span className="text-xs text-text-primary">{`${formatTimeForDisplay(schedule.timeIn)} - ${formatTimeForDisplay(schedule.timeOut)}`}</span>;
                                                        } else {
                                                            return <span className="text-sm text-text-secondary/60">Not Set</span>;
                                                        }
                                                    }

                                                    return (
                                                        <div
                                                            key={`${emp.id}-${currentDayKey}`}
                                                            className={dayClasses}
                                                        >
                                                            <div className={`text-sm font-medium ${dateInfo.isToday ? 'text-text-primary' : 'text-text-secondary'}`}>
                                                                {dateInfo.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}
                                                                <span className="ml-2 text-text-secondary/70">{dateInfo.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', timeZone: 'UTC' })}</span>
                                                            </div>
                                                            <div className="flex flex-col items-end gap-1">
                                                                {renderCellContent()}
                                                                {isEditMode && (
                                                                    <div className="flex gap-1">
                                                                        <button
                                                                            onClick={() => handleOpenScheduleModal(emp, currentDayKey, dateInfo.date)}
                                                                            className="px-2 py-0.5 text-[9px] bg-accent-orange/10 border border-accent-orange/30 rounded text-accent-orange hover:bg-accent-orange/20 font-semibold"
                                                                        >
                                                                            Schedule
                                                                        </button>
                                                                        <button
                                                                            onClick={() => handleOpenAttendanceModal(emp, currentDayKey, dateInfo.date)}
                                                                            className="px-2 py-0.5 text-[9px] bg-accent-blue/10 border border-accent-blue/30 rounded text-accent-blue hover:bg-accent-blue/20 font-semibold"
                                                                        >
                                                                            Attendance
                                                                        </button>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    )
                                })
                            ) : (
                                <div className="text-center p-16 text-text-secondary">
                                    Upload a schedule CSV or add an employee to begin.
                                </div>
                            )}
                        </div>
                    </div>
                    <button 
                        onClick={() => setScheduleTotalHrsVisible(!isScheduleTotalHrsVisible)}
                        className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-20 bg-bg-tertiary w-7 h-7 rounded-full items-center justify-center border border-border-color hover:bg-hover-bg transition"
                        title={isScheduleTotalHrsVisible ? 'Collapse Total Hours column' : 'Expand Total Hours column'}
                    >
                        {isScheduleTotalHrsVisible ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>


            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-[60]">
                    <div className="bg-bg-secondary p-8 rounded-xl max-w-lg w-11/12 border border-border-color shadow-2xl">
                        <h2 className="text-2xl font-semibold mb-6">{modalType === 'add' ? 'Add New Employee' : 'Edit Employee'}</h2>
                        <div className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Employee Name*</label>
                                    <input type="text" name="name" value={formData.name} onChange={handleFormChange} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Position*</label>
                                    <input type="text" name="position" value={formData.position} onChange={handleFormChange} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Department</label>
                                    <input type="text" name="department" value={formData.department} onChange={handleFormChange} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Hourly Rate (₱)*</label>
                                    <input type="number" name="rate" value={formData.rate} onChange={handleFormChange} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                                </div>
                            </div>

                            {/* Rate History Section */}
                            <div className="border border-border-color rounded-lg p-4 bg-bg-primary/50">
                                <div className="flex items-center justify-between mb-3">
                                    <label className="text-sm font-medium text-text-secondary">Rate History</label>
                                    {!isAddingRateChange && (
                                        <button
                                            type="button"
                                            onClick={() => setIsAddingRateChange(true)}
                                            className="text-xs px-2 py-1 rounded bg-accent-blue/20 text-accent-blue hover:bg-accent-blue/30 transition-colors flex items-center gap-1"
                                        >
                                            <PlusIcon className="w-3 h-3" /> Add Rate Change
                                        </button>
                                    )}
                                </div>

                                {/* Add Rate Change Form */}
                                {isAddingRateChange && (
                                    <div className="mb-3 p-3 bg-bg-secondary rounded-lg border border-border-color space-y-2">
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs text-text-secondary mb-1">New Rate (₱)</label>
                                                <input
                                                    type="number"
                                                    value={newRateChange.rate}
                                                    onChange={(e) => setNewRateChange({ ...newRateChange, rate: e.target.value })}
                                                    className="w-full bg-bg-primary border border-border-color rounded px-2 py-1 text-sm"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs text-text-secondary mb-1">Effective Date</label>
                                                <input
                                                    type="date"
                                                    value={newRateChange.effectiveDate}
                                                    onChange={(e) => setNewRateChange({ ...newRateChange, effectiveDate: e.target.value })}
                                                    className="w-full bg-bg-primary border border-border-color rounded px-2 py-1 text-sm"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-xs text-text-secondary mb-1">Notes (optional)</label>
                                            <input
                                                type="text"
                                                value={newRateChange.notes}
                                                onChange={(e) => setNewRateChange({ ...newRateChange, notes: e.target.value })}
                                                className="w-full bg-bg-primary border border-border-color rounded px-2 py-1 text-sm"
                                                placeholder="e.g., Promotion, Annual raise"
                                            />
                                        </div>
                                        <div className="flex gap-2 justify-end">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsAddingRateChange(false);
                                                    setNewRateChange({ rate: '', effectiveDate: '', notes: '' });
                                                }}
                                                className="px-3 py-1 text-xs rounded bg-bg-tertiary hover:bg-hover-bg transition"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const rate = parseFloat(newRateChange.rate);
                                                    if (!rate || !newRateChange.effectiveDate) {
                                                        alert('Please enter rate and effective date');
                                                        return;
                                                    }
                                                    const newEntry: RateHistoryEntry = {
                                                        id: Date.now().toString(),
                                                        rate,
                                                        effectiveDate: newRateChange.effectiveDate,
                                                        notes: newRateChange.notes || undefined,
                                                    };
                                                    setRateHistoryForm([...rateHistoryForm, newEntry].sort((a, b) => a.effectiveDate.localeCompare(b.effectiveDate)));
                                                    setNewRateChange({ rate: '', effectiveDate: '', notes: '' });
                                                    setIsAddingRateChange(false);
                                                }}
                                                className="px-3 py-1 text-xs rounded bg-accent-blue text-white hover:bg-opacity-80 transition"
                                            >
                                                Add
                                            </button>
                                        </div>
                                    </div>
                                )}

                                {/* Rate History List */}
                                {rateHistoryForm.length > 0 ? (
                                    <div className="space-y-2 max-h-32 overflow-y-auto">
                                        {[...rateHistoryForm]
                                            .sort((a, b) => b.effectiveDate.localeCompare(a.effectiveDate))
                                            .map((entry) => (
                                                <div
                                                    key={entry.id}
                                                    className="flex items-center justify-between p-2 bg-bg-secondary rounded border border-border-color group"
                                                >
                                                    <div className="flex-1">
                                                        <span className="text-sm font-medium">₱{entry.rate.toFixed(2)}/hr</span>
                                                        <span className="text-xs text-text-secondary ml-2">
                                                            from {new Date(entry.effectiveDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                        </span>
                                                        {entry.notes && (
                                                            <span className="text-xs text-text-secondary/60 ml-2">({entry.notes})</span>
                                                        )}
                                                    </div>
                                                    <button
                                                        type="button"
                                                        onClick={() => setRateHistoryForm(rateHistoryForm.filter(r => r.id !== entry.id))}
                                                        className="p-1 rounded text-text-secondary/40 hover:text-accent-red hover:bg-accent-red/10 opacity-0 group-hover:opacity-100 transition-all"
                                                    >
                                                        <XMarkIcon className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            ))}
                                    </div>
                                ) : (
                                    <p className="text-xs text-text-secondary/60 text-center py-2">
                                        No rate changes recorded. Current rate will apply to all dates.
                                    </p>
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
                                    <input type="tel" name="phone" value={formData.phone} onChange={handleFormChange} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Payment Mode</label>
                                    <input type="text" name="paymentMode" value={formData.paymentMode} onChange={handleFormChange} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" placeholder="e.g., Bank Transfer, Cash" />
                                </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                                    <input type="email" name="email" value={formData.email} onChange={handleFormChange} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Bank Account</label>
                                    <input type="text" name="bankAccount" value={formData.bankAccount} onChange={handleFormChange} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" placeholder="e.g., 123-456-789" />
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-8">
                             <div>
                                {modalType === 'edit' && selectedEmployee && (
                                    <button 
                                        onClick={async () => {
                                            if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
                                                await deleteEmployee(selectedEmployee.id);
                                                setIsModalOpen(false);
                                            }
                                        }}
                                        className="px-4 py-2 rounded-lg font-medium bg-accent-red/20 text-accent-red hover:bg-accent-red/30 transition-colors"
                                    >
                                        Delete Employee
                                    </button>
                                )}
                            </div>
                            <div className="flex gap-4">
                                <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-lg font-semibold bg-bg-tertiary hover:bg-hover-bg transition">Cancel</button>
                                <button onClick={handleSaveEmployee} className="px-4 py-2 rounded-lg font-semibold bg-accent-blue text-white hover:bg-opacity-80 transition">Save</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
            
            {viewedEmployee && (
                <EmployeeProfile
                    employee={viewedEmployee}
                    employees={employees}
                    attendanceRecords={attendanceRecords}
                    salesData={salesData}
                    payrollRecords={payrollRecords}
                    setPayrollRecords={setPropPayrollRecords}
                    onClose={() => setViewedEmployee(null)}
                    onEdit={() => {
                        openEditModal(viewedEmployee);
                    }}
                    onDelete={() => {
                        if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
                            deleteEmployee(viewedEmployee.id);
                            setViewedEmployee(null);
                        }
                    }}
                    onUpdateEmployee={handleUpdateEmployee}
                    onUpdateAttendance={handleUpdateAttendance}
                />
            )}

            {editingScheduleContext && (
                <ScheduleEditModal
                    isOpen={!!editingScheduleContext}
                    onClose={() => setEditingScheduleContext(null)}
                    onSave={handleSaveScheduleFromModal}
                    employeeName={editingScheduleContext.emp.name}
                    date={editingScheduleContext.date}
                    initialSchedule={editingScheduleContext.emp.schedule[editingScheduleContext.dateKey]}
                />
            )}

            {editingAttendanceContext && (
                <AttendanceEditModal
                    isOpen={!!editingAttendanceContext}
                    onClose={() => setEditingAttendanceContext(null)}
                    onSave={handleSaveAttendanceFromModal}
                    employeeName={editingAttendanceContext.emp.name}
                    date={editingAttendanceContext.date}
                    initialRecord={attendanceRecords.find(r => r.employee.toLowerCase() === editingAttendanceContext.emp.name.toLowerCase() && r.date === editingAttendanceContext.dateKey)}
                />
            )}

            <WeekScheduleCreator
                isOpen={isWeekScheduleCreatorOpen}
                onClose={() => setIsWeekScheduleCreatorOpen(false)}
                onSave={handleCreateWeekSchedule}
                employees={employees}
            />
        </div>
    );
};

export default Attendance;
