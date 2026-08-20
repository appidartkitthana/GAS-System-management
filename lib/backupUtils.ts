import * as XLSX from 'xlsx';
import { Customer, InventoryItem, Sale, Expense, CompanyInfo, TankLoanAuditLog } from '../types';

/**
 * Format date for backup filenames: YYYY-MM-DD_HHmm
 */
export const getBackupTimestamp = (): string => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}_${hours}${minutes}`;
};

/**
 * Helper to trigger browser download of a blob
 */
export const triggerDownload = (blob: Blob, filename: string) => {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

/**
 * Escape string for SQL literals
 */
const escapeSqlString = (str: string | null | undefined): string => {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
};

/**
 * Escape JSON/Object for SQL literals
 */
const escapeSqlJson = (val: any): string => {
  if (val === null || val === undefined) return "'[]'::jsonb";
  const jsonStr = JSON.stringify(val).replace(/'/g, "''");
  return `'${jsonStr}'::jsonb`;
};

/**
 * Format numbers for SQL
 */
const formatSqlNumber = (num: number | null | undefined, defaultValue: number = 0): string => {
  if (num === null || num === undefined || isNaN(Number(num))) return String(defaultValue);
  return String(Number(num));
};

/**
 * Format timestamps for SQL
 */
const formatSqlTimestamp = (dateStr: string | null | undefined): string => {
  if (!dateStr) return 'now()';
  return `'${dateStr}'::timestamptz`;
};

/**
 * Export all data to multi-sheet Excel (.xlsx) file
 */
export const exportToExcel = (
  customers: Customer[],
  inventory: InventoryItem[],
  sales: Sale[],
  expenses: Expense[],
  companyInfo: CompanyInfo,
  tankLoanLogs: TankLoanAuditLog[] = []
) => {
  const timestamp = getBackupTimestamp();
  const workbook = XLSX.utils.book_new();

  // 1. Customers Sheet
  const customerRows = customers.map((c, index) => ({
    'ลำดับ': index + 1,
    'รหัสลูกค้า (ID)': c.id,
    'ชื่อลูกค้า': c.name,
    'สาขา': c.branch || '',
    'เบอร์โทรศัพท์': c.phone || '',
    'ที่อยู่': c.address || '',
    'เลขประจำตัวผู้เสียภาษี': c.tax_id || '',
    'ราคาตั้งต้น (บาท)': c.price || 0,
    'ยี่ห้อถังหลัก': c.tank_brand || '',
    'ขนาดถังหลัก': c.tank_size || '',
    'รูปแบบ VAT': c.default_vat_type === 'SEPARATE' ? 'แยกภาษี 7%' : 'รวมภาษี',
    'จำนวนถังยืมรวม': Array.isArray(c.borrowed_tanks) ? c.borrowed_tanks.reduce((s, t) => s + (t.quantity || 0), 0) : 0,
    'รายละเอียดถังยืม (JSON)': JSON.stringify(c.borrowed_tanks || []),
    'ตารางราคาเฉพาะ (JSON)': JSON.stringify(c.price_list || []),
    'Google Maps URL': c.google_map_url || '',
    'หมายเหตุ': c.notes || '',
    'วันที่สร้าง': c.created_at || ''
  }));
  const wsCustomers = XLSX.utils.json_to_sheet(customerRows);
  XLSX.utils.book_append_sheet(workbook, wsCustomers, 'ข้อมูลลูกค้า');

  // 2. Inventory Sheet
  const inventoryRows = inventory.map((item, index) => ({
    'ลำดับ': index + 1,
    'รหัสสต็อก (ID)': item.id,
    'หมวดหมู่': item.category === 'ACCESSORY' ? 'อุปกรณ์/อะไหล่' : 'ถังแก๊ส',
    'ชื่อสินค้า': item.name || (item.category === 'GAS' ? `${item.tank_brand || ''} ${item.tank_size || ''}`.trim() : ''),
    'ยี่ห้อถัง': item.tank_brand || '-',
    'ขนาดถัง': item.tank_size || '-',
    'ยอดรวมทั้งหมด': item.total || 0,
    'ถังเต็ม (พร้อมขาย)': item.full || 0,
    'ถังยืม (อยู่ที่ลูกค้า)': item.on_loan || 0,
    'ราคาทุน (บาท)': item.cost_price || 0,
    'จุดเตือนสต็อกต่ำ': item.low_stock_threshold ?? 5,
    'หมายเหตุ': item.notes || ''
  }));
  const wsInventory = XLSX.utils.json_to_sheet(inventoryRows);
  XLSX.utils.book_append_sheet(workbook, wsInventory, 'สต็อกสินค้า');

  // 3. Sales Sheet
  const customerMap = new Map(customers.map(c => [c.id, c.name + (c.branch ? ` (${c.branch})` : '')]));
  const salesRows = sales.map((s, index) => {
    let itemSummary = '';
    if (s.items && Array.isArray(s.items) && s.items.length > 0) {
      itemSummary = s.items.map(i => `${i.name || `${i.brand} ${i.size}`} x${i.quantity}`).join(', ');
    } else if (s.tank_brand || s.tank_size) {
      itemSummary = `${s.tank_brand || ''} ${s.tank_size || ''} x${s.quantity}`;
    }

    return {
      'ลำดับ': index + 1,
      'รหัสการขาย (ID)': s.id,
      'เลขที่เอกสาร': s.invoice_number || '-',
      'วันที่ขาย': s.date,
      'ชื่อลูกค้า': customerMap.get(s.customer_id) || 'ลูกค้าทั่วไป',
      'ยอดรวม (บาท)': s.total_amount || 0,
      'ช่องทางชำระเงิน': s.payment_method === 'CASH' ? 'เงินสด' : s.payment_method === 'TRANSFER' ? 'โอนเงิน' : 'เงินเชื่อ (ค้างชำระ)',
      'ประเภทบิล': s.invoice_type === 'TAX_INVOICE' ? 'ใบกำกับภาษี' : s.invoice_type === 'DELIVERY' ? 'ใบส่งของ' : 'บิลเงินสด',
      'รายการสินค้า': itemSummary,
      'ราคาทุนรวม (บาท)': s.cost_price || 0,
      'ประเภท VAT': s.vat_type === 'SEPARATE' ? 'แยกภาษี 7%' : 'รวมภาษี',
      'ยอดก่อน VAT (บาท)': s.pre_vat_amount || 0,
      'ภาษี VAT (บาท)': s.vat_amount || 0,
      'แก๊สคืน (กก.)': s.gas_return_kg || 0,
      'ราคาแก๊สคืน/กก.': s.gas_return_price || 0,
      'จำนวนถังแก๊สคืน': s.gas_return_qty || 0,
      'ข้อมูลสินค้า JSON': JSON.stringify(s.items || [])
    };
  });
  const wsSales = XLSX.utils.json_to_sheet(salesRows);
  XLSX.utils.book_append_sheet(workbook, wsSales, 'ประวัติการขาย');

  // 4. Expenses Sheet
  const expenseRows = expenses.map((e, index) => {
    let refillSummary = '';
    if (e.refill_details && Array.isArray(e.refill_details)) {
      refillSummary = e.refill_details.map(r => `${r.brand} ${r.size} x${r.quantity}`).join(', ');
    }

    return {
      'ลำดับ': index + 1,
      'รหัสรายจ่าย (ID)': e.id,
      'วันที่': e.date,
      'ประเภทรายจ่าย': e.type,
      'รายละเอียด': e.description || '',
      'จำนวนเงิน (บาท)': e.amount || 0,
      'ช่องทางจ่าย': e.payment_method === 'CASH' ? 'เงินสด' : e.payment_method === 'TRANSFER' ? 'โอนเงิน' : 'เงินเชื่อ/ติดค้าง',
      'ผู้รับเงิน/ร้านค้า': e.payee || '',
      'สรุปการส่งเติม': refillSummary,
      'แก๊สคืนโรงบรรจุ (กก.)': e.gas_return_kg || 0,
      'มูลค่าแก๊สคืน (บาท)': e.gas_return_amount || 0,
      'ข้อมูลส่งเติม JSON': JSON.stringify(e.refill_details || [])
    };
  });
  const wsExpenses = XLSX.utils.json_to_sheet(expenseRows);
  XLSX.utils.book_append_sheet(workbook, wsExpenses, 'รายการรายจ่าย');

  // 5. Tank Loan Logs Sheet
  if (tankLoanLogs && tankLoanLogs.length > 0) {
    const loanRows = tankLoanLogs.map((log, index) => ({
      'ลำดับ': index + 1,
      'รหัสบันทึก (ID)': log.id,
      'วันที่เวลา': log.timestamp,
      'ชื่อลูกค้า': log.customerName,
      'ยี่ห้อถัง': log.brand,
      'ขนาดถัง': log.size,
      'จำนวนที่เปลี่ยนแปลง': log.changeAmount,
      'จำนวนคงเหลือล่าสุด': log.newQuantity,
      'หมายเหตุ/เหตุผล': log.notes || ''
    }));
    const wsLoans = XLSX.utils.json_to_sheet(loanRows);
    XLSX.utils.book_append_sheet(workbook, wsLoans, 'ประวัติยืมคืนถัง');
  }

  // 6. Company Info Sheet
  const companyRows = [{
    'ชื่อร้าน/บริษัท': companyInfo.name || '',
    'ที่อยู่': companyInfo.address || '',
    'เบอร์โทรศัพท์': companyInfo.phone || '',
    'เลขประจำตัวผู้เสียภาษี': companyInfo.taxId || '',
    'บัญชีธนาคาร': companyInfo.bankAccount || '',
    'วันที่สำรองข้อมูล': new Date().toLocaleString('th-TH')
  }];
  const wsCompany = XLSX.utils.json_to_sheet(companyRows);
  XLSX.utils.book_append_sheet(workbook, wsCompany, 'ข้อมูลร้านค้า');

  // Write file
  XLSX.writeFile(workbook, `somkiat_gas_backup_${timestamp}.xlsx`);
};

/**
 * Export all database tables as a complete SQL Dump (.sql) file
 */
export const exportToSql = (
  customers: Customer[],
  inventory: InventoryItem[],
  sales: Sale[],
  expenses: Expense[],
  companyInfo: CompanyInfo
) => {
  const timestamp = getBackupTimestamp();
  const thaiDate = new Date().toLocaleString('th-TH');

  let sql = `-- ==============================================================================
-- SOMKIAT GAS LPG DISTRIBUTION SYSTEM - FULL DATABASE BACKUP
-- ระบบจัดการร้านสมเกียรติแก๊ส - ไฟล์สำรองข้อมูลฐานข้อมูลฉบับสมบูรณ์ (SQL Dump)
-- วันที่สำรองข้อมูล: ${thaiDate}
-- จำนวนข้อมูล: ลูกค้า ${customers.length} ราย | สต็อก ${inventory.length} รายการ | การขาย ${sales.length} รายการ | รายจ่าย ${expenses.length} รายการ
-- ==============================================================================

-- 1. สร้างโครงสร้างตาราง (CREATE TABLE IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    name TEXT NOT NULL,
    branch TEXT,
    phone TEXT,
    address TEXT,
    tax_id TEXT,
    price NUMERIC DEFAULT 0,
    tank_brand TEXT,
    tank_size TEXT,
    borrowed_tanks JSONB DEFAULT '[]'::jsonb,
    price_list JSONB DEFAULT '[]'::jsonb,
    google_map_url TEXT,
    notes TEXT,
    default_vat_type TEXT DEFAULT 'INCLUDED'
);

CREATE TABLE IF NOT EXISTS public.inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    category TEXT DEFAULT 'GAS',
    name TEXT,
    tank_brand TEXT,
    tank_size TEXT,
    total INTEGER DEFAULT 0,
    full INTEGER DEFAULT 0,
    on_loan INTEGER DEFAULT 0,
    cost_price NUMERIC DEFAULT 0,
    low_stock_threshold INTEGER DEFAULT 5,
    notes TEXT
);

CREATE TABLE IF NOT EXISTS public.sales (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    date TIMESTAMPTZ DEFAULT now(),
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    quantity INTEGER DEFAULT 1,
    unit_price NUMERIC DEFAULT 0,
    total_amount NUMERIC DEFAULT 0,
    tank_brand TEXT,
    tank_size TEXT,
    payment_method TEXT DEFAULT 'CASH',
    invoice_type TEXT DEFAULT 'CASH',
    invoice_number TEXT,
    cost_price NUMERIC DEFAULT 0,
    items JSONB DEFAULT '[]'::jsonb,
    gas_return_kg NUMERIC DEFAULT 0,
    gas_return_price NUMERIC DEFAULT 0,
    gas_return_qty INTEGER DEFAULT 0,
    vat_type TEXT DEFAULT 'INCLUDED',
    pre_vat_amount NUMERIC DEFAULT 0,
    vat_amount NUMERIC DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    date TIMESTAMPTZ DEFAULT now(),
    type TEXT NOT NULL,
    description TEXT,
    amount NUMERIC DEFAULT 0,
    payment_method TEXT DEFAULT 'CASH',
    payee TEXT,
    refill_details JSONB DEFAULT '[]'::jsonb,
    gas_return_kg NUMERIC DEFAULT 0,
    gas_return_amount NUMERIC DEFAULT 0
);

-- ปรับปรุงโครงสร้างคอลัมน์ (Migration Safety)
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS tax_id TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS borrowed_tanks JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS price_list JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS google_map_url TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS default_vat_type TEXT DEFAULT 'INCLUDED';

ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS category TEXT DEFAULT 'GAS';
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS low_stock_threshold INTEGER DEFAULT 5;
ALTER TABLE public.inventory ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.inventory ALTER COLUMN tank_brand DROP NOT NULL;
ALTER TABLE public.inventory ALTER COLUMN tank_size DROP NOT NULL;

ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS items JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS cost_price NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gas_return_kg NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gas_return_price NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS gas_return_qty INTEGER DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS vat_type TEXT DEFAULT 'INCLUDED';
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS pre_vat_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS vat_amount NUMERIC DEFAULT 0;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS invoice_number TEXT;

ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS payee TEXT;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS refill_details JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS gas_return_kg NUMERIC DEFAULT 0;
ALTER TABLE public.expenses ADD COLUMN IF NOT EXISTS gas_return_amount NUMERIC DEFAULT 0;
ALTER TABLE public.expenses ALTER COLUMN type TYPE TEXT;

-- ==============================================================================
-- 2. ข้อมูลตารางลูกค้า (CUSTOMERS DATA - ${customers.length} ROWS)
-- ==============================================================================
`;

  if (customers.length > 0) {
    customers.forEach(c => {
      const id = escapeSqlString(c.id);
      const createdAt = formatSqlTimestamp(c.created_at);
      const name = escapeSqlString(c.name);
      const branch = escapeSqlString(c.branch);
      const phone = escapeSqlString(c.phone);
      const address = escapeSqlString(c.address);
      const taxId = escapeSqlString(c.tax_id);
      const price = formatSqlNumber(c.price);
      const tankBrand = escapeSqlString(c.tank_brand);
      const tankSize = escapeSqlString(c.tank_size);
      const borrowedTanks = escapeSqlJson(c.borrowed_tanks);
      const priceList = escapeSqlJson(c.price_list);
      const mapUrl = escapeSqlString(c.google_map_url);
      const notes = escapeSqlString(c.notes);
      const defaultVatType = escapeSqlString(c.default_vat_type || 'INCLUDED');

      sql += `INSERT INTO public.customers (id, created_at, name, branch, phone, address, tax_id, price, tank_brand, tank_size, borrowed_tanks, price_list, google_map_url, notes, default_vat_type)
VALUES (${id}, ${createdAt}, ${name}, ${branch}, ${phone}, ${address}, ${taxId}, ${price}, ${tankBrand}, ${tankSize}, ${borrowedTanks}, ${priceList}, ${mapUrl}, ${notes}, ${defaultVatType})
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name, branch = EXCLUDED.branch, phone = EXCLUDED.phone, address = EXCLUDED.address,
  tax_id = EXCLUDED.tax_id, price = EXCLUDED.price, tank_brand = EXCLUDED.tank_brand, tank_size = EXCLUDED.tank_size,
  borrowed_tanks = EXCLUDED.borrowed_tanks, price_list = EXCLUDED.price_list, google_map_url = EXCLUDED.google_map_url,
  notes = EXCLUDED.notes, default_vat_type = EXCLUDED.default_vat_type;\n`;
    });
  } else {
    sql += `-- ไม่มีข้อมูลลูกค้าในระบบ\n`;
  }

  sql += `\n-- ==============================================================================
-- 3. ข้อมูลสต็อกสินค้า (INVENTORY DATA - ${inventory.length} ROWS)
-- ==============================================================================
`;

  if (inventory.length > 0) {
    inventory.forEach(item => {
      const id = escapeSqlString(item.id);
      const createdAt = formatSqlTimestamp(item.created_at);
      const category = escapeSqlString(item.category || 'GAS');
      const name = escapeSqlString(item.name);
      const tankBrand = escapeSqlString(item.tank_brand);
      const tankSize = escapeSqlString(item.tank_size);
      const total = formatSqlNumber(item.total);
      const full = formatSqlNumber(item.full);
      const onLoan = formatSqlNumber(item.on_loan);
      const costPrice = formatSqlNumber(item.cost_price);
      const threshold = formatSqlNumber(item.low_stock_threshold, 5);
      const notes = escapeSqlString(item.notes);

      sql += `INSERT INTO public.inventory (id, created_at, category, name, tank_brand, tank_size, total, full, on_loan, cost_price, low_stock_threshold, notes)
VALUES (${id}, ${createdAt}, ${category}, ${name}, ${tankBrand}, ${tankSize}, ${total}, ${full}, ${onLoan}, ${costPrice}, ${threshold}, ${notes})
ON CONFLICT (id) DO UPDATE SET
  category = EXCLUDED.category, name = EXCLUDED.name, tank_brand = EXCLUDED.tank_brand, tank_size = EXCLUDED.tank_size,
  total = EXCLUDED.total, full = EXCLUDED.full, on_loan = EXCLUDED.on_loan, cost_price = EXCLUDED.cost_price,
  low_stock_threshold = EXCLUDED.low_stock_threshold, notes = EXCLUDED.notes;\n`;
    });
  } else {
    sql += `-- ไม่มีข้อมูลสต็อกสินค้าในระบบ\n`;
  }

  sql += `\n-- ==============================================================================
-- 4. ข้อมูลการขายและรายรับ (SALES DATA - ${sales.length} ROWS)
-- ==============================================================================
`;

  if (sales.length > 0) {
    sales.forEach(s => {
      const id = escapeSqlString(s.id);
      const createdAt = formatSqlTimestamp(s.created_at);
      const date = formatSqlTimestamp(s.date);
      const customerId = s.customer_id ? escapeSqlString(s.customer_id) : 'NULL';
      const quantity = formatSqlNumber(s.quantity, 1);
      const unitPrice = formatSqlNumber(s.unit_price);
      const totalAmount = formatSqlNumber(s.total_amount);
      const tankBrand = escapeSqlString(s.tank_brand);
      const tankSize = escapeSqlString(s.tank_size);
      const paymentMethod = escapeSqlString(s.payment_method || 'CASH');
      const invoiceType = escapeSqlString(s.invoice_type || 'CASH');
      const invoiceNumber = escapeSqlString(s.invoice_number);
      const costPrice = formatSqlNumber(s.cost_price);
      const items = escapeSqlJson(s.items);
      const gasReturnKg = formatSqlNumber(s.gas_return_kg);
      const gasReturnPrice = formatSqlNumber(s.gas_return_price);
      const gasReturnQty = formatSqlNumber(s.gas_return_qty);
      const vatType = escapeSqlString(s.vat_type || 'INCLUDED');
      const preVatAmount = formatSqlNumber(s.pre_vat_amount);
      const vatAmount = formatSqlNumber(s.vat_amount);

      sql += `INSERT INTO public.sales (id, created_at, date, customer_id, quantity, unit_price, total_amount, tank_brand, tank_size, payment_method, invoice_type, invoice_number, cost_price, items, gas_return_kg, gas_return_price, gas_return_qty, vat_type, pre_vat_amount, vat_amount)
VALUES (${id}, ${createdAt}, ${date}, ${customerId}, ${quantity}, ${unitPrice}, ${totalAmount}, ${tankBrand}, ${tankSize}, ${paymentMethod}, ${invoiceType}, ${invoiceNumber}, ${costPrice}, ${items}, ${gasReturnKg}, ${gasReturnPrice}, ${gasReturnQty}, ${vatType}, ${preVatAmount}, ${vatAmount})
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date, customer_id = EXCLUDED.customer_id, quantity = EXCLUDED.quantity, unit_price = EXCLUDED.unit_price,
  total_amount = EXCLUDED.total_amount, tank_brand = EXCLUDED.tank_brand, tank_size = EXCLUDED.tank_size, payment_method = EXCLUDED.payment_method,
  invoice_type = EXCLUDED.invoice_type, invoice_number = EXCLUDED.invoice_number, cost_price = EXCLUDED.cost_price, items = EXCLUDED.items,
  gas_return_kg = EXCLUDED.gas_return_kg, gas_return_price = EXCLUDED.gas_return_price, gas_return_qty = EXCLUDED.gas_return_qty,
  vat_type = EXCLUDED.vat_type, pre_vat_amount = EXCLUDED.pre_vat_amount, vat_amount = EXCLUDED.vat_amount;\n`;
    });
  } else {
    sql += `-- ไม่มีข้อมูลการขายในระบบ\n`;
  }

  sql += `\n-- ==============================================================================
-- 5. ข้อมูลรายจ่ายและการส่งเติม (EXPENSES DATA - ${expenses.length} ROWS)
-- ==============================================================================
`;

  if (expenses.length > 0) {
    expenses.forEach(e => {
      const id = escapeSqlString(e.id);
      const createdAt = formatSqlTimestamp(e.created_at);
      const date = formatSqlTimestamp(e.date);
      const type = escapeSqlString(e.type);
      const description = escapeSqlString(e.description);
      const amount = formatSqlNumber(e.amount);
      const paymentMethod = escapeSqlString(e.payment_method || 'CASH');
      const payee = escapeSqlString(e.payee);
      const refillDetails = escapeSqlJson(e.refill_details);
      const gasReturnKg = formatSqlNumber(e.gas_return_kg);
      const gasReturnAmount = formatSqlNumber(e.gas_return_amount);

      sql += `INSERT INTO public.expenses (id, created_at, date, type, description, amount, payment_method, payee, refill_details, gas_return_kg, gas_return_amount)
VALUES (${id}, ${createdAt}, ${date}, ${type}, ${description}, ${amount}, ${paymentMethod}, ${payee}, ${refillDetails}, ${gasReturnKg}, ${gasReturnAmount})
ON CONFLICT (id) DO UPDATE SET
  date = EXCLUDED.date, type = EXCLUDED.type, description = EXCLUDED.description, amount = EXCLUDED.amount,
  payment_method = EXCLUDED.payment_method, payee = EXCLUDED.payee, refill_details = EXCLUDED.refill_details,
  gas_return_kg = EXCLUDED.gas_return_kg, gas_return_amount = EXCLUDED.gas_return_amount;\n`;
    });
  } else {
    sql += `-- ไม่มีข้อมูลรายจ่ายในระบบ\n`;
  }

  sql += `\n-- ==============================================================================
-- 6. นโยบายสิทธิ์ความปลอดภัย (Row-Level Security)
-- ==============================================================================
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable all access for all users" ON public.customers;
CREATE POLICY "Enable all access for all users" ON public.customers FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for all users" ON public.inventory;
CREATE POLICY "Enable all access for all users" ON public.inventory FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for all users" ON public.sales;
CREATE POLICY "Enable all access for all users" ON public.sales FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Enable all access for all users" ON public.expenses;
CREATE POLICY "Enable all access for all users" ON public.expenses FOR ALL USING (true) WITH CHECK (true);
`;

  const blob = new Blob([sql], { type: 'text/plain;charset=utf-8' });
  triggerDownload(blob, `somkiat_gas_backup_${timestamp}.sql`);
};
