import React, { useState } from 'react';
import { Badge, CompactProfile, Timeline } from './index';
import { formatGregorianDate, formatTimeOnly, formatDateOnly, getRelativeTime } from '../../utils/dateUtils';

const OrderCard = ({
  order,
  onAction,
  actions = [],
  showTimeline = false,
  onShowTimeline,
  className = '',
  ...props
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [notes, setNotes] = useState('');
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [hoveredAction, setHoveredAction] = useState(null);
  const [showImages, setShowImages] = useState(false);
  // Get saved action data for input fields
  const getSavedActionData = () => {
    const latestAction = order.maintenanceHistory?.find(entry => 
      (entry.action === 'refund_or_replace' || entry.action === 'confirm_send' || entry.action === 'send_order') && entry.actionData
    );
    return latestAction?.actionData || {};
  };

  const savedActionData = getSavedActionData();

  const [newTrackingNumber, setNewTrackingNumber] = useState(savedActionData.newTrackingNumber || '');
  const [newCod, setNewCod] = useState(savedActionData.newCod || '');
  const [refundAmount, setRefundAmount] = useState(savedActionData.refundAmount || '');
  const [refundReason, setRefundReason] = useState(savedActionData.refundReason || '');
  const [replacementTrackingNumber, setReplacementTrackingNumber] = useState(savedActionData.replacementTrackingNumber || '');

  // Check if order is in read-only mode (sending status is now always read-only)
  const isReadOnlyMode = () => {
    // Sending list is now always read-only - it's the final state
    return order.status === 'sending';
  };

  // Check if confirm_send action is completed
  const isConfirmSendCompleted = () => {
    return order.maintenanceHistory?.some(entry => 
      entry.action === 'confirm_send' && entry.actionData
    );
  };

  // Check if send_order action is completed
  const isSendOrderCompleted = () => {
    return order.maintenanceHistory?.some(entry => 
      entry.action === 'send_order' && entry.actionData
    );
  };

  // Check if confirm_refund_replace action is completed
  const isConfirmRefundReplaceCompleted = () => {
    return order.maintenanceHistory?.some(entry => 
      entry.action === 'confirm_refund_replace' && entry.actionData
    );
  };

  // Check if refund/replace action is completed
  const isRefundReplaceCompleted = () => {
    return order.maintenanceHistory?.some(entry => 
      entry.action === 'refund_or_replace' && entry.actionData
    );
  };

  // Get the latest action data for display
  const getLatestActionData = () => {
    if (!isReadOnlyMode()) return null;
    
    // For sending status, get the latest action that moved the order to sending
    const latestAction = order.maintenanceHistory?.find(entry => 
      (entry.action === 'refund_or_replace' || entry.action === 'confirm_send' || entry.action === 'send_order' || entry.action === 'confirm_refund_replace') && entry.action_data
    );
    
    return latestAction?.action_data || {};
  };

  // Get stored action data for display
  const getStoredActionData = () => {
    const latestAction = order.maintenanceHistory?.find(entry => 
      (entry.action === 'refund_or_replace' || entry.action === 'send_order' || entry.action === 'confirm_send') && entry.action_data
    );
    
    console.log('Order maintenance history:', order.maintenanceHistory);
    console.log('Latest action found:', latestAction);
    console.log('Action data:', latestAction?.action_data);
    
    return latestAction?.action_data || {};
  };

  // Extract Bosta-specific data
  const getBostaData = (order) => {
    // Priority for description: returnSpecs first (for returned items), then specs, then fallback
    const getDescription = () => {
      if (order.returnSpecs?.packageDetails?.description) {
        return order.returnSpecs.packageDetails.description;
      }
      if (order.specs?.packageDetails?.description) {
        return order.specs.packageDetails.description;
      }
      // Fallback to system description if available
      if (order.description) {
        return order.description;
      }
      return 'لا يوجد وصف';
    };

    // Get address with priority to pickup address for returns
    const getFullAddress = () => {
      if (order.type?.value === "Customer Return Pickup" && order.pickupAddress) {
        return `${order.pickupAddress.firstLine || ''} - ${order.pickupAddress.zone?.nameAr || ''}, ${order.pickupAddress.city?.nameAr || ''}`.trim();
      }
      if (order.dropOffAddress) {
        return `${order.dropOffAddress.firstLine || ''} ${order.dropOffAddress.secondLine || ''} - ${order.dropOffAddress.zone?.nameAr || ''}, ${order.dropOffAddress.city?.nameAr || ''}`.trim();
      }
      return order.address || '';
    };

    return {
      trackingNumber: order.trackingNumber || order.tracking_number,
      description: getDescription(),
      shippingState: order.maskedState || order.state?.value || order.status,
      cod: order.cod || 0,
      bostaFees: order.wallet?.cashCycle?.bosta_fees || order.shipmentFees || 0,
      starName: order.star?.name || 'غير محدد',
      starPhone: order.star?.phone || '',
      itemsCount: order.specs?.packageDetails?.itemsCount ||
        order.returnSpecs?.packageDetails?.itemsCount || 1,
      weight: order.specs?.weight || 0,
      proofImages: order.starProofOfReturnedPackages || [],
      returnReason: order.returnSpecs?.packageDetails?.description || '',
      isReturn: order.type?.value === "Customer Return Pickup",
      attemptsCount: order.attemptsCount || 0,
      callsNumber: order.callsNumber || 0,
      smsNumber: order.smsNumber || 0,
      receiver: {
        fullName: order.receiver?.fullName || '',
        phone: order.receiver?.phone || '',
        secondPhone: order.receiver?.secondPhone || ''
      },
      address: {
        full: getFullAddress()
      },
      timeline: order.timeline || []
    };
  };

  const bostaData = getBostaData(order);

  // Clean phone number by removing country code
  const cleanPhoneNumber = (phone) => {
    if (!phone) return '';

    // Remove +20 or 20 from the beginning
    let cleaned = phone.toString().trim();

    if (cleaned.startsWith('+20')) {
      cleaned = cleaned.substring(3);
    } else if (cleaned.startsWith('20')) {
      cleaned = cleaned.substring(2);
    }

    // Remove any leading zeros and ensure it starts with 1
    cleaned = cleaned.replace(/^0+/, '');

    // Format as 01XXXXXXXXX if it's a valid Egyptian mobile number
    if (cleaned.length === 9 && (cleaned.startsWith('1') || cleaned.startsWith('5'))) {
      cleaned = '0' + cleaned;
    }

    return cleaned;
  };

  const getStatusVariant = (status) => {
    const variants = {
      'scanned': 'info',
      'received': 'primary',
      'in_maintenance': 'warning',
      'completed': 'success',
      'failed': 'danger',
      'returned': 'secondary',
      'sending': 'shipping',
      'rescheduled': 'info',
      // Bosta states
      'Delivered': 'success',
      'Returned': 'secondary',
      'In Transit': 'info',
      'Out for Delivery': 'warning',
      'Picked Up': 'primary'
    };
    return variants[status] || 'default';
  };

  const getStatusLabel = (status) => {
    const labels = {
      'scanned': 'تم المسح',
      'received': 'مستلم',
      'in_maintenance': 'تحت الصيانة',
      'completed': 'مكتمل',
      'failed': 'فاشل',
      'returned': 'مرتجع',
      'sending': 'جاري الإرسال',
      'rescheduled': 'إعادة جدولة',
      // Bosta states
      'Delivered': 'تم التوصيل',
      'Returned': 'تم الإرجاع',
      'In Transit': 'في الطريق',
      'Out for Delivery': 'خارج للتوصيل',
      'Picked Up': 'تم الاستلام'
    };
    return labels[status] || status;
  };

  const getStateBadge = (order) => {
    // Get the most recent maintenance action
    const maintenanceHistory = order.maintenanceHistory || [];
    const latestAction = maintenanceHistory[maintenanceHistory.length - 1];

    // If completed and sent to client, show solved badge
    if (order.status === 'completed' && maintenanceHistory.some(h => h.action === 'send_order')) {
      return {
        label: 'تم الإصلاح',
        variant: 'success',
        icon: 'success'
      };
    }

    // If completed with refund/replace action but not yet confirmed, show preparing badge
    if (order.status === 'completed' && maintenanceHistory.some(h => h.action === 'refund_or_replace') && !maintenanceHistory.some(h => h.action === 'confirm_refund_replace')) {
      return {
        label: 'تحضير الاسترداد أو الإرسال',
        variant: 'warning',
        icon: 'warning'
      };
    }

    // If completed but not yet sent, show ready to send badge
    if (order.status === 'completed' && !maintenanceHistory.some(h => h.action === 'send_order')) {
      return {
        label: 'تم الإصلاح',
        variant: 'success',
        icon: 'success'
      };
    }

    // If currently in maintenance and has failed before, show re-maintenance
    if (order.status === 'in_maintenance' && maintenanceHistory.some(h => h.action === 'fail_maintenance')) {
      return {
        label: 'إعادة صيانة',
        variant: 'warning',
        icon: 'refresh'
      };
    }

    // If received and has failed before, show re-maintenance
    if (order.status === 'received' && maintenanceHistory.some(h => h.action === 'fail_maintenance')) {
      return {
        label: 'إعادة صيانة',
        variant: 'info',
        icon: 'refresh'
      };
    }

    // If failed, show failed badge
    if (order.status === 'failed') {
      return {
        label: 'فشل الصيانة',
        variant: 'danger',
        icon: 'warning'
      };
    }

    // If returned to customer
    if (maintenanceHistory.some(h => h.action === 'return_order')) {
      return {
        label: 'مرتجع للعميل',
        variant: 'secondary',
        icon: 'return'
      };
    }

    // If sending - this is now the final state, show appropriate badge
    if (order.status === 'sending') {
      // Check if this was a refund/replace order
      const hasRefundReplaceAction = order.maintenanceHistory?.some(entry => 
        entry.action === 'refund_or_replace' && entry.actionData
      );
      
      if (hasRefundReplaceAction) {
        return {
          label: 'تم استرداد او ارسال',
          variant: 'success',
          icon: 'success'
        };
      }
      
      // Check if this was a normal completed order
      const hasConfirmSendAction = order.maintenanceHistory?.some(entry => 
        entry.action === 'confirm_send' && entry.actionData
      );
      
      if (hasConfirmSendAction) {
        return {
          label: 'تم الإرسال',
          variant: 'success',
          icon: 'success'
        };
      }
      
      // Default sending badge
      return {
        label: 'تم الإرسال',
        variant: 'success',
        icon: 'success'
      };
    }

    // If failed and has refund/replacement action
    if (order.status === 'failed' && maintenanceHistory.some(h => h.action === 'refund_or_replace')) {
      return {
        label: 'تم الاسترداد',
        variant: 'success',
        icon: 'success'
      };
    }

    // Bosta-specific states
    if (bostaData.shippingState === 'Returned' || bostaData.isReturn) {
      return {
        label: bostaData.isReturn ? 'استرجاع عميل' : 'تم الإرجاع',
        variant: 'secondary',
        icon: 'return'
      };
    }

    return null;
  };

  const getDynamicActions = (order) => {
    const baseActions = [];
    const stateBadge = getStateBadge(order);

    // If in read-only mode, return no actions
    if (isReadOnlyMode()) {
      return [];
    }

    // Primary action based on current status
    switch (order.status) {
      case 'received':
        // Show both actions for ALL received orders regardless of type
        baseActions.push(
          {
            type: 'start_maintenance',
            label: 'بدء الصيانة',
            className: 'bg-blue-600 hover:bg-blue-700 text-white',
            priority: 'primary'
          },
          {
            type: 'move_to_returns',
            label: 'نقل للمرتجعات',
            className: 'bg-orange-600 hover:bg-orange-700 text-white',
            priority: 'secondary'
          }
        );
        break;

      case 'in_maintenance':
        baseActions.push(
          {
            type: 'complete_maintenance',
            label: 'إنجاز الصيانة',
            className: 'bg-green-600 hover:bg-green-700 text-white',
            priority: 'primary'
          },
          {
            type: 'fail_maintenance',
            label: 'فشل الصيانة',
            className: 'bg-red-600 hover:bg-red-700 text-white',
            priority: 'secondary'
          }
        );
        break;

      case 'failed':
        baseActions.push(
          {
            type: 'reschedule',
            label: 'إعادة للصيانة',
            className: 'bg-yellow-600 hover:bg-yellow-700 text-white',
            priority: 'primary'
          },
          {
            type: 'refund_or_replace',
            label: 'استرداد أو إرسال منتج آخر',
            className: 'bg-orange-600 hover:bg-orange-700 text-white',
            priority: 'secondary',
            requiresInput: false
          }
        );
        break;

      case 'completed':
        // Check if this is a refund/replace order (moved from failed)
        const hasRefundReplaceAction = order.maintenanceHistory?.some(h => h.action === 'refund_or_replace');
        const isRefundReplaceOrder = hasRefundReplaceAction && !order.maintenanceHistory?.some(h => h.action === 'send_order');
        
        if (isRefundReplaceOrder) {
          // Show send order action with inputs for refund/replace orders
          baseActions.push({
            type: 'send_order',
            label: 'إرسال للعميل',
            className: 'bg-purple-600 hover:bg-purple-700 text-white',
            priority: 'primary',
            requiresInput: true
          });
        } else {
          // Check if already sent to client
          const hasBeenSent = order.maintenanceHistory?.some(h => h.action === 'send_order');
          if (hasBeenSent) {
            baseActions.push({
              type: 'confirm_send',
              label: 'تأكيد الإرسال للعميل',
              className: 'bg-purple-600 hover:bg-purple-700 text-white',
              priority: 'primary',
              requiresInput: true
            });
          } else {
            baseActions.push({
              type: 'send_order',
              label: 'إرسال للعميل',
              className: 'bg-purple-600 hover:bg-purple-700 text-white',
              priority: 'primary',
              requiresInput: true
            });
          }
        }
        break;

      case 'sending':
        // Sending list is now read-only - no actions available
        // This is the final state of the order
        break;

      default:
        break;
    }

    return baseActions;
  };

  const formatDate = (dateString) => {
    return formatGregorianDate(dateString, true);
  };

  const convertToDisplayTimeline = (order) => {
    const originalTimeline = bostaData.timeline?.map(item => {
      // Debug logging for invalid dates
      if (!item.date) {
        console.warn('Timeline item missing date:', item);
      }
      
      return {
        title: getArabicStatusTitle(item.value),
        description: `حالة الشحن: ${getArabicStatusTitle(item.value)}`,
        time: formatTimeOnly(item.date),
        date: formatDateOnly(item.date),
        status: item.done ? 'completed' : 'pending',
        details: `كود الحالة: ${item.code}`
      };
    }) || [];

    const maintenanceTimeline = order.maintenanceHistory?.map(item => {
      // Debug logging for invalid timestamps
      if (!item.timestamp) {
        console.warn('Maintenance item missing timestamp:', item);
      }
      
      return {
        title: getArabicActionTitle(item.action),
        description: item.notes,
        time: formatTimeOnly(item.timestamp),
        date: formatDateOnly(item.timestamp),
        status: 'maintenance',
        details: `بواسطة: ${item.user}`,
        user: item.user
      };
    }) || [];

    return [...originalTimeline, ...maintenanceTimeline].sort(
      (a, b) => new Date(b.timestamp || b.date) - new Date(a.timestamp || a.date)
    );
  };

  const getArabicStatusTitle = (status) => {
    const statusMap = {
      'ready_for_pickup': 'جاهز للاستلام',
      'picked_up': 'تم الاستلام',
      'in_transit': 'في الطريق',
      'out_for_delivery': 'خارج للتوصيل',
      'delivered': 'تم التوصيل',
      'returned': 'تم الإرجاع',
      'out_for_return': 'خارج للإرجاع'
    };
    return statusMap[status] || status;
  };

  const getArabicActionTitle = (action) => {
    const actionMap = {
      'received': 'تم الاستلام في المركز',
      'start_maintenance': 'بدء الصيانة',
      'complete_maintenance': 'انتهاء الصيانة',
      'fail_maintenance': 'فشل الصيانة',
      'send_order': 'إرسال الطلب للعميل',
      'return_order': 'إرجاع الطلب للعميل',
      'reschedule': 'إعادة للصيانة',
      'refund_or_replace': 'استرداد أو إرسال منتج آخر',
      'move_to_returns': 'نقل للمرتجعات',
      'confirm_send': 'تأكيد الإرسال للعميل',
      'confirm_refund_replace': 'تأكيد الاسترداد أو الإرسال'
    };
    return actionMap[action] || action;
  };

  const getActionIcon = (actionType) => {
    const icons = {
      'start_maintenance': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      'complete_maintenance': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'fail_maintenance': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'send_order': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      ),
      'return_order': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
      'reschedule': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      ),
      'refund_or_replace': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'move_to_returns': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
      'confirm_send': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'confirm_refund_replace': (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      )
    };
    return icons[actionType] || null;
  };

  const getStateIcon = (iconType) => {
    const icons = {
      'warning': (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
        </svg>
      ),
      'refresh': (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      ),
      'return': (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
        </svg>
      ),
      'success': (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      'shipping': (
        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
        </svg>
      )
    };
    return icons[iconType] || null;
  };

  const getTimelineIcon = (action) => {
    const icons = {
      'received': (
        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      ),
      'start_maintenance': (
        <div className="w-6 h-6 bg-green-100 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </div>
      ),
      'fail_maintenance': (
        <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
      'reschedule': (
        <div className="w-6 h-6 bg-yellow-100 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
      ),
      'complete_maintenance': (
        <div className="w-6 h-6 bg-green-600 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
      'send_order': (
        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
          </svg>
        </div>
      ),
      'return_order': (
        <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </div>
      ),
      'refund_or_replace': (
        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
      'move_to_returns': (
        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
          </svg>
        </div>
      ),
      'confirm_send': (
        <div className="w-6 h-6 bg-purple-100 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      ),
      'confirm_refund_replace': (
        <div className="w-6 h-6 bg-orange-100 rounded-full flex items-center justify-center">
          <svg className="w-3 h-3 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      )
    };
    return icons[action] || (
      <div className="w-6 h-6 bg-gray-100 rounded-full flex items-center justify-center">
        <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
    );
  };

  const handleAction = async (actionType, order, notes) => {
    if (isActionLoading) return;

    setIsActionLoading(true);
    try {
      // For confirm_send action, include tracking number and COD data
      if (actionType === 'confirm_send') {
        const actionData = {
          notes,
          new_tracking_number: newTrackingNumber,
          new_cod: newCod || null
        };
        await onAction?.(actionType, order, actionData);
        setNewTrackingNumber('');
        setNewCod('');
      } else if (actionType === 'refund_or_replace') {
        // For refund_or_replace action, include all optional data (expert mode)
        const actionData = {
          notes,
          new_tracking_number: newTrackingNumber || null,
          new_cod: newCod || null
        };
        await onAction?.(actionType, order, actionData);
        setNewTrackingNumber('');
        setNewCod('');
      } else if (actionType === 'confirm_refund_replace') {
        // For confirm_refund_replace action, include refund data
        const actionData = {
          notes,
          refund_amount: refundAmount,
          refund_reason: refundReason,
          replacement_tracking_number: replacementTrackingNumber || null,
          new_tracking_number: newTrackingNumber,
          new_cod: newCod || null
        };
        await onAction?.(actionType, order, actionData);
        setRefundAmount('');
        setRefundReason('');
        setReplacementTrackingNumber('');
        setNewTrackingNumber('');
        setNewCod('');
      } else if (actionType === 'send_order') {
        // For send_order action, include tracking number and COD data
        const actionData = {
          notes,
          new_tracking_number: newTrackingNumber,
          new_cod: newCod || null
        };
        await onAction?.(actionType, order, actionData);
        setNewTrackingNumber('');
        setNewCod('');
      } else {
        await onAction?.(actionType, order, notes);
      }
      setNotes('');
    } catch (error) {
      console.error('Action failed:', error);
    } finally {
      setIsActionLoading(false);
    }
  };

  // Get dynamic actions based on order state
  const dynamicActions = getDynamicActions(order);
  const stateBadge = getStateBadge(order);

  return (
    <div className={`bg-white rounded-lg shadow-sm border border-gray-200 hover:shadow-md transition-all duration-200 ${className}`} {...props}>
      {/* Compact Header with State Badge */}
      <div className="p-3 border-b border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2 space-x-reverse">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
              <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <div>
              <h3 className="text-sm font-cairo font-bold text-gray-900">
                <a 
                  href={`https://business.bosta.co/orders/${bostaData.trackingNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-blue-600 hover:underline transition-colors duration-200 cursor-pointer"
                  title="فتح في بوابة بوسطا للأعمال"
                >
                  {bostaData.trackingNumber}
                </a>
              </h3>
              <p className="text-xs text-gray-600 font-cairo">
                {bostaData.receiver.fullName}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            {/* State Badge */}
            {stateBadge && (
              <div className={`px-2 py-1 rounded-full text-xs font-cairo font-medium flex items-center space-x-1 space-x-reverse ${stateBadge.variant === 'danger' ? 'bg-red-100 text-red-800' :
                  stateBadge.variant === 'info' ? 'bg-blue-100 text-blue-800' :
                    stateBadge.variant === 'secondary' ? 'bg-gray-100 text-gray-800' :
                      stateBadge.variant === 'success' ? 'bg-green-100 text-green-800' :
                        'bg-yellow-100 text-yellow-800'
                }`}>
                {getStateIcon(stateBadge.icon)}
                <span>{stateBadge.label}</span>
              </div>
            )}

            {/* Status Badge */}
            <Badge variant={getStatusVariant(order.status)} size="sm">
              {getStatusLabel(order.status)}
            </Badge>

            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              aria-label={isExpanded ? 'تصغير التفاصيل' : 'توسيع التفاصيل'}
            >
              <svg className={`w-4 h-4 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Info Section */}
      <div className="px-3 py-2 bg-gray-50">
        {/* Product Description */}
        {bostaData.description && bostaData.description !== 'لا يوجد وصف' && (
          <div className="mb-2">
            <span className="text-gray-500 font-cairo text-xs block mb-1">
              {bostaData.isReturn ? 'وصف المنتج المسترجع' : 'وصف المنتج'}
            </span>
            <p className="font-cairo text-xs text-gray-900 leading-relaxed bg-white rounded p-2 border-r-2 border-blue-200">
              {bostaData.description}
            </p>
          </div>
        )}

        {/* Sending Data Display - Creative Compact Design */}
        {order.status === 'sending' && (() => {
          const actionData = getStoredActionData();
          if (!actionData || (!actionData.new_tracking_number && !actionData.new_cod && !actionData.notes)) return null;
          
          return (
            <div className="mb-2">
              <div className="flex items-center space-x-2 space-x-reverse mb-2">
                <div className="w-3 h-3 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full animate-pulse"></div>
                <span className="text-gray-500 font-cairo text-xs font-medium">بيانات الإرسال</span>
              </div>
              
              <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 border border-blue-200/50 shadow-sm">
                <div className="grid grid-cols-1 gap-2">
                  {actionData.new_tracking_number && (
                    <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-md p-2 border border-blue-200/30 hover:border-blue-300/50 transition-all duration-200">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-xs font-cairo text-gray-600">رقم التتبع</span>
                      </div>
                      <a 
                        href={`https://business.bosta.co/orders/${actionData.new_tracking_number}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-cairo font-semibold text-blue-700 bg-blue-50 px-2 py-1 rounded-md hover:bg-blue-100 hover:text-blue-800 transition-all duration-200 cursor-pointer"
                        title="فتح في بوابة بوسطا للأعمال"
                      >
                        {actionData.new_tracking_number}
                      </a>
                    </div>
                  )}
                  
                  {actionData.new_cod && (
                    <div className="flex items-center justify-between bg-white/80 backdrop-blur-sm rounded-md p-2 border border-green-200/30 hover:border-green-300/50 transition-all duration-200">
                      <div className="flex items-center space-x-2 space-x-reverse">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-xs font-cairo text-gray-600">المبلغ</span>
                      </div>
                      <span className="text-xs font-cairo font-semibold text-green-700 bg-green-50 px-2 py-1 rounded-md">
                        {actionData.new_cod} ج.م
                      </span>
                    </div>
                  )}
                  
                  {actionData.notes && (
                    <div className="bg-white/80 backdrop-blur-sm rounded-md p-2 border border-purple-200/30 hover:border-purple-300/50 transition-all duration-200">
                      <div className="flex items-center space-x-2 space-x-reverse mb-1">
                        <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                        <span className="text-xs font-cairo text-gray-600">ملاحظات</span>
                      </div>
                      <p className="text-xs font-cairo text-gray-700 leading-relaxed bg-purple-50/50 px-2 py-1 rounded-md">
                        {typeof actionData.notes === 'string' ? actionData.notes : JSON.stringify(actionData.notes)}
                      </p>
                    </div>
                  )}
                </div>
                
                {/* Creative Status Indicator */}
                <div className="mt-2 pt-2 border-t border-blue-200/30">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-1 space-x-reverse">
                      <div className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-ping"></div>
                      <span className="text-xs font-cairo text-blue-600 font-medium">جاهز للإرسال</span>
                    </div>
                    <div className="flex space-x-1 space-x-reverse">
                      <div className="w-1 h-1 bg-blue-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-purple-400 rounded-full"></div>
                      <div className="w-1 h-1 bg-green-400 rounded-full"></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Proof Images - Compact and Clickable */}
        {bostaData.proofImages && bostaData.proofImages.length > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 font-cairo text-xs">صور المندوب للمرتجع ({bostaData.proofImages.length})</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {bostaData.proofImages.slice(0, 3).map((image, index) => (
                <div key={index} className="relative group">
                  <img
                    src={image}
                    alt={`إثبات ${index + 1}`}
                    className="w-full h-12 object-cover rounded-lg border border-gray-200 cursor-pointer hover:scale-105 transition-transform duration-200 hover:shadow-md"
                    onClick={() => window.open(image, '_blank')}
                    title="انقر لفتح الصورة في نافذة جديدة"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 rounded-lg transition-opacity duration-200 flex items-center justify-center">
                    <svg className="w-3 h-3 text-white opacity-0 group-hover:opacity-100 transition-opacity duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Interactive Timeline Preview - RTL Layout with Improved Z-Index */}
        {order.maintenanceHistory && order.maintenanceHistory.length > 0 && (
          <div className="flex items-center space-x-1 space-x-reverse">
            <span className="text-xs text-gray-500 font-cairo">دورة الصيانة:</span>
            <div className="flex items-center space-x-1 space-x-reverse relative">
              {/* Reverse the order for RTL display */}
              {order.maintenanceHistory.slice().reverse().map((entry, index) => (
                <div key={index} className="relative group">
                  <div
                    className="flex items-center space-x-1 space-x-reverse cursor-pointer transition-all duration-200 hover:scale-110 hover:bg-blue-50 rounded-lg p-1"
                    onMouseEnter={() => setHoveredAction(entry)}
                    onMouseLeave={() => setHoveredAction(null)}
                    onClick={() => onShowTimeline?.(order)}
                  >
                    <div className="transition-all duration-200 group-hover:scale-110 group-hover:shadow-sm">
                      {getTimelineIcon(entry.action)}
                    </div>
                    {index < order.maintenanceHistory.length - 1 && (
                      <div className="w-3 h-0.5 bg-gray-300 mx-1 transition-colors duration-200 group-hover:bg-blue-300"></div>
                    )}
                  </div>

                  {/* Enhanced Tooltip with Higher Z-Index */}
                  {hoveredAction === entry && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-[9999] pointer-events-none">
                      <div className="bg-white text-gray-900 rounded-lg p-3 shadow-xl border border-gray-200 min-w-[220px] max-w-[280px] backdrop-blur-sm">
                        {/* Tooltip Arrow */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"></div>

                        {/* Tooltip Header */}
                        <div className="flex items-center space-x-2 space-x-reverse mb-2">
                          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                            {getTimelineIcon(entry.action)}
                          </div>
                          <h4 className="font-cairo font-semibold text-sm text-gray-900">
                            {getArabicActionTitle(entry.action)}
                          </h4>
                        </div>

                        {/* Tooltip Content */}
                        <div className="space-y-2">
                          <p className="text-xs text-gray-600 font-cairo leading-relaxed">
                            {entry.notes}
                          </p>
                          <div className="flex items-center justify-between text-xs text-gray-500 font-cairo">
                            <span>بواسطة: {entry.user}</span>
                            <span>{formatDate(entry.timestamp)}</span>
                          </div>
                        </div>

                        {/* Step Indicator - RTL Order */}
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 font-cairo">الخطوة {order.maintenanceHistory.length - index} من {order.maintenanceHistory.length}</span>
                            <div className="flex space-x-1 space-x-reverse">
                              {order.maintenanceHistory.slice().reverse().map((_, i) => (
                                <div
                                  key={i}
                                  className={`w-1.5 h-1.5 rounded-full ${i <= index ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}
                                ></div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Actions - Always Visible */}
      {dynamicActions.length > 0 && (
        <div className="p-3 bg-white border-t border-gray-100">
          <div className="flex items-center space-x-2 space-x-reverse mb-2">
            <div className="w-4 h-4 bg-blue-500 rounded-full flex items-center justify-center">
              <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-xs font-cairo font-medium text-gray-700">إجراءات الطلب</span>
          </div>

          {/* Dynamic Action Buttons */}
          <div className={`grid gap-2 ${dynamicActions.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
            {dynamicActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleAction(action.type, order, notes)}
                disabled={action.disabled || isActionLoading}
                className={`
                  relative group px-3 py-2 rounded-md font-cairo text-xs font-medium transition-all duration-200
                  flex items-center justify-center space-x-1 space-x-reverse
                  ${action.className}
                  ${action.disabled || isActionLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-sm'}
                  focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-blue-500
                `}
                aria-label={action.label}
              >
                {/* Loading State */}
                {isActionLoading && (
                  <div className="absolute inset-0 bg-white/80 rounded-md flex items-center justify-center">
                    <svg className="w-3 h-3 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}

                {/* Icon */}
                {getActionIcon(action.type) && (
                  <span className="transition-transform duration-200 group-hover:scale-110">
                    {getActionIcon(action.type)}
                  </span>
                )}

                {/* Label */}
                <span className="font-cairo">{action.label}</span>
              </button>
            ))}
          </div>

          {/* Compact Notes Input */}
          <div className="mt-2 space-y-2">
            {/* Show tracking number and COD inputs for confirm_send, send_order, and refund_or_replace actions */}
            {dynamicActions.some(action => (action.type === 'confirm_send' || action.type === 'send_order' || action.type === 'refund_or_replace') && action.requiresInput) && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-cairo text-gray-700 mb-1">
                    رقم التتبع الجديد
                  </label>
                  <input
                    type="text"
                    value={newTrackingNumber}
                    onChange={(e) => setNewTrackingNumber(e.target.value)}
                    placeholder="أدخل رقم التتبع الجديد"
                    className={`w-full px-2 py-1 border rounded-md font-cairo text-xs text-right ${
                      (isConfirmSendCompleted() || isSendOrderCompleted()) 
                        ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                        : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent'
                    }`}
                    dir="rtl"
                    readOnly={isConfirmSendCompleted() || isSendOrderCompleted()}
                    disabled={isConfirmSendCompleted() || isSendOrderCompleted()}
                  />
                </div>
                <div>
                  <label className="block text-xs font-cairo text-gray-700 mb-1">
                    المبلغ المستحق (اختياري)
                  </label>
                  <input
                    type="number"
                    value={newCod}
                    onChange={(e) => setNewCod(e.target.value)}
                    placeholder="أدخل المبلغ"
                    className={`w-full px-2 py-1 border rounded-md font-cairo text-xs text-right ${
                      (isConfirmSendCompleted() || isSendOrderCompleted()) 
                        ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                        : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent'
                    }`}
                    dir="rtl"
                    readOnly={isConfirmSendCompleted() || isSendOrderCompleted()}
                    disabled={isConfirmSendCompleted() || isSendOrderCompleted()}
                  />
                </div>
              </div>
            )}

            {/* Show refund/replace inputs for confirm_refund_replace action */}
            {dynamicActions.some(action => action.type === 'confirm_refund_replace' && action.requiresInput) && (
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-cairo text-gray-700 mb-1">
                      مبلغ الاسترداد
                    </label>
                    <input
                      type="number"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      placeholder="أدخل مبلغ الاسترداد"
                      className="w-full px-2 py-1 border border-gray-300 rounded-md font-cairo text-xs text-right focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-cairo text-gray-700 mb-1">
                      رقم تتبع المنتج البديل (اختياري)
                    </label>
                    <input
                      type="text"
                      value={replacementTrackingNumber}
                      onChange={(e) => setReplacementTrackingNumber(e.target.value)}
                      placeholder="أدخل رقم التتبع"
                      className="w-full px-2 py-1 border border-gray-300 rounded-md font-cairo text-xs text-right focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                      dir="rtl"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-xs font-cairo text-gray-700 mb-1">
                      رقم التتبع الجديد
                    </label>
                    <input
                      type="text"
                      value={newTrackingNumber}
                      onChange={(e) => setNewTrackingNumber(e.target.value)}
                      placeholder="أدخل رقم التتبع الجديد"
                      className="w-full px-2 py-1 border border-gray-300 rounded-md font-cairo text-xs text-right focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                      dir="rtl"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-cairo text-gray-700 mb-1">
                      المبلغ المستحق (اختياري)
                    </label>
                    <input
                      type="number"
                      value={newCod}
                      onChange={(e) => setNewCod(e.target.value)}
                      placeholder="أدخل المبلغ"
                      className="w-full px-2 py-1 border border-gray-300 rounded-md font-cairo text-xs text-right focus:ring-1 focus:ring-orange-500 focus:border-transparent"
                      dir="rtl"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Read-only display for completed refund/replace action */}
            {isRefundReplaceCompleted() && (
              <div className="bg-green-50 rounded-md p-3 border border-green-200">
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <div className="w-4 h-4 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-cairo font-semibold text-green-700">تم الإرسال - بيانات الإجراء</span>
                </div>
                
                {(() => {
                  const actionData = getLatestActionData();
                  if (!actionData) return null;
                  
                  return (
                    <div className="space-y-2">
                      {actionData.refundAmount && (
                        <div className="flex items-center justify-between bg-white rounded p-2 border border-green-200">
                          <span className="text-xs font-cairo text-gray-600">مبلغ الاسترداد:</span>
                          <span className="text-xs font-cairo font-semibold text-green-700">{actionData.refundAmount} ج.م</span>
                        </div>
                      )}
                      
                      {actionData.replacementTrackingNumber && (
                        <div className="flex items-center justify-between bg-white rounded p-2 border border-green-200">
                          <span className="text-xs font-cairo text-gray-600">رقم تتبع المنتج البديل:</span>
                          <span className="text-xs font-cairo font-semibold text-blue-700">{actionData.replacementTrackingNumber}</span>
                        </div>
                      )}
                      
                      {actionData.notes && (
                        <div className="bg-white rounded p-2 border border-green-200">
                          <span className="text-xs font-cairo text-gray-600 block mb-1">ملاحظات:</span>
                          <p className="text-xs font-cairo text-gray-700 leading-relaxed">
                            {typeof actionData.notes === 'string' ? actionData.notes : JSON.stringify(actionData.notes)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Read-only display for completed confirm_send action */}
            {isConfirmSendCompleted() && (
              <div className="bg-blue-50 rounded-md p-3 border border-blue-200">
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-cairo font-semibold text-blue-700">تم الإرسال - بيانات الإجراء</span>
                </div>
                
                {(() => {
                  const actionData = getLatestActionData();
                  if (!actionData) return null;
                  
                  return (
                    <div className="space-y-2">
                      {actionData.new_tracking_number && (
                        <div className="flex items-center justify-between bg-white rounded p-2 border border-blue-200">
                          <span className="text-xs font-cairo text-gray-600">رقم التتبع الجديد:</span>
                          <span className="text-xs font-cairo font-semibold text-blue-700">{actionData.new_tracking_number}</span>
                        </div>
                      )}
                      
                      {actionData.new_cod && (
                        <div className="flex items-center justify-between bg-white rounded p-2 border border-blue-200">
                          <span className="text-xs font-cairo text-gray-600">المبلغ المستحق:</span>
                          <span className="text-xs font-cairo font-semibold text-green-700">{actionData.new_cod} ج.م</span>
                        </div>
                      )}
                      
                      {actionData.notes && (
                        <div className="bg-white rounded p-2 border border-blue-200">
                          <span className="text-xs font-cairo text-gray-600 block mb-1">ملاحظات:</span>
                          <p className="text-xs font-cairo text-gray-700 leading-relaxed">
                            {typeof actionData.notes === 'string' ? actionData.notes : JSON.stringify(actionData.notes)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Read-only display for completed send_order action */}
            {isSendOrderCompleted() && (
              <div className="bg-purple-50 rounded-md p-3 border border-purple-200">
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <div className="w-4 h-4 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-cairo font-semibold text-purple-700">تم الإرسال للعميل - بيانات الإجراء</span>
                </div>
                
                {(() => {
                  const actionData = getLatestActionData();
                  if (!actionData) return null;
                  
                  return (
                    <div className="space-y-2">
                      {actionData.new_tracking_number && (
                        <div className="flex items-center justify-between bg-white rounded p-2 border border-purple-200">
                          <span className="text-xs font-cairo text-gray-600">رقم التتبع الجديد:</span>
                          <span className="text-xs font-cairo font-semibold text-purple-700">{actionData.new_tracking_number}</span>
                        </div>
                      )}
                      
                      {actionData.new_cod && (
                        <div className="flex items-center justify-between bg-white rounded p-2 border border-purple-200">
                          <span className="text-xs font-cairo text-gray-600">المبلغ المستحق:</span>
                          <span className="text-xs font-cairo font-semibold text-green-700">{actionData.new_cod} ج.م</span>
                        </div>
                      )}
                      
                      {actionData.notes && (
                        <div className="bg-white rounded p-2 border border-purple-200">
                          <span className="text-xs font-cairo text-gray-600 block mb-1">ملاحظات:</span>
                          <p className="text-xs font-cairo text-gray-700 leading-relaxed">
                            {typeof actionData.notes === 'string' ? actionData.notes : JSON.stringify(actionData.notes)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Read-only display for completed confirm_refund_replace action */}
            {isConfirmRefundReplaceCompleted() && (
              <div className="bg-orange-50 rounded-md p-3 border border-orange-200">
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <div className="w-4 h-4 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <span className="text-xs font-cairo font-semibold text-orange-700">تم الاسترداد أو الإرسال - بيانات الإجراء</span>
                </div>
                
                {(() => {
                  const actionData = getLatestActionData();
                  if (!actionData) return null;
                  
                  return (
                    <div className="space-y-2">
                      {actionData.refundAmount && (
                        <div className="flex items-center justify-between bg-white rounded p-2 border border-orange-200">
                          <span className="text-xs font-cairo text-gray-600">مبلغ الاسترداد:</span>
                          <span className="text-xs font-cairo font-semibold text-orange-700">{actionData.refundAmount} ج.م</span>
                        </div>
                      )}
                      
                      {actionData.replacementTrackingNumber && (
                        <div className="flex items-center justify-between bg-white rounded p-2 border border-orange-200">
                          <span className="text-xs font-cairo text-gray-600">رقم تتبع المنتج البديل:</span>
                          <span className="text-xs font-cairo font-semibold text-blue-700">{actionData.replacementTrackingNumber}</span>
                        </div>
                      )}
                      
                      {actionData.new_tracking_number && (
                        <div className="flex items-center justify-between bg-white rounded p-2 border border-orange-200">
                          <span className="text-xs font-cairo text-gray-600">رقم التتبع الجديد:</span>
                          <span className="text-xs font-cairo font-semibold text-blue-700">{actionData.new_tracking_number}</span>
                        </div>
                      )}
                      
                      {actionData.new_cod && (
                        <div className="flex items-center justify-between bg-white rounded p-2 border border-orange-200">
                          <span className="text-xs font-cairo text-gray-600">المبلغ المستحق:</span>
                          <span className="text-xs font-cairo font-semibold text-green-700">{actionData.new_cod} ج.م</span>
                        </div>
                      )}
                      
                      {actionData.notes && (
                        <div className="bg-white rounded p-2 border border-orange-200">
                          <span className="text-xs font-cairo text-gray-600 block mb-1">ملاحظات:</span>
                          <p className="text-xs font-cairo text-gray-700 leading-relaxed">
                            {typeof actionData.notes === 'string' ? actionData.notes : JSON.stringify(actionData.notes)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Read-only display for sending orders with stored data */}
            {order.status === 'sending' && (
              <div className="bg-blue-50 rounded-md p-3 border border-blue-200">
                <div className="flex items-center space-x-2 space-x-reverse mb-2">
                  <div className="w-4 h-4 bg-blue-100 rounded-full flex items-center justify-center">
                    <svg className="w-2 h-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                    </svg>
                  </div>
                  <span className="text-xs font-cairo font-semibold text-blue-700">بيانات الإرسال</span>
                </div>
                
                {(() => {
                  const actionData = getStoredActionData();
                  if (!actionData || (!actionData.new_tracking_number && !actionData.new_cod && !actionData.notes)) return null;
                  
                  return (
                    <div className="space-y-2">
                      {actionData.new_tracking_number && (
                        <div className="flex items-center justify-between bg-white rounded p-2 border border-blue-200">
                          <span className="text-xs font-cairo text-gray-600">رقم التتبع الجديد:</span>
                          <span className="text-xs font-cairo font-semibold text-blue-700">{actionData.new_tracking_number}</span>
                        </div>
                      )}
                      
                      {actionData.new_cod && (
                        <div className="flex items-center justify-between bg-white rounded p-2 border border-blue-200">
                          <span className="text-xs font-cairo text-gray-600">المبلغ المستحق:</span>
                          <span className="text-xs font-cairo font-semibold text-green-700">{actionData.new_cod} ج.م</span>
                        </div>
                      )}
                      
                      {actionData.notes && (
                        <div className="bg-white rounded p-2 border border-blue-200">
                          <span className="text-xs font-cairo text-gray-600 block mb-1">ملاحظات:</span>
                          <p className="text-xs font-cairo text-gray-700 leading-relaxed">
                            {typeof actionData.notes === 'string' ? actionData.notes : JSON.stringify(actionData.notes)}
                          </p>
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* Show textarea but make it read-only when actions are completed */}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="ملاحظات (اختيارية)..."
              rows={2}
              className={`w-full px-2 py-1 border rounded-md font-cairo text-xs text-right resize-none transition-all duration-200 min-h-[3rem] ${
                isReadOnlyMode() 
                  ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                  : 'border-gray-300 focus:ring-1 focus:ring-blue-500 focus:border-transparent'
              }`}
              dir="rtl"
              readOnly={isReadOnlyMode()}
              disabled={isReadOnlyMode()}
            />
          </div>
        </div>
      )}

      {/* Expanded Content - Only when needed */}
      {isExpanded && (
        <div className="p-3 space-y-3 border-t border-gray-100">
          {/* Enhanced Order Details */}
          <div className="bg-gray-50 rounded-md p-3">
            <h4 className="font-cairo font-semibold text-gray-900 mb-2 text-sm">تفاصيل الطلب والشحن</h4>
            <div className="grid grid-cols-1 gap-3 text-xs">

              {/* Shipping Details */}
              <div className="bg-white rounded p-2">
                <h5 className="font-cairo font-medium text-gray-800 mb-2">معلومات الشحن والاتصال</h5>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-gray-500 font-cairo">رقم التتبع:</span>
                    <p className="font-cairo font-medium mt-1">{bostaData.trackingNumber}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-cairo">حالة الشحن:</span>
                    <p className="font-cairo font-medium mt-1">{getStatusLabel(bostaData.shippingState)}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-cairo">نوع الطرد:</span>
                    <p className="font-cairo font-medium mt-1">{order.type?.value || 'غير محدد'}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 font-cairo">التاريخ:</span>
                    <p className="font-cairo font-medium mt-1">{formatDate(order.createdAt || order.creationTimestamp)}</p>
                  </div>
                  {bostaData.attemptsCount > 0 && (
                    <div>
                      <span className="text-gray-500 font-cairo">عدد المحاولات:</span>
                      <p className="font-cairo font-medium mt-1">{bostaData.attemptsCount}</p>
                    </div>
                  )}
                  {bostaData.callsNumber > 0 && (
                    <div>
                      <span className="text-gray-500 font-cairo">عدد المكالمات:</span>
                      <p className="font-cairo font-medium mt-1">{bostaData.callsNumber}</p>
                    </div>
                  )}
                </div>
              </div>


              {/* Return Information */}
              {(bostaData.returnReason || bostaData.isReturn) && (
                <div className="bg-orange-50 rounded p-2 border border-orange-200">
                  <h5 className="font-cairo font-medium text-orange-800 mb-2">
                    {bostaData.isReturn ? 'معلومات الاسترجاع' : 'سبب الإرجاع'}
                  </h5>
                  {bostaData.returnReason && (
                    <p className="font-cairo text-orange-700 text-xs leading-relaxed mb-2">{bostaData.returnReason}</p>
                  )}
                  {bostaData.isReturn && (
                    <div className="text-xs">
                      <span className="inline-block bg-orange-100 text-orange-800 px-2 py-1 rounded font-cairo">
                        طلب استرجاع من العميل
                      </span>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>

          {/* Timeline */}
          {showTimeline && (
            <div className="bg-gray-50 rounded-md p-3">
              <h4 className="font-cairo font-semibold text-gray-900 mb-2 text-sm">الجدول الزمني</h4>
              <Timeline
                items={convertToDisplayTimeline(order).slice(0, 3)}
                variant="compact"
              />
            </div>
          )}

          {/* Complete Maintenance Timeline */}
          {order.maintenanceHistory && order.maintenanceHistory.length > 0 && (
            <div className="bg-yellow-50 rounded-md p-3">
              <h4 className="font-cairo font-semibold text-gray-900 mb-2 text-sm">دورة الصيانة الكاملة</h4>
              <div className="space-y-2">
                {order.maintenanceHistory.map((entry, index) => (
                  <div key={index} className="flex items-start space-x-2 space-x-reverse">
                    <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${entry.action === 'received' ? 'bg-blue-500' :
                        entry.action === 'start_maintenance' ? 'bg-green-500' :
                          entry.action === 'fail_maintenance' ? 'bg-red-500' :
                            entry.action === 'reschedule' ? 'bg-yellow-500' :
                              entry.action === 'complete_maintenance' ? 'bg-green-600' :
                                entry.action === 'send_order' ? 'bg-purple-500' :
                                  entry.action === 'return_order' ? 'bg-gray-500' :
                                    'bg-yellow-500'
                      }`}></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="font-cairo font-medium text-gray-900 text-xs">
                          {getArabicActionTitle(entry.action)}
                        </p>
                        <span className="text-xs text-gray-500 font-cairo">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 font-cairo mt-1">{entry.notes}</p>
                      <p className="text-xs text-gray-500 font-cairo mt-1">بواسطة: {entry.user}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default OrderCard; 