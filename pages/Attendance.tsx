
import React, { useState, useMemo, useRef, useEffect } from 'react';
import type { Employee, AttendanceRecord, PayrollRecord, Schedule, SalesData } from '../types';
import { UploadIcon, CalendarDaysIcon, PencilSquareIcon, ChevronLeftIcon, ChevronRightIcon, TrashIcon, PlusIcon, CheckIcon } from '../components/Icons';
import EmployeeProfile from '../components/EmployeeProfile';
import ScheduleEditModal from '../components/ScheduleEditModal';
import AttendanceEditModal from '../components/AttendanceEditModal';

interface AttendanceProps {
    employees: Employee[];
    setEmployees: React.Dispatch<React.SetStateAction<Employee[]>>;
    attendanceRecords: AttendanceRecord[];
    setAttendanceRecords: React.Dispatch<React.SetStateAction<AttendanceRecord[]>>;
    setPayrollRecords: React.Dispatch<React.SetStateAction<PayrollRecord[]>>;
    salesData: SalesData[];
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


const Attendance: React.FC<AttendanceProps> = ({ employees, setEmployees, attendanceRecords, setAttendanceRecords, setPayrollRecords, salesData }) => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'add' | 'edit'>('add');
    const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
    const [viewedEmployee, setViewedEmployee] = useState<Employee | null>(null);
    const [formData, setFormData] = useState({ id: 0, name: '', position: '', rate: '', phone: '', email: '' });
    const [isScheduleLocked, setIsScheduleLocked] = useState(true);
    const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
    const [isScheduleTotalHrsVisible, setScheduleTotalHrsVisible] = useState(false);
    const [isAttendanceTotalHrsVisible, setAttendanceTotalHrsVisible] = useState(true);
    const datePickerRef = useRef<HTMLDivElement>(null);
    const [editingScheduleContext, setEditingScheduleContext] = useState<{ emp: Employee, dateKey: string, date: Date } | null>(null);
    const [isAttendanceLocked, setIsAttendanceLocked] = useState(true);
    const [editingAttendanceContext, setEditingAttendanceContext] = useState<{ emp: Employee, dateKey: string, date: Date } | null>(null);

    const [scheduleWeekStart, setScheduleWeekStart] = useState(() => {
        const today = new Date();
        const dayOfWeek = today.getDay();
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(today);
        monday.setDate(today.getDate() + daysToMonday);
        return monday.toISOString().split('T')[0];
    });
    
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
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setIsDatePickerOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

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
        return Object.values(dailyScheduleTotals).reduce((sum, hours) => {
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
        return Object.values(dailyAttendanceTotals).reduce((sum, hours) => {
            return sum + (Number.isFinite(hours) ? hours : 0);
        }, 0);
    }, [dailyAttendanceTotals]);
    
    const handleDateSelect = (dateStr: string) => {
        const selectedDate = new Date(dateStr + 'T00:00:00Z');
        const dayOfWeek = selectedDate.getUTCDay(); // Sunday = 0, Monday = 1
        const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        const monday = new Date(selectedDate);
        monday.setUTCDate(selectedDate.getUTCDate() + daysToMonday);
        setScheduleWeekStart(monday.toISOString().split('T')[0]);
        setIsDatePickerOpen(false);
    };

    const openAddModal = () => {
        setModalType('add');
        setSelectedEmployee(null);
        setFormData({ id: 0, name: '', position: '', rate: '', phone: '', email: '' });
        setIsModalOpen(true);
    };

    const openEditModal = (employee: Employee) => {
        setModalType('edit');
        setSelectedEmployee(employee);
        setFormData({ id: employee.id, name: employee.name, position: employee.position, rate: String(employee.rate), phone: employee.phone || '', email: employee.email || '' });
        setIsModalOpen(true);
    };

    const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSaveEmployee = () => {
        if (!formData.name || !formData.position || !formData.rate) {
            alert('Please fill in Name, Position, and Rate.');
            return;
        }
        if (modalType === 'add') {
            setEmployees([
                ...employees,
                {
                    id: Date.now(),
                    name: formData.name,
                    position: formData.position,
                    rate: parseFloat(formData.rate) || 0,
                    schedule: {},
                    phone: formData.phone,
                    email: formData.email,
                },
            ]);
        } else if (selectedEmployee) {
            setEmployees(
                employees.map(emp =>
                    emp.id === selectedEmployee.id
                        ? { ...emp, name: formData.name, position: formData.position, rate: parseFloat(formData.rate) || 0, phone: formData.phone, email: formData.email }
                        : emp
                )
            );
        }
        setIsModalOpen(false);
    };
    
    const handleClearAllData = () => {
        if (window.confirm('Are you sure you want to clear all employee and attendance data? This action cannot be undone.')) {
            setEmployees([]);
            setAttendanceRecords([]);
        }
    };

    const deleteEmployee = (employeeId: number) => {
        setEmployees(employees.filter(emp => emp.id !== employeeId));
    };
    
    const handleSaveSchedules = () => {
        setIsScheduleLocked(true);
        alert('All schedule changes have been saved!');
    };

    const handleEditSchedules = () => {
        setIsScheduleLocked(false);
    };

    const handleOpenScheduleModal = (emp: Employee, dateKey: string, date: Date) => {
        setEditingScheduleContext({ emp, dateKey, date });
    };

    const handleSaveScheduleFromModal = (newScheduleData: Schedule) => {
        if (!editingScheduleContext) return;
        const { emp, dateKey } = editingScheduleContext;

        setEmployees(employees.map(e => {
            if (e.id === emp.id) {
                const newSchedule = { ...e.schedule, [dateKey]: newScheduleData };
                return { ...e, schedule: newSchedule };
            }
            return e;
        }));
        setEditingScheduleContext(null);
    };
    
    const handleOpenAttendanceModal = (emp: Employee, dateKey: string, date: Date) => {
        setEditingAttendanceContext({ emp, dateKey, date });
    };

    const handleSaveAttendanceFromModal = (newAttendanceData: { timeIn: string; timeOut: string; }) => {
        if (!editingAttendanceContext) return;
        const { emp, dateKey } = editingAttendanceContext;

        setAttendanceRecords(prevRecords => {
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
        setEditingAttendanceContext(null);
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
        reader.onload = (e) => {
            const text = e.target?.result as string;
            parseScheduleCSV(text);
            event.target.value = '';
        };
        reader.readAsText(file);
    };

    const parseScheduleCSV = (csvText: string) => {
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
        setIsScheduleLocked(true);
        alert(`Schedule import complete!\n\n${updatedCount} existing employees updated.\n${createdCount} new employees created.\nThe schedule is now locked.`);
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

    const parseAttendanceCSV = (csvText: string) => {
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

        setAttendanceRecords(newRecords);
        alert(`${newRecords.length} attendance records have been successfully imported.`);
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

    const handleUpdateEmployee = (updatedEmployee: Employee) => {
        setEmployees(prev => prev.map(emp => emp.id === updatedEmployee.id ? updatedEmployee : emp));
        if (viewedEmployee && viewedEmployee.id === updatedEmployee.id) {
            setViewedEmployee(updatedEmployee);
        }
    };

    const today = new Date();
    const todayUTC = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate()));
    
    return (
        <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full space-y-8">
            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold">Employee Management</h2>
                     <div className="flex items-center gap-2">
                        <button onClick={handleClearAllData} className="flex items-center gap-2 bg-accent-red/20 text-accent-red px-3 py-2 rounded-lg font-medium text-sm hover:bg-accent-red/30 transition">
                            <TrashIcon className="w-5 h-5" />
                            Clear All Data
                        </button>
                        <button onClick={openAddModal} className="flex items-center gap-2 bg-accent-blue text-white px-3 py-2 rounded-lg font-medium text-sm shadow-md hover:bg-opacity-80 transition">
                            <PlusIcon className="w-5 h-5" />
                            Add Employee
                        </button>
                    </div>
                </div>
                <div className="bg-bg-secondary rounded-xl border border-border-color p-4">
                   <div className="relative">
                     <div className="flex flex-nowrap gap-4 p-2 overflow-x-auto horizontal-scrollbar-hide">
                         {employees.length > 0 ? employees.map(emp => (
                            <div key={emp.id} className="relative flex flex-col items-center w-28 flex-shrink-0">
                               <button 
                                    onClick={() => setViewedEmployee(emp)}
                                    className="w-16 h-16 rounded-full bg-teal-400/20 text-teal-300 flex items-center justify-center font-bold text-2xl transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-bg-secondary focus:ring-accent-blue"
                                >
                                    {emp.name.charAt(0)}
                                </button>
                                <p className="mt-2 text-sm font-medium text-text-primary text-center truncate w-full">{emp.name}</p>
                                <p className="text-xs text-text-secondary text-center truncate w-full capitalize">{emp.position}</p>
                            </div>
                         )) : (
                             <div className="w-full flex items-center justify-center h-[100px] text-text-secondary">No employees added yet.</div>
                         )}
                       </div>
                       <div className="absolute top-0 right-0 bottom-0 w-16 bg-gradient-to-l from-bg-secondary pointer-events-none lg:hidden"></div>
                   </div>
                </div>
            </div>

            <div>
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold">Weekly Schedule</h2>
                     <div className="flex items-center gap-2 flex-wrap justify-start w-full sm:w-auto">
                        <div className="relative" ref={datePickerRef}>
                             <button 
                                onClick={() => setIsDatePickerOpen(!isDatePickerOpen)}
                                className="flex items-center gap-2 bg-bg-tertiary border border-border-color rounded-lg py-2 px-3 text-sm font-medium hover:bg-hover-bg transition"
                            >
                                <CalendarDaysIcon className="w-5 h-5 text-text-secondary" />
                                <span>{new Date(scheduleWeekStart + 'T00:00:00Z').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })}</span>
                            </button>
                            {isDatePickerOpen && (
                                <DatePickerPopup 
                                    initialDate={scheduleWeekStart}
                                    onDateSelect={handleDateSelect}
                                />
                            )}
                        </div>
                         <label htmlFor="schedule-csv-input" className="cursor-pointer bg-bg-tertiary text-text-primary px-3 py-2 rounded-lg font-medium text-sm hover:bg-hover-bg transition flex items-center gap-2">
                            <UploadIcon className="w-5 h-5"/>
                            Upload CSV
                        </label>
                        <input type="file" id="schedule-csv-input" accept=".csv" className="hidden" onChange={handleScheduleUpload} />
                         {isScheduleLocked ? (
                            <button onClick={handleEditSchedules} className="bg-accent-orange text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-opacity-90 transition flex items-center gap-2">
                                <PencilSquareIcon className="w-5 h-5"/>
                                Edit Schedule
                            </button>
                        ) : (
                            <button onClick={handleSaveSchedules} className="bg-accent-green text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-opacity-80 transition flex items-center gap-2">
                                <CheckIcon className="w-5 h-5" />
                                Save Schedule
                            </button>
                        )}
                    </div>
                </div>
                <div className="relative">
                    <div className={`bg-bg-secondary rounded-xl border overflow-hidden transition-all duration-300 ${!isScheduleLocked ? 'border-accent-blue ring-2 ring-accent-blue/30' : 'border-border-color'}`}>
                        {/* Desktop Table View */}
                        <div className="overflow-x-auto hidden lg:block">
                            <table className="w-full border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-bg-tertiary/40">
                                        <th className="p-3 text-left text-sm font-medium text-text-secondary sticky left-0 bg-bg-tertiary/40 z-10 w-36 uppercase">Employee</th>
                                        {weekDates.map(dateInfo => (
                                            <th key={dateInfo.key} className={`p-2 text-center text-xs font-semibold uppercase tracking-wider border-l border-border-color transition-colors ${dateInfo.isToday ? 'bg-border-color/20 text-text-primary' : ''} ${dateInfo.isWeekend ? 'bg-bg-tertiary/30' : ''}`}>
                                                {dateInfo.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()}
                                                <div className="font-normal">{dateInfo.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', timeZone: 'UTC' })}</div>
                                            </th>
                                        ))}
                                        <th className={`text-center text-sm font-medium text-text-secondary uppercase border-l border-border-color transition-all duration-300 ease-in-out ${isScheduleTotalHrsVisible ? 'w-28 p-3' : 'w-0 p-0'}`}>
                                            <div className={`whitespace-nowrap overflow-hidden ${isScheduleTotalHrsVisible ? 'opacity-100' : 'opacity-0'}`}>
                                                Total Hrs
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-color">
                                   {employees.length > 0 ? (
                                       employees.map(emp => {
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
                                                <tr key={emp.id} className="group/row hover:bg-hover-bg/50 transition-colors">
                                                    <td className="p-3 font-medium sticky left-0 bg-bg-secondary group-hover/row:bg-hover-bg/50 z-10 w-36">{emp.name}</td>
                                                    {weekDates.map(dateInfo => {
                                                        const currentDayKey = dateToKey(dateInfo.date);
                                                        const schedule = emp.schedule[currentDayKey];
                                                        const cellClasses = `text-center border-l border-border-color ${dateInfo.isToday ? 'bg-border-color/20' : ''} ${dateInfo.isWeekend ? 'bg-bg-tertiary/20' : ''}`;
                                                        
                                                        const renderCellContent = () => {
                                                            if (schedule?.off) {
                                                                return <span className="bg-bg-tertiary text-text-secondary font-semibold text-xs uppercase px-3 py-1 rounded-md">OFF</span>;
                                                            }
                                                            if (schedule?.timeIn && schedule?.timeOut) {
                                                                return <span className="text-xs">{`${formatTimeForDisplay(schedule.timeIn)} - ${formatTimeForDisplay(schedule.timeOut)}`}</span>;
                                                            }
                                                            return <span className="text-sm text-text-secondary/60">Not Set</span>
                                                        }

                                                        if (isScheduleLocked) {
                                                            return (
                                                    <td key={`${emp.id}-${currentDayKey}`} className={`${cellClasses} p-0 align-middle`}>
                                                                    <div className="flex items-center justify-center p-2 h-full">
                                                                        {renderCellContent()}
                                                                    </div>
                                                                </td>
                                                            );
                                                        }

                                                        // Edit mode
                                                        return (
                                                    <td key={`${emp.id}-${currentDayKey}`} className={`${cellClasses} p-1 align-middle`}>
                                                                <button
                                                                    onClick={() => handleOpenScheduleModal(emp, currentDayKey, dateInfo.date)}
                                                                    className="w-full h-full text-center bg-bg-primary/50 border border-border-color rounded-lg hover:bg-hover-bg/50 transition-colors p-2 flex items-center justify-center"
                                                                >
                                                                    {renderCellContent()}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className={`text-center text-sm font-medium border-l border-border-color transition-all duration-300 ${isScheduleTotalHrsVisible ? 'p-3' : 'p-0 w-0'}`}>
                                                        <div className={`transition-opacity duration-150 whitespace-nowrap overflow-hidden ${isScheduleTotalHrsVisible ? 'opacity-100' : 'opacity-0'}`}>
                                                            {totalScheduledHours > 0 ? `${totalScheduledHours.toFixed(2)} hrs` : '--'}
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
                                    <tr className="bg-bg-tertiary/30 border-t border-border-color">
                                        <td className="p-3 font-semibold text-sm uppercase text-text-secondary sticky left-0 bg-bg-tertiary/30 z-10">
                                            Total Hours
                                        </td>
                                        {weekDates.map(dateInfo => {
                                            const totalHours = dailyScheduleTotals[dateToKey(dateInfo.date)];
                                            return (
                                                <td
                                                    key={`schedule-total-${dateInfo.key}`}
                                                    className="p-2 text-center text-sm font-semibold text-text-primary border-l border-border-color"
                                                >
                                                    {totalHours && totalHours > 0 ? `${totalHours.toFixed(2)} hrs` : '--'}
                                                </td>
                                            );
                                        })}
                                        <td
                                            className={`text-center text-sm font-semibold border-l border-border-color transition-all duration-300 ${
                                                isAttendanceTotalHrsVisible ? 'p-3' : 'p-0 w-0'
                                            }`}
                                        >
                                            <div
                                                className={`whitespace-nowrap overflow-hidden ${
                                                    isAttendanceTotalHrsVisible ? 'opacity-100' : 'opacity-0'
                                                }`}
                                            >
                                                {weeklyScheduleTotalHours > 0 ? `${weeklyScheduleTotalHours.toFixed(2)} hrs` : '--'}
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                         {/* Mobile/Tablet Card View */}
                        <div className="block lg:hidden p-4 space-y-4">
                            {employees.length > 0 ? (
                                employees.map(emp => {
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
                                        <div key={emp.id} className="bg-bg-tertiary/60 p-4 rounded-lg">
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

                                                    const scheduleContent = isScheduleLocked ? (
                                                        <div className="flex items-center justify-end h-full">
                                                          {renderCellContent()}
                                                        </div>
                                                    ) : (
                                                        <button 
                                                            onClick={() => handleOpenScheduleModal(emp, currentDayKey, dateInfo.date)}
                                                            className="w-48 text-right p-1 -m-1 bg-bg-primary/50 border border-border-color rounded-md flex justify-end items-center"
                                                        >
                                                            {renderCellContent()}
                                                        </button>
                                                    );
                                                    
                                                    return (
                                                <div key={`${emp.id}-${currentDayKey}`} className={dayClasses}>
                                                            <div className={`text-sm font-medium ${dateInfo.isToday ? 'text-text-primary' : 'text-text-secondary'}`}>
                                                                {dateInfo.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}
                                                                <span className="ml-2 text-text-secondary/70">{dateInfo.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', timeZone: 'UTC' })}</span>
                                                            </div>
                                                            <div>{scheduleContent}</div>
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

            <div>
                 <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
                    <h2 className="text-2xl font-bold">Weekly Attendance</h2>
                    <div className="flex items-center gap-2 flex-wrap justify-start sm:justify-end w-full sm:w-auto">
                        <label htmlFor="attendance-csv-input" className="cursor-pointer bg-bg-tertiary text-text-primary px-3 py-2 rounded-lg font-medium text-sm hover:bg-hover-bg transition flex items-center gap-2">
                            <UploadIcon className="w-5 h-5"/>
                            Upload Attendance
                        </label>
                        <input type="file" id="attendance-csv-input" accept=".csv" className="hidden" onChange={handleAttendanceUpload} />
                         {isAttendanceLocked ? (
                            <button onClick={() => setIsAttendanceLocked(false)} className="bg-accent-orange text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-opacity-90 transition flex items-center gap-2">
                                <PencilSquareIcon className="w-5 h-5"/>
                                Edit Attendance
                            </button>
                        ) : (
                            <button onClick={() => setIsAttendanceLocked(true)} className="bg-accent-green text-white px-4 py-2 rounded-lg font-medium text-sm hover:bg-opacity-80 transition flex items-center gap-2">
                                <CheckIcon className="w-5 h-5" />
                                Save Attendance
                            </button>
                        )}
                    </div>
                </div>
                 <div className="relative">
                    <div className={`bg-bg-secondary rounded-xl border overflow-hidden transition-all duration-300 ${!isAttendanceLocked ? 'border-accent-blue ring-2 ring-accent-blue/30' : 'border-border-color'}`}>
                        {/* Desktop Table View */}
                        <div className="overflow-x-auto hidden lg:block">
                            <table className="w-full border-collapse table-fixed">
                                <thead>
                                    <tr className="bg-bg-tertiary/40">
                                        <th className="p-3 text-left text-sm font-medium text-text-secondary sticky left-0 bg-bg-tertiary/40 z-10 w-36 uppercase">Employee</th>
                                        {weekDates.map(dateInfo => (
                                            <th key={dateInfo.key} className={`p-2 text-center text-xs font-semibold text-text-secondary uppercase tracking-wider border-l border-border-color transition-colors ${dateInfo.isToday ? 'bg-border-color/20 text-text-primary' : ''} ${dateInfo.isWeekend ? 'bg-bg-tertiary/30' : ''}`}>
                                                {dateInfo.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' }).toUpperCase()}
                                                <div className="font-normal">{dateInfo.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', timeZone: 'UTC' })}</div>
                                            </th>
                                        ))}
                                        <th className={`text-center text-sm font-medium text-text-secondary uppercase border-l border-border-color transition-all duration-300 ease-in-out ${isAttendanceTotalHrsVisible ? 'w-28 p-3' : 'w-0 p-0'}`}>
                                            <div className={`whitespace-nowrap overflow-hidden ${isAttendanceTotalHrsVisible ? 'opacity-100' : 'opacity-0'}`}>
                                                Total Hrs
                                            </div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border-color">
                                   {employees.length > 0 ? (
                                       employees.map(emp => {
                                            const totalAttendedHours = weekDates.reduce((total, dateInfo) => {
                                                const currentDayKey = dateToKey(dateInfo.date);
                                                const record = attendanceRecords.find(r => r.employee.toLowerCase() === emp.name.toLowerCase() && r.date === currentDayKey);
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
                                                <tr key={emp.id} className="group/row hover:bg-hover-bg/50 transition-colors">
                                                    <td className="p-3 font-medium sticky left-0 bg-bg-secondary group-hover/row:bg-hover-bg/50 z-10 w-36">{emp.name}</td>
                                                    {weekDates.map(dateInfo => {
                                                        const currentDayKey = dateToKey(dateInfo.date);
                                                        const record = attendanceRecords.find(r => r.employee.toLowerCase() === emp.name.toLowerCase() && r.date === currentDayKey);
                                                        const schedule = emp.schedule[currentDayKey];
                                                        const cellClasses = `text-center border-l border-border-color transition-colors ${dateInfo.isToday ? 'bg-border-color/20' : ''} ${dateInfo.isWeekend ? 'bg-bg-tertiary/20' : ''}`;

                                                        let cellContent;
                                                        const isFuture = dateInfo.date > todayUTC;

                                                        if (schedule?.off) {
                                                            cellContent = <span className="bg-bg-tertiary text-text-secondary font-semibold text-xs rounded-md px-3 py-1 uppercase">OFF</span>;
                                                        } else if (record?.timeIn) {
                                                            let textColorClass = '';
                                                            if (record.timeIn && schedule?.timeIn) {
                                                                const scheduledMinutes = timeStringToMinutes(schedule.timeIn);
                                                                const actualMinutes = timeStringToMinutes(record.timeIn);
                                                                if (scheduledMinutes !== null && actualMinutes !== null) {
                                                                    textColorClass = actualMinutes > scheduledMinutes ? 'text-accent-red' : 'text-accent-green';
                                                                }
                                                            }
                                                            const timeOutDisplay = record.timeOut ? ` - ${formatTime12Hour(record.timeOut)}` : '';
                                                            cellContent = <span className={`text-xs ${textColorClass}`}>{`${formatTime12Hour(record.timeIn)}${timeOutDisplay}`}</span>;
                                                        } else if (schedule?.timeIn) {
                                                            if (isFuture) {
                                                                cellContent = <span className="text-sm text-text-secondary/60">Not Set</span>;
                                                            } else {
                                                                cellContent = <StatusTag text="Absent" type="absent" />;
                                                            }
                                                        } else {
                                                            cellContent = <span className="text-sm text-text-secondary/60">Not Set</span>;
                                                        }
                                                        
                                                        if (isAttendanceLocked) {
                                                            return (
                                                            <td key={`${emp.id}-${currentDayKey}`} className={`${cellClasses} p-2`}>
                                                                    {cellContent}
                                                                </td>
                                                            );
                                                        }

                                                        return (
                                                            <td key={`${emp.id}-${currentDayKey}`} className={`${cellClasses} p-1 align-middle`}>
                                                                <button onClick={() => handleOpenAttendanceModal(emp, currentDayKey, dateInfo.date)} className="w-full h-full text-center bg-bg-primary/50 border border-border-color rounded-lg hover:bg-hover-bg/50 transition-colors p-2 flex items-center justify-center">
                                                                    {cellContent}
                                                                </button>
                                                            </td>
                                                        );
                                                    })}
                                                    <td className={`text-center text-sm font-medium border-l border-border-color transition-all duration-300 ${isAttendanceTotalHrsVisible ? 'p-3' : 'p-0 w-0'}`}>
                                                        <div className={`transition-opacity duration-150 whitespace-nowrap overflow-hidden ${isAttendanceTotalHrsVisible ? 'opacity-100' : 'opacity-0'}`}>
                                                            {totalAttendedHours > 0 ? `${totalAttendedHours.toFixed(2)} hrs` : '--'}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )
                                        })
                                   ) : (
                                    <tr>
                                        <td colSpan={9} className="text-center p-16 text-text-secondary">
                                            No attendance data. Upload an attendance CSV to see results.
                                        </td>
                                    </tr>
                                   )}
                                </tbody>
                                <tfoot>
                                    <tr className="bg-bg-tertiary/30 border-t border-border-color">
                                        <td className="p-3 font-semibold text-sm uppercase text-text-secondary sticky left-0 bg-bg-tertiary/30 z-10">
                                            Total Hours
                                        </td>
                                        {weekDates.map(dateInfo => {
                                            const totalHours = dailyAttendanceTotals[dateToKey(dateInfo.date)];
                                            return (
                                                <td
                                                    key={`attendance-total-${dateInfo.key}`}
                                                    className="p-2 text-center text-sm font-semibold text-text-primary border-l border-border-color"
                                                >
                                                    {totalHours && totalHours > 0 ? `${totalHours.toFixed(2)} hrs` : '--'}
                                                </td>
                                            );
                                        })}
                                        <td
                                            className={`text-center text-sm font-semibold border-l border-border-color transition-all duration-300 ${
                                                isAttendanceTotalHrsVisible ? 'p-3' : 'p-0 w-0'
                                            }`}
                                        >
                                            <div
                                                className={`whitespace-nowrap overflow-hidden ${
                                                    isAttendanceTotalHrsVisible ? 'opacity-100' : 'opacity-0'
                                                }`}
                                            >
                                                {weeklyAttendanceTotalHours > 0 ? `${weeklyAttendanceTotalHours.toFixed(2)} hrs` : '--'}
                                            </div>
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                         {/* Mobile/Tablet Card View */}
                        <div className="block lg:hidden p-4 space-y-4">
                            {employees.length > 0 ? (
                                employees.map(emp => {
                                    const totalAttendedHours = weekDates.reduce((total, dateInfo) => {
                                        const currentDayKey = dateToKey(dateInfo.date);
                                        const record = attendanceRecords.find(r => r.employee.toLowerCase() === emp.name.toLowerCase() && r.date === currentDayKey);
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
                                        <div key={emp.id} className="bg-bg-tertiary/60 p-4 rounded-lg">
                                            <div className="flex justify-between items-start">
                                                <h3 className="font-semibold text-text-primary">{emp.name}</h3>
                                                {totalAttendedHours > 0 &&
                                                    <div className="text-right">
                                                        <p className="text-sm font-medium text-text-primary">{totalAttendedHours.toFixed(2)} hrs</p>
                                                        <p className="text-xs text-text-secondary">Attended</p>
                                                    </div>
                                                }
                                            </div>
                                            <div className="mt-3 space-y-1">
                                                {weekDates.map(dateInfo => {
                                                    const currentDayKey = dateToKey(dateInfo.date);
                                                    const record = attendanceRecords.find(r => r.employee.toLowerCase() === emp.name.toLowerCase() && r.date === currentDayKey);
                                                    const schedule = emp.schedule[currentDayKey];
                                                    const dayClasses = `flex justify-between items-center p-2 rounded-md transition-colors ${dateInfo.isToday ? 'bg-border-color/20' : ''} ${dateInfo.isWeekend ? 'bg-black/10' : ''}`;
                                                    
                                                    let cellContent;
                                                    const isFuture = dateInfo.date > todayUTC;

                                                    if (schedule?.off) {
                                                        cellContent = <span className="bg-bg-tertiary text-text-secondary font-semibold text-xs uppercase px-3 py-1 rounded-md">OFF</span>;
                                                    } else if (record?.timeIn) {
                                                        let textColorClass = '';
                                                        if (record.timeIn && schedule?.timeIn) {
                                                            const scheduledMinutes = timeStringToMinutes(schedule.timeIn);
                                                            const actualMinutes = timeStringToMinutes(record.timeIn);
                                                            if (scheduledMinutes !== null && actualMinutes !== null) {
                                                                textColorClass = actualMinutes > scheduledMinutes ? 'text-accent-red' : 'text-accent-green';
                                                            }
                                                        }
                                                        const timeOutDisplay = record.timeOut ? ` - ${formatTime12Hour(record.timeOut)}` : '';
                                                        cellContent = <span className={`text-xs ${textColorClass}`}>{`${formatTime12Hour(record.timeIn)}${timeOutDisplay}`}</span>;
                                                    } else if (schedule?.timeIn) {
                                                        if (isFuture) {
                                                            cellContent = <span className="text-sm text-text-secondary/60">Not Set</span>;
                                                        } else {
                                                            cellContent = <StatusTag text="Absent" type="absent" />;
                                                        }
                                                    } else {
                                                        cellContent = <span className="text-sm text-text-secondary/60">Not Set</span>;
                                                    }
                                                    
                                                    const attendanceContent = isAttendanceLocked ? (
                                                        cellContent
                                                    ) : (
                                                        <button onClick={() => handleOpenAttendanceModal(emp, currentDayKey, dateInfo.date)} className="w-48 text-right p-1 -m-1 bg-bg-primary/50 border border-border-color rounded-md flex justify-end items-center">
                                                            {cellContent}
                                                        </button>
                                                    );


                                                    return (
                                                <div key={`${emp.id}-${currentDayKey}`} className={dayClasses}>
                                                            <div className={`text-sm font-medium ${dateInfo.isToday ? 'text-text-primary' : 'text-text-secondary'}`}>
                                                                {dateInfo.date.toLocaleDateString('en-US', { weekday: 'short', timeZone: 'UTC' })}
                                                                <span className="ml-2 text-text-secondary/70">{dateInfo.date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', timeZone: 'UTC' })}</span>
                                                            </div>
                                                            <div>{attendanceContent}</div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center p-16 text-text-secondary">
                                    No attendance data. Upload an attendance CSV to see results.
                                </div>
                            )}
                        </div>
                    </div>
                     <button 
                        onClick={() => setAttendanceTotalHrsVisible(!isAttendanceTotalHrsVisible)}
                        className="hidden lg:flex absolute top-1/2 -right-3 -translate-y-1/2 z-20 bg-bg-tertiary w-7 h-7 rounded-full items-center justify-center border border-border-color hover:bg-hover-bg transition"
                        title={isAttendanceTotalHrsVisible ? 'Collapse Total Hours column' : 'Expand Total Hours column'}
                    >
                        {isAttendanceTotalHrsVisible ? <ChevronRightIcon className="w-4 h-4" /> : <ChevronLeftIcon className="w-4 h-4" />}
                    </button>
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50">
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
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Hourly Rate (₱)*</label>
                                    <input type="number" name="rate" value={formData.rate} onChange={handleFormChange} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-text-secondary mb-1">Phone</label>
                                    <input type="tel" name="phone" value={formData.phone} onChange={handleFormChange} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Email</label>
                                <input type="email" name="email" value={formData.email} onChange={handleFormChange} className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue" />
                            </div>
                        </div>
                        <div className="flex justify-between items-center mt-8">
                             <div>
                                {modalType === 'edit' && selectedEmployee && (
                                    <button 
                                        onClick={() => {
                                            if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
                                                deleteEmployee(selectedEmployee.id);
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
                    onClose={() => setViewedEmployee(null)}
                    onEdit={() => {
                        openEditModal(viewedEmployee);
                        setViewedEmployee(null);
                    }}
                    onDelete={() => {
                        if (window.confirm('Are you sure you want to delete this employee? This action cannot be undone.')) {
                            deleteEmployee(viewedEmployee.id);
                            setViewedEmployee(null);
                        }
                    }}
                    onUpdateEmployee={handleUpdateEmployee}
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
        </div>
    );
};

export default Attendance;
