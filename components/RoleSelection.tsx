
import React from 'react';
import type { Role } from '../types';

interface RoleSelectionProps {
    onSelectRole: (role: Role) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
    return (
        <div className="flex flex-col items-center justify-center h-screen bg-bg-primary text-text-primary p-4">
            <img src="/dlc-mainlogo.png" alt="D'Luca Logo" className="w-32 h-32 mb-6 object-contain" />
            <h1 className="text-4xl font-semibold mb-2">Welcome to D'Luca</h1>
            <p className="text-lg text-text-secondary mb-10">Select your role to continue</p>
            <div className="flex flex-col sm:flex-row gap-6">
                <button
                    onClick={() => onSelectRole('admin')}
                    className="group flex flex-col items-center justify-center p-8 rounded-xl bg-bg-tertiary border border-border-color hover:border-border-color/70 hover:bg-hover-bg transition-colors duration-200 w-64 h-40"
                >
                    <span className="text-2xl font-semibold">Admin</span>
                    <span className="text-sm text-text-secondary mt-1">Full Access</span>
                </button>
                <button
                    onClick={() => onSelectRole('staff')}
                    className="group flex flex-col items-center justify-center p-8 rounded-xl bg-bg-tertiary border border-border-color hover:border-border-color/70 hover:bg-hover-bg transition-colors duration-200 w-64 h-40"
                >
                    <span className="text-2xl font-semibold">Staff</span>
                    <span className="text-sm text-text-secondary mt-1">Standard Access</span>
                </button>
            </div>
        </div>
    );
};

export default RoleSelection;
