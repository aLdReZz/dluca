import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { PlusIcon } from './Icons';
import { triggerHaptic, HapticPattern } from '../utils/haptics';

export interface FABProps {
  icon?: React.ReactNode;
  onClick?: () => void;
  onLongPress?: () => void;
  label?: string;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
  showOnMobile?: boolean;
  showOnTablet?: boolean;
  showOnDesktop?: boolean;
  className?: string;
  'aria-label'?: string;
}

const FAB: React.FC<FABProps> = ({
  icon = <PlusIcon className="w-6 h-6" />,
  onClick,
  onLongPress,
  label,
  position = 'bottom-right',
  showOnMobile = true,
  showOnTablet = true,
  showOnDesktop = false,
  className = '',
  'aria-label': ariaLabel = 'Floating action button',
}) => {
  const [isPressed, setIsPressed] = useState(false);
  const longPressTimerRef = React.useRef<NodeJS.Timeout | null>(null);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-6 left-6',
  };

  const visibilityClasses = [
    showOnMobile ? 'block' : 'hidden',
    showOnTablet ? 'sm:block' : 'sm:hidden',
    showOnDesktop ? 'lg:block' : 'lg:hidden',
  ].join(' ');

  const handleTouchStart = () => {
    setIsPressed(true);

    if (onLongPress) {
      longPressTimerRef.current = setTimeout(() => {
        triggerHaptic(HapticPattern.Heavy);
        onLongPress();
        setIsPressed(false);
      }, 500);
    }
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    if (isPressed && onClick) {
      triggerHaptic(HapticPattern.Light);
      onClick();
    }

    setIsPressed(false);
  };

  const handleClick = () => {
    if (onClick) {
      triggerHaptic(HapticPattern.Light);
      onClick();
    }
  };

  const fabContent = (
    <button
      className={`
        fixed ${positionClasses[position]} ${visibilityClasses}
        w-14 h-14
        flex items-center justify-center
        bg-gradient-to-br from-accent-blue to-accent-cyan
        text-white
        rounded-full
        shadow-xl hover:shadow-glow-blue
        transition-all duration-200
        ${isPressed ? 'scale-90' : 'hover:scale-105'}
        active:scale-90
        z-[1000]
        ${className}
      `}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchCancel={handleTouchEnd}
      aria-label={ariaLabel}
      role="button"
    >
      {icon}
      {label && (
        <span className="sr-only">{label}</span>
      )}
    </button>
  );

  // Render FAB in a portal to ensure it's always on top
  return createPortal(fabContent, document.body);
};

export default FAB;
