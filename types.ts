

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

export enum InventoryCategory {
  GAS = 'ก๊าซหุงต้ม',
  ACCESSORY = 'เตาแก๊สและอุปกรณ์',
}

export enum ExpenseType {
  REFILL = 'ค่าบรรจุก๊าซ',
  FUEL = 'ค่าน้ำมัน',
  ACCOUNTING = 'บัญชี',
  TAX = 'ค่าภาษี',
  TRANSPORT = 'ค่าขนส่ง',
  TOLL = 'ค่าทางด่วน',
  LOADING = 'ค่าขึ้นถัง',
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

export type Page = 'DASHBOARD' | 'TRANSACTIONS' | 'CUSTOMERS' | 'INVENTORY' | 'REPORTS' | 'SETTINGS';

export interface CompanyInfo {
  name: string;
  address: string;
  taxId: string;
  phone: string;
  logo?: string; // Base64 string
}

export interface BorrowedTank {
  brand: Brand;
  size: Size;
  quantity: number;
  date?: string;
  status?: string;
  notes?: string;
}

export interface BorrowedTankAuditLog {
  timestamp: string;
  user?: string;
  action: string;
  details: string;
}

export interface BorrowedTankRecord {
  id: string;
  customer_id: string;
  customer_name: string;
  customer_branch: string;
  date: string;
  brand: Brand;
  size: Size;
  quantity: number;
  status: 'กำลังยืม' | 'คืนแล้ว' | 'ชำรุด' | 'อื่นๆ' | string;
  notes?: string;
  history?: BorrowedTankAuditLog[];
}

export interface CustomerPriceItem {
  brand: Brand;
  size: Size;
  price: number;
}

export interface Customer {
  id: string;
  created_at?: string;
  name: string;
  branch: string;
  price: number; // Default/Base Selling price
  tank_brand: Brand; // Default preference
  tank_size: Size; // Default preference
  borrowed_tanks?: BorrowedTank[]; 
  price_list?: CustomerPriceItem[]; // New: Specific price list
  address?: string;
  google_map_url?: string;
  tax_id?: string;
  notes?: string; // New: Notes
}

export interface SaleItem {
  brand: Brand;
  size: Size;
  quantity: number;
  unit_price: number; // Price per unit for this specific item
  total_price: number; // quantity * unit_price
  cost_price?: number; // Snapshot of cost at time of sale
  item_type?: 'GAS' | 'ACCESSORY';
  item_name?: string;
  inventory_id?: string;
}

export interface Sale {
  id: string;
  created_at?: string;
  customer_id: string;
  date: string; // ISO string
  quantity: number; // Total Quantity (Sum of items)
  unit_price: number; // Deprecated or Average
  cost_price?: number; // Deprecated (Use item cost_price)
  total_amount: number; // Grand Total
  tank_brand: Brand; // Primary Brand (or first item)
  tank_size: Size; // Primary Size (or first item)
  payment_method: PaymentMethod;
  invoice_type: InvoiceType;
  invoice_number: string;
  gas_return_kg?: number;
  gas_return_price?: number; // New: Price per KG for return
  items?: SaleItem[]; 
}

export interface RefillItem {
  brand: Brand;
  size: Size;
  quantity: number;
  unit_cost?: number;
}

export interface Expense {
  id: string;
  created_at?: string;
  date: string; // ISO string
  type: string; 
  description: string; 
  payee?: string; 
  amount: number;
  payment_method: PaymentMethod;
  refill_details?: RefillItem[]; 
  gas_return_kg?: number;
  gas_return_amount?: number;
  // Legacy fields
  refill_tank_brand?: Brand;
  refill_tank_size?: Size;
  refill_quantity?: number;
}

export interface InventoryItem {
  id: string;
  created_at?: string;
  category: InventoryCategory; 
  name?: string; 
  tank_brand?: Brand; 
  tank_size?: Size; 
  cost_price?: number; 
  total: number;
  full: number;
  on_loan: number;
  notes?: string;
  low_stock_threshold?: number; // New: Low stock alert threshold
}