import React, { useState, useEffect } from 'react';

const ServiceActionFAB = ({ onClick, className = '' }) => {
    const [isVisible, setIsVisible] = useState(true);
    const [lastScrollY, setLastScrollY] = useState(0);

    // Handle scroll to hide/show FAB
    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;

            // Hide FAB when scrolling down, show when scrolling up
            if (currentScrollY > lastScrollY && currentScrollY > 100) {
                setIsVisible(false);
            } else if (currentScrollY < lastScrollY || currentScrollY <= 100) {
                setIsVisible(true);
            }

            setLastScrollY(currentScrollY);
        };

        window.addEventListener('scroll', handleScroll, { passive: true });
        return () => window.removeEventListener('scroll', handleScroll);
    }, [lastScrollY]);

    return (
        <div className={`fixed bottom-6 left-6 z-[9999] transition-all duration-200 ease-out ${className}`}>
            <button
                onClick={onClick}
                className={`
                    group relative
                    w-12 h-12 md:w-14 md:h-14
                    bg-white dark:bg-gray-800 border-2 border-brand-blue-500
                    hover:bg-brand-blue-50 dark:hover:bg-brand-blue-900/20
                    active:bg-brand-blue-100 dark:active:bg-brand-blue-900/30
                    text-brand-blue-600 dark:text-brand-blue-400
                    rounded-full shadow-lg hover:shadow-xl
                    transform transition-all duration-150 ease-out
                    hover:scale-105 active:scale-95
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-blue-500
                    cursor-pointer select-none
                    ${isVisible ? 'translate-y-0 opacity-100' : 'translate-y-1 opacity-0'}
                `}
                aria-label="إنشاء إجراء خدمة جديد"
                type="button"
                tabIndex={0}
            >
                {/* Plus Icon */}
                <svg
                    className="w-5 h-5 md:w-6 md:h-6 mx-auto"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2.5}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                </svg>
            </button>

            {/* Simple Tooltip */}
            <div className={`
                absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2
                px-2 py-1 bg-gray-900 text-white text-xs font-cairo rounded
                opacity-0 group-hover:opacity-100 transition-opacity duration-150
                pointer-events-none whitespace-nowrap z-[10000]
                ${isVisible ? 'translate-y-0' : 'translate-y-1'}
            `}>
                إنشاء إجراء خدمة جديد
                <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-2 border-r-2 border-t-2 border-transparent border-t-gray-900"></div>
            </div>
        </div>
    );
};

export default React.memo(ServiceActionFAB);
