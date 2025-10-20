/**
 * Utility functions for handling dates in Indian Standard Time (IST)
 */

/**
 * Get current date in IST timezone
 * @returns Date object representing current time in IST
 */
export const getCurrentDateInIST = (): Date => {
  const now = new Date();
  // IST is UTC+5:30
  const istOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  return new Date(utc + (istOffset * 60000));
};

/**
 * Get current date string in YYYY-MM-DD format in IST
 * @returns Date string in YYYY-MM-DD format
 */
export const getCurrentDateStringInIST = (): string => {
  return getCurrentDateInIST().toISOString().split('T')[0];
};

/**
 * Format date to IST locale string
 * @param date - Date object or date string
 * @param options - Intl.DateTimeFormatOptions
 * @returns Formatted date string in IST
 */
export const formatDateInIST = (
  date: Date | string, 
  options: Intl.DateTimeFormatOptions = { 
    year: 'numeric', 
    month: 'long' 
  }
): string => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Convert to IST by adding 5:30 hours
  const istOffset = 5.5 * 60; // 5 hours 30 minutes in minutes
  const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (istOffset * 60000));
  
  return istDate.toLocaleDateString('en-IN', {
    ...options,
    timeZone: 'Asia/Kolkata'
  });
};

/**
 * Get month and year in IST
 * @param date - Date object or date string (optional, defaults to current date)
 * @returns Object with year and month in IST
 */
export const getMonthYearInIST = (date?: Date | string) => {
  const dateObj = date ? (typeof date === 'string' ? new Date(date) : date) : getCurrentDateInIST();
  
  // Convert to IST
  const istOffset = 5.5 * 60;
  const utc = dateObj.getTime() + (dateObj.getTimezoneOffset() * 60000);
  const istDate = new Date(utc + (istOffset * 60000));
  
  const year = istDate.getFullYear();
  const month = String(istDate.getMonth() + 1).padStart(2, '0');
  
  return {
    year: year.toString(),
    month,
    monthYear: `${year}-${month}`,
    displayName: istDate.toLocaleDateString('en-IN', { 
      year: 'numeric', 
      month: 'long',
      timeZone: 'Asia/Kolkata'
    })
  };
};

/**
 * Format number with Indian locale (for currency display)
 * @param amount - Number to format
 * @returns Formatted number string
 */
export const formatCurrencyInIST = (amount: number): string => {
  return amount.toLocaleString('en-IN');
};
