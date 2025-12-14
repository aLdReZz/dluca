import React, { useState } from 'react';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.FC<{ className?: string }>;
    color: 'blue' | 'green' | 'orange' | 'purple' | 'yellow';
    tooltip?: React.ReactNode;
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color, tooltip }) => {
    const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);

    const colorClasses = {
        blue: 'text-accent-blue',
        green: 'text-accent-green',
        orange: 'text-accent-orange',
        purple: 'text-accent-purple',
        yellow: 'text-accent-yellow',
    };

    const bgClasses = {
        blue: 'bg-accent-blue/10',
        green: 'bg-accent-green/10',
        orange: 'bg-accent-orange/10',
        purple: 'bg-accent-purple/10',
        yellow: 'bg-accent-yellow/10',
    };

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
        setMousePos({
            x: e.clientX,
            y: e.clientY
        });
    };

    return (
        <div
            className="group relative bg-bg-secondary rounded-lg sm:rounded-xl border border-border-color/50 p-3 sm:p-4 lg:p-5 transition-all duration-200 hover:border-border-color"
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovering(true)}
            onMouseLeave={() => setIsHovering(false)}
        >
            <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-3">
                <div className={`h-8 w-8 sm:h-10 sm:w-10 lg:h-11 lg:w-11 rounded-lg sm:rounded-xl ${bgClasses[color]} flex items-center justify-center flex-shrink-0`}>
                    <Icon className={`w-4 h-4 sm:w-5 sm:h-5 ${colorClasses[color]}`} />
                </div>
                <p className="text-[10px] sm:text-xs font-medium text-text-secondary/70 uppercase tracking-wide truncate">{title}</p>
            </div>
            <p className="text-lg sm:text-xl lg:text-2xl font-bold text-text-primary whitespace-nowrap">{value}</p>
            {tooltip && isHovering && (
                <div
                    className="fixed bg-bg-tertiary border border-border-color rounded-lg p-3 shadow-lg z-50 pointer-events-none whitespace-nowrap"
                    style={{
                        left: `${mousePos.x + 15}px`,
                        top: `${mousePos.y + 15}px`
                    }}
                >
                    {tooltip}
                </div>
            )}
        </div>
    );
};

export default StatCard;
