import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Badge, CompactProfile, Timeline, SendDataPanel } from './index';
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
  // Get proper Arabic order type label
  const getOrderTypeLabel = (orderType) => {
    switch (orderType) {
      case 'Customer Return Pickup':
        return 'استرجاع عميل';
      case 'Return to Origin':
        return 'مرتجع مخزن';
      case 'Exchange':
        return 'استبدال';
      case 'Send':
      default:
        return 'إرسال';
    }
  };

  // Get order type badge variant
  const getOrderTypeBadgeVariant = (orderType) => {
    switch (orderType) {
      case 'Customer Return Pickup':
        return 'orange';
      case 'Return to Origin':
        return 'red';
      case 'Exchange':
        return 'purple';
      case 'Send':
      default:
        return 'blue';
    }
  };

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
      orderType: order.type?.value || 'Send',
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

  const bostaData = useMemo(() => getBostaData(order), [order]);

  // Attempt to refresh Bosta proof images when an image fails to load
  const handleProofImageError = async (e) => {
    try {
      console.error('Image failed to load:', e.target?.src);
      if (!order?.trackingNumber) return;
      const { orderAPI } = await import('../../api/orderAPI');
      const res = await orderAPI.refreshOrderFromBosta(order.trackingNumber);
      if (res.success && res.data?.order?.bosta_proof_images) {
        // Update element src with a fresh URL for the same index if possible
        const idx = Number(e.target?.dataset?.idx);
        const freshImages = res.data.order.bosta_proof_images;
        if (!Number.isNaN(idx) && freshImages[idx]) {
          // Signed URLs must not be mutated with extra query params
          e.target.src = freshImages[idx];
          e.target.style.display = 'block';
          if (e.target.nextElementSibling) {
            e.target.nextElementSibling.style.display = 'none';
          }
        } else if (freshImages.length > 0) {
          e.target.src = freshImages[0];
        }
      } else {
        // fallback to hide broken image UI that already exists below
        if (e.target) {
          e.target.style.display = 'none';
          if (e.target.nextElementSibling) {
            e.target.nextElementSibling.style.display = 'flex';
          }
        }
      }
    } catch (err) {
      console.error('Error refreshing proof images:', err);
      if (e.target) {
        e.target.style.display = 'none';
        if (e.target.nextElementSibling) {
          e.target.nextElementSibling.style.display = 'flex';
        }
      }
    }
  };

  const cleanPhoneNumber = (phone) => {
    if (!phone) return '';

    let cleaned = phone.toString().trim();
    cleaned = cleaned.replace(/[^\d+]/g, '');

    if (cleaned.startsWith('+20')) {
      cleaned = cleaned.slice(3);
    } else if (cleaned.startsWith('20')) {
      cleaned = cleaned.slice(2);
    }

    if (cleaned.startsWith('0')) {
      return cleaned;
    }

    if (cleaned.startsWith('1') || cleaned.startsWith('5')) {
      return '0' + cleaned;
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
        label: 'تحضير استرداد/إرسال',
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

    // If in returns list, show condition badge when available
    if (order.status === 'returned' && order.returnCondition) {
      return {
        label: order.returnCondition === 'valid' ? 'مرتجع سليم' : 'مرتجع تالف',
        variant: order.returnCondition === 'valid' ? 'info' : 'danger',
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

    /*
    // Bosta-specific states
    if (bostaData.shippingState === 'Returned' || bostaData.isReturn) {
      return {
        label: bostaData.isReturn ? 'استرجاع عميل' : 'تم الإرجاع',
        variant: 'secondary',
        icon: 'return'
      };
    }
    */

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
          // Move to returns as VALID
          {
            type: 'move_to_returns',
            label: 'نقل للمرتجعات (سليم)',
            className: 'bg-orange-600 hover:bg-orange-700 text-white',
            priority: 'secondary',
            return_condition: 'valid'
          },
          // Move to returns as DAMAGED
          {
            type: 'move_to_returns',
            label: 'نقل للمرتجعات (تالف)',
            className: 'bg-red-600 hover:bg-red-700 text-white',
            priority: 'secondary',
            return_condition: 'damaged'
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

      case 'returned':
        // Allow toggling between valid <-> damaged - only show the opposite action
        if (order.returnCondition === 'valid') {
          baseActions.push({
            type: 'set_return_condition',
            label: 'نقل للمرتجعات (تالف)',
            className: 'bg-red-600 hover:bg-red-700 text-white',
            priority: 'primary',
            return_condition: 'damaged'
          });
        } else if (order.returnCondition === 'damaged') {
          baseActions.push({
            type: 'set_return_condition',
            label: 'نقل للمرتجعات (سليم)',
            className: 'bg-blue-600 hover:bg-blue-700 text-white',
            priority: 'primary',
            return_condition: 'valid'
          });
        } else {
          // If not set, allow both options
          baseActions.push(
            {
              type: 'set_return_condition',
              label: 'نقل للمرتجعات (سليم)',
              className: 'bg-blue-600 hover:bg-blue-700 text-white',
              priority: 'primary',
              return_condition: 'valid'
            },
            {
              type: 'set_return_condition',
              label: 'نقل للمرتجعات (تالف)',
              className: 'bg-red-600 hover:bg-red-700 text-white',
              priority: 'secondary',
              return_condition: 'damaged'
            }
          );
        }
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
        title: getArabicActionTitle(item.action, item.action_data || item.actionData),
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

  const getArabicActionTitle = (action, actionData = null) => {
    const base = {
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
      'confirm_refund_replace': 'تأكيد الاسترداد أو الإرسال',
      // Show as move-to-returns family, not "set"
      'set_return_condition': 'نقل للمرتجعات'
    };

    // Enhance labels for returns-related actions using actionData
    if (action === 'move_to_returns' && actionData && actionData.return_condition) {
      const cond = actionData.return_condition === 'valid' ? 'سليم' : 'تالف';
      return `نقل للمرتجعات (${cond})`;
    }
    if (action === 'set_return_condition') {
      const condRaw = actionData?.return_condition || actionData?.returnCondition;
      if (condRaw) {
        const cond = condRaw === 'valid' ? 'سليم' : 'تالف';
        return `نقل للمرتجعات (${cond})`;
      }
      return 'نقل للمرتجعات';
    }

    return base[action] || action;
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
      'set_return_condition': (
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
      // Use the same icon for set_return_condition as move_to_returns
      'set_return_condition': (
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
  const dynamicActions = useMemo(() => getDynamicActions(order), [order]);
  const stateBadge = useMemo(() => getStateBadge(order), [order]);

  // Helper to format phone as 01XXXXXXXXX
  const formatEgyptianPhone = (phone) => {
    if (!phone) return '';
    let cleaned = phone.toString().replace(/\D/g, '');
    if (cleaned.startsWith('20')) cleaned = cleaned.slice(2);
    if (cleaned.startsWith('1')) cleaned = '0' + cleaned;
    if (!cleaned.startsWith('01')) cleaned = '01' + cleaned.slice(cleaned.startsWith('0') ? 1 : 0);
    return cleaned.slice(0, 11);
  };

  // Toast state for copy feedback
  const [showCopyToast, setShowCopyToast] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const copyToClipboard = (text, msg = 'تم النسخ!') => {
    navigator.clipboard.writeText(text);
    setToastMsg(msg);
    setShowCopyToast(true);
    setTimeout(() => setShowCopyToast(false), 1200);
  };

  // Treat some backend default messages as non-notes for the dot indicator
  const DEFAULT_NOTE_PHRASES = [
    'تم استلام الطلب بنجاح',
    'تم الاستلام بنجاح',
    'انتهاء الصيانة بنجاح',
    'تمت الصيانة بنجاح',
    'تم الإرسال',
    'تم الإرسال بنجاح',
    'تم الإرجاع',
    'تم الإرجاع بنجاح',
    'إعادة للصيانة',
    'تمت إعادة الجدولة',
  ];

  const isDefaultMaintenanceNote = (note) => {
    if (!note) return false;
    const text = typeof note === 'string' ? note : JSON.stringify(note);
    const normalized = text.trim().replace(/\s+/g, ' ');
    return DEFAULT_NOTE_PHRASES.some((p) => normalized.startsWith(p));
  };

  // Tooltip notes that can expand/collapse and handle long text
  const TooltipNotes = ({ text }) => {
    if (!text) return null;
    const [expanded, setExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);
    const contentRef = useRef(null);

    const displayText = typeof text === 'string' ? text : JSON.stringify(text);
    const collapsedMax = 'max-h-16'; // ~3 lines with text-xs/relaxed
    const expandedMax = 'max-h-[60vh]'; // allow large view without overflowing screen

    useEffect(() => {
      const el = contentRef.current;
      if (!el) return;
      const measure = () => {
        setIsOverflowing(el.scrollHeight > el.clientHeight + 2);
      };
      // Initial measure after paint
      requestAnimationFrame(measure);
      const resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(el);
      return () => resizeObserver.disconnect();
    }, [displayText]);

    return (
      <div>
        <div
          ref={contentRef}
          className={`whitespace-pre-wrap leading-relaxed text-xs text-gray-600 font-cairo overflow-auto scrollbar-hide pe-1 ${
            expanded ? expandedMax : collapsedMax
          }`}
        >
          {displayText}
        </div>
        {(isOverflowing || expanded) && (
          <button
            type="button"
            onClick={() => setExpanded(v => !v)}
            className="mt-1 inline-flex items-center gap-1 text-[11px] font-cairo text-ui-info-600 hover:text-ui-info-700 focus:outline-none focus:ring-2 focus:ring-ui-info-500 rounded px-1 py-0.5"
          >
            <span>{expanded ? 'عرض أقل' : 'عرض المزيد'}</span>
            <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        )}
      </div>
    );
  };

  return (
    <div className={`bg-white rounded-lg shadow-md border-2 border-gray-200 hover:shadow-lg hover:border-gray-300 transition-all duration-300 ${className}`} {...props}>
      {/* Compact Header with State Badge */}
              <div className="p-3 border-b border-gray-100 bg-gradient-to-r from-gray-50 to-white">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2 space-x-reverse">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-sm ${
                bostaData.isReturn ? 'bg-gradient-to-br from-orange-100 to-orange-200' : 'bg-gradient-to-br from-blue-100 to-blue-200'
              }`}>
                <svg className={`w-5 h-5 ${
                  bostaData.isReturn ? 'text-orange-700' : 'text-blue-700'
                }`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {bostaData.isReturn ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                  )}
                </svg>
              </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2 space-x-reverse">
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
                {/* Order Type Badge - align with small badge sizing */}
                <span className={`px-2 py-1 text-xs font-cairo font-semibold rounded-full shadow-sm border ${
                  getOrderTypeBadgeVariant(bostaData.orderType) === 'orange' ? 'bg-orange-200 text-orange-800 border-orange-300' :
                  getOrderTypeBadgeVariant(bostaData.orderType) === 'red' ? 'bg-red-200 text-red-800 border-red-300' :
                  getOrderTypeBadgeVariant(bostaData.orderType) === 'purple' ? 'bg-purple-200 text-purple-800 border-purple-300' :
                  'bg-blue-200 text-blue-800 border-blue-300'
                }`}>
                  {getOrderTypeLabel(bostaData.orderType)}
                </span>
              </div>
              <div className="flex items-center space-x-3 space-x-reverse mt-1">
                <p className="text-xs text-gray-600 font-cairo flex-shrink-0">
                  {bostaData.receiver.fullName}
                </p>
                {/* Show client phone for all orders */}
                {bostaData.receiver.phone && (
                  <div className="relative group flex items-center space-x-1 space-x-reverse">
                                         <span
                       className="text-xs font-cairo font-medium text-green-700 hover:text-green-800 hover:underline cursor-pointer transition-colors"
                       title="نسخ رقم العميل"
                       onClick={() => copyToClipboard(formatEgyptianPhone(bostaData.receiver.phone))}
                       tabIndex={0}
                       onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyToClipboard(formatEgyptianPhone(bostaData.receiver.phone)); } }}
                     >
                       {formatEgyptianPhone(bostaData.receiver.phone)}
                     </span>
                    {/* Tooltip for second phone */}
                    {bostaData.receiver.secondPhone && (
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity duration-200 pointer-events-none z-20 min-w-max">
                                                 <div className="bg-gray-900 text-white text-xs rounded px-2 py-1 shadow-lg pointer-events-auto">
                           <span 
                             className="cursor-pointer hover:text-green-300 transition-colors"
                             onClick={e => { e.stopPropagation(); copyToClipboard(formatEgyptianPhone(bostaData.receiver.secondPhone), 'تم نسخ الرقم الثاني!'); }}
                             title="نسخ الرقم الثاني"
                           >
                             {formatEgyptianPhone(bostaData.receiver.secondPhone)}
                           </span>
                         </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2 space-x-reverse">
            {/* State Badge */}
            {stateBadge && (
              <div className={`px-2 py-1 rounded-full text-xs leading-tight font-cairo font-medium flex items-center gap-1 whitespace-nowrap shadow-sm border ${stateBadge.variant === 'danger' ? 'bg-red-200 text-red-900 border-red-300' :
                  stateBadge.variant === 'info' ? 'bg-blue-200 text-blue-900 border-blue-300' :
                    stateBadge.variant === 'secondary' ? 'bg-gray-200 text-gray-900 border-gray-300' :
                      stateBadge.variant === 'success' ? 'bg-green-200 text-green-900 border-green-300' :
                        'bg-yellow-200 text-yellow-900 border-yellow-300'
                }`}>
                {getStateIcon(stateBadge.icon)}
                <span>{stateBadge.label}</span>
              </div>
            )}

            {/* Status Badge - match visual weight of state badge */}
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
      <div className="px-3 py-3 bg-gradient-to-r from-gray-50 to-white border-b border-gray-100">
        {/* Description */}
        {bostaData.description && bostaData.description !== 'لا يوجد وصف' && (
          <div className="mb-2">
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center space-x-1 space-x-reverse">
                <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <span className="text-gray-500 font-cairo text-xs">وصف المنتج</span>
              </div>
              {order.status === 'sending' && bostaData.proofImages && bostaData.proofImages.length > 0 && (
                <div className="flex items-center gap-2 text-[11px] text-gray-700 font-cairo">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 inline-block"></span>
                  <span>صور متوفرة</span>
                </div>
              )}
            </div>
            <p className="font-cairo text-xs text-gray-900 leading-relaxed bg-white rounded-lg p-3 border-2 border-gray-200 shadow-sm">{bostaData.description}</p>
          </div>
        )}

        {/* Interactive Timeline Preview - RTL Layout with Improved Z-Index */}
        {order.maintenanceHistory && order.maintenanceHistory.length > 0 && (
          <div className="flex items-center space-x-1 space-x-reverse">
            <span className="text-xs text-gray-500 font-cairo">دورة الصيانة:</span>
            <div className="flex items-center space-x-1 space-x-reverse relative">
              {/* Reverse the order for RTL display */}
              {order.maintenanceHistory.slice().reverse().map((entry, index) => (
                <div key={index} className="relative group" onMouseEnter={() => setHoveredAction(entry)} onMouseLeave={() => setHoveredAction(null)}>
                  <div
                    className="flex items-center space-x-1 space-x-reverse cursor-pointer rounded-lg p-1 pb-2"
                    onClick={() => onShowTimeline?.(order)}
                  >
                    <div className="relative z-10">
                      {getTimelineIcon(entry.action)}
                      {entry.notes && !isDefaultMaintenanceNote(entry.notes) ? (
                        <span className="absolute -bottom-0.5 -right-0.5 w-1.5 h-1.5 bg-ui-info-600 rounded-full ring-2 ring-white" aria-hidden="true"></span>
                      ) : null}
                    </div>
                    {index < order.maintenanceHistory.length - 1 && (
                      <div className="w-3 h-0.5 bg-gray-300 mx-1 transition-colors duration-200 group-hover:bg-blue-300"></div>
                    )}
                  </div>

                  {/* Enhanced Tooltip with Higher Z-Index */}
                  {hoveredAction === entry && (
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-0.5 z-[99999]" onMouseEnter={() => setHoveredAction(entry)} onMouseLeave={() => setHoveredAction(null)}>
                      <div className="absolute -top-0.5 left-0 right-0 h-1"></div>
                      <div className="bg-white text-gray-900 rounded-lg p-3 shadow-xl border border-gray-200 min-w-[240px] max-w-[320px] max-h-[70vh] overflow-auto scrollbar-hide">
                        {/* Tooltip Arrow */}
                        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-white"></div>

                        {/* Tooltip Header */}
                        <div className="flex items-center space-x-2 space-x-reverse mb-2">
                          <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center">
                            {getTimelineIcon(entry.action)}
                          </div>
                          <h4 className="font-cairo font-semibold text-sm text-gray-900">
                            {getArabicActionTitle(entry.action, entry.action_data || entry.actionData)}
                          </h4>
                        </div>

                        {/* Tooltip Content */}
                        <div className="space-y-2">
                          <TooltipNotes text={entry.notes} />
                          <div className="flex items-center justify-between text-xs text-gray-500 font-cairo">
                            <span>{formatDate(entry.timestamp)}</span>
                            <span className="text-gray-600">{getRelativeTime(entry.timestamp)}</span>
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

        {/* بيانات الإرسال - compact, WCAG-compliant panel (only when action data exists) */}
        {(() => {
          const actionData = getStoredActionData();
          if (!actionData || (!actionData.new_tracking_number && !actionData.new_cod && !actionData.notes)) return null;
          return <SendDataPanel actionData={actionData} className="mb-2" />;
        })()}

        {/* (Moved) Simple indicator for images availability is shown inline with description title for sending */}

        {/* Creative Proof Images with Description Layout */}
        {bostaData.proofImages && bostaData.proofImages.length > 0 && order.status !== 'sending' && (
          <div className="mb-3">
            {/* Compact Header */}
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-1 space-x-reverse">
                <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <span className="text-xs font-cairo font-medium text-gray-700">صور الإثبات</span>
              </div>
              <span className="text-xs font-cairo text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                {bostaData.proofImages.length}
              </span>
            </div>
            
            {/* Images Grid with Clickable Containers */}
            <div className="grid grid-cols-6 gap-2">
              {bostaData.proofImages.slice(0, 8).map((image, index) => (
                <div 
                  key={index} 
                  className="relative group cursor-pointer"
                  onClick={() => {
                    try {
                      const newWindow = window.open(image, '_blank');
                      if (!newWindow) {
                        window.location.href = image;
                      }
                    } catch (error) {
                      console.error('Error opening image:', error);
                      window.location.href = image;
                    }
                  }}
                  title="انقر لفتح الصورة بحجم كامل في نافذة جديدة"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      try {
                        const newWindow = window.open(image, '_blank');
                        if (!newWindow) {
                          window.location.href = image;
                        }
                      } catch (error) {
                        console.error('Error opening image:', error);
                        window.location.href = image;
                      }
                    }
                  }}
                  role="button"
                  aria-label={`فتح الصورة ${index + 1} في نافذة جديدة`}
                >
                  {/* Image Container */}
                  <div className="aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-100 hover:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-lg group-hover:scale-105 w-16 h-16">
                    <img
                      src={image}
                      alt={`صورة إثبات ${index + 1}`}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      loading="lazy"
                      data-idx={index}
                      onError={handleProofImageError}
                      onLoad={(e) => {
                        e.target.style.display = 'block';
                        e.target.nextElementSibling.style.display = 'none';
                      }}
                    />
                    {/* Fallback for broken images */}
                    <div className="w-full h-full hidden items-center justify-center bg-gray-100">
                      <div className="text-center">
                        <svg className="w-6 h-6 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span className="text-xs text-gray-500 font-cairo">خطأ في التحميل</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Hover Overlay with Zoom Icon */}
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-md transition-all duration-300 flex items-center justify-center">
                    <div className="bg-white bg-opacity-95 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                      <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                      </svg>
                    </div>
                  </div>
                  
                  {/* Image Index Badge */}
                  <div className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-cairo font-bold shadow-sm">
                    {index + 1}
                  </div>
                </div>
              ))}
              
              {/* Show More Indicator */}
              {bostaData.proofImages.length > 8 && (
                <div className="relative group cursor-pointer aspect-square overflow-hidden rounded-md border border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 transition-all duration-300 flex items-center justify-center w-16 h-16">
                  <div className="text-center">
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center mx-auto mb-1">
                      <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <span className="text-xs font-cairo font-medium text-gray-600">+{bostaData.proofImages.length - 8}</span>
                    <p className="text-xs font-cairo text-gray-500">المزيد</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Dynamic Actions - Always Visible */}
      {dynamicActions.length > 0 && (
        <div className="p-4 bg-gradient-to-r from-white to-gray-50 border-t border-gray-200">
          <div className="flex items-center space-x-2 space-x-reverse mb-3">
            <div className="w-5 h-5 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center shadow-sm">
              <svg className="w-2.5 h-2.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <span className="text-sm font-cairo font-semibold text-gray-800">إجراءات الطلب</span>
          </div>

          {/* Dynamic Action Buttons */}
          <div className={`grid gap-2 ${dynamicActions.length >= 3 ? 'grid-cols-3' : dynamicActions.length === 2 ? 'grid-cols-2' : 'grid-cols-1'}`}>
            {dynamicActions.map((action, index) => (
              <button
                key={index}
                onClick={() => handleAction(
                  action.type,
                  order,
                  action.return_condition ? { return_condition: action.return_condition, notes } : notes
                )}
                disabled={action.disabled || isActionLoading}
                className={`
                  relative group px-4 py-2.5 rounded-lg font-cairo text-xs font-semibold transition-all duration-300
                  flex items-center justify-center space-x-1 space-x-reverse shadow-sm border-2
                  ${action.className}
                  ${action.disabled || isActionLoading ? 'opacity-50 cursor-not-allowed' : 'hover:scale-105 hover:shadow-md hover:border-opacity-80'}
                  focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500
                  w-full whitespace-nowrap
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
                <span className="font-cairo whitespace-nowrap">{action.label}</span>
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
                    className={`w-full px-3 py-2 border-2 rounded-lg font-cairo text-xs text-right shadow-sm ${
                      (isConfirmSendCompleted() || isSendOrderCompleted()) 
                        ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                        : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-400'
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
                    className={`w-full px-3 py-2 border-2 rounded-lg font-cairo text-xs text-right shadow-sm ${
                      (isConfirmSendCompleted() || isSendOrderCompleted()) 
                        ? 'border-gray-200 bg-gray-50 text-gray-600 cursor-not-allowed' 
                        : 'border-gray-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-400'
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
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg font-cairo text-xs text-right shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-400"
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
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg font-cairo text-xs text-right shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-400"
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
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg font-cairo text-xs text-right shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-400"
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
                      className="w-full px-3 py-2 border-2 border-gray-300 rounded-lg font-cairo text-xs text-right shadow-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-400"
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
                  <span className="text-xs font-cairo font-semibold text-brand-blue-700">بيانات الإرسال</span>
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


              {/* Star Delivery Man Details - Always Show in Expanded View */}
              {(bostaData.starName || bostaData.starPhone) && (
                <div className="bg-blue-50 rounded p-2 border border-blue-200">
                  <h5 className="font-cairo font-medium text-blue-800 mb-2 flex items-center space-x-1 space-x-reverse">
                    <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    <span>معلومات المندوب</span>
                  </h5>
                  <div className="grid grid-cols-1 gap-2">
                    {bostaData.starName && bostaData.starName !== 'غير محدد' && (
                      <div className="flex items-center justify-between bg-white rounded p-2 border border-blue-200/50">
                        <span className="text-xs font-cairo text-gray-600">اسم المندوب:</span>
                        <span className="text-xs font-cairo font-semibold text-blue-700">{bostaData.starName}</span>
                      </div>
                    )}
                    {bostaData.starPhone && (
                      <div className="flex items-center justify-between bg-white rounded p-2 border border-blue-200/50">
                        <span className="text-xs font-cairo text-gray-600">رقم المندوب:</span>
                        <div className="flex items-center space-x-1 space-x-reverse">
                          <a
                            href={`tel:${formatEgyptianPhone(bostaData.starPhone)}`}
                            className="text-green-700 hover:text-green-800"
                            title="اتصال بالمندوب"
                            aria-label="اتصال بالمندوب"
                          >
                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                          </a>
                          <span
                            className="text-xs font-cairo font-semibold text-green-700 hover:text-green-800 hover:underline cursor-pointer"
                            title="نسخ رقم المندوب"
                            onClick={() => copyToClipboard(formatEgyptianPhone(bostaData.starPhone), 'تم نسخ رقم المندوب!')}
                            tabIndex={0}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); copyToClipboard(formatEgyptianPhone(bostaData.starPhone), 'تم نسخ رقم المندوب!'); } }}
                          >
                            {formatEgyptianPhone(bostaData.starPhone)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Return Information */}
              {bostaData.returnReason && (
                <div className="bg-gray-50 rounded p-2 border border-gray-200">
                  <h5 className="font-cairo font-medium text-gray-800 mb-2">
                    تفاصيل إضافية
                  </h5>
                  <p className="font-cairo text-gray-700 text-xs leading-relaxed">{bostaData.returnReason}</p>
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

          {/* Proof Images (Sending status only - moved to expanded view) */}
          {order.status === 'sending' && bostaData.proofImages && bostaData.proofImages.length > 0 && (
            <div className="bg-white rounded-md p-3 border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-1 space-x-reverse">
                  <svg className="w-4 h-4 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="text-xs font-cairo font-medium text-gray-700">صور الإثبات</span>
                </div>
                <span className="text-xs font-cairo text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full">
                  {bostaData.proofImages.length}
                </span>
              </div>

              <div className="grid grid-cols-6 gap-2">
                {bostaData.proofImages.slice(0, 12).map((image, index) => (
                  <div 
                    key={index} 
                    className="relative group cursor-pointer"
                    onClick={() => {
                      try {
                        const newWindow = window.open(image, '_blank');
                        if (!newWindow) {
                          window.location.href = image;
                        }
                      } catch (error) {
                        console.error('Error opening image:', error);
                        window.location.href = image;
                      }
                    }}
                    title="انقر لفتح الصورة بحجم كامل في نافذة جديدة"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        try {
                          const newWindow = window.open(image, '_blank');
                          if (!newWindow) {
                            window.location.href = image;
                          }
                        } catch (error) {
                          console.error('Error opening image:', error);
                          window.location.href = image;
                        }
                      }
                    }}
                    role="button"
                    aria-label={`فتح الصورة ${index + 1} في نافذة جديدة`}
                  >
                    <div className="aspect-square overflow-hidden rounded-md border border-gray-200 bg-gray-100 hover:border-blue-400 transition-all duration-300 shadow-sm hover:shadow-lg group-hover:scale-105 w-16 h-16">
                      <img
                        src={image}
                        alt={`صورة إثبات ${index + 1}`}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                        loading="lazy"
                        data-idx={index}
                        onError={handleProofImageError}
                        onLoad={(e) => {
                          e.target.style.display = 'block';
                          e.target.nextElementSibling.style.display = 'none';
                        }}
                      />
                      <div className="w-full h-full hidden items-center justify-center bg-gray-100">
                        <div className="text-center">
                          <svg className="w-6 h-6 text-gray-400 mx-auto mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span className="text-xs text-gray-500 font-cairo">خطأ في التحميل</span>
                        </div>
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 rounded-md transition-all duration-300 flex items-center justify-center">
                      <div className="bg-white bg-opacity-95 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-lg">
                        <svg className="w-3 h-3 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </div>
                    </div>
                    <div className="absolute top-1 right-1 bg-blue-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center font-cairo font-bold">
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
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
                          {getArabicActionTitle(entry.action, entry.action_data || entry.actionData)}
                        </p>
                        <span className="text-xs text-gray-500 font-cairo">
                          {formatDate(entry.timestamp)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 font-cairo mt-1">{entry.notes}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      {showCopyToast && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-[9999] font-cairo text-sm animate-fade-in">
          {toastMsg}
        </div>
      )}
    </div>
  );
};

export default React.memo(OrderCard);