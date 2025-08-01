// Date formatting utilities for Gregorian calendar with Arabic numerals
// م for AM (morning) and ص for PM (afternoon)

/**
 * Format date to Gregorian calendar with Arabic numerals
 * @param {string|Date} dateString - ISO date string or Date object
 * @param {boolean} includeTime - Whether to include time in the output
 * @returns {string} Formatted date string
 */
export const formatGregorianDate = (dateString, includeTime = true) => {
  // Handle null, undefined, or empty values
  if (!dateString || dateString === null || dateString === undefined) {
    return includeTime ? 'لا يوجد تاريخ ووقت' : 'لا يوجد تاريخ';
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid date format:', dateString);
    return includeTime ? 'تاريخ ووقت غير صحيح' : 'تاريخ غير صحيح';
  }

  // Format date in Gregorian calendar
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  // Convert to Arabic numerals
  const arabicNumerals = {
    0: '٠', 1: '١', 2: '٢', 3: '٣', 4: '٤',
    5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩'
  };
  
  const convertToArabic = (num) => {
    return num.toString().split('').map(digit => arabicNumerals[digit] || digit).join('');
  };
  
  const formattedDate = `${convertToArabic(day)}/${convertToArabic(month)}/${convertToArabic(year)}`;
  
  if (!includeTime) {
    return formattedDate;
  }
  
  // Format time with م/ص
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  const period = hours < 12 ? 'م' : 'ص';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  const formattedTime = `${convertToArabic(displayHours)}:${convertToArabic(minutes.toString().padStart(2, '0'))} ${period}`;
  
  return `${formattedDate} ${formattedTime}`;
};

/**
 * Format time only with م/ص
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Formatted time string
 */
export const formatTimeOnly = (dateString) => {
  // Handle null, undefined, or empty values
  if (!dateString || dateString === null || dateString === undefined) {
    return 'لا يوجد وقت';
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid date format:', dateString);
    return 'وقت غير صحيح';
  }
  
  const arabicNumerals = {
    0: '٠', 1: '١', 2: '٢', 3: '٣', 4: '٤',
    5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩'
  };
  
  const convertToArabic = (num) => {
    return num.toString().split('').map(digit => arabicNumerals[digit] || digit).join('');
  };
  
  const hours = date.getHours();
  const minutes = date.getMinutes();
  
  const period = hours < 12 ? 'م' : 'ص';
  const displayHours = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;
  
  return `${convertToArabic(displayHours)}:${convertToArabic(minutes.toString().padStart(2, '0'))} ${period}`;
};

/**
 * Format date only (without time)
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Formatted date string
 */
export const formatDateOnly = (dateString) => {
  // Handle null, undefined, or empty values
  if (!dateString || dateString === null || dateString === undefined) {
    return 'لا يوجد تاريخ';
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid date format:', dateString);
    return 'تاريخ غير صحيح';
  }
  
  const arabicNumerals = {
    0: '٠', 1: '١', 2: '٢', 3: '٣', 4: '٤',
    5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩'
  };
  
  const convertToArabic = (num) => {
    return num.toString().split('').map(digit => arabicNumerals[digit] || digit).join('');
  };
  
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();
  
  return `${convertToArabic(day)}/${convertToArabic(month)}/${convertToArabic(year)}`;
};

/**
 * Get relative time (e.g., "منذ 5 دقائق")
 * @param {string|Date} dateString - ISO date string or Date object
 * @returns {string} Relative time string
 */
export const getRelativeTime = (dateString) => {
  // Handle null, undefined, or empty values
  if (!dateString || dateString === null || dateString === undefined) {
    return 'لا يوجد وقت';
  }
  
  const date = new Date(dateString);
  const now = new Date();
  
  if (isNaN(date.getTime())) {
    console.warn('Invalid date format:', dateString);
    return 'وقت غير صحيح';
  }
  
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  const arabicNumerals = {
    0: '٠', 1: '١', 2: '٢', 3: '٣', 4: '٤',
    5: '٥', 6: '٦', 7: '٧', 8: '٨', 9: '٩'
  };
  
  const convertToArabic = (num) => {
    return num.toString().split('').map(digit => arabicNumerals[digit] || digit).join('');
  };
  
  if (diffInSeconds < 60) {
    return 'الآن';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `منذ ${convertToArabic(minutes)} دقيقة`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `منذ ${convertToArabic(hours)} ساعة`;
  } else {
    const days = Math.floor(diffInSeconds / 86400);
    return `منذ ${convertToArabic(days)} يوم`;
  }
}; 