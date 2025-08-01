import React, { useState, useEffect } from 'react';
import { 
  detectDeviceAndBrowser, 
  checkCameraPermission, 
  requestCameraPermission,
  forceCameraPermissionRequest,
  ultimateForceCameraRequest,
  getBrowserInstructions,
  checkCameraSupport
} from '../../utils/permissions';

const PermissionDialog = ({ 
  isOpen, 
  onClose, 
  onGranted, 
  onDenied,
  type = 'camera',
  className = '',
  ...props 
}) => {
  const [permissionState, setPermissionState] = useState('checking');
  const [deviceInfo, setDeviceInfo] = useState(null);
  const [browserInfo, setBrowserInfo] = useState(null);
  const [errorDetails, setErrorDetails] = useState(null);
  const [cameraSupport, setCameraSupport] = useState(null);

  // Detect device and browser information
  useEffect(() => {
    const { deviceInfo, browserInfo } = detectDeviceAndBrowser();
    setDeviceInfo(deviceInfo);
    setBrowserInfo(browserInfo);
    setCameraSupport(checkCameraSupport());
  }, []);

  // Check current permission status
  useEffect(() => {
    const checkPermission = async () => {
      try {
        const permission = await checkCameraPermission();
        setPermissionState(permission.state);
      } catch (error) {
        console.warn('Permission check failed:', error);
        setPermissionState('prompt');
      }
    };

    if (isOpen) {
      checkPermission();
    }
  }, [isOpen]);

  // Request camera permission with enhanced handling
  const requestPermission = async () => {
    try {
      setPermissionState('requesting');
      
      // Try the enhanced force permission request first
      const result = await forceCameraPermissionRequest();
      
      if (result.success) {
        setPermissionState('granted');
        console.log('Camera permission granted successfully');
        onGranted?.();
      } else {
        setPermissionState('denied');
        setErrorDetails(result.error);
        console.error('Camera permission denied:', result.error);
        onDenied?.(result.error);
      }
    } catch (error) {
      console.error('Permission request failed:', error);
      setPermissionState('denied');
      setErrorDetails(error);
      onDenied?.(error);
    }
  };

  // Get device-specific instructions
  const getDeviceInstructions = () => {
    if (!deviceInfo || !browserInfo) return {};

    const browserInstructions = getBrowserInstructions();
    
    return {
      title: 'إذن الكاميرا مطلوب',
      description: 'يحتاج التطبيق إلى إذن للوصول إلى الكاميرا لمسح رموز QR',
      steps: [
        'اضغط على "السماح" في النافذة المنبثقة',
        'إذا لم تظهر النافذة، اتبع الخطوات أدناه',
        'ابحث عن أيقونة الكاميرا في شريط العنوان',
        'أعد تحميل الصفحة بعد منح الإذن'
      ],
      icon: browserInstructions.icon,
      browserSpecific: browserInstructions
    };
  };

  const instructions = getDeviceInstructions();

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 bg-black/50 backdrop-blur-sm ${className}`} {...props}>
      <div className="relative w-full max-w-sm sm:max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[95vh] sm:max-h-[90vh] flex flex-col mt-4 sm:mt-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-3 sm:p-4 text-white text-center flex-shrink-0">
          <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">{instructions.icon}</div>
          <h2 className="text-base sm:text-lg font-cairo-play font-bold mb-1 sm:mb-2">
            {instructions.title}
          </h2>
          <p className="text-blue-100 text-xs font-roboto leading-relaxed">
            {instructions.description}
          </p>
        </div>

        {/* Content */}
        <div className="p-3 sm:p-4 flex-1 overflow-y-auto min-h-0">
          {/* Permission Status */}
          <div className="mb-3 sm:mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-gray-700">حالة الإذن:</span>
              <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                permissionState === 'granted' ? 'bg-green-100 text-green-800' :
                permissionState === 'denied' ? 'bg-red-100 text-red-800' :
                permissionState === 'requesting' ? 'bg-yellow-100 text-yellow-800' :
                'bg-gray-100 text-gray-800'
              }`}>
                {permissionState === 'granted' ? 'مُمنح' :
                 permissionState === 'denied' ? 'مرفوض' :
                 permissionState === 'requesting' ? 'جاري الطلب' :
                 permissionState === 'prompt' ? 'في انتظار الطلب' : 'غير محدد'}
              </span>
            </div>
          </div>

          {/* Device Info */}
          {deviceInfo && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-gray-50 rounded-lg">
              <h3 className="text-xs font-medium text-gray-700 mb-2">معلومات الجهاز:</h3>
              <div className="text-xs text-gray-600 space-y-1">
                <div>النوع: {deviceInfo.isMobile ? 'هاتف محمول' : deviceInfo.isTablet ? 'تابلت' : 'كمبيوتر'}</div>
                <div>المتصفح: {browserInfo?.isChrome ? 'Chrome' : browserInfo?.isSafari ? 'Safari' : browserInfo?.isFirefox ? 'Firefox' : 'آخر'}</div>
                <div>دعم الكاميرا: {deviceInfo.hasCamera ? 'متوفر' : 'غير متوفر'}</div>
                <div>السياق الآمن: {deviceInfo.hasSecureContext ? 'متوفر' : 'غير متوفر'}</div>
                {cameraSupport && (
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    {cameraSupport.issues.length > 0 && (
                      <div className="text-red-600">
                        <div className="text-xs font-medium">مشاكل محتملة:</div>
                        {cameraSupport.issues.map((issue, index) => (
                          <div key={index} className="text-xs">• {issue}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instructions */}
          <div className="mb-3 sm:mb-4">
            <h3 className="text-xs font-medium text-gray-700 mb-2">خطوات منح الإذن:</h3>
            <div className="space-y-2">
              {instructions.steps.map((step, index) => (
                <div key={index} className="flex items-start space-x-2 space-x-reverse">
                  <div className="flex-shrink-0 w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center text-xs font-bold">
                    {index + 1}
                  </div>
                  <p className="text-xs text-gray-600 font-roboto leading-relaxed">{step}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Browser-specific instructions */}
          {instructions.browserSpecific && (
            <div className="mb-3 sm:mb-4 p-2 sm:p-3 bg-blue-50 rounded-lg border border-blue-200">
              <h3 className="text-xs font-medium text-blue-800 mb-2">
                {instructions.browserSpecific.title}:
              </h3>
              <div className="space-y-2">
                {instructions.browserSpecific.steps.map((step, index) => (
                  <div key={index} className="flex items-start space-x-2 space-x-reverse">
                    <div className="flex-shrink-0 w-4 h-4 bg-blue-200 text-blue-700 rounded-full flex items-center justify-center text-xs font-bold">
                      {index + 1}
                    </div>
                    <p className="text-xs text-blue-700 font-roboto leading-relaxed">{step}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error Details */}
          {errorDetails && (
            <div className="mb-4 p-3 bg-red-50 rounded-lg border border-red-200">
              <h3 className="text-xs font-medium text-red-800 mb-2">تفاصيل الخطأ:</h3>
              <p className="text-xs text-red-700 font-roboto mb-2 leading-relaxed">
                {errorDetails.userMessage || 
                 (errorDetails.name === 'NotAllowedError' ? 'تم رفض الإذن من قبل المستخدم' :
                  errorDetails.name === 'NotFoundError' ? 'لم يتم العثور على كاميرا' :
                  errorDetails.name === 'NotSupportedError' ? 'المتصفح لا يدعم الكاميرا' :
                  errorDetails.name === 'NotReadableError' ? 'الكاميرا مشغولة من قبل تطبيق آخر' :
                  errorDetails.message || 'خطأ غير معروف')}
              </p>
              
              {/* Solution suggestions */}
              {errorDetails.solution && (
                <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                  <h4 className="text-xs font-medium text-blue-800 mb-1">الحل المقترح:</h4>
                  <div className="text-xs text-blue-700 space-y-1">
                    {errorDetails.solution === 'go_to_settings' && (
                      <>
                        <div>• اذهب إلى إعدادات المتصفح</div>
                        <div>• ابحث عن "الأذونات" أو "الموقع"</div>
                        <div>• غير إعداد الكاميرا إلى "السماح"</div>
                        <div>• أعد تحميل الصفحة</div>
                      </>
                    )}
                    {errorDetails.solution === 'check_hardware' && (
                      <>
                        <div>• تأكد من وجود كاميرا في الجهاز</div>
                        <div>• تحقق من عدم استخدام الكاميرا من تطبيق آخر</div>
                        <div>• أعد تشغيل الجهاز إذا لزم الأمر</div>
                      </>
                    )}
                    {errorDetails.solution === 'change_browser' && (
                      <>
                        <div>• جرب متصفح Chrome أو Firefox</div>
                        <div>• تأكد من تحديث المتصفح</div>
                        <div>• جرب في وضع التصفح الخاص</div>
                      </>
                    )}
                    {errorDetails.solution === 'close_other_apps' && (
                      <>
                        <div>• أغلق التطبيقات الأخرى التي تستخدم الكاميرا</div>
                        <div>• أغلق تطبيقات الكاميرا أو التصوير</div>
                        <div>• أعد تشغيل الجهاز إذا لزم الأمر</div>
                      </>
                    )}
                    {errorDetails.solution === 'use_https' && (
                      <>
                        <div>• تأكد من استخدام HTTPS في الموقع</div>
                        <div>• أو استخدم localhost للتطوير</div>
                        <div>• تحقق من إعدادات الأمان في المتصفح</div>
                        <div>• جرب فتح الموقع مع https:// بدلاً من http://</div>
                      </>
                    )}
                    {errorDetails.solution === 'update_browser' && (
                      <>
                        <div>• قم بتحديث المتصفح إلى أحدث إصدار</div>
                        <div>• جرب متصفح Chrome أو Firefox الحديث</div>
                        <div>• تأكد من دعم المتصفح لـ WebRTC</div>
                        <div>• أعد تشغيل المتصفح بعد التحديث</div>
                      </>
                    )}
                    {errorDetails.solution === 'check_permissions' && (
                      <>
                        <div>• تحقق من إعدادات الكاميرا في المتصفح</div>
                        <div>• امنح الإذن يدوياً من شريط العنوان</div>
                        <div>• أعد تشغيل المتصفح وحاول مرة أخرى</div>
                        <div>• تأكد من عدم منع الكاميرا من إعدادات النظام</div>
                      </>
                    )}
                    {errorDetails.solution === 'comprehensive_fix' && (
                      <>
                        <div>• جرب جميع الحلول المذكورة أعلاه</div>
                        <div>• استخدم HTTPS إذا كنت تستخدم HTTP</div>
                        <div>• حدث المتصفح إلى أحدث إصدار</div>
                        <div>• امنح الإذن يدوياً من إعدادات المتصفح</div>
                        <div>• جرب متصفح مختلف كخيار أخير</div>
                      </>
                    )}
                    {errorDetails.solution === 'reload_page' && (
                      <>
                        <div>• أعد تحميل الصفحة</div>
                        <div>• جرب فتح الموقع بـ HTTPS</div>
                        <div>• امسح ذاكرة التخزين المؤقت للمتصفح</div>
                        <div>• تأكد من السياق الآمن للموقع</div>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex flex-col space-y-2">
            {/* Primary Actions */}
            <div className="flex space-x-2 space-x-reverse">
              {permissionState === 'prompt' && (
                <button
                  onClick={requestPermission}
                  className="flex-1 py-2.5 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-cairo-play font-medium text-sm"
                >
                  طلب الإذن
                </button>
              )}
              
              {permissionState === 'granted' && (
                <button
                  onClick={onClose}
                  className="flex-1 py-2.5 px-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-cairo-play font-medium text-sm"
                >
                  متابعة
                </button>
              )}
              
              <button
                onClick={onClose}
                className="flex-1 py-2.5 px-3 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors font-cairo-play font-medium text-sm"
              >
                إغلاق
              </button>
            </div>

            {/* Advanced Actions */}
            {(permissionState === 'denied' || errorDetails) && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => {
                      try {
                        setPermissionState('requesting');
                        console.log('Attempting aggressive force request...');
                        
                        const result = await forceCameraPermissionRequest();
                        
                        if (result.success) {
                          setPermissionState('granted');
                          setErrorDetails(null);
                          console.log('Aggressive force request succeeded!');
                          onGranted?.();
                        } else {
                          setPermissionState('denied');
                          setErrorDetails(result.error);
                          console.error('Aggressive force request failed:', result.error);
                        }
                      } catch (error) {
                        console.error('Error during aggressive force request:', error);
                        setPermissionState('denied');
                        setErrorDetails(error);
                      }
                    }}
                    className="py-2 px-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-cairo-play font-medium text-xs"
                  >
                    إعادة المحاولة بقوة
                  </button>
                  
                  <button
                    onClick={() => {
                      // Try to open browser settings
                      if (navigator.userAgent.includes('Chrome')) {
                        window.open('chrome://settings/content/camera', '_blank');
                      } else if (navigator.userAgent.includes('Firefox')) {
                        window.open('about:preferences#privacy', '_blank');
                      } else {
                        // Generic settings URL
                        window.open('about:preferences', '_blank');
                      }
                    }}
                    className="py-2 px-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-cairo-play font-medium text-xs"
                  >
                    فتح الإعدادات
                  </button>
                  
                  <button
                    onClick={() => {
                      window.location.reload();
                    }}
                    className="py-2 px-3 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-cairo-play font-medium text-xs"
                  >
                    إعادة التحميل
                  </button>
                </div>

                {/* Ultimate Force Button */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={async () => {
                      try {
                        setPermissionState('requesting');
                        console.log('Attempting ULTIMATE force request...');
                        
                        const result = await ultimateForceCameraRequest();
                        
                        if (result.success) {
                          setPermissionState('granted');
                          setErrorDetails(null);
                          console.log('Ultimate force request succeeded!', result);
                          
                          if (result.isMock) {
                            alert('تم إنشاء كاميرا وهمية للاختبار - هذا للتطوير فقط');
                          }
                          
                          onGranted?.(result);
                        } else {
                          setPermissionState('denied');
                          setErrorDetails(result.error);
                          console.error('Ultimate force request failed:', result.error);
                        }
                      } catch (error) {
                        console.error('Error during ultimate force request:', error);
                        setPermissionState('denied');
                        setErrorDetails(error);
                      }
                    }}
                    className="py-2 px-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-cairo-play font-medium text-xs font-bold"
                    title="يجرب جميع الطرق الممكنة بما في ذلك إنشاء كاميرا وهمية للاختبار"
                  >
                    🚀 قوة قصوى
                  </button>
                  
                  <button
                    onClick={() => {
                      console.log('Device Info:', deviceInfo);
                      console.log('Browser Info:', browserInfo);
                      console.log('Camera Support:', cameraSupport);
                      console.log('Error Details:', errorDetails);
                      alert('تم طباعة معلومات التشخيص في وحدة التحكم (Console)');
                    }}
                    className="py-2 px-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-cairo-play font-medium text-xs"
                  >
                    معلومات التشخيص
                  </button>
                </div>
              </>
            )}
          </div>

          {/* Additional Help */}
          <div className="mt-3 text-center">
            <button
              onClick={() => window.open(instructions.browserSpecific?.helpUrl || 'https://support.google.com/chrome/answer/2693767', '_blank')}
              className="text-xs text-blue-600 hover:text-blue-800 underline font-roboto"
            >
              مساعدة إضافية
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-2 right-2 sm:top-4 sm:right-4 text-white/80 hover:text-white transition-colors z-10"
        >
          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default PermissionDialog; 