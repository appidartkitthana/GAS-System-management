
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
 * Checks if two dates are the same calendar day, ignoring time.
 * Handles string inputs (ISO) by converting them to local date context.
 */
export const isSameDay = (dateString: string | Date, targetDate: Date): boolean => {
  const d1 = new Date(dateString);
  const d2 = new Date(targetDate);

  return d1.getDate() === d2.getDate() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getFullYear() === d2.getFullYear();
};

/**
 * Check if a date is in the same month and year as the target date.
 */
export const isSameMonth = (dateString: string | Date, targetDate: Date): boolean => {
  const d1 = new Date(dateString);
  const d2 = new Date(targetDate);

  return d1.getMonth() === d2.getMonth() &&
         d1.getFullYear() === d2.getFullYear();
}


/**
 * Formats an error object into a user-friendly string.
 * This prevents the cryptic "[object Object]" from being displayed in alerts.
 * @param error The error object from the Supabase client or another source.
 * @returns A formatted, readable error string.
 */
export const formatSupabaseError = (error: any): string => {
  if (!error) return 'เกิดข้อผิดพลาดที่ไม่รู้จัก';

  // Handle Check constraints
  if (error.code === '42703') {
      return 'โครงสร้างฐานข้อมูลไม่ถูกต้อง (ไม่พบคอลัมน์ที่จำเป็น) กรุณาไปที่หน้า "ตั้งค่า" และกด "เริ่มการทดสอบระบบ" เพื่อรับโค้ดแก้ไขฐานข้อมูล';
  }
  if (error.code === '23505' && error.details?.includes('inventory_tank_unique')) {
    return 'ไม่สามารถบันทึกได้: มีสต็อกสินค้ายี่ห้อและขนาดนี้อยู่แล้ว';
  }
  if (error.code === '42P01') {
      return 'ไม่พบตารางข้อมูลในระบบ กรุณาตรวจสอบการตั้งค่าฐานข้อมูล';
  }
  if (error.code === '23502') {
      return `ข้อมูลไม่ครบถ้วน: ${error.message}`;
  }

  // Handle Standard JS Error object first
  if (error instanceof Error) {
      return error.message;
  }

  // Supabase error object usually has 'message', 'details', 'hint'
  if (typeof error === 'object') {
      // Prioritize message
      if (error.message && typeof error.message === 'string') return error.message;
      if (error.details && typeof error.details === 'string') return error.details;
      if (error.hint && typeof error.hint === 'string') return error.hint;
  }

  // Handle if the error itself is a string
  if (typeof error === 'string') {
    return error;
  }

  // Fallback: Try to JSON stringify.
  try {
    const stringified = JSON.stringify(error, null, 2);
    if (stringified !== '{}' && stringified !== '[]') {
        return `Error Code: ${error.code || 'N/A'} \nDetails: ${stringified}`;
    }
  } catch (e) {
      // ignore
  }
  
  return `เกิดข้อผิดพลาดที่ไม่รู้จัก (Type: ${typeof error})`;
};
