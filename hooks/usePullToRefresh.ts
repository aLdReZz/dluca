import { RefObject, useEffect, useRef, useState, useCallback } from 'react';
import { HapticPattern, triggerHaptic } from '../utils/haptics';

export interface PullToRefreshConfig {
  onRefresh: () => Promise<void> | void;
  threshold?: number;         // Distance to pull before triggering (default: 80px)
  maxPullDistance?: number;   // Maximum pull distance (default: 120px)
  resistance?: number;        // Pull resistance factor 0-1 (default: 0.5)
  haptic?: boolean;           // Trigger haptic feedback (default: true)
}

export interface PullToRefreshState {
  isPulling: boolean;
  isRefreshing: boolean;
  pullDistance: number;
  pullProgress: number; // 0 to 1
}

export const usePullToRefresh = (
  elementRef: RefObject<HTMLElement>,
  config: PullToRefreshConfig
): PullToRefreshState => {
  const {
    onRefresh,
    threshold = 80,
    maxPullDistance = 120,
    resistance = 0.5,
    haptic = true,
  } = config;

  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);

  const startYRef = useRef<number>(0);
  const currentYRef = useRef<number>(0);
  const scrollTopRef = useRef<number>(0);
  const hasTriggeredHapticRef = useRef(false);

  const calculatePullDistance = useCallback((deltaY: number): number => {
    // Apply resistance - more resistance as you pull further
    const resistedDistance = deltaY * resistance;
    return Math.min(resistedDistance, maxPullDistance);
  }, [resistance, maxPullDistance]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);

    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
      hasTriggeredHapticRef.current = false;
    }
  }, [onRefresh]);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      // Only allow pull-to-refresh when scrolled to top
      const scrollTop = element.scrollTop || window.scrollY;
      scrollTopRef.current = scrollTop;

      if (scrollTop === 0 && !isRefreshing) {
        startYRef.current = e.touches[0].clientY;
        currentYRef.current = e.touches[0].clientY;
        hasTriggeredHapticRef.current = false;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (isRefreshing || scrollTopRef.current > 0) return;

      currentYRef.current = e.touches[0].clientY;
      const deltaY = currentYRef.current - startYRef.current;

      // Only track downward pulls
      if (deltaY > 0) {
        setIsPulling(true);
        const distance = calculatePullDistance(deltaY);
        setPullDistance(distance);

        // Trigger haptic when reaching threshold
        if (distance >= threshold && haptic && !hasTriggeredHapticRef.current) {
          triggerHaptic(HapticPattern.Medium);
          hasTriggeredHapticRef.current = true;
        }

        // Prevent scroll bounce on iOS while pulling
        if (distance > 10) {
          e.preventDefault();
        }
      }
    };

    const handleTouchEnd = () => {
      if (!isPulling || isRefreshing) return;

      if (pullDistance >= threshold) {
        // Trigger refresh
        if (haptic) {
          triggerHaptic(HapticPattern.Heavy);
        }
        handleRefresh();
      } else {
        // Reset if didn't reach threshold
        setPullDistance(0);
        setIsPulling(false);
        hasTriggeredHapticRef.current = false;
      }
    };

    // Add event listeners
    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchmove', handleTouchMove, { passive: false });
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
    isPulling,
    isRefreshing,
    pullDistance,
    threshold,
    haptic,
    calculatePullDistance,
    handleRefresh,
  ]);

  const pullProgress = Math.min(pullDistance / threshold, 1);

  return {
    isPulling,
    isRefreshing,
    pullDistance,
    pullProgress,
  };
};
