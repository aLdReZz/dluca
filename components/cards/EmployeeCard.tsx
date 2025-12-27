import React, { useState } from 'react';
import Card from '../Card';
import {
  UserCircleIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
} from '../Icons';

export interface EmployeeCardProps {
  id: string;
  name: string;
  role: string;
  rate?: number;
  rateType?: 'hourly' | 'daily' | 'monthly';
  status?: 'active' | 'inactive' | 'on-leave';
  schedule?: Array<{ day: string; start: string; end: string }>;
  hoursWorked?: number;
  avatarUrl?: string;
  onEdit?: () => void;
  onEditSchedule?: () => void;
  className?: string;
}

const EmployeeCard: React.FC<EmployeeCardProps> = ({
  id,
  name,
  role,
  rate,
  rateType = 'hourly',
  status = 'active',
  schedule = [],
  hoursWorked,
  avatarUrl,
  onEdit,
  onEditSchedule,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const statusConfig = {
    active: { color: 'text-accent-green', bg: 'bg-accent-green/10', icon: CheckCircleIcon, label: 'Active' },
    inactive: { color: 'text-text-tertiary', bg: 'bg-bg-tertiary', icon: XCircleIcon, label: 'Inactive' },
    'on-leave': { color: 'text-accent-orange', bg: 'bg-accent-orange/10', icon: CalendarIcon, label: 'On Leave' },
  };

  const currentStatus = statusConfig[status];
  const StatusIcon = currentStatus.icon;

  const compactView = (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex gap-3">
        {/* Avatar */}
        {avatarUrl ? (
          <div className="w-14 h-14 rounded-full overflow-hidden bg-bg-tertiary flex-shrink-0">
            <img src={avatarUrl} alt={name} className="w-full h-full object-cover" />
          </div>
        ) : (
          <div className="w-14 h-14 rounded-full bg-bg-tertiary flex items-center justify-center flex-shrink-0">
            <UserCircleIcon className="w-10 h-10 text-text-tertiary" />
          </div>
        )}

        {/* Employee info */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-text-primary truncate">
            {name}
          </h3>
          <p className="text-xs text-text-secondary truncate">
            {role}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <div className={`flex items-center gap-1 px-2 py-0.5 rounded ${currentStatus.bg}`}>
              <StatusIcon className={`w-3 h-3 ${currentStatus.color}`} />
              <span className={`text-xs font-medium ${currentStatus.color}`}>
                {currentStatus.label}
              </span>
            </div>
          </div>
        </div>

        {/* Rate */}
        {rate !== undefined && (
          <div className="text-right">
            <p className="text-lg font-bold text-text-primary">
              ₱{rate.toLocaleString('en-PH')}
            </p>
            <p className="text-xs text-text-tertiary">
              per {rateType}
            </p>
          </div>
        )}
      </div>

      {/* Quick stats */}
      {hoursWorked !== undefined && (
        <div className="flex items-center gap-2 pl-[62px]">
          <ClockIcon className="w-4 h-4 text-text-tertiary" />
          <span className="text-sm text-text-secondary">
            {hoursWorked} hours this week
          </span>
        </div>
      )}
    </div>
  );

  const expandedView = (
    <div className="space-y-3 pt-3 border-t border-border-color animate-fade-in-up">
      {/* Rate details */}
      {rate !== undefined && (
        <div className="flex items-center gap-2">
          <CurrencyDollarIcon className="w-4 h-4 text-text-tertiary" />
          <div className="flex-1">
            <p className="text-xs text-text-tertiary">Pay Rate</p>
            <p className="text-sm text-text-primary font-medium">
              ₱{rate.toLocaleString('en-PH')} per {rateType}
            </p>
          </div>
        </div>
      )}

      {/* Schedule */}
      {schedule.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <CalendarIcon className="w-4 h-4 text-text-tertiary" />
              <h4 className="text-xs font-semibold text-text-secondary uppercase">Schedule</h4>
            </div>
            {onEditSchedule && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEditSchedule();
                }}
                className="text-xs text-accent-blue hover:text-accent-blue/80"
              >
                Edit
              </button>
            )}
          </div>
          <div className="space-y-1.5 pl-6">
            {schedule.map((shift, index) => (
              <div key={index} className="flex justify-between text-sm">
                <span className="text-text-secondary font-medium">{shift.day}</span>
                <span className="text-text-primary">
                  {shift.start} - {shift.end}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Hours worked detail */}
      {hoursWorked !== undefined && (
        <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
          <div className="flex items-center gap-2">
            <ClockIcon className="w-4 h-4 text-text-tertiary" />
            <span className="text-sm text-text-secondary">Hours This Week</span>
          </div>
          <span className="text-lg font-bold text-text-primary">
            {hoursWorked}h
          </span>
        </div>
      )}

      {/* Actions */}
      {onEdit && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-accent-blue/10 text-accent-blue rounded-lg hover:bg-accent-blue/20 transition-colors"
        >
          <PencilIcon className="w-4 h-4" />
          <span className="text-sm font-medium">Edit Employee</span>
        </button>
      )}
    </div>
  );

  return (
    <Card
      variant="interactive"
      expandable={schedule.length > 0 || rate !== undefined}
      expanded={isExpanded}
      onExpandChange={setIsExpanded}
      className={className}
    >
      {compactView}
      {isExpanded && expandedView}
    </Card>
  );
};

export default EmployeeCard;
