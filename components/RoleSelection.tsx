
import React from 'react';
import type { Role } from '../types';

interface RoleSelectionProps {
    onSelectRole: (role: Role) => void;
}

const backgroundImage = new URL('../image/homepage.jpg', import.meta.url).href;

const RoleSelection: React.FC<RoleSelectionProps> = ({ onSelectRole }) => {
    return (
        <div
            className="relative min-h-screen flex items-center justify-center text-text-primary px-6 py-12 select-none"
            style={{
                backgroundImage: `url(${backgroundImage})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat'
            }}
        >
            <div className="absolute inset-0 bg-bg-primary/85 backdrop-blur-sm" aria-hidden="true" />
            <div className="relative z-10 flex w-full max-w-4xl justify-center">
                <div className="relative flex w-full max-w-xl flex-col items-center gap-10 overflow-hidden rounded-3xl bg-bg-secondary/60 px-8 py-12 backdrop-blur-md shadow-[0_40px_90px_-25px_rgba(0,0,0,0.75)] transition-all duration-300">
                    <div className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10 bg-gradient-to-br from-white/8 via-white/2 to-transparent" aria-hidden="true" />
                    <div className="relative z-10 flex w-full flex-col items-center gap-10">
                        <img
                            src="/dlc-mainlogo.png"
                            alt="D'Luca Logo"
                            className="w-52 select-none object-contain drop-shadow-[0_10px_30px_rgba(0,0,0,0.45)] sm:w-64"
                        />
                        <div className="flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center sm:gap-6">
                            <button
                                onClick={() => onSelectRole('admin')}
                                className="role-select-btn group flex h-[5.5rem] w-full max-w-[12rem] flex-col items-center justify-center rounded-2xl border border-border-color bg-bg-tertiary/80 px-4 py-6 transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:bg-hover-bg hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-blue/60"
                            >
                                <span className="text-lg font-semibold">Admin</span>
                                <span className="mt-1 text-xs text-text-secondary sm:text-sm">Full Access</span>
                            </button>
                            <button
                                onClick={() => onSelectRole('staff')}
                                className="role-select-btn group flex h-[5.5rem] w-full max-w-[12rem] flex-col items-center justify-center rounded-2xl border border-border-color bg-bg-tertiary/80 px-4 py-6 transition-all duration-200 hover:-translate-y-1 hover:border-transparent hover:bg-hover-bg hover:shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-green/60"
                            >
                                <span className="text-lg font-semibold">Staff</span>
                                <span className="mt-1 text-xs text-text-secondary sm:text-sm">Standard Access</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RoleSelection;
