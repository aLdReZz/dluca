import React from 'react';
import type { Role } from '../types';

interface RoleSelectionProps {
    onSelectRole: (role: Role) => void;
}

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
    return (
        <div className="relative min-h-screen overflow-hidden">
            <div
                className="absolute inset-0 bg-cover bg-center filter blur-sm transform scale-110"
                style={{ backgroundImage: "url('/role-background.jpg')" }}
                aria-hidden="true"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/80 to-black/90" aria-hidden="true" />
            <div className="relative z-10 flex min-h-screen items-center justify-center px-6 py-12">
                <div className="w-full max-w-2xl rounded-[32px] border border-white/15 bg-black/45 px-12 pb-14 pt-16 text-center text-text-primary shadow-[0_40px_90px_-45px_rgba(0,0,0,0.95)] backdrop-blur-2xl">
                    <div className="flex flex-col items-center space-y-4">
                        <img src="/dlc-mainlogo.png" alt="D'Luca Logo" className="h-16 w-36 object-contain" />
                        <p className="text-base text-text-secondary">Choose how you want to access the dashboard.</p>
                    </div>

                    <div className="mt-10 grid gap-6 sm:grid-cols-2">
                        <button
                            onClick={() => onSelectRole('admin')}
                            className="role-select-btn group flex h-32 flex-col items-center justify-center rounded-[24px] border border-white/20 bg-white/10 px-6 text-text-primary transition-all duration-200 hover:-translate-y-1 hover:border-white/40 hover:bg-white/15 hover:shadow-[0_28px_60px_-32px_rgba(0,0,0,0.9)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                        >
                            <span className="text-xl font-semibold">Admin</span>
                            <span className="mt-1 text-sm text-text-secondary">Full Access</span>
                        </button>
                        <button
                            onClick={() => onSelectRole('staff')}
                            className="role-select-btn group flex h-32 flex-col items-center justify-center rounded-[24px] border border-white/20 bg-white/10 px-6 text-text-primary transition-all duration-200 hover:-translate-y-1 hover:border-white/40 hover:bg-white/15 hover:shadow-[0_28px_60px_-32px_rgba(0,0,0,0.9)] active:scale-95 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green/60"
                        >
                            <span className="text-xl font-semibold">Staff</span>
                            <span className="mt-1 text-sm text-text-secondary">Standard Access</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;
