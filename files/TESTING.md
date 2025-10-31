# Testing & QA Guide

## Overview

This guide covers all aspects of testing the Box Factory Landing Page production system, including functional testing, A/B test validation, performance benchmarks, and QA checklists.

---

## Table of Contents

1. [Pre-deployment Testing](#pre-deployment-testing)
2. [A/B Test Validation](#ab-test-validation)
3. [Performance Testing](#performance-testing)
4. [Cross-browser Testing](#cross-browser-testing)
5. [Mobile Testing](#mobile-testing)
6. [Accessibility Testing](#accessibility-testing)
7. [Load Testing](#load-testing)
8. [Monitoring & Alerts](#monitoring--alerts)

---

## Pre-deployment Testing

### ✅ Functional Testing Checklist

#### Loading State
- [ ] Loading screen appears on page load
- [ ] Progress bar animates smoothly (0% → 100%)
- [ ] Loading percentage text updates
- [ ] Loading screen disappears after fonts load
- [ ] Minimum loading time is respected (800ms)
- [ ] Timeout fallback works if fonts fail to load

#### Mouse Interaction
- [ ] Mouse movement triggers parallax effect on grid
- [ ] Cursor near center reveals text character-by-character
- [ ] Cube scales up when cursor moves away from center
- [ ] Cube faces separate when cursor moves away
- [ ] Blinking cursor appears when text is visible
- [ ] Text disappears when cursor moves far from center
- [ ] Animations are smooth at 60fps

#### Visual Effects
- [ ] CRT scanlines visible across screen
- [ ] RGB pixel mask creates subtle chromatic effect
- [ ] Grain texture overlays everything
- [ ] Glow effect animates smoothly
- [ ] Flicker effect (if enabled in variant) works
- [ ] Perspective grid rotates correctly
- [ ] All gradients render correctly

#### Error Handling
- [ ] Error boundary catches component errors
- [ ] Error screen shows appropriate message
- [ ] Refresh button on error screen works
- [ ] Errors are logged to analytics
- [ ] Error details visible in development mode only

### 🧪 Test Scenarios

#### Scenario 1: Normal Page Load
```
Steps:
1. Navigate to landing page
2. Wait for loading screen
3. Move mouse around page
4. Hover over center logo area

Expected Result:
- Loading completes in 1-2 seconds
- Smooth animations throughout
- Text reveals fully when hovering center
- No console errors
```

#### Scenario 2: Slow Network
```
Steps:
1. Open DevTools → Network → Throttle to "Slow 3G"
2. Hard refresh page (Cmd+Shift+R / Ctrl+Shift+R)
3. Observe loading behavior

Expected Result:
- Loading screen shows progress
- Font timeout triggers after 3 seconds
- Page still functional with system fonts
- Loading completes even if fonts timeout
```

#### Scenario 3: Error Recovery
```
Steps:
1. Open DevTools → Console
2. Throw error in component: throw new Error('Test')
3. Observe error boundary

Expected Result:
- Error boundary catches error
- User sees friendly error message
- Refresh button is functional
- Error logged to analytics
```

#### Scenario 4: Extended Session
```
Steps:
1. Load page and interact for 5+ minutes
2. Move mouse in different patterns
3. Hover center multiple times
4. Open dashboard (press 'D' in dev mode)

Expected Result:
- No memory leaks
- Performance stays consistent
- Analytics tracking continues
- All events logged correctly
```

---

## A/B Test Validation

### Testing Variant Assignment

#### Test 1: Initial Assignment
```javascript
// Open DevTools Console

// Check current assignment
console.log('Style Variant:', localStorage.getItem('ab_landing_style'));
console.log('Speed Variant:', localStorage.getItem('ab_interaction_speed'));

// Clear and reassign
localStorage.clear();
location.reload();
```

#### Test 2: Variant Persistence
```
Steps:
1. Note your assigned variants (press 'D' to see dashboard)
2. Refresh page multiple times
3. Check variants remain the same

Expected Result:
- Same variants across all refreshes
- localStorage preserves assignment
```

#### Test 3: Manual Variant Testing
```javascript
// Force specific variant for testing
localStorage.setItem('ab_landing_style', JSON.stringify({
  id: 'variant_a',
  name: 'Subtle CRT Effect',
  weight: 50,
  config: {
    scanlineOpacity: 0.2,
    rgbPixelOpacity: 0.4,
    grainOpacity: 0.15,
    flickerEnabled: false,
  }
}));

location.reload();
```

### Visual Differences by Variant

#### Landing Style Experiment

**Control (Original CRT)**
- Scanlines: 0.4 opacity (clearly visible)
- RGB pixels: 0.7 opacity (pronounced effect)
- Grain: 0.25 opacity (visible texture)
- Flicker: Enabled (subtle screen flicker)
- Overall: Strong retro CRT aesthetic

**Variant A (Subtle CRT)**
- Scanlines: 0.2 opacity (subtle)
- RGB pixels: 0.4 opacity (mild effect)
- Grain: 0.15 opacity (barely visible)
- Flicker: Disabled (no flicker)
- Overall: Modern, cleaner look

#### Interaction Speed Experiment

**Control (Normal Speed)**
- Transition: 0.15s (moderate)
- Text reveal: 1.5x multiplier
- Feel: Deliberate, smooth

**Variant A (Fast Speed)**
- Transition: 0.08s (quick)
- Text reveal: 2.0x multiplier
- Feel: Snappy, responsive

### Conversion Tracking Test

```javascript
// Simulate conversion event
window.__abTesting.trackConversion('landing_style', 'button_click', 1);

// Check in analytics dashboard
// Event should appear with correct variant info
```

---

## Performance Testing

### Target Metrics

| Metric | Target | Acceptable | Poor |
|--------|--------|------------|------|
| Time to Interactive | < 1.5s | < 2.5s | > 2.5s |
| First Contentful Paint | < 1s | < 1.5s | > 1.5s |
| Largest Contentful Paint | < 2s | < 3s | > 3s |
| Cumulative Layout Shift | < 0.1 | < 0.25 | > 0.25 |
| First Input Delay | < 100ms | < 300ms | > 300ms |
| Font Load Time | < 800ms | < 1.5s | > 1.5s |

### Lighthouse Audit

```bash
# Run Lighthouse audit
lighthouse https://your-domain.com --view

# Target scores:
# Performance: 90+
# Accessibility: 95+
# Best Practices: 90+
# SEO: 90+
```

### Performance Testing Tools

#### Chrome DevTools Performance
```
Steps:
1. Open DevTools → Performance tab
2. Start recording
3. Refresh page
4. Interact with page for 10 seconds
5. Stop recording
6. Analyze flame chart

Look for:
- Long tasks (> 50ms)
- Unnecessary re-renders
- Memory leaks
- Dropped frames
```

#### Memory Profiling
```
Steps:
1. Open DevTools → Memory tab
2. Take heap snapshot (baseline)
3. Interact with page for 2 minutes
4. Take another heap snapshot
5. Compare snapshots

Expected:
- Memory usage should stabilize
- No significant memory growth
- Event listeners properly cleaned up
```

### Frame Rate Testing

```javascript
// Monitor FPS in console
let lastTime = performance.now();
let frames = 0;

function measureFPS() {
  frames++;
  const currentTime = performance.now();
  
  if (currentTime >= lastTime + 1000) {
    console.log(`FPS: ${frames}`);
    frames = 0;
    lastTime = currentTime;
  }
  
  requestAnimationFrame(measureFPS);
}

measureFPS();
```

Expected: Consistent 60 FPS during mouse movement

---

## Cross-browser Testing

### Supported Browsers

#### Tier 1 (Full Support)
- Chrome 90+ ✅
- Firefox 88+ ✅
- Safari 14+ ✅
- Edge 90+ ✅

#### Tier 2 (Core Functionality)
- Chrome 80-89
- Firefox 78-87
- Safari 13
- Edge 80-89

#### Tier 3 (Graceful Degradation)
- IE 11 (show fallback message)
- Older mobile browsers

### Browser-Specific Tests

#### Safari
- [ ] Font loading works correctly
- [ ] CRT effects render properly
- [ ] Transform animations smooth
- [ ] Will-change CSS respected
- [ ] No visual glitches

#### Firefox
- [ ] RGB pixel mask displays correctly
- [ ] Scanlines render properly
- [ ] Performance comparable to Chrome
- [ ] Analytics tracking works

#### Edge
- [ ] All Chromium features work
- [ ] Font Loading API supported
- [ ] Performance on par with Chrome

### Testing Older Browsers

```javascript
// Feature detection fallback
if (!document.fonts) {
  console.warn('Font Loading API not supported');
  // Fallback: Wait fixed time for fonts
  setTimeout(() => setFontsLoaded(true), 1000);
}

if (!window.requestAnimationFrame) {
  console.error('requestAnimationFrame not supported');
  // Use setTimeout fallback
}
```

---

## Mobile Testing

### Device Testing Matrix

#### iOS
- [ ] iPhone 13 Pro (iOS 15+)
- [ ] iPhone 12 (iOS 14+)
- [ ] iPhone SE (iOS 13+)
- [ ] iPad Pro (iOS 15+)

#### Android
- [ ] Samsung Galaxy S21
- [ ] Google Pixel 5
- [ ] OnePlus 9
- [ ] Budget device (< $300)

### Mobile-Specific Tests

#### Touch Interaction
- [ ] Touch events trigger parallax
- [ ] Tap near center reveals text
- [ ] No hover effects causing issues
- [ ] Smooth scrolling if applicable
- [ ] No lag during interaction

#### Performance
- [ ] 60fps on flagship devices
- [ ] 30fps minimum on budget devices
- [ ] No thermal throttling
- [ ] Battery drain acceptable

#### Responsive Design
- [ ] Logo scales appropriately
- [ ] Text readable on small screens
- [ ] Loading screen fits viewport
- [ ] Dashboard usable on tablet

### Mobile Performance Testing

```javascript
// Test on mobile
// Open remote debugging: chrome://inspect

// Monitor metrics
console.log('Device Memory:', navigator.deviceMemory, 'GB');
console.log('Hardware Concurrency:', navigator.hardwareConcurrency);
console.log('Connection:', navigator.connection?.effectiveType);
```

---

## Accessibility Testing

### WCAG 2.1 Level AA Compliance

#### Keyboard Navigation
- [ ] Can tab through interactive elements
- [ ] Focus indicators visible
- [ ] No keyboard traps
- [ ] All functionality available via keyboard

#### Screen Reader Testing
- [ ] Logo has proper aria-label
- [ ] Decorative elements marked aria-hidden
- [ ] Semantic HTML used correctly
- [ ] Error messages announced

#### Visual
- [ ] Text has sufficient contrast (4.5:1 minimum)
- [ ] No color-only information
- [ ] Text scales up to 200% without breaking
- [ ] No flashing content > 3 times/second

#### Motion & Animation
- [ ] Respects prefers-reduced-motion
- [ ] Essential motion only
- [ ] No vestibular triggers

### Testing Tools

```bash
# Axe DevTools
# Install Chrome extension
# Run audit on page

# Pa11y
npm install -g pa11y
pa11y https://your-domain.com

# Lighthouse Accessibility Audit
lighthouse https://your-domain.com --only-categories=accessibility
```

### Manual Screen Reader Test

```
Steps (macOS with VoiceOver):
1. Cmd+F5 to enable VoiceOver
2. Navigate to landing page
3. Tab through elements
4. Verify announcements make sense

Steps (Windows with NVDA):
1. Install NVDA (free)
2. Start NVDA
3. Navigate with Tab/Shift+Tab
4. Verify content is accessible
```

---

## Load Testing

### Simulating Traffic

#### Using Artillery
```yaml
# load-test.yml
config:
  target: "https://your-domain.com"
  phases:
    - duration: 60
      arrivalRate: 10
      name: "Warm up"
    - duration: 120
      arrivalRate: 50
      name: "Peak load"
    - duration: 60
      arrivalRate: 10
      name: "Cool down"

scenarios:
  - flow:
    - get:
        url: "/"
```

```bash
# Run test
artillery run load-test.yml
```

#### Expected Results
- Response time < 200ms at 50 req/sec
- No errors under normal load
- CDN caching working
- Server resources stable

---

## Monitoring & Alerts

### Production Monitoring Setup

#### Error Rate Alert
```javascript
// Alert if error rate > 1%
if (errorCount / totalPageViews > 0.01) {
  sendAlert('High error rate detected');
}
```

#### Performance Alert
```javascript
// Alert if p95 load time > 3s
if (p95LoadTime > 3000) {
  sendAlert('Slow page load detected');
}
```

#### A/B Test Sample Size
```javascript
// Alert when experiment reaches significance
if (sampleSize > minimumSampleSize && pValue < 0.05) {
  sendAlert('Experiment results statistically significant');
}
```

### Recommended Monitoring Tools

1. **Sentry** - Error tracking
2. **Google Analytics** - User behavior
3. **Datadog/New Relic** - Performance monitoring
4. **Optimizely/VWO** - A/B test analysis
5. **Hotjar** - Heatmaps & recordings

---

## QA Sign-off Checklist

### Before Launch

- [ ] All functional tests pass
- [ ] Performance targets met
- [ ] Cross-browser testing complete
- [ ] Mobile testing complete
- [ ] Accessibility audit passes
- [ ] A/B tests configured correctly
- [ ] Analytics tracking verified
- [ ] Error tracking configured
- [ ] Loading states working
- [ ] Error boundaries functioning
- [ ] Documentation up to date
- [ ] Stakeholder approval obtained

### Post-Launch

- [ ] Monitor error rates (first 24 hours)
- [ ] Check analytics data flowing
- [ ] Verify A/B test assignments
- [ ] Monitor performance metrics
- [ ] Review user feedback
- [ ] Check conversion funnels
- [ ] Analyze experiment results

---

## Common Issues & Solutions

### Issue: Fonts not loading
**Solution**: Check network tab, verify Google Fonts URL, increase timeout

### Issue: Low FPS on interactions
**Solution**: Increase MOUSEMOVE_THROTTLE, reduce CRT effect layers

### Issue: A/B test not assigning
**Solution**: Clear localStorage, check experiment definition

### Issue: Analytics not tracking
**Solution**: Verify gtag loaded, check network tab for API calls

### Issue: Error boundary not catching
**Solution**: Ensure error thrown in render method, check error boundary placement

---

## Automated Testing Script

```javascript
// Jest + React Testing Library example
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BoxFactoryLanding from './box-factory-production';

describe('BoxFactoryLanding', () => {
  test('shows loading screen initially', () => {
    render(<BoxFactoryLanding />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  test('hides loading screen after load', async () => {
    render(<BoxFactoryLanding />);
    await waitFor(() => {
      expect(screen.queryByText(/loading/i)).not.toBeInTheDocument();
    }, { timeout: 3000 });
  });

  test('tracks analytics on page view', () => {
    const analyticsSpy = jest.spyOn(window.__analytics, 'track');
    render(<BoxFactoryLanding />);
    expect(analyticsSpy).toHaveBeenCalledWith('page_view', expect.any(Object));
  });
});
```

---

## Version

**v1.0.0** - Testing Guide for Production System

Last Updated: 2025-10-31