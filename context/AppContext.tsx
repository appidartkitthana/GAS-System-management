import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Customer, Sale, Expense, InventoryItem, ExpenseType, Brand, Size, PaymentMethod } from '../types';
import { supabaseClient } from '../lib/supabaseClient';
import { formatSupabaseError } from '../lib/utils';

interface AppContextType {
  loading: boolean;
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  inventory: InventoryItem[];
  getCustomerById: (id: string) => Customer | undefined;
  reportDate: Date;
  setReportDate: (date: Date) => void;
  reportSummary: {
    income: number;
    expense: number;
    profit: number;
    cashIncome: number;
    transferIncome: number;
    creditIncome: number;
    salesByCustomer: { customerId: string; customerName: string; totalAmount: number }[];
  };
  totalSummary: { income: number; expense: number; profit: number };
  
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

  // --- Inventory Helpers ---
  const updateInventoryCount = async (brand: Brand, size: Size, quantityChange: number) => {
    const item = inventory.find(i => i.tank_brand === brand && i.tank_size === size);
    if (!item) return;

    const newFullCount = item.full + quantityChange;
    const { data: updatedItem, error } = await supabaseClient
      .from('inventory')
      .update({ full: newFullCount })
      .eq('id', item.id)
      .select()
      .single();

    if (error) {
      console.error("Failed to update inventory", error);
      alert(`เกิดข้อผิดพลาดในการอัปเดตสต็อก: ${formatSupabaseError(error)}`);
    } else {
      setInventory(prev => prev.map(i => i.id === item.id ? updatedItem : i));
    }
  };


  // --- CRUD Functions ---

  // Customer
  const addCustomer = async (data: Omit<Customer, 'id'>) => {
    const { data: newCustomer, error } = await supabaseClient.from('customers').insert(data).select().single();
    if (error) {
      console.error("Error adding customer:", error);
      alert(`เกิดข้อผิดพลาดในการเพิ่มลูกค้า: ${formatSupabaseError(error)}`);
    } else if (newCustomer) {
      setCustomers(prev => [newCustomer, ...prev]);
    }
  };
  const updateCustomer = async (data: Customer) => {
    const { id, created_at, ...updateData } = data;
    const { data: updatedCustomer, error } = await supabaseClient.from('customers').update(updateData).eq('id', id).select().single();
    if (error) {
      console.error("Error updating customer:", error);
      alert(`เกิดข้อผิดพลาดในการแก้ไขลูกค้า: ${formatSupabaseError(error)}`);
    } else if (updatedCustomer) {
      setCustomers(prev => prev.map(c => c.id === data.id ? updatedCustomer : c));
    }
  };
  const deleteCustomer = async (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้ารายนี้?')) {
      const { error } = await supabaseClient.from('customers').delete().eq('id', id);
      if (error) {
        console.error("Error deleting customer:", error);
        alert(`เกิดข้อผิดพลาดในการลบลูกค้า: ${formatSupabaseError(error)}`);
      } else {
        setCustomers(prev => prev.filter(c => c.id !== id));
      }
    }
  };

  // Sale
  const addSale = async (data: Omit<Sale, 'id'>) => {
    const { data: newSale, error } = await supabaseClient.from('sales').insert(data).select().single();
    if (error) {
        console.error("Error adding sale:", error);
        alert(`เกิดข้อผิดพลาดในการเพิ่มรายการขาย: ${formatSupabaseError(error)}`);
    } else if (newSale) {
        setSales(prev => [newSale, ...prev]);
        await updateInventoryCount(newSale.tank_brand, newSale.tank_size, -newSale.quantity);
    }
  };
  const updateSale = async (data: Sale) => {
    const originalSale = sales.find(s => s.id === data.id);
    const { id, created_at, ...updateData } = data;
    const { data: updatedSale, error } = await supabaseClient.from('sales').update(updateData).eq('id', id).select().single();
     if (error) {
        console.error("Error updating sale:", error);
        alert(`เกิดข้อผิดพลาดในการแก้ไขรายการขาย: ${formatSupabaseError(error)}`);
    } else if (updatedSale) {
        if (originalSale) {
             // Revert old inventory count if tank/quantity changed
            if (originalSale.tank_brand !== updatedSale.tank_brand || originalSale.tank_size !== updatedSale.tank_size || originalSale.quantity !== updatedSale.quantity) {
                await updateInventoryCount(originalSale.tank_brand, originalSale.tank_size, originalSale.quantity); // Revert
                await updateInventoryCount(updatedSale.tank_brand, updatedSale.tank_size, -updatedSale.quantity); // Apply new
            }
        }
        setSales(prev => prev.map(s => s.id === data.id ? updatedSale : s));
    }
  };
  const deleteSale = async (id: string) => {
     if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการขายนี้?')) {
        const saleToDelete = sales.find(s => s.id === id);
        if (saleToDelete) {
            const { error } = await supabaseClient.from('sales').delete().eq('id', id);
            if (error) {
                console.error("Error deleting sale:", error);
                alert(`เกิดข้อผิดพลาดในการลบรายการขาย: ${formatSupabaseError(error)}`);
            } else {
                await updateInventoryCount(saleToDelete.tank_brand, saleToDelete.tank_size, saleToDelete.quantity);
                setSales(prev => prev.filter(s => s.id !== id));
            }
        }
    }
  };

  // Expense
  const addExpense = async (data: Omit<Expense, 'id'>) => {
    const { data: newExpense, error } = await supabaseClient.from('expenses').insert(data).select().single();
    if (error) {
        console.error("Error adding expense:", error);
        alert(`เกิดข้อผิดพลาดในการเพิ่มรายจ่าย: ${formatSupabaseError(error)}`);
    } else if (newExpense) {
        setExpenses(prev => [newExpense, ...prev]);
        if (newExpense.refill_tank_brand && newExpense.refill_tank_size && newExpense.refill_quantity) {
            await updateInventoryCount(newExpense.refill_tank_brand, newExpense.refill_tank_size, newExpense.refill_quantity);
        }
    }
  };
  const updateExpense = async (data: Expense) => {
    const originalExpense = expenses.find(e => e.id === data.id);
    const { id, created_at, ...updateData } = data;
    const { data: updatedExpense, error } = await supabaseClient.from('expenses').update(updateData).eq('id', id).select().single();
     if (error) {
        console.error("Error updating expense:", error);
        alert(`เกิดข้อผิดพลาดในการแก้ไขรายจ่าย: ${formatSupabaseError(error)}`);
    } else if (updatedExpense) {
        if (originalExpense?.refill_quantity) {
            await updateInventoryCount(originalExpense.refill_tank_brand!, originalExpense.refill_tank_size!, -originalExpense.refill_quantity);
        }
        if (updatedExpense.refill_quantity) {
            await updateInventoryCount(updatedExpense.refill_tank_brand!, updatedExpense.refill_tank_size!, updatedExpense.refill_quantity);
        }
        setExpenses(prev => prev.map(e => e.id === data.id ? updatedExpense : e));
    }
  };
  const deleteExpense = async (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการจ่ายนี้?')) {
        const expenseToDelete = expenses.find(e => e.id === id);
        if (expenseToDelete) {
            const { error } = await supabaseClient.from('expenses').delete().eq('id', id);
            if (error) {
                 console.error("Error deleting expense:", error);
                 alert(`เกิดข้อผิดพลาดในการลบรายจ่าย: ${formatSupabaseError(error)}`);
            } else {
                if (expenseToDelete.refill_quantity) {
                    await updateInventoryCount(expenseToDelete.refill_tank_brand!, expenseToDelete.refill_tank_size!, -expenseToDelete.refill_quantity);
                }
                setExpenses(prev => prev.filter(e => e.id !== id));
            }
        }
    }
  };
  
  // Inventory
  const addInventoryItem = async (data: Omit<InventoryItem, 'id'>) => {
    const existing = inventory.find(i => i.tank_brand === data.tank_brand && i.tank_size === data.tank_size);
    if (existing) {
        alert(`สต็อกสำหรับ ${data.tank_brand} ${data.tank_size} มีอยู่แล้วในระบบ`);
        return;
    }
     const { data: newItem, error } = await supabaseClient.from('inventory').insert(data).select().single();
     if (error) {
        console.error("Error adding inventory item:", error);
        alert(`เกิดข้อผิดพลาดในการเพิ่มสต็อก: ${formatSupabaseError(error)}`);
     } else if (newItem) {
        setInventory(prev => [newItem, ...prev]);
     }
  };
  const updateInventoryItem = async (data: InventoryItem) => {
      const existing = inventory.find(i => i.id !== data.id && i.tank_brand === data.tank_brand && i.tank_size === data.tank_size);
      if (existing) {
          alert(`สต็อกสำหรับ ${data.tank_brand} ${data.tank_size} มีอยู่แล้วในระบบ`);
          return;
      }
      const { id, created_at, ...updateData } = data;
      const { data: updatedItem, error } = await supabaseClient.from('inventory').update(updateData).eq('id', id).select().single();
      if (error) {
        console.error("Error updating inventory item:", error);
        alert(`เกิดข้อผิดพลาดในการแก้ไขสต็อก: ${formatSupabaseError(error)}`);
      } else if (updatedItem) {
        setInventory(prev => prev.map(i => i.id === data.id ? updatedItem : i));
      }
  };
  const deleteInventoryItem = async (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสต็อกสินค้านี้?')) {
        const { error } = await supabaseClient.from('inventory').delete().eq('id', id);
        if (error) {
            console.error("Error deleting inventory item:", error);
            alert(`เกิดข้อผิดพลาดในการลบสต็อก: ${formatSupabaseError(error)}`);
        } else {
            setInventory(prev => prev.filter(i => i.id !== id));
        }
    }
  };

  // --- Memos for Summaries ---
  const isSameDay = (dateString: string, targetDate: Date) => {
    const date = new Date(dateString);
    return date.getDate() === targetDate.getDate() &&
           date.getMonth() === targetDate.getMonth() &&
           date.getFullYear() === targetDate.getFullYear();
  };

  const reportSummary = useMemo(() => {
    const dateSales = sales.filter(s => isSameDay(s.date, reportDate));
    const income = dateSales.reduce((acc, s) => acc + s.total_amount, 0);
    const cashIncome = dateSales.filter(s => s.payment_method === PaymentMethod.CASH).reduce((acc, s) => acc + s.total_amount, 0);
    const transferIncome = dateSales.filter(s => s.payment_method === PaymentMethod.TRANSFER).reduce((acc, s) => acc + s.total_amount, 0);
    const creditIncome = dateSales.filter(s => s.payment_method === PaymentMethod.CREDIT).reduce((acc, s) => acc + s.total_amount, 0);
    
    const expense = expenses.filter(e => isSameDay(e.date, reportDate)).reduce((acc, e) => acc + e.amount, 0);
    
    const salesByCustomerMap = dateSales.reduce((acc, sale) => {
        const customer = getCustomerById(sale.customer_id);
        const customerName = customer ? `${customer.name} (${customer.branch})` : 'ลูกค้าทั่วไป';
        
        const existingEntry = acc.get(sale.customer_id);
        
        if (existingEntry) {
            existingEntry.totalAmount += sale.total_amount;
        } else {
            acc.set(sale.customer_id, {
                customerId: sale.customer_id,
                customerName: customerName,
                totalAmount: sale.total_amount,
            });
        }
        return acc;
    }, new Map<string, { customerId: string; customerName: string; totalAmount: number }>());

    const salesByCustomer = Array.from(salesByCustomerMap.values())
        .sort((a, b) => b.totalAmount - a.totalAmount);

    return { income, expense, profit: income - expense, cashIncome, transferIncome, creditIncome, salesByCustomer };
  }, [sales, expenses, reportDate, customers]);

  const totalSummary = useMemo(() => {
    const income = sales.reduce((acc, s) => acc + s.total_amount, 0);
    const expense = expenses.reduce((acc, e) => acc + e.amount, 0);
    return { income, expense, profit: income - expense };
  }, [sales, expenses]);

  const value = {
    loading, customers, sales, expenses, inventory, getCustomerById, reportDate, setReportDate, reportSummary, totalSummary,
    addCustomer, updateCustomer, deleteCustomer,
    addSale, updateSale, deleteSale,
    addExpense, updateExpense, deleteExpense,
    addInventoryItem, updateInventoryItem, deleteInventoryItem,
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
