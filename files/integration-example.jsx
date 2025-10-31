import React from 'react';
import BoxFactoryLanding from './box-factory-production';
import AnalyticsDashboard from './AnalyticsDashboard';

/**
 * EXAMPLE INTEGRATION
 * 
 * This file shows how to integrate the analytics dashboard with your landing page.
 * Use this in development or on a separate admin page.
 */

// Import the services from the production file
// In a real app, you'd want to export these from box-factory-production.jsx
// For now, we'll import them as globals (they're already instantiated in the module)

// Method 1: Overlay Dashboard (Development Mode)
// Shows dashboard as an overlay that can be toggled
export function LandingPageWithOverlayDashboard() {
  const [showDashboard, setShowDashboard] = React.useState(false);

  // Only show in development
  const isDevelopment = process.env.NODE_ENV === 'development';

  React.useEffect(() => {
    if (!isDevelopment) return;

    // Press 'D' key to toggle dashboard
    const handleKeyPress = (e) => {
      if (e.key === 'd' || e.key === 'D') {
        setShowDashboard(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [isDevelopment]);

  return (
    <>
      <BoxFactoryLanding />
      
      {isDevelopment && showDashboard && (
        <AnalyticsDashboard
          analytics={window.__analytics}
          abTesting={window.__abTesting}
          perfMonitor={window.__perfMonitor}
        />
      )}

      {isDevelopment && (
        <div 
          className="fixed top-4 right-4 z-[99] px-3 py-2 bg-gray-800 bg-opacity-80 text-white text-xs rounded"
          style={{ fontFamily: 'monospace' }}
        >
          Press 'D' to toggle dashboard
        </div>
      )}
    </>
  );
}

// Method 2: Separate Dashboard Page
// Dashboard on a separate admin route
export function DashboardPage() {
  return (
    <div className="min-h-screen bg-gray-950">
      <AnalyticsDashboard
        analytics={window.__analytics}
        abTesting={window.__abTesting}
        perfMonitor={window.__perfMonitor}
      />
    </div>
  );
}

// Method 3: Split Screen (Good for testing)
// Shows landing page and dashboard side-by-side
export function SplitScreenView() {
  return (
    <div className="flex h-screen">
      <div className="w-1/2">
        <BoxFactoryLanding />
      </div>
      <div className="w-1/2 overflow-auto bg-gray-950">
        <div className="p-4">
          <AnalyticsDashboard
            analytics={window.__analytics}
            abTesting={window.__abTesting}
            perfMonitor={window.__perfMonitor}
          />
        </div>
      </div>
    </div>
  );
}

// Export services to window for dashboard access
// Add this to your box-factory-production.jsx file:
/*
if (typeof window !== 'undefined') {
  window.__analytics = analytics;
  window.__abTesting = abTesting;
  window.__perfMonitor = perfMonitor;
}
*/

// Default export - Standard production setup
export default function App() {
  // In production, just show the landing page
  if (process.env.NODE_ENV === 'production') {
    return <BoxFactoryLanding />;
  }

  // In development, show with overlay dashboard
  return <LandingPageWithOverlayDashboard />;
}

/**
 * USAGE EXAMPLES:
 * 
 * 1. Basic Production Setup:
 *    import App from './integration-example';
 *    ReactDOM.render(<App />, document.getElementById('root'));
 * 
 * 2. Development with Dashboard:
 *    import { LandingPageWithOverlayDashboard } from './integration-example';
 *    ReactDOM.render(<LandingPageWithOverlayDashboard />, document.getElementById('root'));
 * 
 * 3. Admin Dashboard Route:
 *    import { DashboardPage } from './integration-example';
 *    <Route path="/admin/analytics" component={DashboardPage} />
 * 
 * 4. Testing with Split View:
 *    import { SplitScreenView } from './integration-example';
 *    ReactDOM.render(<SplitScreenView />, document.getElementById('root'));
 */