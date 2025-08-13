import React, { useState, useRef, useCallback, useEffect } from 'react';
import QrScanner from 'qr-scanner';
import { scanSuccessFeedback, scanErrorFeedback, hapticFeedback } from '../../utils/feedback';
import {
  getDeviceInfo,
  getOptimizedCameraConstraints,
  getOptimizedScannerSettings,
  recordScanPerformance,
  startPerformanceMonitoring,
  optimizeMemoryUsage
} from '../../utils/performance';

const ScannerSection = ({ 
  onScanResult, 
  onError,
  isProcessing = false,
  className = "" 
}) => {
  // Scanner States
  const [scannerState, setScannerState] = useState({
    isScanning: false,
    isInitializing: false,
    hasPermission: false,
    showCamera: false,
    error: null,
    deviceInfo: null
  });

  const [manualInput, setManualInput] = useState('');
  const [scannerBuffer, setScannerBuffer] = useState('');
  const [lastScanTime, setLastScanTime] = useState(0);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [lastScanTimestamp, setLastScanTimestamp] = useState(0);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const scannerInputRef = useRef(null);

  // Enhanced QR Scanner initialization
  const initializeQRScanner = useCallback(async () => {
    if (!videoRef.current) return;

    setScannerState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      startPerformanceMonitoring();

      const deviceInfo = getDeviceInfo();
      const optimizedSettings = getOptimizedScannerSettings();
      const optimizedConstraints = getOptimizedCameraConstraints('environment');

      // Check camera permissions first
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setScannerState(prev => ({ ...prev, hasPermission: true }));
      } catch (permError) {
        throw new Error('تم رفض إذن الكاميرا. يرجى السماح بالوصول للكاميرا في إعدادات المتصفح.');
      }

      qrScannerRef.current = new QrScanner(
        videoRef.current,
        (result) => {
          if (!isProcessing) {
            recordScanPerformance();
            handleQRDetected(result.data, result);
          }
        },
        {
          ...optimizedSettings,
          preferredCamera: 'environment',
          constraints: {
            video: optimizedConstraints
          },
          onDecodeError: (error) => {
            console.debug('QR decode error:', error);
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
          maxScansPerSecond: 10,
          validateScan: (result) => {
            if (!result || !result.data) return false;
            const data = result.data.trim();
            return data.length >= 3 && data.length <= 50;
          }
        }
      );

      await qrScannerRef.current.start();
      setScannerState(prev => ({
        ...prev,
        isScanning: true,
        isInitializing: false,
        deviceInfo,
        error: null
      }));

    } catch (err) {
      console.error('QR Scanner initialization error:', err);

      let errorMessage = 'فشل في بدء مسح رمز QR.';

      if (err.name === 'NotAllowedError' || err.message.includes('إذن الكاميرا')) {
        errorMessage = 'تم رفض إذن الكاميرا. يرجى السماح بالوصول للكاميرا في إعدادات المتصفح.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'لم يتم العثور على كاميرا. تأكد من وجود كاميرا متصلة.';
      } else if (err.name === 'NotSupportedError') {
        errorMessage = 'هذا المتصفح لا يدعم مسح رمز QR. جرب متصفح آخر.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'الكاميرا مشغولة من قبل تطبيق آخر. أغلق التطبيقات الأخرى التي تستخدم الكاميرا.';
      }

      setScannerState(prev => ({
        ...prev,
        error: errorMessage,
        isInitializing: false,
        isScanning: false
      }));

      scanErrorFeedback();
      onError?.(errorMessage);
    }
  }, [isProcessing, onError]);

  // Enhanced QR detection with debouncing
  const handleQRDetected = useCallback(async (data) => {
    if (isProcessing) return;

    // Debounce mechanism
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTimestamp;
    const isDuplicateCode = lastScannedCode === data;
    
    if (isDuplicateCode && timeSinceLastScan < 3000) {
      console.log('Debounced duplicate scan:', data);
      return;
    }
    
    setLastScannedCode(data);
    setLastScanTimestamp(now);

    // Validate tracking number format
    if (!data || typeof data !== 'string') {
      const error = 'بيانات QR غير صحيحة';
      setScannerState(prev => ({ ...prev, error }));
      scanErrorFeedback();
      hapticFeedback('error');
      
      setTimeout(() => {
        setScannerState(prev => ({ ...prev, error: null }));
        resumeScanner();
      }, 3000);
      return;
    }

    const cleanTrackingNumber = data.trim();
    
    if (cleanTrackingNumber.length < 3) {
      const error = 'رقم التتبع قصير جداً';
      setScannerState(prev => ({ ...prev, error }));
      scanErrorFeedback();
      hapticFeedback('error');
      
      setTimeout(() => {
        setScannerState(prev => ({ ...prev, error: null }));
        resumeScanner();
      }, 3000);
      return;
    }

    // Check for invalid patterns
    const invalidPatterns = [
      /^[0-9]{1,2}$/,
      /^[a-zA-Z]{1,2}$/,
      /^[\\\/\-_]{1,}$/,
      /^[0-9]{1,2}[a-zA-Z]{1,2}$/,
    ];

    if (invalidPatterns.some(pattern => pattern.test(cleanTrackingNumber))) {
      const error = 'نمط رقم التتبع غير صحيح';
      setScannerState(prev => ({ ...prev, error }));
      scanErrorFeedback();
      hapticFeedback('error');
      
      setTimeout(() => {
        setScannerState(prev => ({ ...prev, error: null }));
        resumeScanner();
      }, 3000);
      return;
    }

    // Pause scanner during processing
    pauseScanner();

    // Enhanced feedback
    scanSuccessFeedback();
    hapticFeedback('success');

    // Call parent handler
    onScanResult?.(cleanTrackingNumber);

  }, [isProcessing, lastScannedCode, lastScanTimestamp, onScanResult]);

  // Resume scanner helper
  const resumeScanner = useCallback(() => {
    if (qrScannerRef.current && typeof qrScannerRef.current.resume === 'function') {
      qrScannerRef.current.resume();
    }
  }, []);

  // Pause scanner helper
  const pauseScanner = useCallback(() => {
    if (qrScannerRef.current && typeof qrScannerRef.current.pause === 'function') {
      qrScannerRef.current.pause();
    }
  }, []);

  // Handle manual submit
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualInput.trim()) return;

    setIsManualSubmitting(true);
    
    try {
      await handleQRDetected(manualInput.trim());
      setManualInput('');
    } finally {
      setIsManualSubmitting(false);
    }
  };

  // Handle scanner device input
  const handleScannerInput = useCallback(async (e) => {
    const now = Date.now();

    if (now - lastScanTime > 100) {
      setScannerBuffer('');
    }

    setLastScanTime(now);

    if (e.key.length === 1) {
      setScannerBuffer(prev => prev + e.key);
    }

    if (e.key === 'Enter' && scannerBuffer.trim()) {
      e.preventDefault();
      await handleQRDetected(scannerBuffer.trim());
      setScannerBuffer('');
    }
  }, [scannerBuffer, lastScanTime, handleQRDetected]);

  // Stop camera
  const stopCamera = useCallback(() => {
    try {
      if (qrScannerRef.current) {
        qrScannerRef.current.stop();
        qrScannerRef.current.destroy();
        qrScannerRef.current = null;
      }

      setScannerState(prev => ({
        ...prev,
        isScanning: false,
        isInitializing: false,
        error: null
      }));

      optimizeMemoryUsage();
    } catch (err) {
      console.error('Error stopping camera:', err);
    }
  }, []);

  // Toggle camera
  const toggleCamera = useCallback(() => {
    if (scannerState.showCamera) {
      stopCamera();
    }
    setScannerState(prev => ({ ...prev, showCamera: !prev.showCamera }));
  }, [scannerState.showCamera, stopCamera]);

  // Start camera
  const startCamera = useCallback(async () => {
    setScannerState(prev => ({ ...prev, error: null }));
    await initializeQRScanner();
  }, [initializeQRScanner]);

  // Event listeners
  useEffect(() => {
    document.addEventListener('keypress', handleScannerInput);
    return () => {
      document.removeEventListener('keypress', handleScannerInput);
    };
  }, [handleScannerInput]);

  // Auto-start camera on mount
  useEffect(() => {
    if (scannerState.showCamera) {
      startCamera();
    }
  }, [scannerState.showCamera, startCamera]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  // Expose resume method for parent component
  useEffect(() => {
    if (typeof onScanResult === 'function') {
      onScanResult.resumeScanner = resumeScanner;
    }
  }, [resumeScanner, onScanResult]);

  return (
    <div className={`w-72 bg-white border-l border-gray-200 flex flex-col ${className}`}>
      {/* Scanner Header */}
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-900 font-cairo">
            مسح رمز التتبع
          </h3>
          <button
            onClick={toggleCamera}
            className={`
              px-2 py-1 rounded text-xs font-cairo transition-colors
              ${scannerState.showCamera
                ? 'bg-red-100 text-red-700 hover:bg-red-200'
                : 'bg-green-100 text-green-700 hover:bg-green-200'
              }
            `}
          >
            {scannerState.showCamera ? 'إخفاء الكاميرا' : 'إظهار الكاميرا'}
          </button>
        </div>

        {/* Compact Camera */}
        {scannerState.showCamera && (
          <div className="relative mb-3">
            <div className="aspect-video bg-gray-900 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />

              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="relative">
                  <div className="w-24 h-24 border-2 border-white/50 rounded relative">
                    <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-blue-400 rounded-tr"></div>
                    <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-blue-400 rounded-tl"></div>
                    <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-blue-400 rounded-br"></div>
                    <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-blue-400 rounded-bl"></div>

                    {scannerState.isScanning && !isProcessing && (
                      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-bounce"></div>
                    )}

                    {isProcessing && (
                      <div className="absolute inset-0 bg-green-400/20 border-2 border-green-400 rounded animate-pulse">
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-cairo">
                            ✓
                          </div>
                        </div>
                      </div>
                    )}

                    {isProcessing && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-2 py-1 rounded text-xs font-cairo animate-pulse">
                        جاري المعالجة...
                      </div>
                    )}

                    {!isProcessing && scannerState.isScanning && (
                      <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-cairo">
                        جاهز للمسح
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {!scannerState.isScanning && !scannerState.error && !scannerState.isInitializing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <button
                    onClick={startCamera}
                    className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-cairo hover:bg-blue-700 transition-colors"
                  >
                    بدء المسح
                  </button>
                </div>
              )}

              {scannerState.isInitializing && (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span className="text-white text-xs font-cairo">
                      جاري تشغيل الكاميرا...
                    </span>
                  </div>
                </div>
              )}

              {scannerState.isScanning && (
                <div className="absolute bottom-2 left-2 right-2">
                  <div className="bg-black/70 rounded p-1 text-center">
                    <p className="text-white text-xs font-cairo">
                      {isProcessing ? 'جاري جلب البيانات من بوسطة...' : 'امسح رمز QR'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Manual Input */}
        <div className="space-y-2">
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <input
              type="text"
              value={manualInput}
              onChange={(e) => setManualInput(e.target.value)}
              placeholder="أدخل رقم التتبع..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-cairo text-right"
              dir="rtl"
            />
            <button
              type="submit"
              disabled={!manualInput.trim() || isManualSubmitting || isProcessing}
              className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-cairo disabled:bg-gray-300"
            >
              {isManualSubmitting ? 'جاري البحث...' : 'بحث عن الطلب'}
            </button>
          </form>
          
          {/* Scanner Input Indicator */}
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span className="font-cairo">جهاز المسح الضوئي:</span>
            <div className="flex items-center space-x-1 space-x-reverse">
              <div className={`w-2 h-2 rounded-full ${scannerBuffer ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
              <span className="font-cairo">
                {scannerBuffer ? 'نشط' : 'جاهز'}
              </span>
            </div>
          </div>
        </div>

        {scannerState.error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-2 mt-2">
            <div className="flex items-center space-x-2 space-x-reverse">
              <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-700 font-cairo text-right text-xs flex-1">{scannerState.error}</p>
              <button
                onClick={() => {
                  setScannerState(prev => ({ ...prev, error: null }));
                  resumeScanner();
                }}
                className="text-red-600 hover:text-red-800 text-xs font-cairo underline"
              >
                إعادة المحاولة
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Hidden input for scanner device */}
      <input
        ref={scannerInputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none"
        autoFocus
      />
    </div>
  );
};

export default ScannerSection;