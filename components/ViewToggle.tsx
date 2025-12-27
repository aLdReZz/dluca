import React from 'react';
import { Squares2X2Icon, TableCellsIcon } from './Icons';
import { triggerHaptic, HapticPattern } from '../utils/haptics';

export type ViewMode = 'card' | 'table';

export interface ViewToggleProps {
  view: ViewMode;
  onViewChange: (view: ViewMode) => void;
  showOnMobile?: boolean;
  showOnDesktop?: boolean;
  className?: string;
}

const ViewToggle: React.FC<ViewToggleProps> = ({
  view,
  onViewChange,
  showOnMobile = true,
  showOnDesktop = true,
  className = '',
}) => {
  const handleToggle = (newView: ViewMode) => {
    if (newView !== view) {
      triggerHaptic(HapticPattern.Light);
      onViewChange(newView);
    }
  };

  const visibilityClasses = [
    showOnMobile ? 'flex' : 'hidden',
    showOnDesktop ? 'lg:flex' : 'lg:hidden',
  ].join(' ');

  return (
    <div className={`${visibilityClasses} items-center gap-1 p-1 bg-bg-tertiary rounded-lg ${className}`}>
      <button
        onClick={() => handleToggle('card')}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md
          text-sm font-medium transition-all duration-200
          ${
            view === 'card'
              ? 'bg-accent-blue text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
          }
        `}
        aria-label="Card view"
        aria-pressed={view === 'card'}
      >
        <Squares2X2Icon className="w-4 h-4" />
        <span className="hidden sm:inline">Cards</span>
      </button>
      <button
        onClick={() => handleToggle('table')}
        className={`
          flex items-center gap-2 px-3 py-1.5 rounded-md
          text-sm font-medium transition-all duration-200
          ${
            view === 'table'
              ? 'bg-accent-blue text-white shadow-sm'
              : 'text-text-secondary hover:text-text-primary hover:bg-hover-bg'
          }
        `}
        aria-label="Table view"
        aria-pressed={view === 'table'}
      >
        <TableCellsIcon className="w-4 h-4" />
        <span className="hidden sm:inline">Table</span>
      </button>
    </div>
  );
};

export default ViewToggle;
