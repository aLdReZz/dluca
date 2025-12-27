import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from './Icons';
import { triggerHaptic, HapticPattern } from '../utils/haptics';

export interface SpeedDialAction {
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
  color?: string;
}

export interface SpeedDialProps {
  actions: SpeedDialAction[];
  open: boolean;
  onClose: () => void;
  position?: 'bottom-right' | 'bottom-center' | 'bottom-left';
}

const SpeedDial: React.FC<SpeedDialProps> = ({
  actions,
  open,
  onClose,
  position = 'bottom-right',
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setIsAnimating(true);
    }
  }, [open]);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-center': 'bottom-6 left-1/2 -translate-x-1/2',
    'bottom-left': 'bottom-6 left-6',
  };

  const handleActionClick = (action: SpeedDialAction) => {
    triggerHaptic(HapticPattern.Light);
    action.onClick();
    onClose();
  };

  const handleClose = () => {
    triggerHaptic(HapticPattern.Light);
    setIsAnimating(false);
    setTimeout(onClose, 200); // Wait for animation
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!open && !isAnimating) return null;

  const speedDialContent = (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/40 backdrop-blur-sm z-[999]
          transition-opacity duration-200
          ${open ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Actions Container */}
      <div
        className={`
          fixed ${positionClasses[position]} z-[1000]
          flex flex-col-reverse items-center gap-3
        `}
      >
        {/* Close Button (replaces FAB when open) */}
        <button
          className={`
            w-14 h-14
            flex items-center justify-center
            bg-gradient-to-br from-accent-red to-accent-orange
            text-white
            rounded-full
            shadow-xl
            transition-all duration-200
            ${open ? 'scale-100 rotate-0' : 'scale-0 rotate-90'}
          `}
          onClick={handleClose}
          aria-label="Close speed dial"
        >
          <XMarkIcon className="w-6 h-6" />
        </button>

        {/* Action Buttons */}
        {actions.map((action, index) => (
          <div
            key={index}
            className={`
              flex items-center gap-3
              transition-all duration-200
              ${open ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}
            `}
            style={{
              transitionDelay: open ? `${index * 50}ms` : '0ms',
            }}
          >
            {/* Label */}
            <div className="bg-bg-secondary text-text-primary text-sm font-medium px-3 py-2 rounded-lg shadow-md whitespace-nowrap">
              {action.label}
            </div>

            {/* Action Button */}
            <button
              className={`
                w-12 h-12
                flex items-center justify-center
                ${action.color || 'bg-bg-tertiary'}
                text-white
                rounded-full
                shadow-lg
                hover:scale-110
                active:scale-95
                transition-transform duration-150
              `}
              onClick={() => handleActionClick(action)}
              aria-label={action.label}
            >
              {action.icon}
            </button>
          </div>
        ))}
      </div>
    </>
  );

  return createPortal(speedDialContent, document.body);
};

export default SpeedDial;
