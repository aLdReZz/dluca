
import React from 'react';
import type { Role } from '../types';

interface RoleSelectionProps {
    onSelectRole: (role: Role) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
    return (
        <div className="min-h-screen flex flex-col items-center justify-start bg-bg-primary text-text-primary p-6 py-12 select-none space-y-6">
            <img src="/dlc-mainlogo.png" alt="D'Luca Logo" className="w-64 h-64 object-contain border-none select-none" />
            <div className="flex flex-col items-center text-center space-y-2">
                <h1 className="text-4xl font-semibold">Welcome to D'Luca</h1>
                <p className="text-lg text-text-secondary">Select your role to continue</p>
            </div>
            <div className="flex flex-col sm:flex-row gap-6 mt-4">
                <button
                    onClick={() => onSelectRole('admin')}
                    className="role-select-btn group flex flex-col items-center justify-center p-8 rounded-xl bg-bg-tertiary border border-border-color hover:border-accent-blue hover:bg-hover-bg transition-all duration-200 w-64 h-40 transform hover:-translate-y-1 hover:shadow-lg active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60 hover:animate-[glowPulseBlue_1.6s_ease-in-out_infinite] focus:animate-[glowPulseBlue_1.6s_ease-in-out_infinite]"
                >
                    <span className="text-2xl font-semibold">Admin</span>
                    <span className="text-sm text-text-secondary mt-1">Full Access</span>
                </button>
                <button
                    onClick={() => onSelectRole('staff')}
                    className="role-select-btn group flex flex-col items-center justify-center p-8 rounded-xl bg-bg-tertiary border border-border-color hover:border-accent-green hover:bg-hover-bg transition-all duration-200 w-64 h-40 transform hover:-translate-y-1 hover:shadow-lg active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green/60 hover:animate-[glowPulseGreen_1.6s_ease-in-out_infinite] focus:animate-[glowPulseGreen_1.6s_ease-in-out_infinite]"
                >
                    <span className="text-2xl font-semibold">Staff</span>
                    <span className="text-sm text-text-secondary mt-1">Standard Access</span>
                </button>
            </div>
        </div>
    );
};

export default RoleSelection;
