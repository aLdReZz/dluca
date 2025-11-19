import React from 'react';
import { createPortal } from 'react-dom';
import {
    HomeIcon,
    ChartBarIcon,
    CubeIcon,
    CalculatorIcon,
    ClockIcon,
    CreditCardIcon,
    CalendarIcon,
} from './Icons';

interface LoadingSpinnerProps {
    message?: string;
}

type SidebarIconComponent = React.FC<{ className?: string }>;

type OrbitIconConfig = {
    Icon: SidebarIconComponent;
    sizeClass: string;
    iconClass: string;
    orbitInset: number;
    animationDuration: string;
    animationDirection?: 'normal' | 'reverse';
    anchorStyle: React.CSSProperties;
};

const ORBIT_ICON_CONFIG: OrbitIconConfig[] = [
    {
        Icon: HomeIcon,
        sizeClass: 'w-9 h-9',
        iconClass: 'w-5 h-5',
        orbitInset: 0,
        animationDuration: '4.6s',
        anchorStyle: { top: 0, left: '50%', transform: 'translate(-50%, 0)' },
    },
    {
        Icon: ChartBarIcon,
        sizeClass: 'w-8 h-8',
        iconClass: 'w-4 h-4',
        orbitInset: 12,
        animationDuration: '5s',
        animationDirection: 'reverse',
        anchorStyle: { top: '20%', right: 0, transform: 'translate(0, -50%)' },
    },
    {
        Icon: CubeIcon,
        sizeClass: 'w-8 h-8',
        iconClass: 'w-4 h-4',
        orbitInset: 24,
        animationDuration: '5.8s',
        anchorStyle: { right: 0, top: '50%', transform: 'translate(0, -50%)' },
    },
    {
        Icon: CalculatorIcon,
        sizeClass: 'w-7 h-7',
        iconClass: 'w-4 h-4',
        orbitInset: 36,
        animationDuration: '6.4s',
        animationDirection: 'reverse',
        anchorStyle: { bottom: 0, left: '50%', transform: 'translate(-50%, 0)' },
    },
    {
        Icon: ClockIcon,
        sizeClass: 'w-7 h-7',
        iconClass: 'w-4 h-4',
        orbitInset: 48,
        animationDuration: '6.9s',
        anchorStyle: { left: 0, top: '50%', transform: 'translate(0, -50%)' },
    },
    {
        Icon: CreditCardIcon,
        sizeClass: 'w-7 h-7',
        iconClass: 'w-4 h-4',
        orbitInset: 60,
        animationDuration: '7.4s',
        animationDirection: 'reverse',
        anchorStyle: { left: 0, top: '30%', transform: 'translate(0, -50%)' },
    },
    {
        Icon: CalendarIcon,
        sizeClass: 'w-6 h-6',
        iconClass: 'w-4 h-4',
        orbitInset: 72,
        animationDuration: '7.9s',
        anchorStyle: { left: '50%', bottom: '12%', transform: 'translate(-50%, 0)' },
    },
];

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
    const orbitBadgeClass =
        'absolute flex items-center justify-center rounded-full border border-white/15 bg-gradient-to-b from-gray-700/70 to-gray-900/80 text-gray-100 shadow-lg shadow-black/60 backdrop-blur-sm';

    const spinnerMarkup = (
        <div className="fixed inset-0 z-40 flex flex-col items-center justify-center bg-gradient-to-b from-[#050505] via-[#080808] to-[#050505]">
            <div className="flex flex-col items-center justify-center h-full">
                {/* Enhanced Orbital Loading Animation */}
                <div className="relative w-48 h-48">
                    {/* Outer glow rings */}
                    <div className="absolute inset-0 rounded-full border-2 border-gray-600/20" style={{ animation: 'pulse-ring 2s ease-out infinite' }}></div>
                    <div className="absolute inset-4 rounded-full border-2 border-gray-500/30" style={{ animation: 'pulse-ring 2.5s ease-out infinite 0.3s' }}></div>
                    <div className="absolute inset-8 rounded-full border-2 border-gray-400/40" style={{ animation: 'pulse-ring 3s ease-out infinite 0.6s' }}></div>

                    {/* Center logo with glow */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <div className="relative">
                            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 opacity-0 blur-xl" style={{ animation: 'logo-glow 2s ease-in-out infinite' }}></div>
                            <img
                                src="/dlc-sublogo.png"
                                alt="Loading"
                                className="w-16 h-16 object-contain relative z-10"
                                style={{ animation: 'logo-float 3s ease-in-out infinite' }}
                            />
                        </div>
                    </div>

                    {/* Restaurant-themed orbiting icons */}
                    {ORBIT_ICON_CONFIG.map(
                        (
                            { Icon, sizeClass, iconClass, orbitInset, animationDuration, animationDirection = 'normal', anchorStyle },
                            index
                        ) => (
                            <div
                                key={`orbit-icon-${index}`}
                                className="absolute animate-spin"
                                style={{
                                    inset: `${orbitInset}px`,
                                    animationDuration,
                                    animationDirection,
                                }}
                            >
                                <div
                                    className={`${orbitBadgeClass} ${sizeClass}`}
                                    style={{
                                        ...anchorStyle,
                                        filter: 'drop-shadow(0 0 14px rgba(188, 197, 209, 0.4))',
                                    }}
                                >
                                    <Icon className={`${iconClass} text-gray-200`} />
                                </div>
                            </div>
                        )
                    )}

                    {/* Dynamic rotating track */}
                    <div className="absolute inset-0 rounded-full border border-transparent border-t-gray-400 border-r-gray-500 border-b-gray-600" style={{
                        animation: 'spin 8s linear infinite',
                        opacity: 0.6
                    }}></div>

                    {/* Second rotating track (opposite direction) */}
                    <div className="absolute inset-2 rounded-full border border-transparent border-l-gray-400 border-b-gray-500" style={{
                        animation: 'spin 10s linear infinite reverse',
                        opacity: 0.4
                    }}></div>
                </div>
            </div>
            <span className="sr-only">{message}</span>
        </div>
    );

    if (typeof document === 'undefined') {
        return spinnerMarkup;
    }

    return createPortal(spinnerMarkup, document.body);
};

export default LoadingSpinner;
