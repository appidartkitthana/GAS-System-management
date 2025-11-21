
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

  // Normalize the error object (Handle nested error property often returned by some clients)
  const err = error.error || error;

  // 1. Check for specific Postgres/Supabase Error Codes
  const code = err.code || '';
  if (code === '42703') {
      return 'โครงสร้างฐานข้อมูลไม่ถูกต้อง (ไม่พบคอลัมน์ที่จำเป็น) กรุณาไปที่หน้า "ตั้งค่า" และกด "เริ่มการทดสอบระบบ" เพื่อซ่อมแซมฐานข้อมูล';
  }
  if (code === '23505') {
      return 'ข้อมูลซ้ำซ้อน (Duplicate Key): ข้อมูลนี้มีอยู่ในระบบแล้ว';
  }
  if (code === '42P01') {
      return 'ไม่พบตารางข้อมูลในระบบ กรุณาตรวจสอบการตั้งค่าฐานข้อมูล';
  }
  if (code === '23502') {
      return 'ข้อมูลไม่ครบถ้วน (Not Null Violation)';
  }
  if (code === '42501') {
      return 'ไม่ได้รับอนุญาต (RLS Policy): คุณไม่มีสิทธิ์แก้ไขข้อมูลนี้';
  }

  // 2. Check for Standard Message Properties
  if (typeof err === 'string') return err;
  if (err.message && typeof err.message === 'string') return err.message;
  if (err.details && typeof err.details === 'string') return err.details;
  if (err.hint && typeof err.hint === 'string') return err.hint;

  // 3. Fallback: Safe JSON Stringify
  try {
    const json = JSON.stringify(err, null, 2);
    if (json && json !== '{}' && json !== '[]') {
        return `Error Details: ${json}`;
    }
  } catch (e) {
      // Ignore serialization errors
  }

  // 4. Absolute Last Resort
  return `เกิดข้อผิดพลาดที่ไม่รู้จัก (Code: ${code || 'Unknown'})`;
};

/**
 * Converts a number to Thai Baht text.
 * @param amount The amount to convert.
 * @returns string
 */
export const thaiBahtText = (amount: number): string => {
    const numStr = amount.toFixed(2);
    const [baht, satang] = numStr.split('.');
    
    const thaiNum = ['ศูนย์', 'หนึ่ง', 'สอง', 'สาม', 'สี่', 'ห้า', 'หก', 'เจ็ด', 'แปด', 'เก้า'];
    const thaiUnit = ['', 'สิบ', 'ร้อย', 'พัน', 'หมื่น', 'แสน', 'ล้าน'];

    const convert = (n: string) => {
        let text = '';
        const len = n.length;
        for (let i = 0; i < len; i++) {
            const digit = parseInt(n[i]);
            const pos = len - i - 1;
            if (digit !== 0) {
                if (pos === 0 && digit === 1 && len > 1) {
                    text += 'เอ็ด';
                } else if (pos === 1 && digit === 2) {
                    text += 'ยี่';
                } else if (pos === 1 && digit === 1) {
                    // Skip 'Nueng' for 10
                } else {
                    text += thaiNum[digit];
                }
                text += thaiUnit[pos];
            }
        }
        return text;
    };

    let text = '';
    if (parseInt(baht) === 0) {
        text = 'ศูนย์บาท';
    } else {
        text = convert(baht) + 'บาท';
    }

    if (parseInt(satang) === 0) {
        text += 'ถ้วน';
    } else {
        text += convert(satang) + 'สตางค์';
    }

    return text;
};
