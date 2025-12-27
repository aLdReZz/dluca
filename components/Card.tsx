import React, { ReactNode, useState } from 'react';

export type CardVariant = 'default' | 'elevated' | 'interactive' | 'compact';

export interface CardProps {
  variant?: CardVariant;
  children: ReactNode;
  onTap?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  expandable?: boolean;
  expanded?: boolean;
  onExpandChange?: (expanded: boolean) => void;
  header?: ReactNode;
  footer?: ReactNode;
  className?: string;
  'aria-label'?: string;
}

const Card: React.FC<CardProps> = ({
  variant = 'default',
  children,
  onTap,
  expandable = false,
  expanded: controlledExpanded,
  onExpandChange,
  header,
  footer,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(false);
  const isExpanded = controlledExpanded !== undefined ? controlledExpanded : internalExpanded;

  const handleToggleExpand = () => {
    if (!expandable) return;

    const newExpanded = !isExpanded;
    if (onExpandChange) {
      onExpandChange(newExpanded);
    } else {
      setInternalExpanded(newExpanded);
    }
  };

  const handleClick = () => {
    if (expandable) {
      handleToggleExpand();
    } else if (onTap) {
      onTap();
    }
  };

  // Variant-specific classes
  const variantClasses = {
    default: 'bg-bg-secondary border border-border-color',
    elevated: 'bg-bg-secondary border border-border-color shadow-md hover:shadow-lg',
    interactive: 'bg-bg-secondary border border-border-color hover:scale-[1.01] hover:border-border-emphasis cursor-pointer',
    compact: 'bg-bg-secondary border border-border-color',
  };

  // Responsive padding
  const paddingClasses = {
    default: 'p-4 lg:p-5',
    elevated: 'p-4 lg:p-5',
    interactive: 'p-3 lg:p-4',
    compact: 'p-3',
  };

  const baseClasses = 'rounded-lg lg:rounded-xl transition-all duration-200';
  const interactiveClasses = (onTap || expandable) ? 'cursor-pointer' : '';

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${paddingClasses[variant]} ${interactiveClasses} ${className}`}
      onClick={handleClick}
      role={onTap || expandable ? 'button' : undefined}
      tabIndex={onTap || expandable ? 0 : undefined}
      aria-label={ariaLabel}
      aria-expanded={expandable ? isExpanded : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && (onTap || expandable)) {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {header && (
        <div className="mb-3 pb-3 border-b border-border-color">
          {header}
        </div>
      )}

      <div className={expandable && !isExpanded ? 'line-clamp-3' : ''}>
        {children}
      </div>

      {expandable && (
        <div className="mt-3 pt-3 border-t border-border-color flex justify-center">
          <button
            className="text-xs text-accent-blue hover:text-accent-blue/80 font-medium flex items-center gap-1"
            onClick={(e) => {
              e.stopPropagation();
              handleToggleExpand();
            }}
          >
            {isExpanded ? (
              <>
                Show Less
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
              </>
            ) : (
              <>
                Show More
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      )}

      {footer && (
        <div className="mt-3 pt-3 border-t border-border-color">
          {footer}
        </div>
      )}
    </div>
  );
};

export default Card;
