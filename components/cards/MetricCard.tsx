import React, { useState } from 'react';
import Card from '../Card';
import { ArrowUpIcon, ArrowDownIcon } from '@heroicons/react/24/solid';

export interface MetricCardProps {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon?: React.ReactNode;
  color?: string;
  trend?: 'up' | 'down' | 'neutral';
  expandedContent?: React.ReactNode;
  loading?: boolean;
  className?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  change,
  changeLabel,
  icon,
  color = 'accent-blue',
  trend,
  expandedContent,
  loading = false,
  className = '',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);

  // Determine trend from change if not explicitly provided
  const effectiveTrend = trend || (change !== undefined ? (change > 0 ? 'up' : change < 0 ? 'down' : 'neutral') : 'neutral');

  const trendColors = {
    up: 'text-accent-green',
    down: 'text-accent-red',
    neutral: 'text-text-secondary',
  };

  const TrendIcon = effectiveTrend === 'up' ? ArrowUpIcon : effectiveTrend === 'down' ? ArrowDownIcon : null;

  if (loading) {
    return (
      <Card variant="default" className={className}>
        <div className="animate-pulse">
          <div className="h-4 bg-bg-tertiary rounded w-1/2 mb-3"></div>
          <div className="h-8 bg-bg-tertiary rounded w-3/4 mb-2"></div>
          <div className="h-3 bg-bg-tertiary rounded w-1/3"></div>
        </div>
      </Card>
    );
  }

  const cardContent = (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-text-secondary uppercase tracking-wide">
            {title}
          </h3>
        </div>
        {icon && (
          <div className={`text-${color} opacity-80`}>
            {icon}
          </div>
        )}
      </div>

      {/* Value */}
      <div className="flex items-baseline gap-2">
        <p className="text-2xl lg:text-3xl font-bold text-text-primary">
          {value}
        </p>
      </div>

      {/* Change indicator */}
      {change !== undefined && (
        <div className="flex items-center gap-1.5">
          {TrendIcon && (
            <TrendIcon className={`w-3 h-3 ${trendColors[effectiveTrend]}`} />
          )}
          <span className={`text-xs font-medium ${trendColors[effectiveTrend]}`}>
            {change > 0 ? '+' : ''}{change}%
          </span>
          {changeLabel && (
            <span className="text-xs text-text-tertiary">
              {changeLabel}
            </span>
          )}
        </div>
      )}

      {/* Expanded content */}
      {isExpanded && expandedContent && (
        <div className="pt-3 border-t border-border-color animate-fade-in-up">
          {expandedContent}
        </div>
      )}
    </div>
  );

  return (
    <Card
      variant="interactive"
      expandable={!!expandedContent}
      expanded={isExpanded}
      onExpandChange={setIsExpanded}
      className={className}
    >
      {cardContent}
    </Card>
  );
};

export default MetricCard;
