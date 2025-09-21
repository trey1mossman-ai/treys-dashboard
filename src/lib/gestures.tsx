/**
 * Gesture Recognition System - Day 3
 * Touch gestures for mobile interactions
 */

import { useEffect, useRef, useCallback, useState } from 'react';

export interface GestureEvent {
  type: 'swipe' | 'pinch' | 'rotate' | 'tap' | 'longpress' | 'pan';
  direction?: 'up' | 'down' | 'left' | 'right';
  deltaX?: number;
  deltaY?: number;
  distance?: number;
  scale?: number;
  rotation?: number;
  velocity?: number;
  center?: { x: number; y: number };
}

export interface GestureConfig {
  onSwipe?: (direction: 'up' | 'down' | 'left' | 'right', velocity: number) => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinch?: (scale: number) => void;
  onRotate?: (angle: number) => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  onPan?: (deltaX: number, deltaY: number) => void;
  onPanStart?: () => void;
  onPanEnd?: () => void;
  
  // Thresholds
  swipeThreshold?: number; // minimum distance for swipe (default: 50px)
  swipeVelocityThreshold?: number; // minimum velocity (default: 0.3)
  tapThreshold?: number; // maximum movement for tap (default: 10px)
  tapTimeout?: number; // maximum time for tap (default: 200ms)
  doubleTapTimeout?: number; // maximum time between taps (default: 300ms)
  longPressTimeout?: number; // minimum time for long press (default: 500ms)
  
  // Options
  preventDefault?: boolean;
  stopPropagation?: boolean;
  enableMouse?: boolean; // Support mouse events too
  enableHaptic?: boolean;
}

interface TouchPoint {
  id: number;
  x: number;
  y: number;
  startX: number;
  startY: number;
  startTime: number;
}

export function useGestures(config: GestureConfig) {
  const elementRef = useRef<HTMLElement | null>(null);
  const touchesRef = useRef<Map<number, TouchPoint>>(new Map());
  const gestureStateRef = useRef({
    isGesturing: false,
    lastTapTime: 0,
    longPressTimer: null as NodeJS.Timeout | null,
    panStarted: false,
    initialDistance: 0,
    initialAngle: 0,
  });

  // Default thresholds
  const swipeThreshold = config.swipeThreshold ?? 50;
  const swipeVelocityThreshold = config.swipeVelocityThreshold ?? 0.3;
  const tapThreshold = config.tapThreshold ?? 10;
  const tapTimeout = config.tapTimeout ?? 200;
  const doubleTapTimeout = config.doubleTapTimeout ?? 300;
  const longPressTimeout = config.longPressTimeout ?? 500;

  // Haptic feedback
  const triggerHaptic = useCallback((pattern: number | number[] = 10) => {
    if (config.enableHaptic && 'vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }, [config.enableHaptic]);

  // Calculate distance between two points
  const getDistance = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  }, []);

  // Calculate angle between two points
  const getAngle = useCallback((x1: number, y1: number, x2: number, y2: number) => {
    return Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  }, []);

  // Get center point of touches
  const getCenter = useCallback((touches: TouchPoint[]) => {
    const sumX = touches.reduce((sum, t) => sum + t.x, 0);
    const sumY = touches.reduce((sum, t) => sum + t.y, 0);
    return {
      x: sumX / touches.length,
      y: sumY / touches.length,
    };
  }, []);

  // Handle touch start
  const handleTouchStart = useCallback((e: TouchEvent) => {
    if (config.preventDefault) e.preventDefault();
    if (config.stopPropagation) e.stopPropagation();

    const now = Date.now();

    // Update touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      touchesRef.current.set(touch.identifier, {
        id: touch.identifier,
        x: touch.clientX,
        y: touch.clientY,
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: now,
      });
    }

    const touches = Array.from(touchesRef.current.values());

    // Single touch - check for tap/long press
    if (touches.length === 1) {
      // Check for double tap
      if (now - gestureStateRef.current.lastTapTime < doubleTapTimeout) {
        config.onDoubleTap?.();
        triggerHaptic([10, 10, 10]);
        gestureStateRef.current.lastTapTime = 0;
      }

      // Start long press timer
      if (config.onLongPress) {
        gestureStateRef.current.longPressTimer = setTimeout(() => {
          const touch = touches[0];
          const distance = getDistance(touch.startX, touch.startY, touch.x, touch.y);
          
          if (distance < tapThreshold) {
            config.onLongPress();
            triggerHaptic([50, 50, 50]);
            gestureStateRef.current.isGesturing = true;
          }
        }, longPressTimeout);
      }
    }
    // Multi-touch - prepare for pinch/rotate
    else if (touches.length === 2) {
      // Cancel long press
      if (gestureStateRef.current.longPressTimer) {
        clearTimeout(gestureStateRef.current.longPressTimer);
        gestureStateRef.current.longPressTimer = null;
      }

      // Calculate initial distance and angle
      gestureStateRef.current.initialDistance = getDistance(
        touches[0].x, touches[0].y,
        touches[1].x, touches[1].y
      );
      gestureStateRef.current.initialAngle = getAngle(
        touches[0].x, touches[0].y,
        touches[1].x, touches[1].y
      );
    }

    gestureStateRef.current.isGesturing = true;
  }, [config, triggerHaptic, getDistance, getAngle, tapThreshold, doubleTapTimeout, longPressTimeout]);

  // Handle touch move
  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (!gestureStateRef.current.isGesturing) return;
    
    if (config.preventDefault) e.preventDefault();
    if (config.stopPropagation) e.stopPropagation();

    // Update touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const storedTouch = touchesRef.current.get(touch.identifier);
      
      if (storedTouch) {
        storedTouch.x = touch.clientX;
        storedTouch.y = touch.clientY;
      }
    }

    const touches = Array.from(touchesRef.current.values());

    // Cancel long press if moved too much
    if (gestureStateRef.current.longPressTimer && touches.length === 1) {
      const touch = touches[0];
      const distance = getDistance(touch.startX, touch.startY, touch.x, touch.y);
      
      if (distance > tapThreshold) {
        clearTimeout(gestureStateRef.current.longPressTimer);
        gestureStateRef.current.longPressTimer = null;
      }
    }

    // Single touch - pan
    if (touches.length === 1 && config.onPan) {
      const touch = touches[0];
      const deltaX = touch.x - touch.startX;
      const deltaY = touch.y - touch.startY;

      if (!gestureStateRef.current.panStarted) {
        config.onPanStart?.();
        gestureStateRef.current.panStarted = true;
      }

      config.onPan(deltaX, deltaY);
    }
    // Multi-touch - pinch/rotate
    else if (touches.length === 2) {
      const distance = getDistance(
        touches[0].x, touches[0].y,
        touches[1].x, touches[1].y
      );
      const angle = getAngle(
        touches[0].x, touches[0].y,
        touches[1].x, touches[1].y
      );

      // Pinch
      if (config.onPinch && gestureStateRef.current.initialDistance > 0) {
        const scale = distance / gestureStateRef.current.initialDistance;
        config.onPinch(scale);
      }

      // Rotate
      if (config.onRotate) {
        const rotation = angle - gestureStateRef.current.initialAngle;
        config.onRotate(rotation);
      }
    }
  }, [config, getDistance, getAngle, tapThreshold]);

  // Handle touch end
  const handleTouchEnd = useCallback((e: TouchEvent) => {
    if (!gestureStateRef.current.isGesturing) return;
    
    if (config.preventDefault) e.preventDefault();
    if (config.stopPropagation) e.stopPropagation();

    const now = Date.now();

    // Process ended touches
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      const storedTouch = touchesRef.current.get(touch.identifier);

      if (storedTouch) {
        const deltaX = storedTouch.x - storedTouch.startX;
        const deltaY = storedTouch.y - storedTouch.startY;
        const distance = getDistance(storedTouch.startX, storedTouch.startY, storedTouch.x, storedTouch.y);
        const duration = now - storedTouch.startTime;
        const velocity = distance / duration;

        // Check for tap
        if (distance < tapThreshold && duration < tapTimeout && touchesRef.current.size === 1) {
          config.onTap?.();
          triggerHaptic(10);
          gestureStateRef.current.lastTapTime = now;
        }
        // Check for swipe
        else if (distance > swipeThreshold && velocity > swipeVelocityThreshold) {
          const absX = Math.abs(deltaX);
          const absY = Math.abs(deltaY);

          if (absX > absY) {
            // Horizontal swipe
            const direction = deltaX > 0 ? 'right' : 'left';
            config.onSwipe?.(direction, velocity);
            
            if (direction === 'left') {
              config.onSwipeLeft?.();
            } else {
              config.onSwipeRight?.();
            }
          } else {
            // Vertical swipe
            const direction = deltaY > 0 ? 'down' : 'up';
            config.onSwipe?.(direction, velocity);
            
            if (direction === 'up') {
              config.onSwipeUp?.();
            } else {
              config.onSwipeDown?.();
            }
          }

          triggerHaptic(20);
        }

        touchesRef.current.delete(touch.identifier);
      }
    }

    // Clean up if no more touches
    if (touchesRef.current.size === 0) {
      if (gestureStateRef.current.longPressTimer) {
        clearTimeout(gestureStateRef.current.longPressTimer);
        gestureStateRef.current.longPressTimer = null;
      }

      if (gestureStateRef.current.panStarted) {
        config.onPanEnd?.();
        gestureStateRef.current.panStarted = false;
      }

      gestureStateRef.current.isGesturing = false;
      gestureStateRef.current.initialDistance = 0;
      gestureStateRef.current.initialAngle = 0;
    }
  }, [config, triggerHaptic, getDistance, swipeThreshold, swipeVelocityThreshold, tapThreshold, tapTimeout]);

  // Mouse event handlers (optional)
  const handleMouseDown = useCallback((e: MouseEvent) => {
    if (!config.enableMouse) return;

    const fakeTouch = {
      identifier: -1,
      clientX: e.clientX,
      clientY: e.clientY,
    };

    handleTouchStart({
      preventDefault: () => e.preventDefault(),
      stopPropagation: () => e.stopPropagation(),
      changedTouches: [fakeTouch],
    } as any);
  }, [config.enableMouse, handleTouchStart]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!config.enableMouse || !gestureStateRef.current.isGesturing) return;

    const fakeTouch = {
      identifier: -1,
      clientX: e.clientX,
      clientY: e.clientY,
    };

    handleTouchMove({
      preventDefault: () => e.preventDefault(),
      stopPropagation: () => e.stopPropagation(),
      changedTouches: [fakeTouch],
    } as any);
  }, [config.enableMouse, handleTouchMove]);

  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!config.enableMouse || !gestureStateRef.current.isGesturing) return;

    const fakeTouch = {
      identifier: -1,
      clientX: e.clientX,
      clientY: e.clientY,
    };

    handleTouchEnd({
      preventDefault: () => e.preventDefault(),
      stopPropagation: () => e.stopPropagation(),
      changedTouches: [fakeTouch],
    } as any);
  }, [config.enableMouse, handleTouchEnd]);

  // Attach to element
  const attach = useCallback((element: HTMLElement | null) => {
    if (elementRef.current) {
      // Remove old listeners
      elementRef.current.removeEventListener('touchstart', handleTouchStart);
      elementRef.current.removeEventListener('touchmove', handleTouchMove);
      elementRef.current.removeEventListener('touchend', handleTouchEnd);
      elementRef.current.removeEventListener('touchcancel', handleTouchEnd);
      
      if (config.enableMouse) {
        elementRef.current.removeEventListener('mousedown', handleMouseDown);
        elementRef.current.removeEventListener('mousemove', handleMouseMove);
        elementRef.current.removeEventListener('mouseup', handleMouseUp);
        elementRef.current.removeEventListener('mouseleave', handleMouseUp);
      }
    }

    elementRef.current = element;

    if (element) {
      // Add new listeners
      element.addEventListener('touchstart', handleTouchStart, { passive: !config.preventDefault });
      element.addEventListener('touchmove', handleTouchMove, { passive: !config.preventDefault });
      element.addEventListener('touchend', handleTouchEnd, { passive: !config.preventDefault });
      element.addEventListener('touchcancel', handleTouchEnd, { passive: !config.preventDefault });
      
      if (config.enableMouse) {
        element.addEventListener('mousedown', handleMouseDown);
        element.addEventListener('mousemove', handleMouseMove);
        element.addEventListener('mouseup', handleMouseUp);
        element.addEventListener('mouseleave', handleMouseUp);
      }
    }
  }, [config, handleTouchStart, handleTouchMove, handleTouchEnd, handleMouseDown, handleMouseMove, handleMouseUp]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      attach(null);
      if (gestureStateRef.current.longPressTimer) {
        clearTimeout(gestureStateRef.current.longPressTimer);
      }
    };
  }, [attach]);

  return { ref: attach };
}

// Gesture component wrapper
interface GestureProps extends GestureConfig {
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export const Gesture: React.FC<GestureProps> = ({ children, className, style, ...config }) => {
  const { ref } = useGestures(config);

  return (
    <div ref={ref} className={className} style={style}>
      {children}
    </div>
  );
};
