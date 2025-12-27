import React, { ReactNode, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from './Icons';
import { triggerHaptic, HapticPattern } from '../utils/haptics';

export interface QuickDrawerProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  width?: string;
  position?: 'left' | 'right';
}

const QuickDrawer: React.FC<QuickDrawerProps> = ({
  open,
  onClose,
  title = 'Quick Access',
  children,
  width = '80%',
  position = 'left',
}) => {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (open) {
      setIsAnimating(true);
      triggerHaptic(HapticPattern.Medium);
    }
  }, [open]);

  const handleClose = () => {
    triggerHaptic(HapticPattern.Light);
    setIsAnimating(false);
    setTimeout(onClose, 300); // Wait for slide-out animation
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // Prevent body scroll when drawer is open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  if (!open && !isAnimating) return null;

  const translateClass = position === 'left'
    ? (open ? 'translate-x-0' : '-translate-x-full')
    : (open ? 'translate-x-0' : 'translate-x-full');

  const positionClass = position === 'left' ? 'left-0' : 'right-0';

  const drawerContent = (
    <>
      {/* Backdrop */}
      <div
        className={`
          fixed inset-0 bg-black/50 backdrop-blur-sm z-[998]
          transition-opacity duration-300
          ${open ? 'opacity-100' : 'opacity-0'}
        `}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />

      {/* Drawer */}
      <div
        className={`
          fixed top-0 ${positionClass} bottom-0 z-[999]
          bg-bg-secondary
          shadow-2xl
          transform transition-transform duration-300 ease-out
          ${translateClass}
          flex flex-col
        `}
        style={{
          width,
          maxWidth: '320px',
        }}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-border-color">
          <h2 className="text-lg font-semibold text-text-primary">
            {title}
          </h2>
          <button
            onClick={handleClose}
            className="p-2 hover:bg-hover-bg rounded-lg transition-colors"
            aria-label="Close drawer"
          >
            <XMarkIcon className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {children}
        </div>
      </div>
    </>
  );

  return createPortal(drawerContent, document.body);
};

export default QuickDrawer;
