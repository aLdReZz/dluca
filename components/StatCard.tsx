
import React from 'react';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.FC<{ className?: string }>;
    color: 'blue' | 'green' | 'orange' | 'purple' | 'yellow';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
    const colorClasses = {
        blue: 'text-accent-blue',
        green: 'text-accent-green',
        orange: 'text-accent-orange',
        purple: 'text-accent-purple',
        yellow: 'text-accent-yellow',
    };

    return (
        <div className="group relative bg-bg-secondary rounded-xl border border-border-color transition-colors duration-300 hover:border-border-color/60 px-5 pt-6 pb-5 overflow-hidden">
            <div className="absolute right-5 top-4 h-10 w-10 rounded-lg bg-bg-tertiary/90 ring-1 ring-border-color/60 flex items-center justify-center group-hover:ring-border-color">
                <Icon className={`w-6 h-6 ${colorClasses[color]}`} />
            </div>
            <div className="pr-16">
                <div className="text-sm font-medium text-text-secondary">{title}</div>
                <div className="text-3xl font-semibold text-text-primary mt-3">{value}</div>
            </div>
        </div>
    );
};

export default StatCard;
