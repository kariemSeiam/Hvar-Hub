import React, { useEffect, useRef, useState } from 'react';

const Field = ({ id, label, value, isLink = false, href, className = '' }) => {
  if (!value) return null;
  return (
    <div className={`flex flex-col gap-1 min-w-0 ${className}`}>
      <dt id={`${id}-label`} className="text-[11px] font-cairo text-gray-600">
        {label}
      </dt>
      <dd
        aria-labelledby={`${id}-label`}
        className="text-sm font-cairo font-semibold text-gray-900 truncate"
      >
        {isLink && href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-ui-info-600 hover:text-ui-info-700 underline-offset-2 hover:underline focus:outline-none focus:ring-2 focus:ring-ui-info-500 rounded px-0.5"
            title="فتح في بوابة بوسطا للأعمال"
          >
            <span dir="ltr" className="arabic-number">{value}</span>
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h4m0 0v4m0-4L10 14" />
            </svg>
          </a>
        ) : (
          <span>{value}</span>
        )}
      </dd>
    </div>
  );
};

const StatusChip = ({ children }) => (
  <div className="inline-flex items-center gap-2 rounded-full border border-ui-success-200 bg-ui-success-50/90 px-2 py-1 text-xs font-cairo text-ui-success-700">
    <span className="w-2 h-2 rounded-full bg-ui-success-500 motion-safe:animate-pulse" aria-hidden="true"></span>
    <span>{children}</span>
  </div>
);

const NotesField = ({ value }) => {
  if (!value) return null;

  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef(null);

  useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    // Measure overflow after next paint
    const measure = () => {
      setIsOverflowing(el.scrollHeight > el.clientHeight + 2);
    };
    measure();
    const resizeObserver = new ResizeObserver(measure);
    resizeObserver.observe(el);
    return () => resizeObserver.disconnect();
  }, [value]);

  const displayText = typeof value === 'string' ? value : JSON.stringify(value);

  return (
    <div className="flex flex-col gap-1 min-w-0 md:col-span-1">
      <dt id="send-notes-label" className="text-[11px] font-cairo text-gray-600">ملاحظات</dt>
      <dd aria-labelledby="send-notes-label" className="text-sm font-cairo text-gray-900">
        <div className="relative">
          <div
            ref={contentRef}
            dir="rtl"
            className={`${expanded ? 'max-h-none' : 'max-h-14'} overflow-hidden whitespace-pre-wrap leading-relaxed`}
          >
            {displayText}
          </div>
          {isOverflowing && (
            <button
              type="button"
              onClick={() => setExpanded((v) => !v)}
              aria-expanded={expanded}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-cairo text-ui-info-600 hover:text-ui-info-700 focus:outline-none focus:ring-2 focus:ring-ui-info-500 rounded px-1 py-0.5"
            >
              <span>{expanded ? 'عرض أقل' : 'عرض المزيد'}</span>
              <svg className={`w-3 h-3 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>
          )}
        </div>
      </dd>
    </div>
  );
};

const SendDataPanel = ({ actionData, className = '' }) => {
  if (!actionData) return null;
  const hasContent = actionData.new_tracking_number || actionData.new_cod || actionData.notes;
  if (!hasContent) return null;

  const formattedAmount = typeof actionData.new_cod === 'number'
    ? `${actionData.new_cod.toLocaleString()} ج.م`
    : (actionData.new_cod ? `${Number(actionData.new_cod).toLocaleString()} ج.م` : null);

  return (
    <section
      role="region"
      aria-labelledby="send-data-title"
      className={`rounded-xl border border-gray-200 bg-white ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-200/70 rounded-t-xl bg-gray-50">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-ui-info-50 text-ui-info-700">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8h18M3 12h18M3 16h18" />
            </svg>
          </div>
          <h4 id="send-data-title" className="text-sm font-cairo font-extrabold text-gray-900">
            بيانات الإرسال
          </h4>
        </div>
        <StatusChip>جاهز للإرسال</StatusChip>
      </div>

      {/* Content */}
      <div className="px-3 py-3">
        {(() => {
          const hasTracking = Boolean(actionData.new_tracking_number);
          const hasAmount = Boolean(formattedAmount);
          const hasNotes = Boolean(actionData.notes);
          const gridColsClass = hasTracking && hasAmount
            ? 'md:grid-cols-3'
            : (hasTracking && hasNotes) || (hasAmount && hasNotes) || (hasTracking || hasAmount)
            ? 'md:grid-cols-2'
            : 'md:grid-cols-1';
          return (
            <dl className={`grid grid-cols-1 ${gridColsClass} gap-2`}>
          <Field
            id="send-tracking"
            label="رقم التتبع"
            value={actionData.new_tracking_number}
            isLink={Boolean(actionData.new_tracking_number)}
            href={actionData.new_tracking_number ? `https://business.bosta.co/orders/${actionData.new_tracking_number}` : undefined}
          />
          <Field id="send-amount" label="المبلغ" value={formattedAmount} />
          <NotesField value={actionData.notes} />
        </dl>
          );
        })()}
      </div>
    </section>
  );
};

export default SendDataPanel;


