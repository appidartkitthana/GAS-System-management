export enum Brand {
  PTT = 'PTT',
  WP = 'WP',
  OTHER = 'อื่นๆ',
}

export enum Size {
  S48_2V = '48 กก. (2 วาล์ว)',
  S48 = '48 กก.',
  S15 = '15 กก.',
  S7 = '7 กก.',
  S4 = '4 กก.',
  OTHER = 'อื่นๆ',
}

export enum ExpenseType {
  REFILL_CREDIT = 'ค่าบรรจุก๊าซ (เครดิต)',
  REFILL_CASH = 'ค่าบรรจุก๊าซ (เงินสด)',
  TRANSPORT_1 = 'ค่าขนส่ง 1',
  TRANSPORT_2 = 'ค่าขนส่ง 2',
  TRANSPORT_3 = 'ค่าขนส่ง 3',
  LIFTING = 'ค่าขึ้นถัง',
  TOLL = 'ทางด่วน',
  DOCUMENT = 'เอกสาร',
  OTHER = 'อื่นๆ',
}

export enum PaymentMethod {
  CASH = 'เงินสด',
  TRANSFER = 'เงินโอน',
  CREDIT = 'เครดิต',
}

export enum InvoiceType {
  CASH = 'บิลเงินสด',
  TAX_INVOICE = 'ใบกำกับภาษี',
}

export interface CompanyInfo {
  name: string;
  address: string;
  taxId: string;
  phone: string;
}

export interface Customer {
  id: string;
  created_at?: string;
  name: string;
  branch: string;
  price: number;
  tank_brand: Brand;
  tank_size: Size;
  borrowed_tanks_quantity: number;
  address?: string;
  tax_id?: string;
}

export interface Sale {
  id: string;
  created_at?: string;
  customer_id: string;
  date: string; // ISO string
  quantity: number;
  unit_price: number;
  total_amount: number;
  tank_brand: Brand;
  tank_size: Size;
  payment_method: PaymentMethod;
  invoice_type: InvoiceType;
  invoice_number: string;
  gas_return_kg?: number;
}

export interface Expense {
  id: string;
  created_at?: string;
  date: string; // ISO string
  type: ExpenseType;
  description: string;
  amount: number;
  payment_method: PaymentMethod;
  refill_tank_brand?: Brand;
  refill_tank_size?: Size;
  refill_quantity?: number;
}

export interface InventoryItem {
  id: string;
  created_at?: string;
  tank_brand: Brand;
  tank_size: Size;
  total: number;
  full: number;
  on_loan: number;
}