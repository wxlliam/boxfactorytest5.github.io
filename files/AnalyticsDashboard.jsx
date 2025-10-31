import React, { useState, useEffect, useMemo } from 'react';

// ============================================================================
// ANALYTICS DASHBOARD COMPONENT
// ============================================================================

/**
 * Real-time analytics dashboard for monitoring A/B tests and performance
 * This component can be rendered in a separate admin page or overlayed
 * on the landing page in development mode
 */

export default function AnalyticsDashboard({ analytics, abTesting, perfMonitor }) {
  const [sessionData, setSessionData] = useState(null);
  const [experiments, setExperiments] = useState([]);
  const [metrics, setMetrics] = useState(null);
  const [isVisible, setIsVisible] = useState(false);

  // Update data every 2 seconds
  useEffect(() => {
    const updateData = () => {
      setSessionData(analytics.getSessionData());
      setMetrics(perfMonitor.getMetrics());
      
      // Get experiment data
      const experimentData = [];
      for (const [experimentId, variants] of abTesting.experiments.entries()) {
        const userVariant = abTesting.userVariants.get(experimentId);
        experimentData.push({
          id: experimentId,
          variants,
          assignedVariant: userVariant,
        });
      }
      setExperiments(experimentData);
    };

    updateData();
    const interval = setInterval(updateData, 2000);
    return () => clearInterval(interval);
  }, [analytics, abTesting, perfMonitor]);

  // Calculate event statistics
  const eventStats = useMemo(() => {
    if (!sessionData) return {};
    
    const stats = {};
    sessionData.events.forEach(event => {
      if (!stats[event.name]) {
        stats[event.name] = { count: 0, avgDuration: 0 };
      }
      stats[event.name].count++;
    });
    
    return stats;
  }, [sessionData]);

  // Performance summary
  const performanceSummary = useMemo(() => {
    if (!metrics) return null;
    
    return {
      totalMarks: metrics.marks.length,
      totalMeasures: metrics.measures.length,
      avgMeasureTime: metrics.measures.length > 0
        ? (metrics.measures.reduce((sum, m) => sum + m.duration, 0) / metrics.measures.length).toFixed(2)
        : 0,
    };
  }, [metrics]);

  if (!isVisible) {
    return (
      <button
        onClick={() => setIsVisible(true)}
        className="fixed bottom-4 right-4 z-[100] px-4 py-2 bg-gray-800 text-white rounded-lg shadow-lg hover:bg-gray-700 transition-colors"
        style={{ fontFamily: 'monospace' }}
      >
        📊 Analytics
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-black bg-opacity-80 overflow-auto p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6 bg-gray-900 p-4 rounded-lg">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: 'monospace' }}>
            📊 Analytics Dashboard
          </h1>
          <button
            onClick={() => setIsVisible(false)}
            className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
          >
            Close
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Session Info */}
          <div className="bg-gray-900 rounded-lg p-6 text-white">
            <h2 className="text-xl font-bold mb-4 text-blue-400">Session Info</h2>
            {sessionData && (
              <div className="space-y-2" style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                <div className="flex justify-between">
                  <span className="text-gray-400">Session ID:</span>
                  <span className="text-green-400">{sessionData.sessionId.slice(0, 20)}...</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Duration:</span>
                  <span className="text-green-400">{(sessionData.duration / 1000).toFixed(1)}s</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Events:</span>
                  <span className="text-green-400">{sessionData.eventCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Events/Second:</span>
                  <span className="text-green-400">
                    {(sessionData.eventCount / (sessionData.duration / 1000)).toFixed(2)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Performance Summary */}
          <div className="bg-gray-900 rounded-lg p-6 text-white">
            <h2 className="text-xl font-bold mb-4 text-purple-400">Performance</h2>
            {performanceSummary && (
              <div className="space-y-2" style={{ fontFamily: 'monospace', fontSize: '0.9rem' }}>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Marks:</span>
                  <span className="text-purple-300">{performanceSummary.totalMarks}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Total Measures:</span>
                  <span className="text-purple-300">{performanceSummary.totalMeasures}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Avg Measure Time:</span>
                  <span className="text-purple-300">{performanceSummary.avgMeasureTime}ms</span>
                </div>
              </div>
            )}
            
            {metrics && metrics.measures.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-gray-400 mb-2">Recent Measures:</h3>
                <div className="space-y-1 max-h-32 overflow-y-auto">
                  {metrics.measures.slice(-5).reverse().map((measure, idx) => (
                    <div key={idx} className="text-xs flex justify-between">
                      <span className="text-gray-500">{measure.name}</span>
                      <span className="text-purple-300">{measure.duration.toFixed(2)}ms</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* A/B Test Assignments */}
          <div className="bg-gray-900 rounded-lg p-6 text-white lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 text-yellow-400">A/B Test Assignments</h2>
            <div className="space-y-4">
              {experiments.map(exp => (
                <div key={exp.id} className="border border-gray-700 rounded p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <h3 className="font-semibold text-lg">{exp.id}</h3>
                      {exp.assignedVariant && (
                        <p className="text-sm text-gray-400">
                          Assigned: <span className="text-yellow-300">{exp.assignedVariant.name}</span>
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {exp.variants.map(variant => {
                      const isAssigned = exp.assignedVariant?.id === variant.id;
                      return (
                        <div
                          key={variant.id}
                          className={`p-3 rounded ${
                            isAssigned ? 'bg-yellow-900 bg-opacity-30 border-2 border-yellow-500' : 'bg-gray-800'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-2">
                            <span className="font-semibold">
                              {isAssigned && '✓ '}
                              {variant.name}
                            </span>
                            <span className="text-sm text-gray-400">{variant.weight}%</span>
                          </div>
                          
                          {/* Progress bar */}
                          <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className={`h-full ${isAssigned ? 'bg-yellow-500' : 'bg-gray-600'}`}
                              style={{ width: `${variant.weight}%` }}
                            />
                          </div>
                          
                          {/* Config preview */}
                          <details className="mt-2">
                            <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400">
                              View Config
                            </summary>
                            <pre className="text-xs mt-2 p-2 bg-gray-950 rounded overflow-auto">
                              {JSON.stringify(variant.config, null, 2)}
                            </pre>
                          </details>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Event Log */}
          <div className="bg-gray-900 rounded-lg p-6 text-white lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 text-green-400">Event Statistics</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(eventStats).map(([eventName, stats]) => (
                <div key={eventName} className="bg-gray-800 rounded p-3">
                  <div className="text-sm font-semibold text-green-300 mb-1">{eventName}</div>
                  <div className="text-2xl font-bold">{stats.count}</div>
                  <div className="text-xs text-gray-500">occurrences</div>
                </div>
              ))}
            </div>
            
            {sessionData && sessionData.events.length > 0 && (
              <div className="mt-6">
                <h3 className="text-sm font-semibold text-gray-400 mb-3">Recent Events:</h3>
                <div 
                  className="space-y-1 max-h-64 overflow-y-auto bg-gray-950 p-3 rounded"
                  style={{ fontFamily: 'monospace', fontSize: '0.75rem' }}
                >
                  {sessionData.events.slice(-20).reverse().map((event, idx) => (
                    <div key={idx} className="flex gap-3 border-b border-gray-800 pb-1">
                      <span className="text-gray-600">
                        {new Date(event.timestamp).toLocaleTimeString()}
                      </span>
                      <span className="text-green-400 flex-shrink-0 w-48">{event.name}</span>
                      <span className="text-gray-500 truncate">
                        {JSON.stringify(event).slice(0, 80)}...
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Export Data */}
          <div className="bg-gray-900 rounded-lg p-6 text-white lg:col-span-2">
            <h2 className="text-xl font-bold mb-4 text-red-400">Data Export</h2>
            <div className="flex gap-4">
              <button
                onClick={() => {
                  const data = JSON.stringify(sessionData, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `analytics-${Date.now()}.json`;
                  a.click();
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded transition-colors"
              >
                Export Session Data
              </button>
              
              <button
                onClick={() => {
                  const data = JSON.stringify(metrics, null, 2);
                  const blob = new Blob([data], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `performance-${Date.now()}.json`;
                  a.click();
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded transition-colors"
              >
                Export Performance Data
              </button>
              
              <button
                onClick={() => {
                  localStorage.clear();
                  window.location.reload();
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded transition-colors"
              >
                Clear & Reset
              </button>
            </div>
            
            <div className="mt-4 p-3 bg-yellow-900 bg-opacity-20 border border-yellow-700 rounded">
              <p className="text-sm text-yellow-200">
                💡 <strong>Tip:</strong> Clear localStorage to reassign A/B test variants. 
                Export data before clearing to preserve analytics.
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 p-4 bg-gray-900 rounded-lg text-center text-gray-500 text-sm">
          Dashboard updates every 2 seconds • Press ESC or click Close to hide
        </div>
      </div>
    </div>
  );
}