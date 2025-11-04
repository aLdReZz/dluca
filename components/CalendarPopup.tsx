import React, { useState, useMemo } from 'react';
import { ChevronLeftIcon, ChevronRightIcon } from './Icons';

interface CalendarPopupProps {
    initialRange: { start: string, end: string };
    onRangeComplete: (range: { start: string, end: string }) => void;
    onClose: () => void;
}

const CalendarPopup: React.FC<CalendarPopupProps> = ({ initialRange, onRangeComplete, onClose }) => {
    const [viewDate, setViewDate] = useState(() => new Date(initialRange.end ? initialRange.end + 'T00:00:00Z' : Date.now()));
    const [selectionStart, setSelectionStart] = useState<string | null>(initialRange.start);
    const [selectionEnd, setSelectionEnd] = useState<string | null>(initialRange.end);
    const [hoverDate, setHoverDate] = useState<Date | null>(null);

    const handleDateClick = (day: Date) => {
        const dayStr = day.toISOString().split('T')[0];
        
        if (!selectionStart || (selectionStart && selectionEnd)) {
            setSelectionStart(dayStr);
            setSelectionEnd(null);
        } else if (day < new Date(selectionStart + 'T00:00:00Z')) {
             setSelectionStart(dayStr);
             setSelectionEnd(null);
        } else {
            setSelectionEnd(dayStr);
            onRangeComplete({ start: selectionStart, end: dayStr });
        }
    };

    const calendarGrid = useMemo(() => {
        const year = viewDate.getUTCFullYear();
        const month = viewDate.getUTCMonth();
        const firstDayOfMonth = new Date(Date.UTC(year, month, 1)).getUTCDay();
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

    const isSameDayUTC = (d1?: Date | null, d2Str?: string | null) => {
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
                <div className="font-semibold text-lg">{viewDate.toLocaleString('default', { month: 'long', year: 'numeric', timeZone: 'UTC' })}</div>
                <button onClick={() => changeMonth(1)} className="p-1 rounded-full hover:bg-hover-bg transition-colors"><ChevronRightIcon className="w-5 h-5"/></button>
            </div>
            <div className="grid grid-cols-7 text-center text-xs font-semibold text-text-secondary/70 mb-3">
                {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => <div key={`${d}-${i}`}>{d}</div>)}
            </div>
            <div className="grid grid-cols-7 gap-y-1" onMouseLeave={() => setHoverDate(null)}>
                {calendarGrid.map(item => {
                    if (item.isEmpty) return <div key={item.key}></div>;
                    const { day, date } = item;
                    if (!date) return <div key={item.key}></div>;
                    
                    const start = selectionStart ? new Date(selectionStart + 'T00:00:00Z') : null;
                    const end = selectionEnd ? new Date(selectionEnd + 'T00:00:00Z') : null;

                    const isSelectedStart = isSameDayUTC(date, selectionStart);
                    const isSelectedEnd = isSameDayUTC(date, selectionEnd);
                    const isToday = isSameDayUTC(date, todayStr);
                    
                    const effectiveEnd = end || (hoverDate && start && hoverDate > start ? hoverDate : null);
                    const isInRange = start && effectiveEnd && date > start && date < effectiveEnd;
                    const isSelected = isSelectedStart || isSelectedEnd;
                    
                    return (
                        <div key={item.key} className="flex items-center justify-center">
                             <button 
                                onClick={() => handleDateClick(date)} 
                                onMouseEnter={() => !end && start && setHoverDate(date)}
                                className={`
                                    relative w-9 h-9 flex items-center justify-center rounded-full cursor-pointer transition-colors text-sm
                                    ${ isSelected ? 'bg-hover-bg text-text-primary font-semibold' 
                                        : isInRange ? 'bg-bg-tertiary' 
                                        : 'hover:bg-hover-bg'
                                    }
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

export default CalendarPopup;
