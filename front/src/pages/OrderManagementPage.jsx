import React, { useState, useRef, useCallback, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Tabs, Timeline, ConfirmationModal, CompactProfile, OrderCard } from '../components/common';
import QrScanner from 'qr-scanner';
import { scanSuccessFeedback, scanErrorFeedback, hapticFeedback } from '../utils/feedback';
import {
  getDeviceInfo,
  getOptimizedCameraConstraints,
  getOptimizedScannerSettings,
  recordScanPerformance,
  startPerformanceMonitoring,
  optimizeMemoryUsage
} from '../utils/performance';
import { orderAPI } from '../api/orderAPI';
import { formatTimeOnly, formatGregorianDate, getRelativeTime } from '../utils/dateUtils';

const OrderManagementPage = () => {
  // Enhanced Scanning States with better organization
  const [scannerState, setScannerState] = useState({
    isScanning: false,
    isProcessing: false,
    isInitializing: false,
    hasPermission: false,
    showCamera: false,
    error: null,
    deviceInfo: null
  });

  const [scannedOrder, setScannedOrder] = useState(null);
  const [manualInput, setManualInput] = useState('');
  const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
  const [recentScans, setRecentScans] = useState([]);
  const [scannerBuffer, setScannerBuffer] = useState('');
  const [lastScanTime, setLastScanTime] = useState(0);
  const [showTimelineModal, setShowTimelineModal] = useState(false);
  const [selectedOrderForTimeline, setSelectedOrderForTimeline] = useState(null);
  const [highlightedOrderId, setHighlightedOrderId] = useState(null);
  const [lastScannedCode, setLastScannedCode] = useState('');
  const [lastScanTimestamp, setLastScanTimestamp] = useState(0);
  const [isManualSubmitting, setIsManualSubmitting] = useState(false);

  // Order Management States
  const [activeTab, setActiveTab] = useState('received');
  const [orders, setOrders] = useState({
    received: [],
    inMaintenance: [],
    completed: [],
    failed: [],
    returns: [],
    sending: []
  });
  const [ordersSummary, setOrdersSummary] = useState({
    received: 0,
    in_maintenance: 0,
    completed: 0,
    failed: 0,
    sending: 0,
    returned: 0,
    total: 0
  });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [actionInProgress, setActionInProgress] = useState(null);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // Refs
  const videoRef = useRef(null);
  const qrScannerRef = useRef(null);
  const scannerInputRef = useRef(null);

  // Load orders from backend
  const loadOrdersByStatus = useCallback(async (status) => {
    if (!status) return;
    
    setIsLoadingOrders(true);
    try {
      const result = await orderAPI.getOrdersByStatus(status);
      if (result.success) {
        const transformedOrders = result.data.orders.map(order => 
          orderAPI.transformBackendOrder(order)
        );
        
        // Map backend status to frontend state key
        const statusMap = {
          'in_maintenance': 'inMaintenance',
          'returned': 'returns'
        };
        const stateKey = statusMap[status] || status;
        
        setOrders(prev => ({
          ...prev,
          [stateKey]: transformedOrders
        }));
      } else {
        console.warn(`Failed to load ${status} orders:`, result.message);
      }
    } catch (error) {
      console.error(`Error loading ${status} orders:`, error);
    } finally {
      setIsLoadingOrders(false);
    }
  }, []);

  // Load orders summary
  const loadOrdersSummary = useCallback(async () => {
    try {
      const result = await orderAPI.getOrdersSummary();
      if (result.success) {
        setOrdersSummary(result.data);
      }
    } catch (error) {
      console.error('Error loading orders summary:', error);
    }
  }, []);

  // Refresh all orders for active tab
  const refreshActiveTabOrders = useCallback(async () => {
    await loadOrdersByStatus(activeTab === 'inMaintenance' ? 'in_maintenance' : activeTab);
    await loadOrdersSummary();
  }, [activeTab, loadOrdersByStatus, loadOrdersSummary]);

  // Enhanced QR Scanner initialization with comprehensive error handling
  const initializeQRScanner = useCallback(async () => {
    if (!videoRef.current) return;

    setScannerState(prev => ({ ...prev, isInitializing: true, error: null }));

    try {
      // Start performance monitoring
      startPerformanceMonitoring();

      const deviceInfo = getDeviceInfo();
      const optimizedSettings = getOptimizedScannerSettings();
      const optimizedConstraints = getOptimizedCameraConstraints('environment');

      console.log('Initializing QR Scanner with device info:', deviceInfo);

      // Check for secure context (HTTPS requirement)
      if (!window.isSecureContext && window.location.protocol !== 'http:') {
        console.warn('Camera requires secure context (HTTPS) for production');
        setScannerState(prev => ({
          ...prev,
          error: 'الكاميرا تتطلب اتصال آمن (HTTPS) في الإنتاج',
          isInitializing: false
        }));
        return;
      }

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
          if (!scannerState.isProcessing) {
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
          // Add better error handling
          onDecodeError: (error) => {
            console.debug('QR decode error:', error);
            // Don't show error for decode failures, just log them
          },
          // Add scan region to improve accuracy
          highlightScanRegion: true,
          highlightCodeOutline: true,
          // Reduce false positives
          maxScansPerSecond: 10,
          // Add validation
          validateScan: (result) => {
            // Basic validation before processing
            if (!result || !result.data) return false;
            const data = result.data.trim();
            return data.length >= 3 && data.length <= 50; // Reasonable length for tracking numbers
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

      console.log('QR Scanner initialized successfully');

    } catch (err) {
      console.error('QR Scanner initialization error:', err);

      // Enhanced error messages for different scenarios
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
    }
  }, [scannerState.isProcessing]);

  // Enhanced QR detection with backend integration
  const handleQRDetected = useCallback(async (data) => {
    if (scannerState.isProcessing) return;

    // Debounce mechanism to prevent duplicate scans
    const now = Date.now();
    const timeSinceLastScan = now - lastScanTimestamp;
    const isDuplicateCode = lastScannedCode === data;
    
    if (isDuplicateCode && timeSinceLastScan < 3000) { // 3 second debounce for same code
      console.log('Debounced duplicate scan:', data);
      return;
    }
    
    // Update last scan info
    setLastScannedCode(data);
    setLastScanTimestamp(now);

    // Validate tracking number format
    if (!data || typeof data !== 'string') {
      console.warn('Invalid QR data detected:', data);
      setScannerState(prev => ({
        ...prev,
        error: 'بيانات QR غير صحيحة'
      }));
      scanErrorFeedback();
      hapticFeedback('error');
      
      // Clear error after 3 seconds and resume scanner
      setTimeout(() => {
        setScannerState(prev => ({ ...prev, error: null }));
        if (qrScannerRef.current && typeof qrScannerRef.current.resume === 'function') {
          qrScannerRef.current.resume();
        }
      }, 3000);
      return;
    }

    // Clean and validate tracking number
    const cleanTrackingNumber = data.trim();
    
    // Check if tracking number is too short or contains invalid characters
    if (cleanTrackingNumber.length < 3) {
      console.warn('Tracking number too short:', cleanTrackingNumber);
      setScannerState(prev => ({
        ...prev,
        error: 'رقم التتبع قصير جداً'
      }));
      scanErrorFeedback();
      hapticFeedback('error');
      
      setTimeout(() => {
        setScannerState(prev => ({ ...prev, error: null }));
        if (qrScannerRef.current && typeof qrScannerRef.current.resume === 'function') {
          qrScannerRef.current.resume();
        }
      }, 3000);
      return;
    }

    // Check for common invalid patterns
    const invalidPatterns = [
      /^[0-9]{1,2}$/, // Single or double digits
      /^[a-zA-Z]{1,2}$/, // Single or double letters
      /^[\\\/\-_]{1,}$/, // Only special characters
      /^[0-9]{1,2}[a-zA-Z]{1,2}$/, // Short alphanumeric
    ];

    if (invalidPatterns.some(pattern => pattern.test(cleanTrackingNumber))) {
      console.warn('Invalid tracking number pattern:', cleanTrackingNumber);
      setScannerState(prev => ({
        ...prev,
        error: 'نمط رقم التتبع غير صحيح'
      }));
      scanErrorFeedback();
      hapticFeedback('error');
      
      setTimeout(() => {
        setScannerState(prev => ({ ...prev, error: null }));
        if (qrScannerRef.current && typeof qrScannerRef.current.resume === 'function') {
          qrScannerRef.current.resume();
        }
      }, 3000);
      return;
    }

    setScannerState(prev => ({ ...prev, isProcessing: true, error: null }));

    try {
      console.log('Scanning order with tracking number:', cleanTrackingNumber);

      // Check if order already exists in backend
      const existingResult = await orderAPI.getOrderByTracking(cleanTrackingNumber);
      
      if (existingResult.success) {
        // Order exists - navigate to its tab and highlight it
        const existingOrder = orderAPI.transformBackendOrder(existingResult.data);
        const tabId = existingOrder.status === 'in_maintenance' ? 'inMaintenance' : existingOrder.status;
        
          // Navigate to the tab containing the order
          setActiveTab(tabId);
        await loadOrdersByStatus(existingOrder.status);
        
        // Highlight the order
          setHighlightedOrderId(existingOrder._id);
          
        // Scroll to top smoothly
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }, 100);
          
        // Clear highlight after 6 seconds
          setTimeout(() => {
            setHighlightedOrderId(null);
          }, 6000);

          // Show success message
          setScannerState(prev => ({
            ...prev,
          error: `تم العثور على الطلب ${cleanTrackingNumber} في ${getTabLabel(tabId)}`
          }));
          
          scanSuccessFeedback();
          hapticFeedback('success');

          // Clear message after 4 seconds and resume scanner
          setTimeout(() => {
            setScannerState(prev => ({ ...prev, error: null }));
            if (qrScannerRef.current && typeof qrScannerRef.current.resume === 'function') {
              qrScannerRef.current.resume();
            }
          }, 4000);

          return;
      }

      // Check if this tracking number was recently scanned (within last 5 seconds)
      const recentScan = recentScans.find(scan => 
        scan.trackingNumber === cleanTrackingNumber && 
        (new Date().getTime() - new Date(scan.scannedAt).getTime()) < 5000
      );

      if (recentScan) {
        console.log('Expert Mode: Auto-confirming duplicate scan for', cleanTrackingNumber);
        
        // Auto-scan and confirm with backend
        const scanResult = await orderAPI.scanOrder(cleanTrackingNumber);
        
        if (scanResult.success) {
          const orderData = orderAPI.transformBackendOrder(scanResult.data.order);
          
          // Refresh orders and navigate to received tab
          setActiveTab('received');
          await loadOrdersByStatus('received');
          await loadOrdersSummary();
          
          // Add to recent scans
          setRecentScans(prev => [orderData, ...prev.slice(0, 8)]);
          
          // Highlight the new order
          setHighlightedOrderId(orderData._id);
          
          // Scroll to top and highlight
          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
          setTimeout(() => {
            setHighlightedOrderId(null);
          }, 4000);
        }, 100);

        // Show expert auto-confirmation message
        setScannerState(prev => ({
          ...prev,
            error: `تم تأكيد استلام الطلب ${cleanTrackingNumber} تلقائياً (وضع الخبير)`
        }));

        scanSuccessFeedback();
        hapticFeedback('success');

        // Clear message after 3 seconds and resume scanner
        setTimeout(() => {
          setScannerState(prev => ({ ...prev, error: null }));
          if (qrScannerRef.current && typeof qrScannerRef.current.resume === 'function') {
            qrScannerRef.current.resume();
          }
        }, 3000);

        return;
        }
      }

      // New order - scan from backend
      const scanResult = await orderAPI.scanOrder(cleanTrackingNumber);
      
      if (scanResult.success) {
        const orderData = orderAPI.transformBackendOrder(scanResult.data.order);

      // Add scanned timestamp
      orderData.scannedAt = new Date().toISOString();

      setScannedOrder(orderData);
      setAwaitingConfirmation(true);

        // Add to recent scans
      setRecentScans(prev => {
        const existingIndex = prev.findIndex(scan => scan.trackingNumber === orderData.trackingNumber);
        if (existingIndex !== -1) {
          const updatedScans = [...prev];
          updatedScans[existingIndex] = {
            ...updatedScans[existingIndex],
            scannedAt: orderData.scannedAt
          };
          return updatedScans;
        } else {
          return [orderData, ...prev.slice(0, 8)];
        }
      });

        // Scroll to top smoothly for new orders
      setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
      }, 100);

      // Enhanced feedback
      scanSuccessFeedback();
      hapticFeedback('success');

      // Pause scanner for confirmation
      if (qrScannerRef.current && typeof qrScannerRef.current.pause === 'function') {
        qrScannerRef.current.pause();
        }
      } else {
        throw new Error(scanResult.message);
      }

    } catch (error) {
      console.error('Error processing scanned data:', error);
      
      setScannerState(prev => ({
        ...prev,
        error: error.message || 'فشل في معالجة البيانات الممسوحة'
      }));
      scanErrorFeedback();
      hapticFeedback('error');

      // Clear error after 3 seconds and resume scanner
      setTimeout(() => {
        setScannerState(prev => ({ ...prev, error: null }));
        if (qrScannerRef.current && typeof qrScannerRef.current.resume === 'function') {
          qrScannerRef.current.resume();
        }
      }, 3000);
    } finally {
      setTimeout(() => {
        setScannerState(prev => ({ ...prev, isProcessing: false }));
      }, 1000);
    }
  }, [scannerState.isProcessing, recentScans, loadOrdersByStatus, loadOrdersSummary]);

  // Handle manual input
  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (manualInput.trim()) {
      setIsManualSubmitting(true);
      
      try {
        // Use the same validation logic as QR scanner
        const cleanTrackingNumber = manualInput.trim();
        
        // Check if tracking number is too short
        if (cleanTrackingNumber.length < 3) {
          setScannerState(prev => ({
            ...prev,
            error: 'رقم التتبع قصير جداً'
          }));
          scanErrorFeedback();
          hapticFeedback('error');
          
          setTimeout(() => {
            setScannerState(prev => ({ ...prev, error: null }));
          }, 3000);
          return;
        }

        // Check for common invalid patterns
        const invalidPatterns = [
          /^[0-9]{1,2}$/, // Single or double digits
          /^[a-zA-Z]{1,2}$/, // Single or double letters
          /^[\\\/\-_]{1,}$/, // Only special characters
          /^[0-9]{1,2}[a-zA-Z]{1,2}$/, // Short alphanumeric
        ];

        if (invalidPatterns.some(pattern => pattern.test(cleanTrackingNumber))) {
          setScannerState(prev => ({
            ...prev,
            error: 'نمط رقم التتبع غير صحيح'
          }));
          scanErrorFeedback();
          hapticFeedback('error');
          
          setTimeout(() => {
            setScannerState(prev => ({ ...prev, error: null }));
          }, 3000);
          return;
        }

        await handleQRDetected(cleanTrackingNumber);
        setManualInput('');
      } finally {
        setIsManualSubmitting(false);
      }
    }
  };

  // Handle Enter key confirmation
  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter' && awaitingConfirmation && scannedOrder) {
      handleConfirmReceive();
    }
  }, [awaitingConfirmation, scannedOrder]);

  // Handle scanner device input
  const handleScannerInput = useCallback(async (e) => {
    const now = Date.now();

    // If it's been more than 100ms since last input, start new buffer
    if (now - lastScanTime > 100) {
      setScannerBuffer('');
    }

    setLastScanTime(now);

    // Add character to buffer
    if (e.key.length === 1) {
      setScannerBuffer(prev => prev + e.key);
    }

    // If Enter is pressed, process the buffer
    if (e.key === 'Enter' && scannerBuffer.trim()) {
      e.preventDefault();
      await handleQRDetected(scannerBuffer.trim());
      setScannerBuffer('');
    }
  }, [scannerBuffer, lastScanTime, handleQRDetected]);

  useEffect(() => {
    document.addEventListener('keypress', handleKeyPress);
    document.addEventListener('keypress', handleScannerInput);
    return () => {
      document.removeEventListener('keypress', handleKeyPress);
      document.removeEventListener('keypress', handleScannerInput);
    };
  }, [handleKeyPress, handleScannerInput]);

  // Load initial data on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      await loadOrdersSummary();
      await loadOrdersByStatus('received'); // Load default tab
      
      // Load recent scans
      try {
        const result = await orderAPI.getRecentScans(10);
        if (result.success) {
          console.log('Recent scans raw data:', result.data);
          console.log('First scan example:', result.data[0]);
          // The backend now returns the correct structure, no transformation needed
          setRecentScans(result.data);
        } else {
          console.warn('Failed to load recent scans:', result.message);
        }
      } catch (error) {
        console.error('Error loading recent scans:', error);
      }
    };

    loadInitialData();
  }, [loadOrdersSummary, loadOrdersByStatus]);

  // Load orders when active tab changes
  useEffect(() => {
    const statusMap = {
      'inMaintenance': 'in_maintenance',
      'returns': 'returned'
    };
    const status = statusMap[activeTab] || activeTab;
    loadOrdersByStatus(status);
  }, [activeTab, loadOrdersByStatus]);

  // Auto-start camera on component mount
  useEffect(() => {
    if (scannerState.showCamera) {
      const startCameraOnMount = async () => {
        try {
          await initializeQRScanner();
        } catch (err) {
          console.log('Camera auto-start failed, will retry on user interaction');
        }
      };

      startCameraOnMount();
    }
  }, [initializeQRScanner, scannerState.showCamera]);

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
        isProcessing: false,
        isInitializing: false,
        error: null
      }));

      // Optimize memory usage
      optimizeMemoryUsage();

      console.log('Camera stopped and resources cleaned up');
    } catch (err) {
      console.error('Error stopping camera:', err);
    }
  }, []);

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      console.log('OrderManagementPage unmounting, cleaning up resources...');
      stopCamera();
    };
  }, [stopCamera]);

  // Order Actions
  const handleConfirmReceive = async () => {
    if (!scannedOrder) return;

    try {
      // Order is already created in backend during scan, just confirm it
    setScannedOrder(null);
    setAwaitingConfirmation(false);

      // Refresh received orders and summary
      setActiveTab('received');
      await loadOrdersByStatus('received');
      await loadOrdersSummary();

              // Resume scanning
          if (qrScannerRef.current && typeof qrScannerRef.current.resume === 'function') {
            qrScannerRef.current.resume();
          }

    hapticFeedback('success');
    } catch (error) {
      console.error('Error confirming order:', error);
    }
  };



  const handleOrderAction = async (actionType, order, actionNotes = '') => {
    setActionInProgress(actionType);
    
    try {
      let actionData = {};
      
      // Extract action data based on action type
      if (typeof actionNotes === 'object' && actionNotes !== null) {
        actionData = actionNotes;
        actionNotes = actionData.notes || '';
      }

      console.log(`Performing action: ${actionType} on order ${order._id}`);
      
      const result = await orderAPI.performOrderAction(
        order._id,
        actionType,
        actionNotes,
        'فني الصيانة',
        actionData
      );

      if (result.success) {
        // Refresh current tab orders and summary
        await refreshActiveTabOrders();
        
        // If action moves order to different tab, also refresh that tab
        const targetStatus = getTargetStatusForAction(actionType);
        if (targetStatus && targetStatus !== activeTab) {
          await loadOrdersByStatus(targetStatus === 'inMaintenance' ? 'in_maintenance' : targetStatus);
        }

        hapticFeedback('success');
        } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Error performing action:', error);
      // You could show a toast notification here
      hapticFeedback('error');
    } finally {
      setActionInProgress(null);
    }
  };

  // Helper function to get target status for action
  const getTargetStatusForAction = (actionType) => {
    const actionStatusMap = {
      'start_maintenance': 'inMaintenance',
      'complete_maintenance': 'completed',
      'fail_maintenance': 'failed',
      'reschedule': 'inMaintenance',
      'send_order': 'sending',
      'confirm_send': 'sending',
      'return_order': 'returns',
      'move_to_returns': 'returns',
      'refund_or_replace': 'completed'
    };
    return actionStatusMap[actionType];
  };

  // Check if order should be treated as return
  const isReturnOrder = (order) => {
    return order.isReturnOrder || false;
  };

  // Get Arabic label for tab
  const getTabLabel = (tabId) => {
    const tabLabels = {
      'received': 'المستلمة',
      'inMaintenance': 'تحت الصيانة',
      'completed': 'مكتملة',
      'failed': 'فاشلة/معلقة',
      'sending': 'جاري الإرسال',
      'returns': 'المرتجعة'
    };
    return tabLabels[tabId] || tabId;
  };

  // Get creative highlight classes based on tab color
  const getHighlightClasses = (tabId) => {
    const tabColorMap = {
      'received': 'blue',
      'inMaintenance': 'amber', 
      'completed': 'green',
      'failed': 'red',
      'sending': 'purple',
      'returns': 'gray'
    };
    
    const color = tabColorMap[tabId] || 'blue';
    
    const highlightStyles = {
      blue: 'border-l-4 border-blue-500 bg-gradient-to-r from-blue-50/80 to-blue-100/40 shadow-lg shadow-blue-200/50 ring-2 ring-blue-300/30',
      amber: 'border-l-4 border-amber-500 bg-gradient-to-r from-amber-50/80 to-amber-100/40 shadow-lg shadow-amber-200/50 ring-2 ring-amber-300/30',
      green: 'border-l-4 border-green-500 bg-gradient-to-r from-green-50/80 to-green-100/40 shadow-lg shadow-green-200/50 ring-2 ring-green-300/30',
      red: 'border-l-4 border-red-500 bg-gradient-to-r from-red-50/80 to-red-100/40 shadow-lg shadow-red-200/50 ring-2 ring-red-300/30',
      purple: 'border-l-4 border-purple-500 bg-gradient-to-r from-purple-50/80 to-purple-100/40 shadow-lg shadow-purple-200/50 ring-2 ring-purple-300/30',
      gray: 'border-l-4 border-gray-500 bg-gradient-to-r from-gray-50/80 to-gray-100/40 shadow-lg shadow-gray-200/50 ring-2 ring-gray-300/30'
    };
    
    return highlightStyles[color];
  };

  // Enhanced camera control with proper cleanup
  const startCamera = useCallback(async () => {
    setScannerState(prev => ({ ...prev, error: null }));
    await initializeQRScanner();
  }, [initializeQRScanner]);



  // Toggle camera with smooth transitions
  const toggleCamera = useCallback(() => {
    if (scannerState.showCamera) {
      stopCamera();
    }
    setScannerState(prev => ({ ...prev, showCamera: !prev.showCamera }));
  }, [scannerState.showCamera, stopCamera]);

  // Dynamic actions are now handled by OrderCard component
  const getActionsForTab = (tabId) => {
    // Return empty array as actions are now dynamic per order
    return [];
  };

  // Tab configuration with backend data
  const tabs = [
    {
      id: 'received',
      label: 'المستلمة',
      badge: ordersSummary.received.toString(),
      color: 'blue'
    },
    {
      id: 'inMaintenance',
      label: 'تحت الصيانة',
      badge: ordersSummary.in_maintenance.toString(),
      color: 'amber'
    },
    {
      id: 'completed',
      label: 'مكتملة',
      badge: ordersSummary.completed.toString(),
      color: 'green'
    },
    {
      id: 'failed',
      label: 'فاشلة/معلقة',
      badge: ordersSummary.failed.toString(),
      color: 'red'
    },
    {
      id: 'sending',
      label: 'جاري الإرسال',
      badge: ordersSummary.sending.toString(),
      color: 'purple'
    },
    {
      id: 'returns',
      label: 'المرتجعة',
      badge: ordersSummary.returned.toString(),
      color: 'gray'
    }
  ];

  const getTabColorClasses = (color, isActive) => {
    const colors = {
      blue: {
        active: 'bg-blue-50 text-blue-700 border-2 border-blue-200',
        inactive: 'text-blue-700 hover:bg-blue-50 hover:border-blue-200 border-2 border-transparent',
        badge: 'bg-blue-100 text-blue-800',
        badgeActive: 'bg-blue-200 text-blue-800'
      },
      amber: {
        active: 'bg-amber-50 text-amber-700 border-2 border-amber-200',
        inactive: 'text-amber-700 hover:bg-amber-50 hover:border-amber-200 border-2 border-transparent',
        badge: 'bg-amber-100 text-amber-800',
        badgeActive: 'bg-amber-200 text-amber-800'
      },
      green: {
        active: 'bg-green-50 text-green-700 border-2 border-green-200',
        inactive: 'text-green-700 hover:bg-green-50 hover:border-green-200 border-2 border-transparent',
        badge: 'bg-green-100 text-green-800',
        badgeActive: 'bg-green-200 text-green-800'
      },
      red: {
        active: 'bg-red-50 text-red-700 border-2 border-red-200',
        inactive: 'text-red-700 hover:bg-red-50 hover:border-red-200 border-2 border-transparent',
        badge: 'bg-red-100 text-red-800',
        badgeActive: 'bg-red-200 text-red-800'
      },
      purple: {
        active: 'bg-purple-50 text-purple-700 border-2 border-purple-200',
        inactive: 'text-purple-700 hover:bg-purple-50 hover:border-purple-200 border-2 border-transparent',
        badge: 'bg-purple-100 text-purple-800',
        badgeActive: 'bg-purple-200 text-purple-800'
      },
      gray: {
        active: 'bg-gray-50 text-gray-700 border-2 border-gray-200',
        inactive: 'text-gray-700 hover:bg-gray-50 hover:border-gray-200 border-2 border-transparent',
        badge: 'bg-gray-100 text-gray-800',
        badgeActive: 'bg-gray-200 text-gray-800'
      }
    };
    return colors[color] || colors.blue;
  };

  // Timeline Modal Component
  const TimelineModal = ({ isOpen, onClose, order }) => {
    if (!isOpen || !order) return null;

    const timelineItems = [
      // Order timeline
      ...(order.timeline || []).map((item, index) => ({
        title: getTimelineTitle(item.value),
        description: getTimelineDescription(item.value),
        time: formatGregorianDate(item.date, true),
        status: item.done ? 'completed' : 'pending',
        details: `المرحلة ${index + 1} من ${order.timeline.length}`
      })),
      // Maintenance history
      ...(order.maintenanceHistory || []).map((history, index) => ({
        title: getMaintenanceTitle(history.action),
        description: history.notes,
        time: formatGregorianDate(history.timestamp, true),
        status: getMaintenanceStatus(history.action),
        details: `بواسطة: ${history.user}`
      }))
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-brand-red-500 to-brand-red-600 px-6 py-4 text-white">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold font-cairo-play">خط زمني للطلب</h2>
                <p className="text-sm opacity-90 font-cairo-play">
                  {order.trackingNumber} - {order.receiver?.fullName}
                </p>
              </div>
              <button
                onClick={onClose}
                className="text-white hover:text-gray-200 transition-colors"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(80vh-120px)]">
            <Timeline
              items={timelineItems}
              variant="default"
              className="space-y-4"
            />
          </div>
        </div>
      </div>
    );
  };

  // Helper functions for timeline
  const getTimelineTitle = (value) => {
    const titles = {
      'ready_for_pickup': 'جاهز للاستلام',
      'picked_up': 'تم الاستلام',
      'in_transit': 'في الطريق',
      'out_for_delivery': 'خارج للتوصيل',
      'delivered': 'تم التوصيل',
      'returned': 'تم الإرجاع',
      'failed': 'فشل في التوصيل'
    };
    return titles[value] || value;
  };

  const getTimelineDescription = (value) => {
    const descriptions = {
      'ready_for_pickup': 'الطلب جاهز للاستلام من المرسل',
      'picked_up': 'تم استلام الطلب بنجاح',
      'in_transit': 'الطلب في الطريق إلى وجهته',
      'out_for_delivery': 'الطلب خارج للتوصيل للمستلم',
      'delivered': 'تم توصيل الطلب بنجاح',
      'returned': 'تم إرجاع الطلب',
      'failed': 'فشل في توصيل الطلب'
    };
    return descriptions[value] || '';
  };

  const getMaintenanceTitle = (action) => {
    const titles = {
      'received': 'استلام الطلب',
      'start_maintenance': 'بدء الصيانة',
      'fail_maintenance': 'فشل في الصيانة',
      'reschedule': 'إعادة للصيانة',
      'complete_maintenance': 'إنجاز الصيانة',
      'send_order': 'إرسال الطلب',
      'confirm_send': 'تأكيد إرسال الطلب'
    };
    return titles[action] || action;
  };

  const getMaintenanceStatus = (action) => {
    const statuses = {
      'received': 'completed',
      'start_maintenance': 'processing',
      'fail_maintenance': 'failed',
      'reschedule': 'pending',
      'complete_maintenance': 'completed',
      'send_order': 'shipping',
      'confirm_send': 'shipping'
    };
    return statuses[action] || 'pending';
  };

  // Custom HVAR Professional Logo
  const HvarSystemIcon = () => (
    <div className="flex items-center justify-center w-10 h-10 bg-gradient-to-br from-brand-red-500 via-brand-red-600 to-brand-red-700 rounded-xl shadow-brand-red relative overflow-hidden">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent"></div>

      <svg
        className="w-7 h-7 text-white relative z-10"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        {/* HVAR Letters */}
        <path
          d="M6 8h2v8H6V8zm4 0h2v8h-2V8zm4 0h2v8h-2V8z"
          fill="currentColor"
        />
        {/* Circuit Lines */}
        <path
          d="M4 6h16M4 18h16M8 4v16M16 4v16M8 4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
          stroke="currentColor"
          strokeWidth="0.5"
          strokeLinecap="round"
        />
        {/* Connection Dots */}
        <circle cx="6" cy="6" r="0.5" fill="currentColor" />
        <circle cx="18" cy="6" r="0.5" fill="currentColor" />
        <circle cx="6" cy="18" r="0.5" fill="currentColor" />
        <circle cx="18" cy="18" r="0.5" fill="currentColor" />
        <circle cx="12" cy="12" r="0.5" fill="currentColor" />
      </svg>

      {/* Glow Effect */}
      <div className="absolute inset-0 bg-gradient-to-br from-brand-red-400/20 to-transparent rounded-xl"></div>
    </div>
  );

  return (
    <div className="h-screen bg-gray-50 flex flex-col" dir="rtl">
      {/* Clean Navigation Bar */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left - Title with Icon */}
          <div className="flex items-center space-x-3 space-x-reverse">
            <HvarSystemIcon />
            <div>
              <h1 className="text-xl font-bold text-gray-900 font-cairo-play">
                ميتو الرايق للصيانة
              </h1>
            </div>
          </div>

          {/* Center - Clean Tabs */}
          <div className="flex space-x-2 space-x-reverse">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              const hasBadge = tab.badge && tab.badge !== '0';
              const colorClasses = getTabColorClasses(tab.color, isActive);

              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    if (activeTab !== tab.id) {
                      setActiveTab(tab.id);
                    }
                  }}
                  className={`
                      px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200
                      flex items-center space-x-2 space-x-reverse font-cairo
                      ${isActive ? colorClasses.active : colorClasses.inactive}
                      ${isLoadingOrders && activeTab === tab.id ? 'opacity-70' : ''}
                    `}
                  disabled={isLoadingOrders && activeTab === tab.id}
                >
                  <span>{tab.label}</span>
                  {hasBadge && (
                    <span className={`
                        px-2 py-0.5 rounded-full text-xs font-bold transition-colors font-cairo
                        ${isActive ? colorClasses.badgeActive : colorClasses.badge}
                      `}>
                      {tab.badge}
                    </span>
                  )}
                  {isLoadingOrders && activeTab === tab.id && (
                    <div className="w-3 h-3 border border-gray-400 border-t-transparent rounded-full animate-spin"></div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Right - Enhanced Status Controls */}
          <div className="flex items-center space-x-3 space-x-reverse">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className={`w-2 h-2 rounded-full transition-colors duration-300 ${scannerState.isInitializing ? 'bg-yellow-500 animate-pulse' :
                  scannerState.isProcessing ? 'bg-blue-500 animate-pulse' :
                    scannerState.isScanning ? 'bg-green-500' :
                      scannerState.error ? 'bg-red-500' : 'bg-gray-400'
                }`}></div>
              <span className="text-xs text-gray-600 font-cairo-play">
                {scannerState.isInitializing ? 'جاري التشغيل...' :
                  scannerState.isProcessing ? 'جاري المعالجة...' :
                    scannerState.isScanning ? 'نشط' :
                      scannerState.error ? 'خطأ' : 'متوقف'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel - Compact Scanner */}
        <div className="w-72 bg-white border-l border-gray-200 flex flex-col">
          {/* Scanner Header */}
          <div className="p-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900 font-cairo-play">
                مسح رمز التتبع
              </h3>
              <button
                onClick={toggleCamera}
                className={`
                  px-2 py-1 rounded text-xs font-cairo-play transition-colors
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

                  {/* Enhanced Scanning overlay with animations */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="relative">
                      {/* Main scanning frame */}
                      <div className="w-24 h-24 border-2 border-white/50 rounded relative">
                        {/* Corner indicators */}
                        <div className="absolute -top-1 -right-1 w-3 h-3 border-t-2 border-r-2 border-blue-400 rounded-tr"></div>
                        <div className="absolute -top-1 -left-1 w-3 h-3 border-t-2 border-l-2 border-blue-400 rounded-tl"></div>
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 border-b-2 border-r-2 border-blue-400 rounded-br"></div>
                        <div className="absolute -bottom-1 -left-1 w-3 h-3 border-b-2 border-l-2 border-blue-400 rounded-bl"></div>

                        {/* Animated scanning line */}
                        {scannerState.isScanning && !scannerState.isProcessing && (
                          <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-blue-400 to-transparent animate-bounce"></div>
                        )}

                        {/* Processing indicator */}
                        {scannerState.isProcessing && (
                          <div className="absolute inset-0 bg-green-400/20 border-2 border-green-400 rounded animate-pulse">
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="bg-green-500 text-white px-2 py-1 rounded text-xs font-cairo-play">
                                ✓
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Success indicator */}
                        {scannerState.isProcessing && (
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-green-500 text-white px-2 py-1 rounded text-xs font-cairo-play animate-pulse">
                            جاري المعالجة...
                          </div>
                        )}

                        {/* Success indicator for completed scans */}
                        {!scannerState.isProcessing && scannerState.isScanning && (
                          <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 bg-blue-500 text-white px-2 py-1 rounded text-xs font-cairo-play">
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
                        className="px-3 py-1 bg-blue-600 text-white rounded text-xs font-cairo-play hover:bg-blue-700 transition-colors"
                      >
                        بدء المسح
                      </button>
                    </div>
                  )}

                  {scannerState.isInitializing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span className="text-white text-xs font-cairo-play">
                          جاري تشغيل الكاميرا...
                        </span>
                      </div>
                    </div>
                  )}

                  {scannerState.isScanning && (
                    <div className="absolute bottom-2 left-2 right-2">
                      <div className="bg-black/70 rounded p-1 text-center">
                        <p className="text-white text-xs font-cairo-play">
                          {scannerState.isProcessing ? 'جاري جلب البيانات من بوسطة...' : 'امسح رمز QR'}
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
                  disabled={!manualInput.trim() || isManualSubmitting}
                  className="w-full py-2 bg-blue-600 text-white rounded-lg text-sm font-cairo-play disabled:bg-gray-300"
                >
                  {isManualSubmitting ? 'جاري البحث...' : 'بحث عن الطلب'}
                </button>
              </form>
              
              {/* Scanner Input Indicator */}
              <div className="flex items-center justify-between text-xs text-gray-500">
                <span className="font-cairo-play">جهاز المسح الضوئي:</span>
                <div className="flex items-center space-x-1 space-x-reverse">
                  <div className={`w-2 h-2 rounded-full ${scannerBuffer ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`}></div>
                  <span className="font-cairo-play">
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
                  <p className="text-red-700 font-cairo-play text-right text-xs flex-1">{scannerState.error}</p>
                  <button
                    onClick={() => {
                      setScannerState(prev => ({ ...prev, error: null }));
                      if (qrScannerRef.current && typeof qrScannerRef.current.resume === 'function') {
                        qrScannerRef.current.resume();
                      }
                    }}
                    className="text-red-600 hover:text-red-800 text-xs font-cairo-play underline"
                  >
                    إعادة المحاولة
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Recent Scans */}
          <div className="flex-1 p-4 overflow-y-auto scrollbar-hide">
            <h4 className="text-sm font-semibold text-gray-900 mb-3 font-cairo-play">
              آخر المسح ({recentScans.length})
            </h4>
            <div className="space-y-2">
              {recentScans.length > 0 ? (
                recentScans.slice(0, 8).map((scan) => (
                  <div key={scan._id} className="flex items-center justify-between bg-gray-50 rounded-lg p-2 hover:bg-gray-100 transition-colors duration-200">
                    <div className="flex items-center space-x-2 space-x-reverse flex-1 min-w-0">
                      <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 text-xs font-cairo-play truncate mb-1">
                          {scan.trackingNumber}
                        </p>
                        <p className="text-gray-600 text-xs font-cairo-play truncate">
                          {scan.receiver?.fullName || 'غير محدد'}
                        </p>
                        {scan.specs?.packageDetails?.description && (
                          <p className="text-gray-500 text-xs font-cairo-play truncate max-w-xs">
                            {scan.specs.packageDetails.description}
                          </p>
                        )}
                      </div>
                    </div>
                    <span className="text-xs text-gray-500 font-cairo-play flex-shrink-0 mr-2">
                      {scan.scannedAt ? formatTimeOnly(scan.scannedAt) : 'لا يوجد وقت'}
                    </span>
                  </div>
                ))
              ) : (
                <div className="text-center py-8">
                  <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                  <p className="text-gray-500 text-sm font-cairo-play">لا توجد عمليات مسح حديثة</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Tab Header with Count */}
          <div className="bg-white border-b border-gray-100 px-6 py-3">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-gray-900 font-cairo-play">
                {tabs.find(tab => tab.id === activeTab)?.label}
              </h2>
              <span className="text-sm text-gray-600 font-cairo-play">
                {orders[activeTab]?.length || 0} طلب
              </span>
            </div>
          </div>

          {/* Enhanced Scanned Order Confirmation - Compact Design */}
          {awaitingConfirmation && scannedOrder && (
            <div className={`bg-gradient-to-r border-b p-3 ${isReturnOrder(scannedOrder)
                ? 'from-orange-50 to-red-50 border-orange-200'
                : 'from-green-50 to-emerald-50 border-green-200'
              }`}>
              <div className="flex items-center justify-between">
                {/* Left - Order Details */}
                <div className="flex items-center space-x-3 space-x-reverse flex-1">
                  {/* Status Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${isReturnOrder(scannedOrder)
                      ? 'bg-orange-100'
                      : 'bg-green-100'
                    }`}>
                    <svg className={`w-4 h-4 ${isReturnOrder(scannedOrder)
                        ? 'text-orange-600'
                        : 'text-green-600'
                      }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      {isReturnOrder(scannedOrder) ? (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      )}
                    </svg>
                  </div>

                  {/* Expert Horizontal Order Information */}
                  <div className="flex-1 min-w-0">
                    {/* Horizontal Layout with Single Icons */}
                    <div className="flex items-center space-x-6 space-x-reverse">

                      {/* 1. Tracking Number - Horizontal Layout */}
                      <div className="flex items-center space-x-3 space-x-reverse flex-shrink-0">
                        <div className="min-w-0">
                          <p className="font-bold text-gray-900 text-xs font-cairo-play mb-1">
                            رقم التتبع
                          </p>
                          <span className="text-gray-900 text-md font-bold font-cairo-play truncate max-w-32">
                            {scannedOrder.trackingNumber}
                          </span>
                        </div>
                      </div>

                      {/* Visual Separator */}
                      <div className="w-px h-12 bg-gradient-to-b from-gray-200 to-gray-300 flex-shrink-0"></div>

                      {/* 2. Customer Information - Horizontal Layout */}
                      <div className="flex items-center space-x-3 space-x-reverse flex-shrink-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                          </svg>
                        </div>
                        <div className="min-w-0 max-w-32">
                          <p className="font-bold text-gray-900 text-xs font-cairo-play mb-1">
                            العميل
                          </p>
                          <span className="text-gray-700 text-sm font-small font-cairo-play truncate max-w-full">
                            {scannedOrder.receiver?.fullName || 'غير محدد'}
                          </span>
                        </div>
                      </div>

                      {/* Visual Separator */}
                      <div className="w-px h-12 bg-gradient-to-b from-gray-200 to-gray-300 flex-shrink-0"></div>

                      {/* 3. Product Information - Horizontal Layout with Flexible Width */}
                      <div className="flex items-start space-x-3 space-x-reverse flex-1 min-w-0">
                        <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center shadow-sm flex-shrink-0 mt-0.5">
                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-900 text-xs font-cairo-play mb-1">
                            وصف المنتج
                          </p>
                          <span className="text-gray-700 text-sm font-small font-cairo-play line-clamp-2 break-words">
                            {scannedOrder.specs?.packageDetails?.description || 'لا يوجد وصف للمنتج'}
                          </span>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>

                {/* Right - Action Buttons */}
                <div className="flex items-center space-x-2 space-x-reverse flex-shrink-0">
                  <button
                    onClick={handleConfirmReceive}
                    className="px-4 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-cairo-play transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                    aria-label="تأكيد استلام الطلب"
                  >
                    تأكيد (Enter)
                  </button>
                  <button
                                onClick={() => {
              setScannedOrder(null);
              setAwaitingConfirmation(false);
              if (qrScannerRef.current && typeof qrScannerRef.current.resume === 'function') {
                qrScannerRef.current.resume();
              }
            }}
                    className="px-3 py-1.5 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-cairo-play transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    aria-label="إلغاء استلام الطلب"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Orders List */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoadingOrders ? (
              <div className="flex items-center justify-center py-12">
                <div className="flex items-center space-x-3 space-x-reverse">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="text-gray-600 font-cairo-play">جاري تحميل الطلبات...</span>
                </div>
              </div>
            ) : orders[activeTab]?.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {orders[activeTab].map((order) => (
                  <OrderCard
                    key={order._id}
                    order={order}
                    onAction={handleOrderAction}
                    showTimeline={false}
                    onShowTimeline={(order) => {
                      setSelectedOrderForTimeline(order);
                      setShowTimelineModal(true);
                    }}
                    className={`text-sm transition-all duration-500 ease-out transform ${
                      highlightedOrderId === order._id 
                        ? `${getHighlightClasses(activeTab)} scale-[1.02]` 
                        : ''
                    } ${actionInProgress ? 'opacity-75' : ''}`}
                    disabled={actionInProgress}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2 font-cairo-play">
                  لا توجد طلبات
                </h3>
                <p className="text-gray-600 font-cairo-play">
                  لا توجد طلبات في هذه المرحلة حالياً
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Modal */}
      <TimelineModal
        isOpen={showTimelineModal}
        onClose={() => {
          setShowTimelineModal(false);
          setSelectedOrderForTimeline(null);
        }}
        order={selectedOrderForTimeline}
      />

      {/* Refund/Replace Modal */}
      {/* Removed as per edit hint */}

      {/* Hidden input for scanner device */}
      <input
        ref={scannerInputRef}
        type="text"
        className="absolute opacity-0 pointer-events-none"
        autoFocus
        onKeyPress={handleScannerInput}
      />
    </div>
  );
};

export default OrderManagementPage;