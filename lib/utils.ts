

import { Customer, Brand, Size, VatType } from '../types';

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

  // Check for specific Schema Cache / Missing Column error
  if (err.message && typeof err.message === 'string') {
      if (err.message.includes("Could not find the") && err.message.includes("in the schema cache")) {
          return 'ฐานข้อมูลไม่เป็นปัจจุบัน (Missing Column) กรุณาไปที่เมนู "ตั้งค่า" > กดปุ่ม "เริ่มการทดสอบระบบ" เพื่อทำการซ่อมแซมฐานข้อมูล';
      }
  }

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

export const getGasWeightKg = (size: string | Size): number => {
  if (!size) return 0;
  if (size.includes('48')) return 48;
  if (size.includes('15')) return 15;
  if (size.includes('7')) return 7;
  if (size.includes('4')) return 4;
  const numMatch = size.match(/(\d+(\.\d+)?)/);
  if (numMatch) return parseFloat(numMatch[1]) || 0;
  return 0;
};

export type DocType = 'DN' | 'IVT' | 'SHORT_TAX_INVOICE' | 'CASH';

export const generateRunningNumber = (
  docType: DocType,
  dateInput: string | Date,
  existingSales: { invoice_number?: string; date?: string }[]
): string => {
  const d = new Date(dateInput);
  const year = d.getFullYear();
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const ym = `${year}${month}`; // e.g. "202608"

  let prefix = '';
  if (docType === 'DN') {
    prefix = `DN-${ym}`;
  } else if (docType === 'IVT') {
    prefix = `IVT-${ym}`;
  } else {
    // Abbreviated tax invoice / Cash bill (YYYYMM0001)
    prefix = `${ym}`;
  }

  // Find max suffix for this prefix in existing sales
  let maxSeq = 0;
  (existingSales || []).forEach(s => {
    const inv = s.invoice_number || '';
    if (inv.startsWith(prefix)) {
      const suffix = inv.substring(prefix.length);
      const seq = parseInt(suffix, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    }
  });

  const nextSeq = (maxSeq + 1).toString().padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

/**
 * Normalizes a Google Drive URL into a reliable image proxy URL
 * to avoid CORS / referrer / direct view restrictions on Google Drive images.
 */
export const normalizeGoogleDriveUrl = (url: string): string => {
  if (!url) return '';
  if (url.includes('drive.google.com') || url.includes('lh3.googleusercontent.com') || url.includes('wsrv.nl')) {
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/) || url.match(/id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      const fileId = match[1];
      return `https://drive.google.com/thumbnail?id=${fileId}&sz=w1000`;
    }
  }
  return url;
};

/**
 * Accurately look up price for a specific customer, brand, and size.
 * Checks price_list specific pricing first, then falls back to customer default price.
 */
export const getCustomerPriceForItem = (
  customer: Customer | undefined,
  brand: Brand | string,
  size: Size | string
): { price: number; found: boolean; source: 'price_list' | 'customer_base' | 'not_found' } => {
  if (!customer) return { price: 0, found: false, source: 'not_found' };

  // 1. Check specific price list first (high priority)
  if (customer.price_list && customer.price_list.length > 0) {
    const specific = customer.price_list.find(p => p.brand === brand && p.size === size);
    if (specific && typeof specific.price === 'number' && specific.price > 0) {
      return { price: specific.price, found: true, source: 'price_list' };
    }
  }

  // 2. Check base customer price
  if (typeof customer.price === 'number' && customer.price > 0) {
    return { price: customer.price, found: true, source: 'customer_base' };
  }

  return { price: 0, found: false, source: 'not_found' };
};

export interface VatBreakdown {
  subtotal: number;       // ยอดรวมสินค้า (ก่อนหักส่วนลด)
  deductions: number;     // หักส่วนลดคืนเนื้อแก๊ส
  netAmount: number;      // ยอดสุทธิหลังหักส่วนลด
  preVatAmount: number;   // มูลค่าก่อน VAT
  vatAmount: number;      // ภาษีมูลค่าเพิ่ม 7%
  grandTotal: number;     // ยอดรวมสุทธิที่ต้องชำระ (Grand Total)
  vatRate: number;        // 7 หรือ 0
  vatType: VatType;
}

export interface InvoiceCalculatedTotals {
  items: any[];
  subtotal: number;         // รวมเป็นเงิน (ก่อนหักส่วนลด)
  gasReturnKg: number;      // กิโลกรัมแก๊สคืน
  gasReturnPrice: number;   // ราคาคืนแก๊สต่อ กก.
  returnDeduction: number;  // ยอดหักส่วนลดคืนเนื้อแก๊ส
  netAmount: number;        // ยอดสุทธิหลังหักส่วนลด (Net Amount)
  preVatAmount: number;     // มูลค่าก่อนภาษี (Pre-VAT Amount)
  vatAmount: number;        // ภาษีมูลค่าเพิ่ม 7% (VAT Amount)
  grandTotal: number;       // ยอดรวมสุทธิที่ต้องชำระ (Grand Total)
  vatRate: number;          // 7 หรือ 0
  vatType: VatType;         // INCLUDED | EXCLUDED | NO_VAT
  priceIncludesVat: boolean;// true if VatType.INCLUDED
  thaiBaht: string;         // จำนวนเงินตัวอักษรไทย
  totalQuantity: number;    // จำนวนชิ้น/ถังรวม
  totalGasWeightKg: number; // น้ำหนักแก๊สรวม (กก.)
}

/**
 * Universal Single-Source Calculation Engine for all invoices, receipts, tax invoices, cash bills, and delivery notes.
 * Mandated by PART 17 & PART 18 to eliminate VAT duplication and calculation discrepancies.
 */
export const calculateInvoiceTotals = (
  sale: any,
  fallbackCustomer?: Customer
): InvoiceCalculatedTotals => {
  if (!sale) {
    return {
      items: [],
      subtotal: 0,
      gasReturnKg: 0,
      gasReturnPrice: 0,
      returnDeduction: 0,
      netAmount: 0,
      preVatAmount: 0,
      vatAmount: 0,
      grandTotal: 0,
      vatRate: 0,
      vatType: VatType.INCLUDED,
      priceIncludesVat: true,
      thaiBaht: 'ศูนย์บาทถ้วน',
      totalQuantity: 0,
      totalGasWeightKg: 0,
    };
  }

  // 1. Normalize items array
  const rawItems = sale.items && sale.items.length > 0
    ? sale.items
    : [{
        brand: sale.tank_brand || Brand.PTT,
        size: sale.tank_size || Size.S48,
        quantity: typeof sale.quantity === 'number' ? sale.quantity : parseFloat(String(sale.quantity)) || 1,
        unit_price: typeof sale.unit_price === 'number' ? sale.unit_price : parseFloat(String(sale.unit_price)) || 0,
        total_price: typeof sale.total_amount === 'number' && sale.total_amount > 0 
          ? sale.total_amount 
          : (typeof sale.unit_price === 'number' ? sale.unit_price : 0) * (typeof sale.quantity === 'number' ? sale.quantity : 1),
        item_type: 'GAS'
      }];

  const items = rawItems.map((item: any) => {
    const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(String(item.quantity)) || 0;
    const unitP = typeof item.unit_price === 'number' ? item.unit_price : parseFloat(String(item.unit_price)) || 0;
    const totalP = typeof item.total_price === 'number'
      ? item.total_price
      : Math.round(qty * unitP * 100) / 100;
    return {
      ...item,
      quantity: qty,
      unit_price: unitP,
      total_price: totalP,
      item_type: item.item_type || 'GAS'
    };
  });

  const subtotal = Math.round(items.reduce((acc: number, item: any) => acc + (item.total_price || 0), 0) * 100) / 100;

  const gasReturnKg = typeof sale.gas_return_kg === 'number'
    ? sale.gas_return_kg
    : parseFloat(String(sale.gas_return_kg || '0')) || 0;

  const gasReturnPrice = typeof sale.gas_return_price === 'number'
    ? sale.gas_return_price
    : parseFloat(String(sale.gas_return_price || '0')) || 0;

  const returnDeduction = Math.round((gasReturnKg * gasReturnPrice) * 100) / 100;
  const netAmount = Math.max(0, Math.round((subtotal - returnDeduction) * 100) / 100);

  // Determine VAT Mode
  const effectiveVatType: VatType = sale.vat_type
    || fallbackCustomer?.default_vat_type
    || (sale.invoice_type === 'TAX_INVOICE' || sale.invoice_type === 'ใบกำกับภาษี' ? VatType.INCLUDED : VatType.INCLUDED);

  let preVatAmount = 0;
  let vatAmount = 0;
  let grandTotal = 0;

  if (effectiveVatType === VatType.INCLUDED) {
    // ราคารวม VAT 7% แล้ว (ห้ามคิด VAT ซ้ำ)
    grandTotal = netAmount;
    preVatAmount = Math.round((grandTotal / 1.07) * 100) / 100;
    vatAmount = Math.round((grandTotal - preVatAmount) * 100) / 100;
  } else if (effectiveVatType === VatType.EXCLUDED) {
    // ราคาก่อน VAT (ยังไม่รวม VAT 7% -> คำนวณเพิ่ม 7%)
    preVatAmount = netAmount;
    vatAmount = Math.round((preVatAmount * 0.07) * 100) / 100;
    grandTotal = Math.round((preVatAmount + vatAmount) * 100) / 100;
  } else {
    // ไม่มี VAT (NO_VAT)
    preVatAmount = netAmount;
    vatAmount = 0;
    grandTotal = netAmount;
  }

  const totalQuantity = items.reduce((acc: number, i: any) => acc + (i.quantity || 0), 0);
  const totalGasWeightKg = items.reduce((acc: number, item: any) => {
    if (item.item_type === 'ACCESSORY') return acc;
    return acc + ((item.quantity || 0) * getGasWeightKg(item.size));
  }, 0);

  return {
    items,
    subtotal,
    gasReturnKg,
    gasReturnPrice,
    returnDeduction,
    netAmount,
    preVatAmount,
    vatAmount,
    grandTotal,
    vatRate: effectiveVatType !== VatType.NO_VAT ? 7 : 0,
    vatType: effectiveVatType,
    priceIncludesVat: effectiveVatType === VatType.INCLUDED,
    thaiBaht: thaiBahtText(grandTotal),
    totalQuantity,
    totalGasWeightKg
  };
};

/**
 * Calculates VAT breakdown according to Thai Tax rules:
 * - INCLUDED: ราคารวม VAT 7% แล้ว (Grand Total = Net, Pre-VAT = Net / 1.07, VAT = Net - Pre-VAT) -> ห้ามคิด VAT ซ้ำ!
 * - EXCLUDED: ราคาก่อน VAT (Pre-VAT = Net, VAT = Net * 0.07, Grand Total = Pre-VAT + VAT)
 * - NO_VAT: ไม่มี VAT (Pre-VAT = Net, VAT = 0, Grand Total = Net)
 */
export const calculateVatBreakdown = (
  itemsTotal: number,
  deductions: number = 0,
  vatType: VatType = VatType.INCLUDED
): VatBreakdown => {
  const net = Math.max(0, itemsTotal - deductions);
  let preVatAmount = 0;
  let vatAmount = 0;
  let grandTotal = 0;

  if (vatType === VatType.INCLUDED) {
    // ราคารวม VAT 7% แล้ว (ห้ามคิด VAT ซ้ำ)
    grandTotal = Math.round(net * 100) / 100;
    preVatAmount = Math.round((grandTotal / 1.07) * 100) / 100;
    vatAmount = Math.round((grandTotal - preVatAmount) * 100) / 100;
  } else if (vatType === VatType.EXCLUDED) {
    // ราคาก่อน VAT (ยังไม่รวม VAT 7% -> คำนวณเพิ่ม 7%)
    preVatAmount = Math.round(net * 100) / 100;
    vatAmount = Math.round((preVatAmount * 0.07) * 100) / 100;
    grandTotal = Math.round((preVatAmount + vatAmount) * 100) / 100;
  } else {
    // ไม่มี VAT (NO_VAT)
    preVatAmount = Math.round(net * 100) / 100;
    vatAmount = 0;
    grandTotal = Math.round(net * 100) / 100;
  }

  return {
    subtotal: Math.round(itemsTotal * 100) / 100,
    deductions: Math.round(deductions * 100) / 100,
    netAmount: Math.round(net * 100) / 100,
    preVatAmount,
    vatAmount,
    grandTotal,
    vatRate: vatType !== VatType.NO_VAT ? 7 : 0,
    vatType
  };
};

