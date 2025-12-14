import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface DatePickerInputProps {
    value: string; // YYYY-MM-DD format
    onChange: (date: string) => void;
    className?: string;
}

const DatePickerInput: React.FC<DatePickerInputProps> = ({ value, onChange, className = '' }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [viewDate, setViewDate] = useState(() => value ? new Date(value + 'T00:00:00Z') : new Date());
    const [dropdownPosition, setDropdownPosition] = useState({ top: 0, left: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    const formatDisplayDate = (dateStr: string) => {
        if (!dateStr) return 'Select date';
        const date = new Date(dateStr + 'T00:00:00Z');
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            timeZone: 'UTC'
        });
    };

    const calendarGrid = useMemo(() => {
        const year = viewDate.getUTCFullYear();
        const month = viewDate.getUTCMonth();
        const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay();
        const daysInMonth = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();

        const days = [];
        const emptyCells = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; // Adjust for Monday start
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

    const handleDateClick = (date: Date) => {
        const dateStr = date.toISOString().split('T')[0];
        onChange(dateStr);
        setIsOpen(false);
    };

    const handleToday = () => {
        const today = new Date();
        const todayStr = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())).toISOString().split('T')[0];
        onChange(todayStr);
        setViewDate(new Date());
        setIsOpen(false);
    };

    const handleClear = () => {
        onChange('');
        setIsOpen(false);
    };

    const isSameDay = (d1: Date, d2Str: string) => {
        if (!d2Str) return false;
        const d2 = new Date(d2Str + 'T00:00:00Z');
        return d1.getUTCFullYear() === d2.getUTCFullYear() &&
               d1.getUTCMonth() === d2.getUTCMonth() &&
               d1.getUTCDate() === d2.getUTCDate();
    };

    const now = new Date();
    const todayStr = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())).toISOString().split('T')[0];

    // Calculate dropdown position
    useEffect(() => {
        if (isOpen && buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            setDropdownPosition({
                top: rect.bottom + window.scrollY + 8,
                left: rect.left + window.scrollX
            });
        }
    }, [isOpen]);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    const calendarDropdown = isOpen && (
        <div
            className="fixed bg-[#2a2a2a] border-2 border-white/20 rounded-2xl shadow-2xl p-4 z-[9999] w-80 animate-fade-in-up"
            style={{
                top: `${dropdownPosition.top}px`,
                left: `${dropdownPosition.left}px`
            }}
        >
                    {/* Month/Year Header */}
                    <div className="flex justify-between items-center mb-4">
                        <button
                            type="button"
                            onClick={() => changeMonth(-1)}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                        >
                            <ChevronLeftIcon className="w-5 h-5" />
                        </button>
                        <div className="font-semibold text-lg text-white">
                            {viewDate.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' })}
                        </div>
                        <button
                            type="button"
                            onClick={() => changeMonth(1)}
                            className="p-2 rounded-full hover:bg-white/10 transition-colors text-white"
                        >
                            <ChevronRightIcon className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Weekday Headers */}
                    <div className="grid grid-cols-7 text-center text-xs font-semibold text-white/50 mb-3">
                        {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d, i) => (
                            <div key={`${d}-${i}`} className="py-1">{d}</div>
                        ))}
                    </div>

                    {/* Calendar Grid */}
                    <div className="grid grid-cols-7 gap-1">
                        {calendarGrid.map(item => {
                            if (item.isEmpty) return <div key={item.key}></div>;
                            const { day, date } = item;
                            if (!date) return <div key={item.key}></div>;

                            const isSelected = isSameDay(date, value);
                            const isToday = isSameDay(date, todayStr);

                            return (
                                <div key={item.key} className="flex items-center justify-center">
                                    <button
                                        type="button"
                                        onClick={() => handleDateClick(date)}
                                        className={`
                                            relative w-10 h-10 flex items-center justify-center rounded-full cursor-pointer transition-all text-sm font-medium
                                            ${isSelected
                                                ? 'bg-accent-blue text-white scale-110'
                                                : isToday
                                                ? 'bg-white/10 text-white hover:bg-white/20'
                                                : 'text-white/90 hover:bg-white/10'
                                            }
                                        `}
                                    >
                                        {day}
                                    </button>
                                </div>
                            );
                        })}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 mt-4 pt-4 border-t border-white/10">
                        <button
                            type="button"
                            onClick={handleClear}
                            className="flex-1 px-3 py-2 rounded-xl text-sm font-medium text-white/70 hover:bg-white/10 transition-colors"
                        >
                            Clear
                        </button>
                        <button
                            type="button"
                            onClick={handleToday}
                            className="flex-1 px-3 py-2 rounded-xl text-sm font-medium text-accent-blue hover:bg-accent-blue/10 transition-colors"
                        >
                            Today
                        </button>
                    </div>
                </div>
    );

    return (
        <div ref={containerRef} className="relative w-full">
            <button
                ref={buttonRef}
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-accent-blue focus:border-accent-blue cursor-pointer text-left ${className}`}
            >
                {formatDisplayDate(value)}
            </button>

            {calendarDropdown && createPortal(calendarDropdown, document.body)}
        </div>
    );
};

export default DatePickerInput;
