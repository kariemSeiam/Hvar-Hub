import { useEffect, useCallback, useRef } from 'react';

/**
 * Custom hook for memory optimization and cleanup
 * Helps prevent memory leaks and optimizes performance
 */
export const useMemoryOptimization = (options = {}) => {
  const {
    cleanupInterval = 30000, // 30 seconds
    maxCacheSize = 100,
    enablePerformanceMonitoring = true
  } = options;

  const performanceMetrics = useRef({
    renderCount: 0,
    lastCleanup: Date.now(),
    memoryUsage: 0
  });

  const cleanupQueue = useRef(new Set());
  const intervalRef = useRef(null);

  // Memory cleanup function
  const cleanupMemory = useCallback(() => {
    try {
      // Clear expired cache entries
      if (window.orderAPICache) {
        const now = Date.now();
        const cacheKeys = Object.keys(window.orderAPICache);
        
        if (cacheKeys.length > maxCacheSize) {
          const sortedKeys = cacheKeys.sort((a, b) => 
            window.orderAPICache[a].timestamp - window.orderAPICache[b].timestamp
          );
          
          // Remove oldest entries
          const keysToRemove = sortedKeys.slice(0, Math.floor(maxCacheSize * 0.3));
          keysToRemove.forEach(key => {
            delete window.orderAPICache[key];
          });
        }
      }

      // Execute cleanup queue
      cleanupQueue.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Cleanup function failed:', error);
        }
      });
      cleanupQueue.current.clear();

      // Force garbage collection if available
      if (window.gc && typeof window.gc === 'function') {
        window.gc();
      }

      // Update metrics
      performanceMetrics.current.lastCleanup = Date.now();
      
      if (enablePerformanceMonitoring && performance.memory) {
        performanceMetrics.current.memoryUsage = performance.memory.usedJSHeapSize;
      }

      console.debug('Memory cleanup completed', {
        timestamp: new Date().toISOString(),
        memoryUsage: performanceMetrics.current.memoryUsage
      });

    } catch (error) {
      console.error('Memory cleanup error:', error);
    }
  }, [maxCacheSize, enablePerformanceMonitoring]);

  // Add cleanup function to queue
  const addCleanup = useCallback((cleanupFn) => {
    if (typeof cleanupFn === 'function') {
      cleanupQueue.current.add(cleanupFn);
    }
  }, []);

  // Remove cleanup function from queue
  const removeCleanup = useCallback((cleanupFn) => {
    cleanupQueue.current.delete(cleanupFn);
  }, []);

  // Force immediate cleanup
  const forceCleanup = useCallback(() => {
    cleanupMemory();
  }, [cleanupMemory]);

  // Get memory statistics
  const getMemoryStats = useCallback(() => {
    return {
      ...performanceMetrics.current,
      queueSize: cleanupQueue.current.size,
      cacheSize: window.orderAPICache ? Object.keys(window.orderAPICache).length : 0,
      browserMemory: performance.memory ? {
        used: performance.memory.usedJSHeapSize,
        total: performance.memory.totalJSHeapSize,
        limit: performance.memory.jsHeapSizeLimit
      } : null
    };
  }, []);

  // Component render tracking
  useEffect(() => {
    performanceMetrics.current.renderCount++;
  });

  // Setup cleanup interval
  useEffect(() => {
    intervalRef.current = setInterval(cleanupMemory, cleanupInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [cleanupMemory, cleanupInterval]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      // Execute all pending cleanups
      cleanupQueue.current.forEach(cleanup => {
        try {
          cleanup();
        } catch (error) {
          console.warn('Final cleanup failed:', error);
        }
      });
      cleanupQueue.current.clear();
    };
  }, []);

  return {
    addCleanup,
    removeCleanup,
    forceCleanup,
    getMemoryStats
  };
};

/**
 * Hook for optimizing large lists and preventing memory leaks
 */
export const useListOptimization = (items = [], options = {}) => {
  const {
    pageSize = 20,
    maxPages = 5,
    enableVirtualization = true
  } = options;

  const { addCleanup } = useMemoryOptimization();
  const observerRef = useRef(null);
  const loadedPages = useRef(new Set([0]));

  // Virtual scrolling optimization
  const getVisibleItems = useCallback((startIndex = 0, endIndex = pageSize) => {
    if (!enableVirtualization) return items;
    
    return items.slice(startIndex, endIndex);
  }, [items, pageSize, enableVirtualization]);

  // Intersection Observer for lazy loading
  const setupIntersectionObserver = useCallback((targetElement, callback) => {
    if (!targetElement || !enableVirtualization) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            callback();
          }
        });
      },
      {
        rootMargin: '100px' // Load before element is visible
      }
    );

    observer.observe(targetElement);
    observerRef.current = observer;

    // Add cleanup
    addCleanup(() => {
      if (observerRef.current) {
        observerRef.current.disconnect();
        observerRef.current = null;
      }
    });

    return () => observer.disconnect();
  }, [enableVirtualization, addCleanup]);

  // Load more items
  const loadMoreItems = useCallback(() => {
    const nextPage = loadedPages.current.size;
    if (nextPage < maxPages && nextPage * pageSize < items.length) {
      loadedPages.current.add(nextPage);
    }
  }, [maxPages, pageSize, items.length]);

  // Get current visible range
  const getVisibleRange = useCallback(() => {
    const maxLoadedPage = Math.max(...Array.from(loadedPages.current));
    return {
      start: 0,
      end: (maxLoadedPage + 1) * pageSize
    };
  }, [pageSize]);

  return {
    getVisibleItems,
    setupIntersectionObserver,
    loadMoreItems,
    getVisibleRange,
    hasMore: loadedPages.current.size * pageSize < items.length
  };
};

export default useMemoryOptimization;