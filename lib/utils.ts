/**
 * Formats a Date object into a 'YYYY-MM-DD' string suitable for date input fields.
 * This avoids timezone issues that can arise from using .toISOString().
 * @param date The date to format.
 * @returns A string in 'YYYY-MM-DD' format.
 */
export const formatDateForInput = (date: Date): string => {
  const year = date.getFullYear();
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const day = date.getDate().toString().padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Formats an error object into a user-friendly string.
 * This prevents the cryptic "[object Object]" from being displayed in alerts.
 * @param error The error object from the Supabase client or another source.
 * @returns A formatted, readable error string.
 */
export const formatSupabaseError = (error: any): string => {
  if (!error) return 'เกิดข้อผิดพลาดที่ไม่รู้จัก';

  // Most common case: a standard Error object or Supabase error with a message
  if (typeof error.message === 'string' && error.message) {
    // Handle specific known Supabase duplicate error for inventory
    if (error.code === '23505' && error.details?.includes('inventory_tank_unique')) {
      return 'ไม่สามารถบันทึกได้: มีสต็อกสินค้ายี่ห้อและขนาดนี้อยู่แล้ว';
    }
    // For other Supabase errors or generic errors, the message is usually sufficient.
    return error.message;
  }

  // Supabase error might have details which are more specific
  if (typeof error.details === 'string' && error.details) {
      return error.details;
  }

  // Handle if the error itself is a string
  if (typeof error === 'string') {
    return error;
  }

  // Fallback for non-standard error objects, try to stringify them
  try {
    const stringifiedError = JSON.stringify(error);
    // Avoid showing an empty object
    if (stringifiedError !== '{}') { 
      return stringifiedError;
    }
  } catch (e) {
    // Could be a circular reference, fall through to the generic message
  }
  
  // Ultimate fallback if no useful information can be extracted
  return 'เกิดข้อผิดพลาดที่ไม่รู้จัก โปรดตรวจสอบคอนโซลเพื่อดูรายละเอียดเพิ่มเติม';
};
