import React, { useState, useEffect, useRef } from 'react';
import type { Employee, Schedule } from '../types';
import { XMarkIcon } from './Icons';

interface ScheduleEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSave: (schedule: Schedule) => void;
    employeeName: string;
    date: Date;
    initialSchedule?: Schedule;
}

const ScheduleEditModal: React.FC<ScheduleEditModalProps> = ({
    isOpen,
    onClose,
    onSave,
    employeeName,
    date,
    initialSchedule,
}) => {
    const [timeIn, setTimeIn] = useState(initialSchedule?.timeIn || '');
    const [timeOut, setTimeOut] = useState(initialSchedule?.timeOut || '');
    const [isOff, setIsOff] = useState(initialSchedule?.off || false);
    const [isClosing, setIsClosing] = useState(false);
    const timeInRef = useRef<HTMLSelectElement>(null);

    useEffect(() => {
        setTimeIn(initialSchedule?.timeIn || '');
        setTimeOut(initialSchedule?.timeOut || '');
        setIsOff(initialSchedule?.off || false);
        setIsClosing(false);
    }, [initialSchedule, isOpen]);

    useEffect(() => {
        if (isOpen && !isOff && timeInRef.current) {
            timeInRef.current.focus();
        }
    }, [isOpen, isOff]);

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

    const handleSave = () => {
        onSave({ timeIn: isOff ? '' : timeIn, timeOut: isOff ? '' : timeOut, off: isOff });
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
                        <h2 className="text-xl font-semibold">Edit Schedule</h2>
                        <p className="text-sm text-text-secondary">{employeeName} - {formattedDate}</p>
                    </div>
                    <button onClick={handleClose} className="p-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex items-center justify-center gap-4">
                        <button
                            onClick={() => setIsOff(false)}
                            className={`px-4 py-2 rounded-lg w-full font-semibold transition-colors ${!isOff ? 'bg-accent-blue text-white' : 'bg-bg-tertiary hover:bg-hover-bg'}`}
                        >
                            Scheduled
                        </button>
                        <button
                            onClick={() => setIsOff(true)}
                            className={`px-4 py-2 rounded-lg w-full font-semibold transition-colors ${isOff ? 'bg-accent-orange text-white' : 'bg-bg-tertiary hover:bg-hover-bg'}`}
                        >
                            Day Off
                        </button>
                    </div>

                    {!isOff && (
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-fade-in-up">
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Time In</label>
                                <select
                                    ref={timeInRef}
                                    value={timeIn}
                                    onChange={(e) => setTimeIn(e.target.value)}
                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer appearance-none transition-all duration-200 text-text-primary text-sm"
                                >
                                    <option value="">Select time</option>
                                    {Array.from({ length: 24 }, (_, i) => {
                                        const hour = String(i).padStart(2, '0');
                                        const time = `${hour}:00`;
                                        const display = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                        });
                                        return (
                                            <option key={time} value={time}>{display}</option>
                                        );
                                    })}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-2">Time Out</label>
                                <select
                                    value={timeOut}
                                    onChange={(e) => setTimeOut(e.target.value)}
                                    className="w-full bg-bg-primary border border-border-color rounded-xl px-3 py-2.5 focus:outline-none cursor-pointer appearance-none transition-all duration-200 text-text-primary text-sm"
                                >
                                    <option value="">Select time</option>
                                    {Array.from({ length: 24 }, (_, i) => {
                                        const hour = String(i).padStart(2, '0');
                                        const time = `${hour}:00`;

                                        // Get the hour from timeIn (e.g., "09:00" -> 9)
                                        const timeInHour = timeIn ? parseInt(timeIn.split(':')[0]) : -1;
                                        const currentHour = parseInt(hour);

                                        // Only show times that are after or equal to timeIn
                                        if (timeInHour >= 0 && currentHour <= timeInHour) {
                                            return null;
                                        }

                                        const display = new Date(`2000-01-01T${time}`).toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                        });
                                        return (
                                            <option key={time} value={time}>{display}</option>
                                        );
                                    })}
                                </select>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-bg-tertiary/50 border-t border-border-color flex justify-end items-center gap-4 rounded-b-2xl">
                    <button onClick={handleClose} className="px-4 py-2 rounded-lg font-semibold bg-bg-secondary hover:bg-hover-bg transition">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg font-semibold bg-accent-green text-white hover:bg-opacity-80 transition">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default ScheduleEditModal;