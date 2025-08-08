import React from 'react';

const InfoItem = ({ label, value, hint, className = '' }) => {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div className={`flex flex-col gap-1 bg-white/70 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-lg p-2.5 shadow-sm ${className}`}>
      <span className="text-[11px] font-cairo text-gray-500 dark:text-gray-400">{label}</span>
      <span className="text-sm font-cairo font-semibold text-gray-900 dark:text-gray-100 break-words">
        {value}
      </span>
      {hint ? (
        <span className="text-[10px] font-cairo text-gray-400 dark:text-gray-500">{hint}</span>
      ) : null}
    </div>
  );
};

const Badge = ({ children, tone = 'blue' }) => {
  const toneClasses = {
    blue: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/40 dark:text-blue-200 dark:border-blue-800/60',
    green: 'bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-200 dark:border-emerald-800/60',
    orange: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/40 dark:text-orange-200 dark:border-orange-800/60',
    red: 'bg-red-100 text-red-800 border-red-200 dark:bg-red-900/40 dark:text-red-200 dark:border-red-800/60',
    purple: 'bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900/40 dark:text-purple-200 dark:border-purple-800/60'
  };
  return (
    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-cairo border ${toneClasses[tone] || toneClasses.blue}`}>
      {children}
    </span>
  );
};

const ShippingInfoPanel = ({ data, className = '' }) => {
  if (!data) return null;

  // Helpers
  const getOrderTypeTone = (orderType) => {
    switch (orderType) {
      case 'Customer Return Pickup':
        return 'orange';
      case 'Return to Origin':
        return 'red';
      case 'Exchange':
        return 'purple';
      default:
        return 'blue';
    }
  };

  const getArabicStatus = (status) => {
    const map = {
      Delivered: 'تم التوصيل',
      Returned: 'تم الإرجاع',
      'In Transit': 'في الطريق',
      'Out for Delivery': 'خارج للتوصيل',
      'Picked Up': 'تم الاستلام'
    };
    return map[status] || status;
  };

  return (
    <div className={`arabic-card bg-gradient-to-br from-white to-gray-50 dark:from-bg-card-dark dark:to-gray-900/30 border border-gray-200 dark:border-gray-800 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/70 dark:border-gray-800/60 bg-gradient-to-l from-brand-blue-50 to-white dark:from-gray-800 dark:to-gray-900 rounded-t-xl">
        <div className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center shadow-sm ${
            data.isReturn ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-200' : 'bg-brand-blue-100 text-brand-blue-700 dark:bg-brand-blue-900/40 dark:text-brand-blue-200'
          }`}>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {data.isReturn ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8h18M3 12h18M3 16h18" />
              )}
            </svg>
          </div>
          <h4 className="text-sm font-cairo font-extrabold text-brand-blue-800 dark:text-brand-blue-200">بيانات الإرسال</h4>
          {data.orderType ? (
            <Badge tone={getOrderTypeTone(data.orderType)}>{data.orderType === 'Send' ? 'إرسال' : data.orderType === 'Exchange' ? 'استبدال' : data.orderType === 'Customer Return Pickup' ? 'استرجاع عميل' : data.orderType}</Badge>
          ) : null}
        </div>
        {data.shippingState ? (
          <Badge tone={data.shippingState === 'Delivered' ? 'green' : data.shippingState === 'Returned' ? 'red' : 'blue'}>
            {getArabicStatus(data.shippingState)}
          </Badge>
        ) : null}
      </div>

      {/* Content */}
      <div className="p-3">
        {/* Top row: tracking + receiver */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-2">
          <InfoItem label="رقم التتبع" value={data.trackingNumber} />
          <InfoItem label="العميل" value={data.receiver?.fullName} />
          <InfoItem label="الهاتف" value={data.receiver?.phone} hint={data.receiver?.secondPhone ? `البديل: ${data.receiver.secondPhone}` : undefined} />
        </div>

        {/* Second row: address */}
        {data.address?.full ? (
          <InfoItem className="mb-2" label="العنوان" value={data.address.full} />
        ) : null}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
          <InfoItem label="المبلغ عند التسليم" value={Number(data.cod) > 0 ? `${Number(data.cod).toLocaleString()} ج.م` : '—'} />
          <InfoItem label="رسوم الشحن" value={data.bostaFees ? `${Number(data.bostaFees).toLocaleString()} ج.م` : '—'} />
          <InfoItem label="عدد القطع" value={data.itemsCount} />
          <InfoItem label="الوزن" value={data.weight ? `${data.weight} كجم` : '—'} />
          {typeof data.attemptsCount === 'number' ? (
            <InfoItem label="المحاولات" value={data.attemptsCount} />
          ) : null}
          {typeof data.callsNumber === 'number' ? (
            <InfoItem label="المكالمات" value={data.callsNumber} />
          ) : null}
        </div>

        {/* Description */}
        {data.description && data.description !== 'لا يوجد وصف' ? (
          <div className="mt-2">
            <InfoItem label="الوصف" value={data.description} />
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default ShippingInfoPanel;


