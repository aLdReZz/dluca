import { RefObject, useEffect, useRef } from 'react';

export type GestureDirection = 'left' | 'right' | 'up' | 'down';

export interface GestureConfig {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  threshold?: number;      // Minimum distance in pixels (default: 50)
  velocity?: number;       // Minimum velocity in px/ms (default: 0.3)
  preventScroll?: boolean; // Prevent default scroll behavior
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  currentX: number;
  currentY: number;
}

export const useGestures = (
  elementRef: RefObject<HTMLElement>,
  config: GestureConfig
) => {
  const {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold = 50,
    velocity = 0.3,
    preventScroll = false,
  } = config;

  const touchState = useRef<TouchState | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      touchState.current = {
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: Date.now(),
        currentX: touch.clientX,
        currentY: touch.clientY,
      };
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!touchState.current) return;

      const touch = e.touches[0];
      touchState.current.currentX = touch.clientX;
      touchState.current.currentY = touch.clientY;

      if (preventScroll) {
        e.preventDefault();
      }
    };

    const handleTouchEnd = () => {
      if (!touchState.current) return;

      const {
        startX,
        startY,
        startTime,
        currentX,
        currentY,
      } = touchState.current;

      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      const deltaTime = Date.now() - startTime;

      // Calculate velocity (px/ms)
      const velocityX = Math.abs(deltaX) / deltaTime;
      const velocityY = Math.abs(deltaY) / deltaTime;

      // Determine if gesture meets threshold and velocity requirements
      const isHorizontalSwipe = Math.abs(deltaX) > Math.abs(deltaY);
      const isVerticalSwipe = Math.abs(deltaY) > Math.abs(deltaX);

      // Horizontal swipes
      if (isHorizontalSwipe && Math.abs(deltaX) >= threshold && velocityX >= velocity) {
        if (deltaX > 0 && onSwipeRight) {
          onSwipeRight();
        } else if (deltaX < 0 && onSwipeLeft) {
          onSwipeLeft();
        }
      }

      // Vertical swipes
      if (isVerticalSwipe && Math.abs(deltaY) >= threshold && velocityY >= velocity) {
        if (deltaY > 0 && onSwipeDown) {
          onSwipeDown();
        } else if (deltaY < 0 && onSwipeUp) {
          onSwipeUp();
        }
      }

      touchState.current = null;
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: !preventScroll });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchEnd, { passive: true });

    // Cleanup
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchmove', handleTouchMove);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [
    elementRef,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    threshold,
    velocity,
    preventScroll,
  ]);
};
