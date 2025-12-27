import { RefObject, useEffect, useRef, useCallback } from 'react';
import { HapticPattern, triggerHaptic } from '../utils/haptics';

export interface LongPressConfig {
  onLongPress: () => void;
  delay?: number;           // Duration to hold before triggering (default: 500ms)
  moveThreshold?: number;   // Max movement in pixels to cancel (default: 10px)
  haptic?: boolean;         // Trigger haptic feedback (default: true)
}

interface TouchPosition {
  x: number;
  y: number;
}

export const useLongPress = (
  elementRef: RefObject<HTMLElement>,
  config: LongPressConfig
) => {
  const {
    onLongPress,
    delay = 500,
    moveThreshold = 10,
    haptic = true,
  } = config;

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const startPositionRef = useRef<TouchPosition | null>(null);
  const isLongPressTriggeredRef = useRef(false);

  const clearLongPressTimeout = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
    startPositionRef.current = null;
    isLongPressTriggeredRef.current = false;
  }, []);

  const handleLongPressStart = useCallback((x: number, y: number) => {
    clearLongPressTimeout();

    startPositionRef.current = { x, y };
    isLongPressTriggeredRef.current = false;

    timeoutRef.current = setTimeout(() => {
      if (startPositionRef.current) {
        isLongPressTriggeredRef.current = true;

        if (haptic) {
          triggerHaptic(HapticPattern.Heavy);
        }

        onLongPress();
      }
    }, delay);
  }, [onLongPress, delay, haptic, clearLongPressTimeout]);

  const handleMove = useCallback((x: number, y: number) => {
    if (!startPositionRef.current || isLongPressTriggeredRef.current) return;

    const deltaX = Math.abs(x - startPositionRef.current.x);
    const deltaY = Math.abs(y - startPositionRef.current.y);

    // Cancel if moved beyond threshold
    if (deltaX > moveThreshold || deltaY > moveThreshold) {
      clearLongPressTimeout();
    }
  }, [moveThreshold, clearLongPressTimeout]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleLongPressStart(touch.clientX, touch.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      handleMove(touch.clientX, touch.clientY);
    };

    const handleTouchEnd = () => {
      clearLongPressTimeout();
    };

    const handleMouseDown = (e: MouseEvent) => {
      handleLongPressStart(e.clientX, e.clientY);
    };

    const handleMouseMove = (e: MouseEvent) => {
      handleMove(e.clientX, e.clientY);
    };

    const handleMouseUp = () => {
      clearLongPressTimeout();
    };

    // Touch events
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    // Mouse events (for desktop testing)
    element.addEventListener('mousedown', handleMouseDown);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('mouseup', handleMouseUp);
    element.addEventListener('mouseleave', handleMouseUp);

    // Cleanup
    return () => {
      clearLongPressTimeout();

      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);

      element.removeEventListener('mousedown', handleMouseDown);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('mouseup', handleMouseUp);
      element.removeEventListener('mouseleave', handleMouseUp);
    };
  }, [elementRef, handleLongPressStart, handleMove, clearLongPressTimeout]);
};
