import React from 'react';
import { XMarkIcon } from './Icons';

interface DeleteConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    confirmText?: string;
    isDeleting?: boolean;
}

const DeleteConfirmationModal: React.FC<DeleteConfirmationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Delete',
    isDeleting = false,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex justify-center items-center z-50 p-3" onClick={onClose}>
            <div className="bg-bg-secondary w-full max-w-md rounded-xl border border-border-color shadow-2xl animate-pop-in" onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div className="p-4 border-b border-border-color flex justify-between items-center bg-gradient-to-r from-bg-secondary to-bg-tertiary/30">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-accent-red/10 flex items-center justify-center">
                            <svg className="w-5 h-5 text-accent-red" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h2 className="text-lg font-bold text-text-primary">{title}</h2>
                    </div>
                    <button onClick={onClose} className="p-1.5 rounded-full text-text-secondary hover:bg-hover-bg hover:text-text-primary transition-all">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4">
                    <p className="text-sm text-text-secondary leading-relaxed">{message}</p>
                </div>

                {/* Footer */}
                <div className="p-3 bg-gradient-to-r from-bg-tertiary/50 to-bg-tertiary/30 border-t border-border-color flex justify-end gap-2 rounded-b-xl">
                    <button
                        onClick={onClose}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg font-semibold text-sm bg-bg-secondary hover:bg-hover-bg transition-all border border-border-color hover:border-text-secondary/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isDeleting}
                        className="px-4 py-2 rounded-lg font-semibold text-sm bg-accent-red text-white hover:bg-opacity-90 transition-all shadow-lg shadow-accent-red/30 hover:shadow-accent-red/50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {isDeleting ? 'Deleting...' : confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DeleteConfirmationModal;
