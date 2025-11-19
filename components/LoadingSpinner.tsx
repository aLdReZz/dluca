import React from 'react';

interface LoadingSpinnerProps {
    message?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ message = 'Loading...' }) => {
    return (
        <div className="flex flex-col items-center justify-center h-full gap-12">
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

                {/* Fast orbiting particle 1 */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                    <div className="absolute top-0 left-1/2 w-3.5 h-3.5 rounded-full bg-gray-300 shadow-lg shadow-gray-300/70 transform -translate-x-1/2" style={{ filter: 'drop-shadow(0 0 8px rgba(200, 200, 200, 0.8))' }}></div>
                </div>

                {/* Counter-rotating particle 2 */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '3s', animationDirection: 'reverse' }}>
                    <div className="absolute bottom-0 left-1/2 w-3 h-3 rounded-full bg-gray-400 shadow-lg shadow-gray-400/70 transform -translate-x-1/2" style={{ filter: 'drop-shadow(0 0 8px rgba(150, 150, 150, 0.8))' }}></div>
                </div>

                {/* Slow side particle */}
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '6s' }}>
                    <div className="absolute left-0 top-1/2 w-2.5 h-2.5 rounded-full bg-gray-500 shadow-lg shadow-gray-500/70 transform -translate-y-1/2" style={{ filter: 'drop-shadow(0 0 8px rgba(100, 100, 100, 0.8))' }}></div>
                </div>

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

            {/* Loading text with enhanced dots animation */}
            <div className="text-center space-y-4">
                <p className="text-text-secondary text-lg font-semibold tracking-wide">
                    {message}
                    <span className="inline-block w-6 ml-2" style={{ animation: 'dot-pulse 1.4s infinite' }}>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animation: 'dot-bounce 1.4s infinite 0s' }}></span>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-500 mx-1" style={{ animation: 'dot-bounce 1.4s infinite 0.2s' }}></span>
                        <span className="inline-block w-1.5 h-1.5 rounded-full bg-gray-400" style={{ animation: 'dot-bounce 1.4s infinite 0.4s' }}></span>
                    </span>
                </p>
                <div className="flex justify-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-gray-500" style={{ animation: 'ping-pulse 1.5s ease-in-out infinite' }}></div>
                    <div className="w-1 h-1 rounded-full bg-gray-500" style={{ animation: 'ping-pulse 1.5s ease-in-out infinite 0.3s' }}></div>
                    <div className="w-1 h-1 rounded-full bg-gray-500" style={{ animation: 'ping-pulse 1.5s ease-in-out infinite 0.6s' }}></div>
                </div>
            </div>

            {/* Flowing gradient bar */}
            <div className="relative w-32 h-1 rounded-full overflow-hidden bg-gray-700/30">
                <div className="absolute inset-y-0 left-0 w-1/3 rounded-full bg-gradient-to-r from-transparent via-gray-400 to-transparent" style={{ animation: 'flow 2s ease-in-out infinite' }}></div>
            </div>
        </div>
    );
};

export default LoadingSpinner;
