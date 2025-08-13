import React from 'react';

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message, 
  confirmText = 'تأكيد',
  cancelText = 'إلغاء',
  variant = 'default',
  className = '',
  ...props 
}) => {
  if (!isOpen) return null;

  const variants = {
    default: {
      overlay: 'bg-black bg-opacity-50',
      modal: 'bg-white',
      confirm: 'bg-blue-600 hover:bg-blue-700',
      cancel: 'bg-gray-200 hover:bg-gray-300'
    },
    danger: {
      overlay: 'bg-black bg-opacity-50',
      modal: 'bg-white',
      confirm: 'bg-red-600 hover:bg-red-700',
      cancel: 'bg-gray-200 hover:bg-gray-300'
    },
    warning: {
      overlay: 'bg-black bg-opacity-50',
      modal: 'bg-white',
      confirm: 'bg-yellow-600 hover:bg-yellow-700',
      cancel: 'bg-gray-200 hover:bg-gray-300'
    },
    success: {
      overlay: 'bg-black bg-opacity-50',
      modal: 'bg-white',
      confirm: 'bg-green-600 hover:bg-green-700',
      cancel: 'bg-gray-200 hover:bg-gray-300'
    }
  };

  const currentVariant = variants[variant];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 ${currentVariant.overlay} ${className}`} {...props}>
      <div className={`relative max-w-md w-full rounded-xl shadow-xl ${currentVariant.modal}`}>
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-cairo font-semibold text-gray-900 text-right">
            {title}
          </h3>
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          <p className="text-gray-600 font-cairo text-right leading-relaxed">
            {message}
          </p>
        </div>

        {/* Actions */}
        <div className="px-6 py-4 bg-gray-50 rounded-b-xl flex space-x-3 space-x-reverse">
          <button
            onClick={onConfirm}
            className={`flex-1 py-2 px-4 rounded-lg text-white font-cairo font-medium transition-colors ${currentVariant.confirm}`}
          >
            {confirmText}
          </button>
          <button
            onClick={onClose}
            className={`flex-1 py-2 px-4 rounded-lg text-gray-700 font-cairo font-medium transition-colors ${currentVariant.cancel}`}
          >
            {cancelText}
          </button>
        </div>

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default ConfirmationModal; 