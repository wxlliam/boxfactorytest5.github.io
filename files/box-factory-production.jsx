import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// ============================================================================
// ANALYTICS & TRACKING
// ============================================================================

class AnalyticsService {
  constructor() {
    this.events = [];
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
  }

  generateSessionId() {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  track(eventName, properties = {}) {
    const event = {
      name: eventName,
      timestamp: Date.now(),
      sessionId: this.sessionId,
      sessionDuration: Date.now() - this.startTime,
      ...properties,
    };

    this.events.push(event);

    // Send to your analytics service (Google Analytics, Segment, Mixpanel, etc.)
    if (typeof window !== 'undefined' && window.gtag) {
      window.gtag('event', eventName, properties);
    }

    // Debug mode - remove in production
    if (process.env.NODE_ENV === 'development') {
      console.log('📊 Analytics:', eventName, properties);
    }

    return event;
  }

  trackPerformance(metricName, value, unit = 'ms') {
    this.track('performance_metric', {
      metric: metricName,
      value,
      unit,
    });
  }

  trackInteraction(interactionType, details = {}) {
    this.track('user_interaction', {
      type: interactionType,
      ...details,
    });
  }

  trackError(error, context = {}) {
    this.track('error', {
      message: error.message,
      stack: error.stack,
      ...context,
    });

    // Send to error tracking service (Sentry, etc.)
    if (typeof window !== 'undefined' && window.Sentry) {
      window.Sentry.captureException(error, { extra: context });
    }
  }

  getSessionData() {
    return {
      sessionId: this.sessionId,
      duration: Date.now() - this.startTime,
      eventCount: this.events.length,
      events: this.events,
    };
  }
}

const analytics = new AnalyticsService();

// ============================================================================
// A/B TESTING FRAMEWORK
// ============================================================================

class ABTestingService {
  constructor() {
    this.experiments = new Map();
    this.userVariants = new Map();
  }

  /**
   * Define an A/B test experiment
   * @param {string} experimentId - Unique identifier for the experiment
   * @param {Array} variants - Array of variant objects with id, weight, and config
   */
  defineExperiment(experimentId, variants) {
    const totalWeight = variants.reduce((sum, v) => sum + v.weight, 0);
    
    if (Math.abs(totalWeight - 100) > 0.01) {
      console.warn(`Experiment ${experimentId} weights don't sum to 100: ${totalWeight}`);
    }

    this.experiments.set(experimentId, variants);
  }

  /**
   * Get assigned variant for a user
   * Uses localStorage for persistence across sessions
   */
  getVariant(experimentId, userId = null) {
    // Check if user already has an assignment
    const storageKey = `ab_${experimentId}`;
    const stored = localStorage.getItem(storageKey);
    
    if (stored) {
      const variant = JSON.parse(stored);
      this.userVariants.set(experimentId, variant);
      return variant;
    }

    // Assign new variant
    const variants = this.experiments.get(experimentId);
    if (!variants) {
      console.error(`Experiment ${experimentId} not found`);
      return null;
    }

    const assignedVariant = this.assignVariant(variants, userId);
    
    // Persist assignment
    localStorage.setItem(storageKey, JSON.stringify(assignedVariant));
    this.userVariants.set(experimentId, assignedVariant);

    // Track assignment
    analytics.track('ab_test_assigned', {
      experimentId,
      variantId: assignedVariant.id,
      variantName: assignedVariant.name,
    });

    return assignedVariant;
  }

  /**
   * Assign variant based on weighted random selection
   */
  assignVariant(variants, userId = null) {
    // Use userId for deterministic assignment, or random
    const rand = userId 
      ? this.hashUserId(userId) 
      : Math.random() * 100;

    let cumulative = 0;
    for (const variant of variants) {
      cumulative += variant.weight;
      if (rand <= cumulative) {
        return variant;
      }
    }

    return variants[variants.length - 1];
  }

  /**
   * Simple hash function for deterministic variant assignment
   */
  hashUserId(userId) {
    let hash = 0;
    for (let i = 0; i < userId.length; i++) {
      hash = ((hash << 5) - hash) + userId.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash) % 100;
  }

  /**
   * Track conversion for an experiment
   */
  trackConversion(experimentId, conversionType = 'default', value = 1) {
    const variant = this.userVariants.get(experimentId);
    
    if (!variant) {
      console.warn(`No variant found for experiment ${experimentId}`);
      return;
    }

    analytics.track('ab_test_conversion', {
      experimentId,
      variantId: variant.id,
      variantName: variant.name,
      conversionType,
      value,
    });
  }
}

const abTesting = new ABTestingService();

// Define experiments
abTesting.defineExperiment('landing_style', [
  { 
    id: 'control', 
    name: 'Original CRT Effect',
    weight: 50,
    config: {
      scanlineOpacity: 0.4,
      rgbPixelOpacity: 0.7,
      grainOpacity: 0.25,
      flickerEnabled: true,
    }
  },
  { 
    id: 'variant_a', 
    name: 'Subtle CRT Effect',
    weight: 50,
    config: {
      scanlineOpacity: 0.2,
      rgbPixelOpacity: 0.4,
      grainOpacity: 0.15,
      flickerEnabled: false,
    }
  },
]);

abTesting.defineExperiment('interaction_speed', [
  { 
    id: 'control', 
    name: 'Normal Speed',
    weight: 50,
    config: {
      transitionDuration: '0.15s',
      textRevealMultiplier: 1.5,
    }
  },
  { 
    id: 'variant_a', 
    name: 'Fast Speed',
    weight: 50,
    config: {
      transitionDuration: '0.08s',
      textRevealMultiplier: 2.0,
    }
  },
]);

// ============================================================================
// PERFORMANCE MONITORING
// ============================================================================

class PerformanceMonitor {
  constructor() {
    this.marks = new Map();
    this.measures = [];
  }

  mark(name) {
    this.marks.set(name, performance.now());
  }

  measure(name, startMark, endMark = null) {
    const startTime = this.marks.get(startMark);
    const endTime = endMark ? this.marks.get(endMark) : performance.now();
    
    if (startTime === undefined) {
      console.warn(`Start mark ${startMark} not found`);
      return null;
    }

    const duration = endTime - startTime;
    this.measures.push({ name, duration, timestamp: Date.now() });
    
    analytics.trackPerformance(name, duration);
    
    return duration;
  }

  measureRender(componentName, renderFn) {
    this.mark(`${componentName}_start`);
    const result = renderFn();
    this.mark(`${componentName}_end`);
    this.measure(`${componentName}_render`, `${componentName}_start`, `${componentName}_end`);
    return result;
  }

  getMetrics() {
    return {
      marks: Array.from(this.marks.entries()),
      measures: this.measures,
    };
  }
}

const perfMonitor = new PerformanceMonitor();

// ============================================================================
// CONSTANTS & CONFIGURATION
// ============================================================================

const CONFIG = {
  // Interaction parameters
  INTERACTION_RADIUS: 0.5,
  CUBE_SCALE_RANGE: 0.3,
  CUBE_SEPARATION: 40,
  PARALLAX_STRENGTH: 30,
  
  // Visual parameters
  PERSPECTIVE: 800,
  GRID_ROTATION: 60,
  GRID_SIZE: 60,
  
  // Performance
  MOUSEMOVE_THROTTLE: 16,
  
  // Typography
  FONT_SIZE: '1.75rem',
  LETTER_SPACING: '0.15em',
  
  // Math constants
  SQRT3_OVER_2: 0.866,
  
  // Loading
  MIN_LOADING_TIME: 800, // Minimum time to show loading screen
  FONT_LOAD_TIMEOUT: 3000, // Timeout for font loading
};

const FONTS = {
  primary: 'Orbitron',
  fallback: 'VT323',
  system: 'monospace',
};

const BRAND_TEXT = 'The Box Factory';

// ============================================================================
// ERROR BOUNDARY
// ============================================================================

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ error, errorInfo });
    analytics.trackError(error, { 
      componentStack: errorInfo.componentStack,
      boundary: 'BoxFactoryLanding',
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="w-full h-screen flex items-center justify-center bg-gray-900 text-white">
          <div className="text-center max-w-md p-8">
            <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
            <p className="text-gray-400 mb-6">
              We're sorry, but something unexpected happened. Please refresh the page to try again.
            </p>
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
            >
              Refresh Page
            </button>
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <details className="mt-8 text-left text-sm">
                <summary className="cursor-pointer text-red-400">Error Details</summary>
                <pre className="mt-4 p-4 bg-gray-800 rounded overflow-auto">
                  {this.state.error.toString()}
                  {this.state.errorInfo?.componentStack}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// LOADING SCREEN
// ============================================================================

const LoadingScreen = React.memo(({ progress }) => (
  <div 
    className="fixed inset-0 z-50 flex flex-col items-center justify-center"
    style={{
      background: 'radial-gradient(ellipse at center, #2d3538 0%, #0e1214 100%)',
    }}
  >
    <div className="text-center">
      {/* Loading Logo */}
      <div 
        className="mb-8"
        style={{
          filter: 'drop-shadow(0 0 20px rgba(180, 180, 180, 0.4))',
        }}
      >
        <svg width="120" height="120" viewBox="0 0 200 200">
          <path
            d="M100,40 L160,70 L100,100 L40,70 Z"
            fill="url(#topGradientLoading)"
          />
          <path
            d="M40,70 L100,100 L100,160 L40,130 Z"
            fill="url(#leftGradientLoading)"
          />
          <path
            d="M100,100 L160,70 L160,130 L100,160 Z"
            fill="url(#rightGradientLoading)"
          />
          <defs>
            <linearGradient id="topGradientLoading" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#d0d0d0" />
              <stop offset="100%" stopColor="#a0a0a0" />
            </linearGradient>
            <linearGradient id="leftGradientLoading" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#909090" />
              <stop offset="100%" stopColor="#606060" />
            </linearGradient>
            <linearGradient id="rightGradientLoading" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#b0b0b0" />
              <stop offset="100%" stopColor="#808080" />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Loading Text */}
      <div 
        className="text-xl mb-6"
        style={{
          fontFamily: `"${FONTS.primary}", "${FONTS.fallback}", ${FONTS.system}`,
          color: '#d8d8d8',
          letterSpacing: '0.15em',
          textShadow: '0 0 10px rgba(216, 216, 216, 0.6)',
        }}
      >
        LOADING
        <span className="inline-block animate-pulse">...</span>
      </div>

      {/* Progress Bar */}
      <div className="w-64 h-2 bg-gray-700 rounded-full overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-gray-400 to-gray-200 transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Percentage */}
      <div 
        className="mt-4 text-sm text-gray-400"
        style={{
          fontFamily: `"${FONTS.fallback}", monospace`,
        }}
      >
        {Math.round(progress)}%
      </div>
    </div>
  </div>
));

LoadingScreen.displayName = 'LoadingScreen';

// ============================================================================
// CUSTOM HOOKS
// ============================================================================

const useLoadingState = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [fontsLoaded, setFontsLoaded] = useState(false);

  useEffect(() => {
    perfMonitor.mark('page_load_start');

    // Simulate progressive loading with realistic steps
    const progressSteps = [
      { progress: 30, delay: 100 },  // Initial resources
      { progress: 60, delay: 300 },  // Fonts loading
      { progress: 90, delay: 200 },  // Final preparation
    ];

    let currentStep = 0;
    const runProgressStep = () => {
      if (currentStep < progressSteps.length) {
        const step = progressSteps[currentStep];
        setTimeout(() => {
          setProgress(step.progress);
          currentStep++;
          runProgressStep();
        }, step.delay);
      }
    };

    runProgressStep();

    // Font loading with timeout
    const fontLoadTimeout = setTimeout(() => {
      setFontsLoaded(true);
    }, CONFIG.FONT_LOAD_TIMEOUT);

    // Check if fonts are actually loaded
    if (document.fonts) {
      document.fonts.ready.then(() => {
        clearTimeout(fontLoadTimeout);
        setFontsLoaded(true);
      });
    } else {
      // Fallback if Font Loading API not supported
      setTimeout(() => setFontsLoaded(true), 1000);
    }

    return () => clearTimeout(fontLoadTimeout);
  }, []);

  useEffect(() => {
    if (fontsLoaded && progress >= 90) {
      // Ensure minimum loading time for smooth UX
      const elapsed = performance.now();
      const remaining = Math.max(0, CONFIG.MIN_LOADING_TIME - elapsed);

      setTimeout(() => {
        setProgress(100);
        setTimeout(() => {
          setLoading(false);
          perfMonitor.mark('page_load_end');
          perfMonitor.measure('total_page_load', 'page_load_start', 'page_load_end');
          
          analytics.track('page_loaded', {
            loadTime: performance.now(),
            fontsLoaded: true,
          });
        }, 200);
      }, remaining);
    }
  }, [fontsLoaded, progress]);

  return { loading, progress };
};

const useThrottledMousePosition = (throttleMs = CONFIG.MOUSEMOVE_THROTTLE) => {
  const [mousePos, setMousePos] = useState({ x: 0.5, y: 0.5 });
  const [logoDistance, setLogoDistance] = useState(1);
  const containerRef = useRef(null);
  const frameRef = useRef(null);
  const interactionCountRef = useRef(0);
  const lastTrackTimeRef = useRef(0);

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (frameRef.current) return;

      frameRef.current = requestAnimationFrame(() => {
        if (!containerRef.current) {
          frameRef.current = null;
          return;
        }

        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        
        setMousePos({ x, y });

        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const dx = e.clientX - rect.left - centerX;
        const dy = e.clientY - rect.top - centerY;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = Math.sqrt(centerX * centerX + centerY * centerY);
        const normalizedDistance = Math.max(0, Math.min(1, distance / (maxDistance * CONFIG.INTERACTION_RADIUS)));
        
        setLogoDistance(normalizedDistance);

        // Track interaction metrics (throttled to once per second)
        interactionCountRef.current++;
        const now = Date.now();
        if (now - lastTrackTimeRef.current > 1000) {
          analytics.trackInteraction('mouse_move', {
            distance: normalizedDistance,
            position: { x, y },
            interactionsPerSecond: interactionCountRef.current,
          });
          interactionCountRef.current = 0;
          lastTrackTimeRef.current = now;
        }

        frameRef.current = null;
      });
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
      }
    };
  }, []);

  return { mousePos, logoDistance, containerRef };
};

const useFontLoader = () => {
  useEffect(() => {
    perfMonitor.mark('font_load_start');
    
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=VT323&family=Press+Start+2P&family=Orbitron:wght@400;500;700&display=swap';
    link.rel = 'stylesheet';
    
    link.onload = () => {
      perfMonitor.mark('font_load_end');
      perfMonitor.measure('font_load_time', 'font_load_start', 'font_load_end');
    };
    
    document.head.appendChild(link);
    
    return () => {
      if (document.head.contains(link)) {
        document.head.removeChild(link);
      }
    };
  }, []);
};

const useABTest = (experimentId) => {
  const [variant, setVariant] = useState(null);

  useEffect(() => {
    const assignedVariant = abTesting.getVariant(experimentId);
    setVariant(assignedVariant);
  }, [experimentId]);

  const trackConversion = useCallback((conversionType, value) => {
    abTesting.trackConversion(experimentId, conversionType, value);
  }, [experimentId]);

  return { variant, trackConversion };
};

// Track time spent in different logo distance zones
const useEngagementTracking = (logoDistance) => {
  const zoneTimeRef = useRef({
    close: 0,   // 0-0.3
    medium: 0,  // 0.3-0.7
    far: 0,     // 0.7-1.0
  });
  const lastZoneRef = useRef(null);
  const lastTimeRef = useRef(Date.now());

  useEffect(() => {
    const now = Date.now();
    const elapsed = now - lastTimeRef.current;
    
    let currentZone;
    if (logoDistance < 0.3) currentZone = 'close';
    else if (logoDistance < 0.7) currentZone = 'medium';
    else currentZone = 'far';

    if (lastZoneRef.current) {
      zoneTimeRef.current[lastZoneRef.current] += elapsed;
    }

    lastZoneRef.current = currentZone;
    lastTimeRef.current = now;

    // Track engagement on unmount
    return () => {
      analytics.track('engagement_zones', zoneTimeRef.current);
    };
  }, [logoDistance]);
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

const getGradients = () => ({
  background: `radial-gradient(ellipse at center, #2d3538 0%, #0e1214 100%)`,
  scanlines: `repeating-linear-gradient(0deg, rgba(0, 0, 0, 0.2) 0px, transparent 1px, transparent 2px, rgba(0, 0, 0, 0.2) 3px)`,
  rgbPixels: `repeating-linear-gradient(90deg, rgba(255, 0, 0, 0.06) 0px, rgba(255, 0, 0, 0.06) 1px, rgba(0, 255, 0, 0.06) 1px, rgba(0, 255, 0, 0.06) 2px, rgba(0, 0, 255, 0.06) 2px, rgba(0, 0, 255, 0.06) 3px, transparent 3px, transparent 4px)`,
  grid: `linear-gradient(to right, rgba(100, 100, 100, 0.15) 1px, transparent 1px), linear-gradient(to bottom, rgba(100, 100, 100, 0.15) 1px, transparent 1px)`,
});

const getNoiseFilter = () => 
  `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='4.5' numOctaves='5' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`;

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

const CRTEffects = React.memo(({ styleVariant }) => {
  const gradients = useMemo(() => getGradients(), []);
  const config = styleVariant?.config || {
    scanlineOpacity: 0.4,
    rgbPixelOpacity: 0.7,
    grainOpacity: 0.25,
    flickerEnabled: true,
  };
  
  return (
    <>
      <div 
        className="absolute inset-0 pointer-events-none z-50"
        style={{
          backgroundImage: gradients.scanlines,
          opacity: config.scanlineOpacity,
        }}
        aria-hidden="true"
      />

      <div 
        className="absolute inset-0 pointer-events-none z-50"
        style={{
          backgroundImage: gradients.rgbPixels,
          mixBlendMode: 'screen',
          opacity: config.rgbPixelOpacity,
        }}
        aria-hidden="true"
      />

      <div 
        className="absolute inset-0 pointer-events-none z-40"
        style={{
          backgroundImage: getNoiseFilter(),
          opacity: config.grainOpacity,
          mixBlendMode: 'overlay',
        }}
        aria-hidden="true"
      />

      <div 
        className="absolute inset-0 pointer-events-none z-30"
        style={{
          boxShadow: `
            inset 0 0 300px rgba(100, 120, 125, 0.06), 
            inset 0 0 300px rgba(110, 130, 135, 0.06),
            inset 0 0 150px rgba(90, 115, 120, 0.04)
          `,
          animation: 'crtGlow 4s ease-in-out infinite',
        }}
        aria-hidden="true"
      />

      {config.flickerEnabled && (
        <div 
          className="absolute inset-0 pointer-events-none z-45"
          style={{
            background: 'rgba(255, 255, 255, 0.02)',
            animation: 'crtFlicker 0.15s infinite',
            mixBlendMode: 'overlay',
          }}
          aria-hidden="true"
        />
      )}
    </>
  );
});

CRTEffects.displayName = 'CRTEffects';

const PerspectiveGrid = React.memo(({ parallaxX, parallaxY }) => {
  const gradients = useMemo(() => getGradients(), []);
  
  return (
    <div 
      className="absolute inset-0"
      style={{
        transform: `translate(${parallaxX}px, ${parallaxY}px) perspective(${CONFIG.PERSPECTIVE}px) rotateX(${CONFIG.GRID_ROTATION}deg)`,
        transformOrigin: 'center center',
        willChange: 'transform',
      }}
      aria-hidden="true"
    >
      <div
        className="w-full h-full"
        style={{
          backgroundImage: gradients.grid,
          backgroundSize: `${CONFIG.GRID_SIZE}px ${CONFIG.GRID_SIZE}px`,
          transform: 'translateY(-50%)',
        }}
      />
    </div>
  );
});

PerspectiveGrid.displayName = 'PerspectiveGrid';

const IsometricCube = React.memo(({ scale, separation, transitionDuration }) => {
  const cubeStyle = useMemo(() => ({
    transform: `scale(${scale})`,
    transition: `transform ${transitionDuration} ease-out`,
    filter: 'drop-shadow(0 0 30px rgba(180, 180, 180, 0.6)) drop-shadow(0 0 15px rgba(200, 200, 200, 0.4)) drop-shadow(0 0 60px rgba(150, 150, 150, 0.2))',
    marginBottom: '1rem',
    willChange: 'transform',
  }), [scale, transitionDuration]);

  const faceTransition = `transform ${transitionDuration} ease-out`;

  return (
    <div className="relative" style={cubeStyle}>
      <svg 
        width="300" 
        height="300" 
        viewBox="0 0 200 200" 
        className="relative"
        role="img"
        aria-label="The Box Factory logo"
      >
        <path
          d="M100,40 L160,70 L100,100 L40,70 Z"
          style={{
            fill: 'url(#topGradient)',
            transform: `translate(0px, ${-separation}px)`,
            transformOrigin: '100px 70px',
            transition: faceTransition,
          }}
        />
        
        <path
          d="M40,70 L100,100 L100,160 L40,130 Z"
          style={{
            fill: 'url(#leftGradient)',
            transform: `translate(${-separation * CONFIG.SQRT3_OVER_2}px, ${separation * 0.5}px)`,
            transformOrigin: '70px 115px',
            transition: faceTransition,
          }}
        />
        
        <path
          d="M100,100 L160,70 L160,130 L100,160 Z"
          style={{
            fill: 'url(#rightGradient)',
            transform: `translate(${separation * CONFIG.SQRT3_OVER_2}px, ${separation * 0.5}px)`,
            transformOrigin: '130px 115px',
            transition: faceTransition,
          }}
        />

        <defs>
          <linearGradient id="topGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#d0d0d0" />
            <stop offset="100%" stopColor="#a0a0a0" />
          </linearGradient>
          <linearGradient id="leftGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#909090" />
            <stop offset="100%" stopColor="#606060" />
          </linearGradient>
          <linearGradient id="rightGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b0b0b0" />
            <stop offset="100%" stopColor="#808080" />
          </linearGradient>
        </defs>
      </svg>
    </div>
  );
});

IsometricCube.displayName = 'IsometricCube';

const TypewriterText = React.memo(({ displayText, isVisible }) => {
  const textStyle = useMemo(() => ({
    fontFamily: `"${FONTS.primary}", "${FONTS.fallback}", ${FONTS.system}`,
    fontSize: CONFIG.FONT_SIZE,
    color: '#d8d8d8',
    letterSpacing: CONFIG.LETTER_SPACING,
    fontWeight: '500',
    textTransform: 'uppercase',
    textShadow: `
      0 0 15px rgba(216, 216, 216, 0.8), 
      0 0 30px rgba(216, 216, 216, 0.4),
      2px 0 5px rgba(80, 140, 150, 0.3), 
      -2px 0 5px rgba(100, 160, 170, 0.3),
      0 0 40px rgba(90, 150, 160, 0.2)
    `,
    filter: 'drop-shadow(0 0 12px rgba(216, 216, 216, 0.3))',
    minHeight: '2.5rem',
    transition: 'opacity 0.1s ease-out',
  }), []);

  useEffect(() => {
    if (displayText === BRAND_TEXT) {
      analytics.trackInteraction('text_fully_revealed');
    }
  }, [displayText]);

  return (
    <div className="text-center relative" style={textStyle}>
      <span style={{ opacity: isVisible ? 1 : 0 }}>
        {displayText}
        {displayText && (
          <span 
            className="inline-block ml-1"
            style={{ animation: 'blink 1s step-end infinite' }}
            aria-hidden="true"
          >
            |
          </span>
        )}
      </span>
    </div>
  );
});

TypewriterText.displayName = 'TypewriterText';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

function BoxFactoryLandingCore() {
  const { mousePos, logoDistance, containerRef } = useThrottledMousePosition();
  const { variant: styleVariant } = useABTest('landing_style');
  const { variant: speedVariant, trackConversion } = useABTest('interaction_speed');
  
  useFontLoader();
  useEngagementTracking(logoDistance);

  // Get config from A/B test variant
  const transitionDuration = speedVariant?.config.transitionDuration || CONFIG.TRANSITION_DURATION;
  const textRevealMultiplier = speedVariant?.config.textRevealMultiplier || 1.5;

  // Track first interaction
  const hasInteractedRef = useRef(false);
  useEffect(() => {
    if (logoDistance < 0.9 && !hasInteractedRef.current) {
      hasInteractedRef.current = true;
      analytics.trackInteraction('first_logo_interaction', { distance: logoDistance });
      trackConversion('first_interaction');
    }
  }, [logoDistance, trackConversion]);

  // Memoized calculations
  const textProgress = useMemo(() => {
    const progress = (1 - logoDistance) * BRAND_TEXT.length * textRevealMultiplier;
    return Math.floor(progress);
  }, [logoDistance, textRevealMultiplier]);

  const displayText = useMemo(() => {
    const charsToShow = Math.min(textProgress, BRAND_TEXT.length);
    return BRAND_TEXT.substring(0, charsToShow);
  }, [textProgress]);

  const cubeScale = useMemo(() => 
    1 + logoDistance * CONFIG.CUBE_SCALE_RANGE, 
    [logoDistance]
  );

  const separation = useMemo(() => 
    logoDistance * CONFIG.CUBE_SEPARATION, 
    [logoDistance]
  );

  const parallaxX = useMemo(() => 
    (mousePos.x - 0.5) * CONFIG.PARALLAX_STRENGTH, 
    [mousePos.x]
  );

  const parallaxY = useMemo(() => 
    (mousePos.y - 0.5) * CONFIG.PARALLAX_STRENGTH, 
    [mousePos.y]
  );

  const isTextVisible = logoDistance < 0.8;

  const gradients = useMemo(() => getGradients(), []);

  // Track session end
  useEffect(() => {
    const handleUnload = () => {
      const sessionData = analytics.getSessionData();
      analytics.track('session_end', sessionData);
    };

    window.addEventListener('beforeunload', handleUnload);
    return () => window.removeEventListener('beforeunload', handleUnload);
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-screen overflow-hidden"
      style={{
        background: gradients.background,
        filter: 'contrast(1.15) brightness(1.05)',
      }}
    >
      <CRTEffects styleVariant={styleVariant} />
      <PerspectiveGrid parallaxX={parallaxX} parallaxY={parallaxY} />

      <main className="absolute inset-0 flex flex-col items-center justify-center z-20">
        <IsometricCube 
          scale={cubeScale} 
          separation={separation}
          transitionDuration={transitionDuration}
        />
        <TypewriterText displayText={displayText} isVisible={isTextVisible} />
      </main>

      <style>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        @keyframes crtFlicker {
          0% { opacity: 1; }
          10% { opacity: 0.95; }
          20% { opacity: 1; }
          30% { opacity: 0.98; }
          40% { opacity: 1; }
          50% { opacity: 0.97; }
          60% { opacity: 1; }
          70% { opacity: 0.99; }
          80% { opacity: 1; }
          90% { opacity: 0.96; }
          100% { opacity: 1; }
        }
        
        @keyframes crtGlow {
          0%, 100% { 
            box-shadow: inset 0 0 300px rgba(80, 140, 150, 0.08), 
                        inset 0 0 300px rgba(100, 160, 170, 0.08),
                        inset 0 0 150px rgba(70, 130, 140, 0.05);
          }
          50% { 
            box-shadow: inset 0 0 320px rgba(80, 140, 150, 0.1), 
                        inset 0 0 320px rgba(100, 160, 170, 0.1),
                        inset 0 0 160px rgba(70, 130, 140, 0.06);
          }
        }
      `}</style>
    </div>
  );
}

// ============================================================================
// EXPORTED COMPONENT WITH LOADING & ERROR BOUNDARY
// ============================================================================

export default function BoxFactoryLanding() {
  const { loading, progress } = useLoadingState();

  useEffect(() => {
    // Track page view
    analytics.track('page_view', {
      url: window.location.href,
      referrer: document.referrer,
      userAgent: navigator.userAgent,
    });
  }, []);

  if (loading) {
    return <LoadingScreen progress={progress} />;
  }

  return (
    <ErrorBoundary>
      <BoxFactoryLandingCore />
    </ErrorBoundary>
  );
}