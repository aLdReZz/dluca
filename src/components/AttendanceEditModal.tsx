import React, { useState, useEffect } from 'react';
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
    const [timeIn, setTimeIn] = useState('');
    const [timeOut, setTimeOut] = useState('');

    useEffect(() => {
        if (isOpen) {
            setTimeIn(initialRecord?.timeIn || '');
            setTimeOut(initialRecord?.timeOut || '');
        }
    }, [initialRecord, isOpen]);

    const handleSave = () => {
        onSave({ timeIn, timeOut });
    };

    const handleClear = () => {
        onSave({ timeIn: '', timeOut: '' });
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
                        <h2 className="text-xl font-semibold">Edit Attendance</h2>
                        <p className="text-sm text-text-secondary">{employeeName} - {formattedDate}</p>
                    </div>
                    <button onClick={onClose} className="p-2 rounded-full text-text-secondary hover:bg-hover-bg transition-colors">
                        <XMarkIcon className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <button onClick={onClose} className="px-4 py-2 rounded-lg font-semibold bg-bg-secondary hover:bg-hover-bg transition">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 rounded-lg font-semibold bg-accent-green text-white hover:bg-opacity-80 transition">Save Changes</button>
                </div>
            </div>
        </div>
    );
};

export default AttendanceEditModal;
