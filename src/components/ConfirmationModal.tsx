import React, { useEffect } from 'react';
import { TrashIcon, ExclamationCircleIcon } from './Icons';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    cancelText?: string;
    iconType?: 'warning' | 'danger';
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    iconType = 'danger',
}) => {
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.body.style.overflow = 'hidden';
            window.addEventListener('keydown', handleKeyDown);
        }
        
        return () => {
            document.body.style.overflow = 'unset';
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const Icon = iconType === 'danger' ? TrashIcon : ExclamationCircleIcon;
    const confirmButtonClasses = iconType === 'danger'
        ? 'bg-accent-red text-white hover:bg-opacity-80'
        : 'bg-accent-blue text-white hover:bg-opacity-80';

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex justify-center items-center z-50 p-4" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-md rounded-2xl border border-border-color shadow-2xl flex flex-col animate-pop-in" onClick={e => e.stopPropagation()}>
                <div className="p-6 text-center">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 ${iconType === 'danger' ? 'bg-accent-red/20' : 'bg-accent-yellow/20'}`}>
                        <Icon className={`w-6 h-6 ${iconType === 'danger' ? 'text-accent-red' : 'text-accent-yellow'}`} />
                    </div>
                    <h2 className="text-xl font-semibold">{title}</h2>
                    <p className="text-text-secondary mt-2">{message}</p>
                </div>
                <div className="p-4 bg-bg-tertiary/50 border-t border-border-color flex justify-center items-center gap-4 rounded-b-2xl">
                    <button onClick={onClose} className="px-6 py-2 rounded-lg font-semibold bg-bg-secondary hover:bg-hover-bg transition w-full sm:w-auto">
                        {cancelText}
                    </button>
                    <button onClick={onConfirm} className={`px-6 py-2 rounded-lg font-semibold transition w-full sm:w-auto ${confirmButtonClasses}`}>
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmationModal;
