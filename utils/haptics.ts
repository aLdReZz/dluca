/**
 * Haptic Feedback Utility
 * Provides tactile feedback for touch interactions on supported devices
 */

export enum HapticPattern {
  Light = 10,      // Button tap, selection
  Medium = 20,     // Swipe action, toggle
  Heavy = 30,      // Long press, important action
}

export interface HapticOptions {
  pattern?: HapticPattern | number[];
  enabled?: boolean;
}

class HapticsManager {
  private isSupported: boolean;
  private isEnabled: boolean;

  constructor() {
    this.isSupported = 'vibrate' in navigator;
    this.isEnabled = true;
  }

  /**
   * Trigger a haptic feedback pattern
   */
  impact(pattern: HapticPattern | number[] = HapticPattern.Light): void {
    if (!this.isSupported || !this.isEnabled) return;

    try {
      navigator.vibrate(pattern);
    } catch (error) {
      console.warn('Haptic feedback failed:', error);
    }
  }

  /**
   * Light haptic for selections and taps
   */
  selection(): void {
    this.impact(HapticPattern.Light);
  }

  /**
   * Medium haptic for swipe actions
   */
  swipe(): void {
    this.impact(HapticPattern.Medium);
  }

  /**
   * Heavy haptic for long press
   */
  longPress(): void {
    this.impact(HapticPattern.Heavy);
  }

  /**
   * Success notification pattern (double tap)
   */
  success(): void {
    this.impact([10, 50, 10]);
  }

  /**
   * Error notification pattern (triple pulse)
   */
  error(): void {
    this.impact([20, 100, 20, 100, 20]);
  }

  /**
   * Warning notification pattern (single long)
   */
  warning(): void {
    this.impact([30, 50, 30]);
  }

  /**
   * Enable haptic feedback
   */
  enable(): void {
    this.isEnabled = true;
  }

  /**
   * Disable haptic feedback
   */
  disable(): void {
    this.isEnabled = false;
  }

  /**
   * Check if haptics are supported
   */
  get supported(): boolean {
    return this.isSupported;
  }

  /**
   * Check if haptics are currently enabled
   */
  get enabled(): boolean {
    return this.isEnabled && this.isSupported;
  }
}

// Export singleton instance
export const haptics = new HapticsManager();

// Export convenience functions
export const triggerHaptic = (pattern: HapticPattern | number[]) => haptics.impact(pattern);
export const selectionHaptic = () => haptics.selection();
export const swipeHaptic = () => haptics.swipe();
export const longPressHaptic = () => haptics.longPress();
export const successHaptic = () => haptics.success();
export const errorHaptic = () => haptics.error();
export const warningHaptic = () => haptics.warning();
