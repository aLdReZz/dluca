import React, { ReactNode } from 'react';
import { selectionHaptic, HapticPattern, triggerHaptic } from '../utils/haptics';

export interface TouchableProps {
  children: ReactNode;
  onTap: () => void;
  onLongPress?: () => void;
  haptic?: boolean;
  hapticPattern?: HapticPattern | number[];
  disabled?: boolean;
  className?: string;
  'aria-label'?: string;
}

const Touchable: React.FC<TouchableProps> = ({
  children,
  onTap,
  onLongPress,
  haptic = true,
  hapticPattern = HapticPattern.Light,
  disabled = false,
  className = '',
  'aria-label': ariaLabel,
}) => {
  const handleTap = () => {
    if (disabled) return;

    if (haptic) {
      triggerHaptic(hapticPattern);
    }

    onTap();
  };

  const handleLongPress = () => {
    if (disabled || !onLongPress) return;

    if (haptic) {
      triggerHaptic(HapticPattern.Heavy);
    }

    onLongPress();
  };

  return (
    <div
      className={`
        min-h-[44px] min-w-[44px]
        flex items-center justify-center
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}
        transition-transform duration-100
        ${className}
      `}
      onClick={handleTap}
      onContextMenu={(e) => {
        if (onLongPress) {
          e.preventDefault();
          handleLongPress();
        }
      }}
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label={ariaLabel}
      aria-disabled={disabled}
      onKeyDown={(e) => {
        if (disabled) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleTap();
        }
      }}
    >
      {children}
    </div>
  );
};

export default Touchable;
