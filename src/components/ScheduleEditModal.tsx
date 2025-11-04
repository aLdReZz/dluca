import React, { useState, useEffect } from 'react';
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

    useEffect(() => {
        setTimeIn(initialSchedule?.timeIn || '');
        setTimeOut(initialSchedule?.timeOut || '');
        setIsOff(initialSchedule?.off || false);
    }, [initialSchedule]);

    const handleSave = () => {
        onSave({ timeIn: isOff ? '' : timeIn, timeOut: isOff ? '' : timeOut, off: isOff });
        onClose();
    };

    if (!isOpen) return null;

    const formattedDate = date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: 'UTC'
    });

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-md rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 border-b border-border-color flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-semibold">Edit Schedule</h2>
                        <p className="text-sm text-text-secondary">{employeeName} - {formattedDate}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors">
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
                                <label className="block text-sm font-medium text-text-secondary mb-1">Time In</label>
                                <input
                                    type="time"
                                    value={timeIn}
                                    onChange={(e) => setTimeIn(e.target.value)}
                                    className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-text-secondary mb-1">Time Out</label>
                                <input
                                    type="time"
                                    value={timeOut}
                                    onChange={(e) => setTimeOut(e.target.value)}
                                    className="w-full bg-bg-primary border border-border-color rounded-lg p-2 focus:ring-accent-blue focus:border-accent-blue"
                                />
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-bg-tertiary/50 border-t border-border-color flex justify-end items-center gap-4 rounded-b-2xl">
                    <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-bg-secondary hover:bg-hover-bg transition">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg font-semibold bg-accent-green text-white hover:bg-opacity-80 transition">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default ScheduleEditModal;