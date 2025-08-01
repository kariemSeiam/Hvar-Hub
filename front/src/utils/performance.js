/**
 * Performance Optimization Utilities for QR Scanner
 * Ensures best performance across all devices and browsers
 */

// Performance monitoring
let performanceMetrics = {
  scanStartTime: 0,
  scanCount: 0,
  averageScanTime: 0,
  deviceInfo: null
};

/**
 * Get device information for optimization
 */
export const getDeviceInfo = () => {
  if (performanceMetrics.deviceInfo) {
    return performanceMetrics.deviceInfo;
  }

  const userAgent = navigator.userAgent;
  const isMobile = /Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
  const isAndroid = /Android/i.test(userAgent);
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);
  const isChrome = /Chrome/i.test(userAgent);
  const isSafari = /Safari/i.test(userAgent) && !/Chrome/i.test(userAgent);
  const isFirefox = /Firefox/i.test(userAgent);

  // Get device memory and hardware concurrency
  const deviceMemory = navigator.deviceMemory || 4; // Default to 4GB
  const hardwareConcurrency = navigator.hardwareConcurrency || 4; // Default to 4 cores

  performanceMetrics.deviceInfo = {
    isMobile,
    isAndroid,
    isIOS,
    isChrome,
    isSafari,
    isFirefox,
    deviceMemory,
    hardwareConcurrency,
    userAgent
  };

  return performanceMetrics.deviceInfo;
};

/**
 * Get optimized camera constraints based on device
 */
export const getOptimizedCameraConstraints = (facingMode = 'environment') => {
  const deviceInfo = getDeviceInfo();
  
  // Base constraints
  const baseConstraints = {
    facingMode,
    width: { ideal: 1280, min: 640, max: 1920 },
    height: { ideal: 720, min: 480, max: 1080 },
    frameRate: { ideal: 30, min: 15, max: 60 }
  };

  // Optimize for different devices
  if (deviceInfo.isAndroid) {
    // Android devices - optimize for performance
    return {
      ...baseConstraints,
      width: { ideal: 1280, min: 640, max: 1920 },
      height: { ideal: 720, min: 480, max: 1080 },
      frameRate: { ideal: 30, min: 15, max: 60 },
      advanced: [
        { focusMode: 'continuous' },
        { exposureMode: 'continuous' },
        { whiteBalanceMode: 'continuous' }
      ]
    };
  } else if (deviceInfo.isIOS) {
    // iOS devices - optimize for quality
    return {
      ...baseConstraints,
      width: { ideal: 1920, min: 1280, max: 1920 },
      height: { ideal: 1080, min: 720, max: 1080 },
      frameRate: { ideal: 30, min: 24, max: 60 },
      advanced: [
        { focusMode: 'continuous' },
        { exposureMode: 'continuous' }
      ]
    };
  } else {
    // Desktop browsers
    return {
      ...baseConstraints,
      width: { ideal: 1920, min: 1280, max: 1920 },
      height: { ideal: 1080, min: 720, max: 1080 },
      frameRate: { ideal: 30, min: 15, max: 60 }
    };
  }
};

/**
 * Get optimized QR scanner settings based on device
 */
export const getOptimizedScannerSettings = () => {
  const deviceInfo = getDeviceInfo();
  
  const baseSettings = {
    returnDetailedScanResult: true,
    highlightScanRegion: false,
    highlightCodeOutline: false,
    onDecodeError: (error) => {
      console.debug('QR decode error:', error);
    }
  };

  if (deviceInfo.isMobile) {
    // Mobile devices - optimize for battery and performance
    return {
      ...baseSettings,
      maxScansPerSecond: deviceInfo.deviceMemory >= 6 ? 30 : 20,
      preferredCamera: 'environment'
    };
  } else {
    // Desktop - optimize for accuracy
    return {
      ...baseSettings,
      maxScansPerSecond: 60,
      preferredCamera: 'environment'
    };
  }
};

/**
 * Start performance monitoring
 */
export const startPerformanceMonitoring = () => {
  performanceMetrics.scanStartTime = performance.now();
  performanceMetrics.scanCount = 0;
  performanceMetrics.averageScanTime = 0;
};

/**
 * Record scan performance
 */
export const recordScanPerformance = () => {
  const scanTime = performance.now() - performanceMetrics.scanStartTime;
  performanceMetrics.scanCount++;
  performanceMetrics.averageScanTime = 
    (performanceMetrics.averageScanTime * (performanceMetrics.scanCount - 1) + scanTime) / performanceMetrics.scanCount;
  
  console.log(`Scan ${performanceMetrics.scanCount}: ${scanTime.toFixed(2)}ms (avg: ${performanceMetrics.averageScanTime.toFixed(2)}ms)`);
};

/**
 * Get performance metrics
 */
export const getPerformanceMetrics = () => {
  return { ...performanceMetrics };
};

/**
 * Check if device supports advanced camera features
 */
export const supportsAdvancedCameraFeatures = async () => {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        width: { ideal: 1280 },
        height: { ideal: 720 },
        advanced: [
          { focusMode: 'continuous' },
          { exposureMode: 'continuous' }
        ]
      }
    });
    
    const track = stream.getVideoTracks()[0];
    const capabilities = track.getCapabilities();
    
    // Stop the test stream
    stream.getTracks().forEach(track => track.stop());
    
    return {
      supportsTorch: capabilities.torch !== undefined,
      supportsFocus: capabilities.focusMode?.includes('continuous'),
      supportsExposure: capabilities.exposureMode?.includes('continuous'),
      supportsWhiteBalance: capabilities.whiteBalanceMode !== undefined
    };
  } catch (error) {
    console.warn('Advanced camera features not supported:', error);
    return {
      supportsTorch: false,
      supportsFocus: false,
      supportsExposure: false,
      supportsWhiteBalance: false
    };
  }
};

/**
 * Optimize for low-end devices
 */
export const optimizeForLowEndDevice = () => {
  const deviceInfo = getDeviceInfo();
  
  // Check if device is low-end
  const isLowEnd = deviceInfo.deviceMemory < 4 || deviceInfo.hardwareConcurrency < 4;
  
  if (isLowEnd) {
    console.log('Low-end device detected, applying optimizations');
    
    // Reduce frame rate and resolution for better performance
    return {
      width: { ideal: 640, min: 480, max: 1280 },
      height: { ideal: 480, min: 360, max: 720 },
      frameRate: { ideal: 15, min: 10, max: 30 },
      maxScansPerSecond: 10
    };
  }
  
  return null;
};

/**
 * Memory management for long-running scanner
 */
export const optimizeMemoryUsage = () => {
  // Clear console logs in production
  if (process.env.NODE_ENV === 'production') {
    console.clear();
  }
  
  // Force garbage collection if available
  if (window.gc) {
    window.gc();
  }
  
  // Clear performance metrics periodically
  if (performanceMetrics.scanCount > 100) {
    performanceMetrics.scanCount = 0;
    performanceMetrics.averageScanTime = 0;
  }
};

export default {
  getDeviceInfo,
  getOptimizedCameraConstraints,
  getOptimizedScannerSettings,
  startPerformanceMonitoring,
  recordScanPerformance,
  getPerformanceMetrics,
  supportsAdvancedCameraFeatures,
  optimizeForLowEndDevice,
  optimizeMemoryUsage
}; 