
import React from 'react';

interface StatCardProps {
    title: string;
    value: string;
    icon: React.FC<{ className?: string }>;
    color: 'blue' | 'green' | 'orange' | 'purple';
}

const StatCard: React.FC<StatCardProps> = ({ title, value, icon: Icon, color }) => {
    const colorClasses = {
        blue: 'text-accent-blue',
        green: 'text-accent-green',
        orange: 'text-accent-orange',
        purple: 'text-accent-purple',
    };

    return (
        <div className="group bg-bg-secondary p-5 rounded-xl border border-border-color transition-colors duration-300 hover:border-border-color/70">
            <div className="flex justify-between items-start">
                <div className="flex-1">
                    <div className="text-sm font-medium text-text-secondary">{title}</div>
                    <div className="text-3xl font-semibold text-text-primary mt-2">{value}</div>
                </div>
                <div className={`p-3 rounded-lg bg-bg-tertiary`}>
                    <Icon className={`w-6 h-6 ${colorClasses[color]}`} />
                </div>
            </div>
        </div>
    );
};

export default StatCard;