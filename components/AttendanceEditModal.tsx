import React, { useState, useEffect, useRef } from 'react';
import type { AttendanceRecord } from '../types';
import { XMarkIcon } from './Icons';

interface AttendanceEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (data: { timeIn: string; timeOut: string }) => void;
    employeeName: string;
    date: Date;
    initialRecord?: AttendanceRecord;
}

const AttendanceEditModal: React.FC<AttendanceEditModalProps> = ({
    isOpen,
    onClose,
    onSave,
    employeeName,
    date,
    initialRecord,
}) => {
    // Convert 12-hour format to 24-hour format for the time input
    const convertTo24Hour = (time12h: string): string => {
        if (!time12h) return '';

        // If already in 24-hour format (HH:MM), return as is
        if (/^\d{1,2}:\d{2}$/.test(time12h)) {
            const [hours, minutes] = time12h.split(':');
            return `${hours.padStart(2, '0')}:${minutes}`;
        }

        // Parse 12-hour format (e.g., "10:49 AM" or "8:03 PM")
        const match = time12h.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
        if (!match) return '';

        let hours = parseInt(match[1]);
        const minutes = match[2];
        const period = match[3].toUpperCase();

        if (period === 'PM' && hours !== 12) {
            hours += 12;
        } else if (period === 'AM' && hours === 12) {
            hours = 0;
        }

        return `${hours.toString().padStart(2, '0')}:${minutes}`;
    };

    const [timeIn, setTimeIn] = useState(() => convertTo24Hour(initialRecord?.timeIn || ''));
    const [timeOut, setTimeOut] = useState(() => convertTo24Hour(initialRecord?.timeOut || ''));
    const [isClosing, setIsClosing] = useState(false);
    const timeInRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setTimeIn(convertTo24Hour(initialRecord?.timeIn || ''));
            setTimeOut(convertTo24Hour(initialRecord?.timeOut || ''));
            setIsClosing(false);
        }
    }, [initialRecord, isOpen]);

    useEffect(() => {
        if (isOpen && timeInRef.current) {
            timeInRef.current.focus();
        }
    }, [isOpen]);

    useEffect(() => {
        const handleEscapeKey = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && isOpen && !isClosing) {
                handleClose();
            }
        };

        if (isOpen && !isClosing) {
            document.addEventListener('keydown', handleEscapeKey);
        }

        return () => {
            document.removeEventListener('keydown', handleEscapeKey);
        };
    }, [isOpen, isClosing]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(onClose, 300);
    };

    // Convert 24-hour format back to 12-hour format for storage
    const convertTo12Hour = (time24h: string): string => {
        if (!time24h) return '';

        const [hoursStr, minutes] = time24h.split(':');
        let hours = parseInt(hoursStr);
        const period = hours >= 12 ? 'PM' : 'AM';

        if (hours === 0) {
            hours = 12;
        } else if (hours > 12) {
            hours -= 12;
        }

        return `${hours}:${minutes} ${period}`;
    };

    const handleSave = () => {
        // Convert times back to 12-hour format before saving
        onSave({
            timeIn: convertTo12Hour(timeIn),
            timeOut: convertTo12Hour(timeOut)
        });
        handleClose();
    };

    const handleClear = () => {
        onSave({ timeIn: '', timeOut: '' });
        handleClose();
    };

    if (!isOpen && !isClosing) return null;

    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    });

    return (
        <div className={`fixed inset-0 flex justify-center items-center z-50 p-4 transition-all duration-300 ${isClosing ? 'bg-black/0 backdrop-blur-none' : 'bg-black/60 backdrop-blur-sm'}`} onClick={handleClose}>
            <div className={`bg-bg-secondary w-full max-w-md rounded-2xl border border-border-color shadow-2xl flex flex-col transition-all duration-300 ${isClosing ? 'opacity-0 scale-95 -translate-y-4' : 'opacity-100 scale-100 animate-pop-in'}`} onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border-color flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold">Edit Attendance</h2>
                        <p className="text-sm text-text-secondary">{employeeName} - {formattedDate}</p>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Time In</label>
                            <input
                                ref={timeInRef}
                                type="time"
                                value={timeIn}
                                onChange={(e) => setTimeIn(e.target.value)}
                                className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all duration-200 text-text-primary text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-text-secondary mb-2">Time Out</label>
                            <input
                                type="time"
                                value={timeOut}
                                onChange={(e) => setTimeOut(e.target.value)}
                                className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/50 transition-all duration-200 text-text-primary text-sm"
                            />
                        </div>
                    </div>
                     <div className="pt-4 border-t border-border-color">
                        <button
                            onClick={handleClear}
                            className="w-full text-center py-2 text-sm text-accent-red hover:bg-accent-red/10 rounded-lg transition-colors"
                        >
                            Clear Times (Mark as Not Set)
                        </button>
                    </div>
                </div>

                <div className="p-4 bg-bg-tertiary/50 border-t border-border-color flex justify-end items-center gap-4 rounded-b-2xl">
                    <button onClick={handleClose} className="px-4 py-2 rounded-lg font-semibold bg-bg-secondary hover:bg-hover-bg transition">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg font-semibold bg-accent-green text-white hover:bg-opacity-80 transition">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceEditModal;
