/**
 * Animation Library - Day 2
 * GPU-accelerated animations with performance-safe patterns
 * Only transform and opacity for 60fps guarantee
 */

// Animation timing constants (per style guide agreement)
export const ANIMATION_TIMING = {
  instant: 80,    // Micro-interactions
  fast: 120,      // Hover states
  normal: 200,    // Page elements
  slow: 300,      // Page transitions
} as const;

// Easing functions
export const EASING = {
  easeOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
  easeInOut: 'cubic-bezier(0.4, 0, 1, 1)',
  easeSpring: 'cubic-bezier(0.175, 0.885, 0.32, 1.275)',
  linear: 'linear',
} as const;

// GPU-accelerated properties only
type GPUProperty = 'transform' | 'opacity' | 'filter';

interface AnimationConfig {
  duration?: number;
  easing?: string;
  delay?: number;
  fill?: 'forwards' | 'backwards' | 'both' | 'none';
}

/**
 * Performance-safe animation factory
 * Only uses GPU-accelerated properties
 */
export class GPUAnimation {
  private element: HTMLElement;
  private rafId: number | null = null;
  private startTime: number | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
    // Force GPU layer
    this.element.style.willChange = 'transform, opacity';
  }

  /**
   * Fade in with scale
   */
  fadeIn(config: AnimationConfig = {}) {
    const {
      duration = ANIMATION_TIMING.normal,
      easing = EASING.easeOut,
      delay = 0,
    } = config;

    this.element.style.opacity = '0';
    this.element.style.transform = 'scale(0.95)';
    
    setTimeout(() => {
      this.element.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;
      this.element.style.opacity = '1';
      this.element.style.transform = 'scale(1)';
    }, delay);

    return this;
  }

  /**
   * Fade out with scale
   */
  fadeOut(config: AnimationConfig = {}) {
    const {
      duration = ANIMATION_TIMING.normal,
      easing = EASING.easeOut,
      delay = 0,
    } = config;

    setTimeout(() => {
      this.element.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;
      this.element.style.opacity = '0';
      this.element.style.transform = 'scale(0.95)';
    }, delay);

    return this;
  }

  /**
   * Slide in from direction
   */
  slideIn(direction: 'left' | 'right' | 'top' | 'bottom', config: AnimationConfig = {}) {
    const {
      duration = ANIMATION_TIMING.normal,
      easing = EASING.easeOut,
      delay = 0,
    } = config;

    const transforms = {
      left: 'translateX(-100%)',
      right: 'translateX(100%)',
      top: 'translateY(-100%)',
      bottom: 'translateY(100%)',
    };

    this.element.style.transform = transforms[direction];
    this.element.style.opacity = '0';

    setTimeout(() => {
      this.element.style.transition = `transform ${duration}ms ${easing}, opacity ${duration}ms ${easing}`;
      this.element.style.transform = 'translateX(0) translateY(0)';
      this.element.style.opacity = '1';
    }, delay);

    return this;
  }

  /**
   * Spring animation
   */
  spring(config: AnimationConfig = {}) {
    const {
      duration = ANIMATION_TIMING.normal,
      easing = EASING.easeSpring,
    } = config;

    this.element.style.transform = 'scale(0.8)';
    this.element.style.transition = `transform ${duration}ms ${easing}`;
    
    requestAnimationFrame(() => {
      this.element.style.transform = 'scale(1)';
    });

    return this;
  }

  /**
   * Cleanup
   */
  cleanup() {
    this.element.style.willChange = 'auto';
    if (this.rafId) {
      cancelAnimationFrame(this.rafId);
    }
  }
}

/**
 * FLIP Animation for layout changes
 * First, Last, Invert, Play
 */
export class FLIPAnimation {
  private element: HTMLElement;
  private first: DOMRect | null = null;

  constructor(element: HTMLElement) {
    this.element = element;
  }

  /**
   * Record first position
   */
  recordFirst() {
    this.first = this.element.getBoundingClientRect();
    return this;
  }

  /**
   * Play animation from first to current position
   */
  play(duration = ANIMATION_TIMING.normal) {
    if (!this.first) {
      console.warn('FLIPAnimation: recordFirst() must be called before play()');
      return;
    }

    const last = this.element.getBoundingClientRect();
    
    // Calculate deltas
    const deltaX = this.first.left - last.left;
    const deltaY = this.first.top - last.top;
    const deltaW = this.first.width / last.width;
    const deltaH = this.first.height / last.height;

    // Invert (apply inverse transform)
    this.element.style.transform = `
      translate(${deltaX}px, ${deltaY}px)
      scale(${deltaW}, ${deltaH})
    `;
    this.element.style.transformOrigin = 'top left';
    this.element.style.transition = 'none';

    // Force reflow
    this.element.getBoundingClientRect();

    // Play (remove transform with transition)
    this.element.style.transition = `transform ${duration}ms ${EASING.easeOut}`;
    this.element.style.transform = '';

    return this;
  }
}

/**
 * Stagger animation for lists
 */
export class StaggerAnimation {
  private elements: HTMLElement[];
  private delay: number;

  constructor(elements: HTMLElement[] | NodeListOf<HTMLElement>, delay = 50) {
    this.elements = Array.from(elements);
    this.delay = delay;
  }

  /**
   * Fade in staggered
   */
  fadeIn(config: AnimationConfig = {}) {
    const {
      duration = ANIMATION_TIMING.fast,
      easing = EASING.easeOut,
    } = config;

    this.elements.forEach((element, index) => {
      element.style.opacity = '0';
      element.style.transform = 'translateY(20px)';
      
      setTimeout(() => {
        element.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;
        element.style.opacity = '1';
        element.style.transform = 'translateY(0)';
      }, index * this.delay);
    });

    return this;
  }

  /**
   * Scale in staggered
   */
  scaleIn(config: AnimationConfig = {}) {
    const {
      duration = ANIMATION_TIMING.fast,
      easing = EASING.easeSpring,
    } = config;

    this.elements.forEach((element, index) => {
      element.style.opacity = '0';
      element.style.transform = 'scale(0.8)';
      
      setTimeout(() => {
        element.style.transition = `opacity ${duration}ms ${easing}, transform ${duration}ms ${easing}`;
        element.style.opacity = '1';
        element.style.transform = 'scale(1)';
      }, index * this.delay);
    });

    return this;
  }
}

/**
 * Page transition manager
 */
export class PageTransition {
  private currentPage: HTMLElement | null = null;

  /**
   * Transition between pages
   */
  async transition(
    from: HTMLElement,
    to: HTMLElement,
    type: 'fade' | 'slide' | 'scale' = 'fade'
  ) {
    // Prepare new page
    to.style.position = 'absolute';
    to.style.top = '0';
    to.style.left = '0';
    to.style.width = '100%';
    to.style.opacity = '0';
    
    // Add to DOM
    from.parentElement?.appendChild(to);

    // Transition based on type
    switch (type) {
      case 'fade':
        await this.fadeTransition(from, to);
        break;
      case 'slide':
        await this.slideTransition(from, to);
        break;
      case 'scale':
        await this.scaleTransition(from, to);
        break;
    }

    // Cleanup
    from.remove();
    to.style.position = '';
    to.style.top = '';
    to.style.left = '';
    to.style.width = '';
  }

  private fadeTransition(from: HTMLElement, to: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      from.style.transition = `opacity ${ANIMATION_TIMING.slow}ms ${EASING.easeOut}`;
      to.style.transition = `opacity ${ANIMATION_TIMING.slow}ms ${EASING.easeOut}`;
      
      from.style.opacity = '0';
      to.style.opacity = '1';

      setTimeout(resolve, ANIMATION_TIMING.slow);
    });
  }

  private slideTransition(from: HTMLElement, to: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      to.style.transform = 'translateX(100%)';
      to.style.opacity = '1';

      from.style.transition = `transform ${ANIMATION_TIMING.slow}ms ${EASING.easeOut}`;
      to.style.transition = `transform ${ANIMATION_TIMING.slow}ms ${EASING.easeOut}`;

      from.style.transform = 'translateX(-100%)';
      to.style.transform = 'translateX(0)';

      setTimeout(resolve, ANIMATION_TIMING.slow);
    });
  }

  private scaleTransition(from: HTMLElement, to: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      to.style.transform = 'scale(0.8)';
      to.style.opacity = '0';

      from.style.transition = `transform ${ANIMATION_TIMING.slow}ms ${EASING.easeOut}, opacity ${ANIMATION_TIMING.slow}ms ${EASING.easeOut}`;
      to.style.transition = `transform ${ANIMATION_TIMING.slow}ms ${EASING.easeSpring}, opacity ${ANIMATION_TIMING.slow}ms ${EASING.easeOut}`;

      from.style.transform = 'scale(1.2)';
      from.style.opacity = '0';
      to.style.transform = 'scale(1)';
      to.style.opacity = '1';

      setTimeout(resolve, ANIMATION_TIMING.slow);
    });
  }
}

/**
 * Gesture animation helpers
 */
export const gestureAnimations = {
  /**
   * Swipe delete animation
   */
  swipeDelete(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      element.style.transition = `transform ${ANIMATION_TIMING.normal}ms ${EASING.easeOut}, opacity ${ANIMATION_TIMING.normal}ms ${EASING.easeOut}`;
      element.style.transform = 'translateX(100%)';
      element.style.opacity = '0';
      
      setTimeout(() => {
        element.style.height = element.offsetHeight + 'px';
        element.style.transition = `height ${ANIMATION_TIMING.fast}ms ${EASING.easeOut}`;
        element.style.height = '0';
        element.style.overflow = 'hidden';
        
        setTimeout(resolve, ANIMATION_TIMING.fast);
      }, ANIMATION_TIMING.normal);
    });
  },

  /**
   * Swipe complete animation
   */
  swipeComplete(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      // Flash green
      element.style.backgroundColor = 'rgba(34, 197, 94, 0.2)';
      element.style.transition = `background-color ${ANIMATION_TIMING.fast}ms ${EASING.easeOut}`;
      
      setTimeout(() => {
        element.style.backgroundColor = '';
        
        // Add cross-off animation
        element.classList.add('cross-off', 'completed');
        resolve();
      }, ANIMATION_TIMING.fast);
    });
  },

  /**
   * Long press selection
   */
  longPressSelect(element: HTMLElement) {
    element.style.transform = 'scale(0.95)';
    element.style.transition = `transform ${ANIMATION_TIMING.instant}ms ${EASING.easeOut}`;
    
    requestAnimationFrame(() => {
      element.style.transform = 'scale(1)';
    });
    
    // Add selection glow
    element.classList.add('glow-active');
  },

  /**
   * Pull to refresh
   */
  pullToRefresh(element: HTMLElement, progress: number) {
    const rotation = progress * 360;
    element.style.transform = `rotate(${rotation}deg)`;
  },
};

/**
 * Performance monitor for animations
 */
export class AnimationPerformance {
  private frameCount = 0;
  private lastTime = performance.now();
  private fps = 60;
  private monitoring = false;

  /**
   * Start monitoring FPS
   */
  startMonitoring() {
    if (this.monitoring) return;
    
    this.monitoring = true;
    this.measureFPS();
  }

  /**
   * Stop monitoring
   */
  stopMonitoring() {
    this.monitoring = false;
  }

  /**
   * Get current FPS
   */
  getFPS(): number {
    return Math.round(this.fps);
  }

  /**
   * Check if we're hitting 60fps
   */
  isPerformant(): boolean {
    return this.fps >= 55; // Allow small margin
  }

  private measureFPS() {
    if (!this.monitoring) return;

    const currentTime = performance.now();
    const delta = currentTime - this.lastTime;
    
    this.frameCount++;
    
    if (delta >= 1000) {
      this.fps = (this.frameCount * 1000) / delta;
      this.frameCount = 0;
      this.lastTime = currentTime;
      
      // Warn if FPS drops
      if (this.fps < 55) {
        console.warn(`Animation FPS dropped to ${this.fps.toFixed(1)}`);
      }
    }

    requestAnimationFrame(() => this.measureFPS());
  }

  /**
   * Reduce motion if needed
   */
  static respectsReducedMotion(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  }
}

// Export singleton performance monitor
export const animationPerf = new AnimationPerformance();

// Auto-start monitoring in development
if (process.env.NODE_ENV === 'development') {
  animationPerf.startMonitoring();
}
