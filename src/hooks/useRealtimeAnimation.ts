/**
 * Real-time Animation Hooks - Day 2
 * Connects WebSocket events to animation system
 */

import { useEffect, useRef, useCallback, useState } from 'react';
import { useWebSocket, WSEventType } from '@/services/websocket';
import { 
  GPUAnimation, 
  FLIPAnimation, 
  StaggerAnimation,
  gestureAnimations,
  ANIMATION_TIMING 
} from '@/lib/animations';

/**
 * Animate data updates in real-time
 */
export function useRealtimeAnimation() {
  const { on, off } = useWebSocket();
  const animationRefs = useRef<Map<string, GPUAnimation>>(new Map());

  useEffect(() => {
    // Handle data creation with animation
    const handleCreate = (payload: any) => {
      const element = document.getElementById(payload.data.id);
      if (element) {
        const anim = new GPUAnimation(element);
        anim.fadeIn({ duration: ANIMATION_TIMING.normal });
        animationRefs.current.set(payload.data.id, anim);
      }
    };

    // Handle data updates with animation
    const handleUpdate = (payload: any) => {
      const element = document.getElementById(payload.id);
      if (element) {
        // Flash update animation
        element.style.backgroundColor = 'rgba(0, 214, 255, 0.1)';
        setTimeout(() => {
          element.style.transition = `background-color ${ANIMATION_TIMING.fast}ms ease-out`;
          element.style.backgroundColor = '';
        }, ANIMATION_TIMING.instant);
      }
    };

    // Handle data deletion with animation
    const handleDelete = (payload: any) => {
      const element = document.getElementById(payload.id);
      if (element) {
        gestureAnimations.swipeDelete(element).then(() => {
          element.remove();
        });
      }
    };

    on(WSEventType.DATA_CREATE, handleCreate);
    on(WSEventType.DATA_UPDATE, handleUpdate);
    on(WSEventType.DATA_DELETE, handleDelete);

    return () => {
      off(WSEventType.DATA_CREATE, handleCreate);
      off(WSEventType.DATA_UPDATE, handleUpdate);
      off(WSEventType.DATA_DELETE, handleDelete);
      
      // Cleanup animations
      animationRefs.current.forEach(anim => anim.cleanup());
      animationRefs.current.clear();
    };
  }, [on, off]);
}

/**
 * Animate presence indicators for collaborative features
 */
export function usePresenceAnimation() {
  const { on, off } = useWebSocket();
  const cursorElements = useRef<Map<string, HTMLElement>>(new Map());

  useEffect(() => {
    const handlePresenceUpdate = (payload: { userId: string; cursor?: { x: number; y: number } }) => {
      if (!payload.cursor) return;

      let cursor = cursorElements.current.get(payload.userId);
      
      if (!cursor) {
        cursor = document.createElement('div');
        cursor.className = 'presence-cursor';
        cursor.style.cssText = `
          position: fixed;
          width: 20px;
          height: 20px;
          border-radius: 50%;
          background: var(--accent);
          pointer-events: none;
          z-index: 9999;
          transition: transform ${ANIMATION_TIMING.fast}ms ease-out;
        `;
        document.body.appendChild(cursor);
        cursorElements.current.set(payload.userId, cursor);
      }

      // Animate cursor movement
      cursor.style.transform = `translate(${payload.cursor.x}px, ${payload.cursor.y}px)`;
    };

    const handlePresenceLeave = (payload: { userId: string }) => {
      const cursor = cursorElements.current.get(payload.userId);
      if (cursor) {
        const anim = new GPUAnimation(cursor);
        anim.fadeOut({ duration: ANIMATION_TIMING.fast });
        setTimeout(() => {
          cursor.remove();
          cursorElements.current.delete(payload.userId);
        }, ANIMATION_TIMING.fast);
      }
    };

    on(WSEventType.PRESENCE_UPDATE, handlePresenceUpdate);
    on(WSEventType.PRESENCE_LEAVE, handlePresenceLeave);

    return () => {
      off(WSEventType.PRESENCE_UPDATE, handlePresenceUpdate);
      off(WSEventType.PRESENCE_LEAVE, handlePresenceLeave);
      
      // Cleanup cursors
      cursorElements.current.forEach(cursor => cursor.remove());
      cursorElements.current.clear();
    };
  }, [on, off]);
}

/**
 * Optimistic update animations
 */
export function useOptimisticAnimation() {
  const { on, off } = useWebSocket();
  const pendingAnimations = useRef<Map<string, any>>(new Map());

  const startOptimistic = useCallback((elementId: string, action: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Add optimistic state
    element.classList.add('optimistic-pending');
    element.style.opacity = '0.7';
    
    // Store original state
    pendingAnimations.current.set(elementId, {
      action,
      originalOpacity: element.style.opacity,
    });

    // Add loading indicator
    const loader = document.createElement('div');
    loader.className = 'optimistic-loader spin';
    loader.style.cssText = `
      position: absolute;
      top: 50%;
      right: 10px;
      transform: translateY(-50%);
      width: 16px;
      height: 16px;
      border: 2px solid var(--accent);
      border-top-color: transparent;
      border-radius: 50%;
    `;
    element.appendChild(loader);
  }, []);

  const completeOptimistic = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    // Remove pending state
    element.classList.remove('optimistic-pending');
    element.style.opacity = '1';
    
    // Remove loader
    const loader = element.querySelector('.optimistic-loader');
    if (loader) {
      loader.remove();
    }

    // Success animation
    element.style.backgroundColor = 'rgba(34, 197, 94, 0.1)';
    setTimeout(() => {
      element.style.transition = `background-color ${ANIMATION_TIMING.normal}ms ease-out`;
      element.style.backgroundColor = '';
    }, ANIMATION_TIMING.fast);

    pendingAnimations.current.delete(elementId);
  }, []);

  const rollbackOptimistic = useCallback((elementId: string) => {
    const element = document.getElementById(elementId);
    if (!element) return;

    const pending = pendingAnimations.current.get(elementId);
    if (pending) {
      // Restore original state
      element.style.opacity = pending.originalOpacity;
    }

    // Remove pending state
    element.classList.remove('optimistic-pending');
    
    // Remove loader
    const loader = element.querySelector('.optimistic-loader');
    if (loader) {
      loader.remove();
    }

    // Error animation
    element.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
    
    // Shake animation
    element.style.animation = `shake ${ANIMATION_TIMING.fast}ms ease-out`;
    
    setTimeout(() => {
      element.style.transition = `background-color ${ANIMATION_TIMING.normal}ms ease-out`;
      element.style.backgroundColor = '';
      element.style.animation = '';
    }, ANIMATION_TIMING.normal);

    pendingAnimations.current.delete(elementId);
  }, []);

  useEffect(() => {
    const handleOptimisticStart = (payload: { id: string; action: string }) => {
      startOptimistic(payload.id, payload.action);
    };

    const handleOptimisticComplete = (payload: { id: string }) => {
      completeOptimistic(payload.id);
    };

    const handleOptimisticRollback = (payload: { id: string }) => {
      rollbackOptimistic(payload.id);
    };

    on(WSEventType.OPTIMISTIC_START, handleOptimisticStart);
    on(WSEventType.OPTIMISTIC_COMPLETE, handleOptimisticComplete);
    on(WSEventType.OPTIMISTIC_ROLLBACK, handleOptimisticRollback);

    return () => {
      off(WSEventType.OPTIMISTIC_START, handleOptimisticStart);
      off(WSEventType.OPTIMISTIC_COMPLETE, handleOptimisticComplete);
      off(WSEventType.OPTIMISTIC_ROLLBACK, handleOptimisticRollback);
    };
  }, [on, off, startOptimistic, completeOptimistic, rollbackOptimistic]);

  return {
    startOptimistic,
    completeOptimistic,
    rollbackOptimistic,
  };
}

/**
 * List animation for real-time updates
 */
export function useListAnimation(containerId: string) {
  const { on, off } = useWebSocket();
  const flipAnimation = useRef<FLIPAnimation | null>(null);

  useEffect(() => {
    const handleListUpdate = () => {
      const container = document.getElementById(containerId);
      if (!container) return;

      const items = Array.from(container.children) as HTMLElement[];
      
      // Record first positions
      if (flipAnimation.current) {
        flipAnimation.current.recordFirst();
      } else {
        items.forEach(item => {
          const flip = new FLIPAnimation(item);
          flip.recordFirst();
        });
      }

      // After DOM update, play animation
      requestAnimationFrame(() => {
        items.forEach(item => {
          const flip = new FLIPAnimation(item);
          flip.play(ANIMATION_TIMING.normal);
        });
      });
    };

    on(WSEventType.DATA_CREATE, handleListUpdate);
    on(WSEventType.DATA_UPDATE, handleListUpdate);
    on(WSEventType.DATA_DELETE, handleListUpdate);

    return () => {
      off(WSEventType.DATA_CREATE, handleListUpdate);
      off(WSEventType.DATA_UPDATE, handleListUpdate);
      off(WSEventType.DATA_DELETE, handleListUpdate);
    };
  }, [containerId, on, off]);
}

/**
 * Connection state animation
 */
export function useConnectionAnimation() {
  const { isConnected, connectionState } = useWebSocket();
  const indicatorRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const indicator = document.getElementById('connection-indicator');
    if (!indicator) return;
    
    indicatorRef.current = indicator;

    if (connectionState === 'connecting') {
      indicator.className = 'connection-indicator pulse';
      indicator.style.backgroundColor = 'var(--warning)';
    } else if (isConnected) {
      indicator.className = 'connection-indicator';
      indicator.style.backgroundColor = 'var(--success)';
      
      // Success pulse
      indicator.style.animation = `pulse ${ANIMATION_TIMING.slow}ms ease-out`;
      setTimeout(() => {
        indicator.style.animation = '';
      }, ANIMATION_TIMING.slow);
    } else {
      indicator.className = 'connection-indicator';
      indicator.style.backgroundColor = 'var(--error)';
    }
  }, [isConnected, connectionState]);
}

/**
 * Typing indicator animation
 */
export function useTypingAnimation(userId: string) {
  const [isTyping, setIsTyping] = useState(false);
  const { on, off, send } = useWebSocket();
  const typingTimeout = useRef<NodeJS.Timeout>();

  const startTyping = useCallback(() => {
    if (!isTyping) {
      setIsTyping(true);
      send({
        type: WSEventType.DATA_UPDATE,
        payload: { userId }
      });
    }

    // Reset timeout
    if (typingTimeout.current) {
      clearTimeout(typingTimeout.current);
    }

    typingTimeout.current = setTimeout(() => {
      setIsTyping(false);
      send({
        type: WSEventType.DATA_UPDATE,
        payload: { userId }
      });
    }, 1000);
  }, [isTyping, send, userId]);

  useEffect(() => {
    return () => {
      if (typingTimeout.current) {
        clearTimeout(typingTimeout.current);
      }
    };
  }, []);

  return { isTyping, startTyping };
}

// CSS for shake animation (add to animations.css)
const shakeKeyframes = `
@keyframes shake {
  0%, 100% { transform: translateX(0); }
  25% { transform: translateX(-5px); }
  75% { transform: translateX(5px); }
}
`;
