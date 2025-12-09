
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Customer, Sale, Expense, InventoryItem, Brand, Size, PaymentMethod, BorrowedTank, InventoryCategory, ExpenseType, SaleItem, InvoiceType, CompanyInfo } from '../types';
import { supabaseClient } from '../lib/supabaseClient';
import { formatSupabaseError, isSameDay, isSameMonth } from '../lib/utils';
import { SELLER_INFO } from '../constants';

interface RefillSummary {
  size: string;
  count: number;
  cashCount: number;
  creditCount: number;
  cost: number;
}

interface SalesSummary {
  size: string;
  count: number;
  cashTransferCount: number;
  creditCount: number;
  taxInvoiceCount: number;
}

interface ExpenseBreakdown {
    type: string;
    count: number;
    cashAmount: number;
    creditAmount: number;
    totalAmount: number;
    totalGasQty: number;
}

interface CustomerSalesStat {
    id: string;
    name: string;
    branch: string;
    totalSales: number;
    totalProfit: number;
}

interface AppContextType {
  loading: boolean;
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  inventory: InventoryItem[];
  getCustomerById: (id: string) => Customer | undefined;
  reportDate: Date;
  setReportDate: (date: Date) => void;
  
  companyInfo: CompanyInfo;
  updateCompanyInfo: (info: CompanyInfo) => void;

  lowStockItems: InventoryItem[];
  
  // Summaries
  dailySummary: {
    income: number;
    expense: number;
    profit: number;
    cashIncome: number;
    transferIncome: number;
    creditIncome: number;
    salesByCustomer: { customerId: string; customerName: string; totalAmount: number }[];
    refillStats: RefillSummary[]; // New field for Daily Refills
  };
  monthlySummary: {
    income: number;
    expense: number;
    profit: number;
    customerStats: { id: string; name: string; branch: string; tanks: number; total: number; profit: number }[];
    gasReturnKg: number;
    gasReturnValue: number;
    refillStats: RefillSummary[];
    salesStats: SalesSummary[];
    expenseBreakdown: ExpenseBreakdown[];
    topCustomers: CustomerSalesStat[];
  };

  // CRUD operations
  addCustomer: (customer: Omit<Customer, 'id'>) => Promise<void>;
  updateCustomer: (customer: Customer) => Promise<void>;
  deleteCustomer: (id: string) => Promise<void>;

  addSale: (sale: Omit<Sale, 'id'>) => Promise<void>;
  updateSale: (sale: Sale) => Promise<void>;
  deleteSale: (id: string) => Promise<void>;

  addExpense: (expense: Omit<Expense, 'id'>) => Promise<void>;
  updateExpense: (expense: Expense) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => Promise<void>;
  updateInventoryItem: (item: InventoryItem) => Promise<void>;
  deleteInventoryItem: (id: string) => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [loading, setLoading] = useState(true);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [reportDate, setReportDate] = useState(new Date());

  // Initialize companyInfo from LocalStorage or Constants
  const [companyInfo, setCompanyInfoState] = useState<CompanyInfo>(() => {
    const saved = localStorage.getItem('companyInfo');
    return saved ? JSON.parse(saved) : SELLER_INFO;
  });

  const updateCompanyInfo = (info: CompanyInfo) => {
      setCompanyInfoState(info);
      localStorage.setItem('companyInfo', JSON.stringify(info));
  };

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [customersRes, salesRes, expensesRes, inventoryRes] = await Promise.all([
            supabaseClient.from('customers').select('*').order('created_at', { ascending: false }),
            supabaseClient.from('sales').select('*').order('date', { ascending: false }),
            supabaseClient.from('expenses').select('*').order('date', { ascending: false }),
            supabaseClient.from('inventory').select('*')
        ]);

        if (customersRes.error) throw customersRes.error;
        if (salesRes.error) throw salesRes.error;
        if (expensesRes.error) throw expensesRes.error;
        if (inventoryRes.error) throw inventoryRes.error;

        if (customersRes.data) setCustomers(customersRes.data);
        if (salesRes.data) setSales(salesRes.data);
        if (expensesRes.data) setExpenses(expensesRes.data);
        if (inventoryRes.data) setInventory(inventoryRes.data);
      } catch (error: any) {
        console.error("Error fetching data:", error);
        alert(`เกิดข้อผิดพลาดในการดึงข้อมูล: ${formatSupabaseError(error)}`);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const getCustomerById = (id: string) => customers.find(c => c.id === id);

  const getStandardCost = (brand: Brand, size: Size): number => {
      const item = inventory.find(i => i.tank_brand === brand && i.tank_size === size);
      return item?.cost_price || 0;
  }

  const updateInventoryCount = async (brand: Brand, size: Size, quantityChange: number) => {
    const item = inventory.find(i => i.tank_brand === brand && i.tank_size === size);
    if (!item) return;

    const newFullCount = (item.full || 0) + quantityChange;
    const { data: updatedItem, error } = await supabaseClient
      .from('inventory')
      .update({ full: newFullCount })
      .eq('id', item.id)
      .select()
      .single();

    if (!error && updatedItem) {
      setInventory(prev => prev.map(i => i.id === item.id ? updatedItem : i));
    }
  };

  const syncInventoryLoans = async (oldBorrowed: BorrowedTank[] | null | undefined, newBorrowed: BorrowedTank[] | null | undefined) => {
      const changes: { brand: Brand, size: Size, delta: number }[] = [];
      const oldList = oldBorrowed || [];
      const newList = newBorrowed || [];

      oldList.forEach(b => changes.push({ brand: b.brand, size: b.size, delta: -b.quantity }));
      newList.forEach(b => changes.push({ brand: b.brand, size: b.size, delta: b.quantity }));

      const consolidated = changes.reduce((acc, curr) => {
          const key = `${curr.brand}-${curr.size}`;
          if (!acc[key]) acc[key] = { brand: curr.brand, size: curr.size, delta: 0 };
          acc[key].delta += curr.delta;
          return acc;
      }, {} as Record<string, { brand: Brand, size: Size, delta: number }>);

      for (const change of Object.values(consolidated)) {
          if (change.delta === 0) continue;
          
          const item = inventory.find(i => i.tank_brand === change.brand && i.tank_size === change.size);
          if (item) {
             const newLoan = (item.on_loan || 0) + change.delta;
             const finalLoan = Math.max(0, newLoan);
             const { data, error } = await supabaseClient.from('inventory').update({ on_loan: finalLoan }).eq('id', item.id).select().single();
             if (!error && data) {
                 setInventory(prev => prev.map(i => i.id === item.id ? data : i));
             } else if (error) {
                 console.error("Failed to sync inventory loan:", error);
                 alert(`ไม่สามารถอัปเดตสต็อกถังยืมได้: ${formatSupabaseError(error)}`);
             }
          }
      }
  };

  // --- CRUD Functions ---
  const addCustomer = async (data: Omit<Customer, 'id'>) => {
    const { data: newCustomer, error } = await supabaseClient.from('customers').insert(data).select().single();
    if (error) alert(`Error adding customer: ${formatSupabaseError(error)}`);
    else if (newCustomer) {
      setCustomers(prev => [newCustomer, ...prev]);
      if (newCustomer.borrowed_tanks) await syncInventoryLoans([], newCustomer.borrowed_tanks);
    }
  };
  const updateCustomer = async (data: Customer) => {
    const oldCustomer = customers.find(c => c.id === data.id);
    const { id, created_at, ...updateData } = data;
    const { data: updatedCustomer, error } = await supabaseClient.from('customers').update(updateData).eq('id', id).select().single();
    if (error) alert(`Error updating customer: ${formatSupabaseError(error)}`);
    else if (updatedCustomer) {
      setCustomers(prev => prev.map(c => c.id === data.id ? updatedCustomer : c));
      await syncInventoryLoans(oldCustomer?.borrowed_tanks, updatedCustomer.borrowed_tanks || []);
    }
  };
  const deleteCustomer = async (id: string) => {
    const hasSales = sales.some(s => s.customer_id === id);
    if (hasSales) { alert('ไม่สามารถลบลูกค้ารายนี้ได้ เนื่องจากมีประวัติการซื้อขายในระบบ'); return; }
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้ารายนี้?')) {
      const customerToDelete = customers.find(c => c.id === id);
      const { error } = await supabaseClient.from('customers').delete().eq('id', id);
      if (!error) {
        setCustomers(prev => prev.filter(c => c.id !== id));
        if (customerToDelete?.borrowed_tanks) await syncInventoryLoans(customerToDelete.borrowed_tanks, []);
      } else alert(`Error deleting customer: ${formatSupabaseError(error)}`);
    }
  };

  const addSale = async (data: Omit<Sale, 'id'>) => {
    try {
        const safeData = JSON.parse(JSON.stringify(data));
        if (safeData.items && Array.isArray(safeData.items)) {
            safeData.items = safeData.items.map((item: SaleItem) => ({
                ...item,
                cost_price: item.cost_price || getStandardCost(item.brand, item.size)
            }));
        } else {
            safeData.cost_price = safeData.cost_price || getStandardCost(safeData.tank_brand, safeData.tank_size);
        }
        const { data: newSale, error } = await supabaseClient.from('sales').insert(safeData).select().single();
        if (error) {
            if (error.code === '42703') alert('โครงสร้างฐานข้อมูลไม่ถูกต้อง (Schema Error). กรุณาไปที่ "ตั้งค่า" > "เริ่มการทดสอบระบบ"');
            else alert(`Error adding sale: ${formatSupabaseError(error)}`);
        } else if (newSale) {
            setSales(prev => [newSale, ...prev]);
            if (newSale.items && Array.isArray(newSale.items)) {
                for (const item of newSale.items) await updateInventoryCount(item.brand, item.size, -item.quantity);
            } else {
                await updateInventoryCount(newSale.tank_brand, newSale.tank_size, -newSale.quantity);
            }
        }
    } catch (e) { console.error(e); alert(`Error: ${formatSupabaseError(e)}`); }
  };
  const updateSale = async (data: Sale) => {
    const originalSale = sales.find(s => s.id === data.id);
    const { id, created_at, ...updateData } = data;
    const safeData = JSON.parse(JSON.stringify(updateData));
    const { data: updatedSale, error } = await supabaseClient.from('sales').update(safeData).eq('id', id).select().single();
     if (error) {
        if (error.code === '42703') alert('โครงสร้างฐานข้อมูลไม่ถูกต้อง. กรุณาไปที่ "ตั้งค่า" > "เริ่มการทดสอบระบบ"');
        else alert(`Error updating sale: ${formatSupabaseError(error)}`);
    } else if (updatedSale) {
        if (originalSale) {
            // Revert
            if (originalSale.items) {
                for (const item of originalSale.items) await updateInventoryCount(item.brand, item.size, item.quantity);
            } else await updateInventoryCount(originalSale.tank_brand, originalSale.tank_size, originalSale.quantity);
            // Apply New
            if (updatedSale.items) {
                for (const item of updatedSale.items) await updateInventoryCount(item.brand, item.size, -item.quantity);
            } else await updateInventoryCount(updatedSale.tank_brand, updatedSale.tank_size, -updatedSale.quantity);
        }
        setSales(prev => prev.map(s => s.id === data.id ? updatedSale : s));
    }
  };
  const deleteSale = async (id: string) => {
     if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการขายนี้?')) {
        const saleToDelete = sales.find(s => s.id === id);
        if (saleToDelete) {
            const { error } = await supabaseClient.from('sales').delete().eq('id', id);
            if (error) alert(`Error deleting sale: ${formatSupabaseError(error)}`);
            else {
                if (saleToDelete.items) {
                    for (const item of saleToDelete.items) await updateInventoryCount(item.brand, item.size, item.quantity);
                } else await updateInventoryCount(saleToDelete.tank_brand, saleToDelete.tank_size, saleToDelete.quantity);
                setSales(prev => prev.filter(s => s.id !== id));
            }
        }
    }
  };

  const addExpense = async (data: Omit<Expense, 'id'>) => {
    try {
        const safeData = JSON.parse(JSON.stringify(data));
        const { data: newExpense, error } = await supabaseClient.from('expenses').insert(safeData).select().single();
        if (error) {
            if (error.code === '42703') alert('โครงสร้างฐานข้อมูลไม่ถูกต้อง. กรุณาไปที่ "ตั้งค่า" > "เริ่มการทดสอบระบบ"');
            else alert(`บันทึกรายจ่ายไม่สำเร็จ: ${formatSupabaseError(error)}`);
        } else if (newExpense) {
            setExpenses(prev => [newExpense, ...prev]);
            if (newExpense.refill_details) {
                for (const item of newExpense.refill_details) await updateInventoryCount(item.brand, item.size, item.quantity);
            }
        }
    } catch (e) { alert(`เกิดข้อผิดพลาด: ${formatSupabaseError(e)}`); }
  };
  const updateExpense = async (data: Expense) => {
    try {
        const originalExpense = expenses.find(e => e.id === data.id);
        const { id, created_at, ...updateData } = data;
        const safeData = JSON.parse(JSON.stringify(updateData));
        const { data: updatedExpense, error } = await supabaseClient.from('expenses').update(safeData).eq('id', id).select().single();
         if (error) {
            if (error.code === '42703') alert('โครงสร้างฐานข้อมูลไม่ถูกต้อง. กรุณาไปที่ "ตั้งค่า" > "เริ่มการทดสอบระบบ"');
            else alert(`แก้ไขรายจ่ายไม่สำเร็จ: ${formatSupabaseError(error)}`);
        } else if (updatedExpense) {
            if (originalExpense?.refill_details) {
                for (const item of originalExpense.refill_details) await updateInventoryCount(item.brand, item.size, -item.quantity);
            }
            if (updatedExpense.refill_details) {
                for (const item of updatedExpense.refill_details) await updateInventoryCount(item.brand, item.size, item.quantity);
            }
            setExpenses(prev => prev.map(e => e.id === data.id ? updatedExpense : e));
        }
    } catch (e) { alert(`เกิดข้อผิดพลาด: ${formatSupabaseError(e)}`); }
  };
  const deleteExpense = async (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการจ่ายนี้?')) {
        const expenseToDelete = expenses.find(e => e.id === id);
        if (expenseToDelete) {
            const { error } = await supabaseClient.from('expenses').delete().eq('id', id);
            if (error) alert(`Error deleting expense: ${formatSupabaseError(error)}`);
            else {
                if (expenseToDelete.refill_details) {
                    for (const item of expenseToDelete.refill_details) await updateInventoryCount(item.brand, item.size, -item.quantity);
                }
                setExpenses(prev => prev.filter(e => e.id !== id));
            }
        }
    }
  };
  
  const addInventoryItem = async (data: Omit<InventoryItem, 'id'>) => {
     const safeData = { ...data, tank_brand: data.tank_brand || null, tank_size: data.tank_size || null };
     const sanitizedData = JSON.parse(JSON.stringify(safeData));
     const { data: newItem, error } = await supabaseClient.from('inventory').insert(sanitizedData).select().single();
     if (error) {
        if (error.code === '42703') alert('โครงสร้างฐานข้อมูลไม่ถูกต้อง. กรุณาไปที่ "ตั้งค่า" > "เริ่มการทดสอบระบบ"');
        else alert(`Error adding inventory: ${formatSupabaseError(error)}`);
     } else if (newItem) setInventory(prev => [newItem, ...prev]);
  };
  const updateInventoryItem = async (data: InventoryItem) => {
      const { id, created_at, ...updateData } = data;
      const sanitizedData = JSON.parse(JSON.stringify(updateData));
      const { data: updatedItem, error } = await supabaseClient.from('inventory').update(sanitizedData).eq('id', id).select().single();
      if (error) {
        if (error.code === '42703') alert('โครงสร้างฐานข้อมูลไม่ถูกต้อง. กรุณาไปที่ "ตั้งค่า" > "เริ่มการทดสอบระบบ"');
        else alert(`Error updating inventory: ${formatSupabaseError(error)}`);
      } else if (updatedItem) setInventory(prev => prev.map(i => i.id === data.id ? updatedItem : i));
  };
  const deleteInventoryItem = async (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสต็อกสินค้านี้?')) {
        const { error } = await supabaseClient.from('inventory').delete().eq('id', id);
        if (error) alert(`Error deleting inventory: ${formatSupabaseError(error)}`);
        else setInventory(prev => prev.filter(i => i.id !== id));
    }
  };

  // --- SUMMARIES ---

  const lowStockItems = useMemo(() => {
    return inventory.filter(item => {
        const currentStock = item.full; // We generally track full tanks for stock alerts
        return item.low_stock_threshold !== undefined && item.low_stock_threshold !== null && currentStock <= item.low_stock_threshold;
    });
  }, [inventory]);

  const dailySummary = useMemo(() => {
    const dateSales = sales.filter(s => isSameDay(s.date, reportDate));
    const income = dateSales.reduce((acc, s) => acc + s.total_amount, 0);
    
    // Profit here is Gross Profit (Sales - Cost of Goods Sold)
    const profit = dateSales.reduce((acc, s) => {
        let saleProfit = 0;
        // Multi-item
        if (s.items && Array.isArray(s.items) && s.items.length > 0) {
            saleProfit = s.items.reduce((itemAcc, item) => {
                const cost = item.cost_price || getStandardCost(item.brand, item.size);
                return itemAcc + (item.total_price - (cost * item.quantity));
            }, 0);
        } else {
            const cost = s.cost_price || getStandardCost(s.tank_brand, s.tank_size);
            saleProfit = s.total_amount - (cost * s.quantity);
        }
        // Deduct Gas Return Cost
        if (s.gas_return_kg && s.gas_return_price) {
             saleProfit -= (s.gas_return_kg * s.gas_return_price);
        }
        return acc + saleProfit;
    }, 0);

    const cashIncome = dateSales.filter(s => s.payment_method === PaymentMethod.CASH).reduce((acc, s) => acc + s.total_amount, 0);
    const transferIncome = dateSales.filter(s => s.payment_method === PaymentMethod.TRANSFER).reduce((acc, s) => acc + s.total_amount, 0);
    const creditIncome = dateSales.filter(s => s.payment_method === PaymentMethod.CREDIT).reduce((acc, s) => acc + s.total_amount, 0);
    
    const dateExpenses = expenses.filter(e => isSameDay(e.date, reportDate));
    const expense = dateExpenses.reduce((acc, e) => acc + e.amount, 0);
    
    // CHANGED: Do NOT subtract expense from profit (Requested: Gross Profit only)
    // const netProfit = profit - expense; 

    const salesByCustomerMap = dateSales.reduce((acc, sale) => {
        const customer = getCustomerById(sale.customer_id);
        const customerName = customer ? `${customer.name} ${customer.branch ? '(' + customer.branch + ')' : ''}` : 'ลูกค้าทั่วไป';
        if (!acc.get(sale.customer_id)) {
            acc.set(sale.customer_id, { customerId: sale.customer_id, customerName, totalAmount: 0 });
        }
        acc.get(sale.customer_id)!.totalAmount += sale.total_amount;
        return acc;
    }, new Map<string, { customerId: string; customerName: string; totalAmount: number }>());

    const salesByCustomer = (Array.from(salesByCustomerMap.values()) as { customerId: string; customerName: string; totalAmount: number }[]).sort((a, b) => b.totalAmount - a.totalAmount);

    // New: Refill Summary for Daily
    const refillMap = new Map<string, RefillSummary>();
      dateExpenses.forEach(e => {
          const isCredit = e.payment_method === PaymentMethod.CREDIT;
          if (e.refill_details) {
              e.refill_details.forEach(item => {
                  const key = `${item.brand} ${item.size}`;
                  if (!refillMap.has(key)) refillMap.set(key, { size: key, count: 0, cashCount: 0, creditCount: 0, cost: 0 });
                  const r = refillMap.get(key)!;
                  r.count += item.quantity;
                  if (isCredit) r.creditCount += item.quantity;
                  else r.cashCount += item.quantity;
              });
          }
          // Legacy support
          if (e.refill_tank_brand && e.refill_tank_size) {
               const key = `${e.refill_tank_brand} ${e.refill_tank_size}`;
               if (!refillMap.has(key)) refillMap.set(key, { size: key, count: 0, cashCount: 0, creditCount: 0, cost: 0 });
               const r = refillMap.get(key)!;
               const qty = e.refill_quantity || 0;
               r.count += qty;
               if (isCredit) r.creditCount += qty;
               else r.cashCount += qty;
          }
      });
      const refillStats = Array.from(refillMap.values());

    return { income, expense, profit: profit, cashIncome, transferIncome, creditIncome, salesByCustomer, refillStats };
  }, [sales, expenses, reportDate, customers, inventory]);

  const monthlySummary = useMemo(() => {
      const monthSales = sales.filter(s => isSameMonth(s.date, reportDate));
      const monthExpenses = expenses.filter(e => isSameMonth(e.date, reportDate));

      const income = monthSales.reduce((acc, s) => acc + s.total_amount, 0);
      const expense = monthExpenses.reduce((acc, e) => acc + e.amount, 0);
      
      const grossProfit = monthSales.reduce((acc, s) => {
        let saleProfit = 0;
        if (s.items && Array.isArray(s.items) && s.items.length > 0) {
            saleProfit = s.items.reduce((itemAcc, item) => {
                const cost = item.cost_price || getStandardCost(item.brand, item.size);
                return itemAcc + (item.total_price - (cost * item.quantity));
            }, 0);
        } else {
            const cost = s.cost_price || getStandardCost(s.tank_brand, s.tank_size);
            saleProfit = s.total_amount - (cost * s.quantity);
        }
        if (s.gas_return_kg && s.gas_return_price) {
             saleProfit -= (s.gas_return_kg * s.gas_return_price);
        }
        return acc + saleProfit;
      }, 0);
      
      // Customer Monthly Stats
      const custMap = new Map<string, { id: string, name: string, branch: string, tanks: number, total: number, profit: number }>();
      
      monthSales.forEach(s => {
          if (!custMap.has(s.customer_id)) {
              const c = getCustomerById(s.customer_id);
              custMap.set(s.customer_id, { 
                  id: s.customer_id, 
                  name: c?.name || 'Unknown', 
                  branch: c?.branch || '-', 
                  tanks: 0, 
                  total: 0, 
                  profit: 0 
              });
          }
          const entry = custMap.get(s.customer_id)!;
          entry.tanks += s.quantity;
          entry.total += s.total_amount;
          
          let currentSaleProfit = 0;
          if (s.items && Array.isArray(s.items) && s.items.length > 0) {
              currentSaleProfit = s.items.reduce((itemAcc, item) => {
                  const cost = item.cost_price || getStandardCost(item.brand, item.size);
                  return itemAcc + (item.total_price - (cost * item.quantity));
              }, 0);
          } else {
              const cost = s.cost_price || getStandardCost(s.tank_brand, s.tank_size);
              currentSaleProfit = (s.total_amount - (cost * s.quantity));
          }
          if (s.gas_return_kg && s.gas_return_price) {
              currentSaleProfit -= (s.gas_return_kg * s.gas_return_price);
          }
          entry.profit += currentSaleProfit;
      });
      const customerStats = Array.from(custMap.values()).sort((a, b) => b.total - a.total);

      // Top Customers for Chart
      const topCustomers: CustomerSalesStat[] = customerStats.slice(0, 5).map(c => ({
          id: c.id,
          name: c.name,
          branch: c.branch,
          totalSales: c.total,
          totalProfit: c.profit
      }));

      // Gas Return
      const gasReturnKg = monthExpenses.reduce((acc, e) => acc + (e.gas_return_kg || 0), 0);
      const gasReturnValue = monthExpenses.reduce((acc, e) => acc + (e.gas_return_amount || 0), 0);

      // Refill Stats with Cash/Credit Split (Expenses)
      const refillMap = new Map<string, RefillSummary>();
      monthExpenses.forEach(e => {
          const isCredit = e.payment_method === PaymentMethod.CREDIT;
          if (e.refill_details) {
              e.refill_details.forEach(item => {
                  const key = `${item.brand} ${item.size}`;
                  if (!refillMap.has(key)) refillMap.set(key, { size: key, count: 0, cashCount: 0, creditCount: 0, cost: 0 });
                  const r = refillMap.get(key)!;
                  r.count += item.quantity;
                  if (isCredit) r.creditCount += item.quantity;
                  else r.cashCount += item.quantity;
              });
          }
          // Legacy support
          if (e.refill_tank_brand && e.refill_tank_size) {
               const key = `${e.refill_tank_brand} ${e.refill_tank_size}`;
               if (!refillMap.has(key)) refillMap.set(key, { size: key, count: 0, cashCount: 0, creditCount: 0, cost: 0 });
               const r = refillMap.get(key)!;
               const qty = e.refill_quantity || 0;
               r.count += qty;
               if (isCredit) r.creditCount += qty;
               else r.cashCount += qty;
          }
      });
      const refillStats = Array.from(refillMap.values());

      // Sales Stats by Size and Payment Method
      const salesStatsMap = new Map<string, SalesSummary>();
      monthSales.forEach(s => {
          const isCredit = s.payment_method === PaymentMethod.CREDIT;
          const isTaxInvoice = s.invoice_type === InvoiceType.TAX_INVOICE;
          
          if (s.items && Array.isArray(s.items) && s.items.length > 0) {
              s.items.forEach(item => {
                  const key = `${item.brand} ${item.size}`;
                  if (!salesStatsMap.has(key)) salesStatsMap.set(key, { size: key, count: 0, cashTransferCount: 0, creditCount: 0, taxInvoiceCount: 0 });
                  const stat = salesStatsMap.get(key)!;
                  stat.count += item.quantity;
                  if (isCredit) stat.creditCount += item.quantity;
                  else stat.cashTransferCount += item.quantity;
                  
                  if (isTaxInvoice) stat.taxInvoiceCount += item.quantity;
              });
          } else {
               // Legacy
               const key = `${s.tank_brand} ${s.tank_size}`;
               if (!salesStatsMap.has(key)) salesStatsMap.set(key, { size: key, count: 0, cashTransferCount: 0, creditCount: 0, taxInvoiceCount: 0 });
               const stat = salesStatsMap.get(key)!;
               stat.count += s.quantity;
               if (isCredit) stat.creditCount += s.quantity;
               else stat.cashTransferCount += s.quantity;

               if (isTaxInvoice) stat.taxInvoiceCount += s.quantity;
          }
      });
      const salesStats = Array.from(salesStatsMap.values());

      // Expense Breakdown with Cash/Credit
      const expenseBreakdownMap = new Map<string, ExpenseBreakdown>();

      monthExpenses.forEach(e => {
        const type = e.type || 'อื่นๆ';
        if (!expenseBreakdownMap.has(type)) {
            expenseBreakdownMap.set(type, { type, count: 0, totalAmount: 0, cashAmount: 0, creditAmount: 0, totalGasQty: 0 });
        }
        const entry = expenseBreakdownMap.get(type)!;
        entry.count += 1;
        entry.totalAmount += e.amount;
        
        if (e.payment_method === PaymentMethod.CREDIT) entry.creditAmount += e.amount;
        else entry.cashAmount += e.amount;

        if (e.refill_details && Array.isArray(e.refill_details)) {
            const qty = e.refill_details.reduce((sum, item) => sum + (item.quantity || 0), 0);
            entry.totalGasQty += qty;
        }
      });
      const expenseBreakdown = Array.from(expenseBreakdownMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

      return { income, expense, profit: grossProfit, customerStats, gasReturnKg, gasReturnValue, refillStats, salesStats, expenseBreakdown, topCustomers };
  }, [sales, expenses, reportDate, customers, inventory]);

  const value = {
    loading, customers, sales, expenses, inventory, getCustomerById, reportDate, setReportDate, dailySummary, monthlySummary,
    addCustomer, updateCustomer, deleteCustomer,
    addSale, updateSale, deleteSale,
    addExpense, updateExpense, deleteExpense,
    addInventoryItem, updateInventoryItem, deleteInventoryItem,
    companyInfo, updateCompanyInfo, lowStockItems
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useAppContext = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppProvider');
  }
  return context;
};
