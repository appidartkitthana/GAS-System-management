
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
  TRANSPORT = 'ค่าขนส่ง',
  OVERHEAD = 'ค่าใช้จ่ายทั่วไป/เบ็ดเตล็ด',
  SALARY = 'เงินเดือนพนักงาน',
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

export interface BorrowedTank {
  brand: Brand;
  size: Size;
  quantity: number;
}

export interface Customer {
  id: string;
  created_at?: string;
  name: string;
  branch: string;
  price: number; // Selling price (Tax Included)
  tank_brand: Brand; // Default preference
  tank_size: Size; // Default preference
  borrowed_tanks?: BorrowedTank[]; // New: Array of borrowed items
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
  cost_price?: number; // New: To calculate profit accurately per transaction
  total_amount: number;
  tank_brand: Brand;
  tank_size: Size;
  payment_method: PaymentMethod;
  invoice_type: InvoiceType;
  invoice_number: string;
  gas_return_kg?: number;
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
  type: string; // Changed from Enum to string to allow custom types
  description: string; // Can be used for Vendor Name
  payee?: string; // New: Vendor/Receiver Name
  amount: number;
  payment_method: PaymentMethod;
  // New: For Refill expenses, we use a JSON structure to store multiple lines
  refill_details?: RefillItem[]; 
  gas_return_kg?: number;
  gas_return_amount?: number;
}

export interface InventoryItem {
  id: string;
  created_at?: string;
  category: InventoryCategory; // New
  name?: string; // For Accessories
  tank_brand?: Brand; // Nullable for Accessories
  tank_size?: Size; // Nullable for Accessories
  cost_price?: number; // New: Standard Cost for profit calc
  total: number;
  full: number;
  on_loan: number;
}
