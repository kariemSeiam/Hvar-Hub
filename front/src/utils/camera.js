// camera.js - HVAR Camera Masterpiece Integration
// Integrates with the global camera system from index.html

/**
 * Enhanced camera utilities that work with the masterpiece camera system
 */

// Wait for the global camera system to be ready
export const waitForCameraSystem = () => {
  return new Promise((resolve) => {
    if (window.HVARCameraState && window.HVARCameraState.isInitialized) {
      resolve(true);
      return;
    }
    
    const checkInterval = setInterval(() => {
      if (window.HVARCameraState && window.HVARCameraState.isInitialized) {
        clearInterval(checkInterval);
        resolve(true);
      }
    }, 100);
    
    // Timeout after 5 seconds
    setTimeout(() => {
      clearInterval(checkInterval);
      resolve(false);
    }, 5000);
  });
};

/**
 * Enhanced camera permission request using the global system
 */
export const requestCameraPermission = async (constraints = {}) => {
  console.log('🎬 Requesting camera permission through HVAR system...');
  
  // Wait for the camera system to be ready
  const systemReady = await waitForCameraSystem();
  if (!systemReady) {
    console.warn('⚠️ Global camera system not ready, falling back to direct API');
    return directCameraRequest(constraints);
  }
  
  // Use the global camera system
  if (window.HVARRequestCameraPermission) {
    try {
      const result = await window.HVARRequestCameraPermission();
      
      if (result.success) {
        console.log('✅ Camera permission granted via HVAR system');
        return {
          success: true,
          stream: result.stream,
          constraints: result.constraints,
          source: 'hvar-system',
          fallback: result.fallback || null,
          legacy: result.legacy || false
        };
      } else {
        console.error('❌ Camera permission failed via HVAR system:', result.error);
        return {
          success: false,
          error: result.error,
          source: 'hvar-system'
        };
      }
    } catch (error) {
      console.error('❌ HVAR camera system error:', error);
      return directCameraRequest(constraints);
    }
  }
  
  return directCameraRequest(constraints);
};

/**
 * Direct camera request fallback
 */
const directCameraRequest = async (constraints = {}) => {
  console.log('🎬 Using direct camera API fallback...');
  
  try {
    const defaultConstraints = {
      video: {
        facingMode: 'environment',
        width: { ideal: 1280, min: 640, max: 1920 },
        height: { ideal: 720, min: 480, max: 1080 },
        frameRate: { ideal: 30, min: 15, max: 60 }
      },
      audio: false
    };
    
    const finalConstraints = { ...defaultConstraints, ...constraints };
    const stream = await navigator.mediaDevices.getUserMedia(finalConstraints);
    
    return {
      success: true,
      stream,
      constraints: finalConstraints,
      source: 'direct-api'
    };
  } catch (error) {
    console.error('❌ Direct camera API failed:', error);
    return {
      success: false,
      error,
      source: 'direct-api'
    };
  }
};

/**
 * Get camera state from the global system
 */
export const getCameraState = () => {
  if (window.HVARCameraState) {
    return { ...window.HVARCameraState };
  }
  
  return {
    isInitialized: false,
    hasPermission: false,
    stream: null,
    error: null,
    devices: [],
    constraints: null
  };
};

/**
 * Get comprehensive camera info
 */
export const getCameraInfo = () => {
  if (window.HVARGetCameraInfo) {
    return window.HVARGetCameraInfo();
  }
  
  return {
    state: getCameraState(),
    isSupported: !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia),
    isSecureContext: window.isSecureContext,
    permissions: 'permissions' in navigator,
    deviceMemory: navigator.deviceMemory || 'unknown',
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
    connectionType: navigator.connection ? navigator.connection.effectiveType : 'unknown'
  };
};

/**
 * Stop camera using the global system
 */
export const stopCamera = () => {
  if (window.HVARStopCamera) {
    window.HVARStopCamera();
  } else if (window.HVARCameraState && window.HVARCameraState.stream) {
    const tracks = window.HVARCameraState.stream.getTracks();
    tracks.forEach(track => track.stop());
    window.HVARCameraState.stream = null;
    window.HVARCameraState.hasPermission = false;
  }
};

/**
 * Check if camera is available and ready
 */
export const isCameraReady = () => {
  const state = getCameraState();
  return state.isInitialized && state.hasPermission && state.stream;
};

/**
 * Get available camera devices
 */
export const getCameraDevices = async () => {
  try {
    if (window.HVARCameraState && window.HVARCameraState.devices.length > 0) {
      return window.HVARCameraState.devices;
    }
    
    const devices = await navigator.mediaDevices.enumerateDevices();
    return devices.filter(device => device.kind === 'videoinput');
  } catch (error) {
    console.error('❌ Failed to get camera devices:', error);
    return [];
  }
};

/**
 * Switch camera (front/back)
 */
export const switchCamera = async (facingMode = 'environment') => {
  console.log(`🔄 Switching camera to ${facingMode}...`);
  
  // Stop current stream
  stopCamera();
  
  // Request new stream with different facing mode
  const constraints = {
    video: {
      facingMode: facingMode,
      width: { ideal: 1280, min: 640, max: 1920 },
      height: { ideal: 720, min: 480, max: 1080 },
      frameRate: { ideal: 30, min: 15, max: 60 }
    },
    audio: false
  };
  
  return await requestCameraPermission(constraints);
};

/**
 * Get optimal camera constraints for current device
 */
export const getOptimalConstraints = () => {
  // Use device detection from global system if available
  const info = getCameraInfo();
  
  // Default constraints
  let constraints = {
    video: {
      facingMode: 'environment',
      width: { ideal: 1280, min: 640, max: 1920 },
      height: { ideal: 720, min: 480, max: 1080 },
      frameRate: { ideal: 30, min: 15, max: 60 }
    },
    audio: false
  };
  
  // Adjust based on device capabilities
  if (info.deviceMemory && info.deviceMemory < 4) {
    // Low memory device - reduce quality
    constraints.video.width = { ideal: 640, min: 320, max: 1280 };
    constraints.video.height = { ideal: 480, min: 240, max: 720 };
    constraints.video.frameRate = { ideal: 15, min: 10, max: 30 };
  }
  
  if (info.connectionType === 'slow-2g' || info.connectionType === '2g') {
    // Slow connection - minimal quality
    constraints.video.width = { ideal: 320, min: 240, max: 640 };
    constraints.video.height = { ideal: 240, min: 180, max: 480 };
    constraints.video.frameRate = { ideal: 10, min: 5, max: 15 };
  }
  
  return constraints;
};

/**
 * Monitor camera performance
 */
export const monitorCameraPerformance = (stream) => {
  if (!stream) return null;
  
  const track = stream.getVideoTracks()[0];
  if (!track) return null;
  
  const monitor = {
    track,
    getStats: () => {
      if (track.getSettings) {
        return track.getSettings();
      }
      return null;
    },
    getCapabilities: () => {
      if (track.getCapabilities) {
        return track.getCapabilities();
      }
      return null;
    },
    getConstraints: () => {
      if (track.getConstraints) {
        return track.getConstraints();
      }
      return null;
    }
  };
  
  // Log performance info
  console.log('📊 Camera Performance Monitor:', {
    settings: monitor.getStats(),
    capabilities: monitor.getCapabilities(),
    constraints: monitor.getConstraints()
  });
  
  return monitor;
};

/**
 * Handle camera errors with user-friendly messages
 */
export const handleCameraError = (error) => {
  const errorMessages = {
    'NotAllowedError': 'تم رفض إذن الكاميرا. يرجى السماح بالوصول للكاميرا.',
    'NotFoundError': 'لم يتم العثور على كاميرا. تأكد من وجود كاميرا متصلة.',
    'NotReadableError': 'الكاميرا مشغولة من قبل تطبيق آخر. أغلق التطبيقات الأخرى.',
    'OverconstrainedError': 'إعدادات الكاميرا غير مدعومة. جاري المحاولة بإعدادات أخرى.',
    'NotSupportedError': 'هذا المتصفح لا يدعم الكاميرا. جرب متصفح آخر.',
    'AbortError': 'تم إلغاء طلب الكاميرا.',
    'SecurityError': 'خطأ أمني في الوصول للكاميرا. تأكد من استخدام HTTPS.'
  };
  
  const userMessage = errorMessages[error.name] || `خطأ في الكاميرا: ${error.message}`;
  
  console.error('🚨 Camera Error:', {
    name: error.name,
    message: error.message,
    userMessage,
    stack: error.stack
  });
  
  return {
    name: error.name,
    message: error.message,
    userMessage,
    timestamp: new Date().toISOString()
  };
};

export default {
  waitForCameraSystem,
  requestCameraPermission,
  getCameraState,
  getCameraInfo,
  stopCamera,
  isCameraReady,
  getCameraDevices,
  switchCamera,
  getOptimalConstraints,
  monitorCameraPerformance,
  handleCameraError
}; 