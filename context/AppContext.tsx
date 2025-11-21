
import React, { createContext, useContext, useState, useMemo, useEffect } from 'react';
import { Customer, Sale, Expense, InventoryItem, Brand, Size, PaymentMethod, BorrowedTank, InventoryCategory, ExpenseType, SaleItem } from '../types';
import { supabaseClient } from '../lib/supabaseClient';
import { formatSupabaseError, isSameDay, isSameMonth } from '../lib/utils';

interface AppContextType {
  loading: boolean;
  customers: Customer[];
  sales: Sale[];
  expenses: Expense[];
  inventory: InventoryItem[];
  getCustomerById: (id: string) => Customer | undefined;
  reportDate: Date;
  setReportDate: (date: Date) => void;
  
  // Summaries
  dailySummary: {
    income: number;
    expense: number;
    profit: number;
    cashIncome: number;
    transferIncome: number;
    creditIncome: number;
    salesByCustomer: { customerId: string; customerName: string; totalAmount: number }[];
  };
  monthlySummary: {
    income: number;
    expense: number;
    profit: number;
    customerStats: { id: string; name: string; branch: string; tanks: number; total: number; profit: number }[];
    gasReturnKg: number;
    gasReturnValue: number;
    refillStats: { size: string; count: number; cost: number }[];
    expenseBreakdown: { type: string; count: number; totalAmount: number; totalGasQty: number }[];
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
  
  // Helper to find cost price for a tank
  const getStandardCost = (brand: Brand, size: Size): number => {
      const item = inventory.find(i => i.tank_brand === brand && i.tank_size === size);
      return item?.cost_price || 0;
  }

  const updateInventoryCount = async (brand: Brand, size: Size, quantityChange: number) => {
    // Only update GAS inventory
    const item = inventory.find(i => i.tank_brand === brand && i.tank_size === size);
    // If item doesn't exist in inventory yet, ignore.
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

  // Sync Borrowed Tanks to Inventory "On Loan"
  const syncInventoryLoans = async (oldBorrowed: BorrowedTank[] | undefined, newBorrowed: BorrowedTank[]) => {
      const changes: { brand: Brand, size: Size, delta: number }[] = [];

      // Subtract old
      oldBorrowed?.forEach(b => {
          changes.push({ brand: b.brand, size: b.size, delta: -b.quantity });
      });
      // Add new
      newBorrowed.forEach(b => {
          changes.push({ brand: b.brand, size: b.size, delta: b.quantity });
      });

      // Consolidate changes
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
             const { data, error } = await supabaseClient.from('inventory').update({ on_loan: newLoan }).eq('id', item.id).select().single();
             if (!error && data) {
                 setInventory(prev => prev.map(i => i.id === item.id ? data : i));
             }
          }
      }
  };

  // --- CRUD Functions ---

  // Customer
  const addCustomer = async (data: Omit<Customer, 'id'>) => {
    const { data: newCustomer, error } = await supabaseClient.from('customers').insert(data).select().single();
    if (error) {
      alert(`Error adding customer: ${formatSupabaseError(error)}`);
    } else if (newCustomer) {
      setCustomers(prev => [newCustomer, ...prev]);
      if (newCustomer.borrowed_tanks) {
          await syncInventoryLoans([], newCustomer.borrowed_tanks);
      }
    }
  };
  const updateCustomer = async (data: Customer) => {
    const oldCustomer = customers.find(c => c.id === data.id);
    const { id, created_at, ...updateData } = data;
    const { data: updatedCustomer, error } = await supabaseClient.from('customers').update(updateData).eq('id', id).select().single();
    if (error) {
      alert(`Error updating customer: ${formatSupabaseError(error)}`);
    } else if (updatedCustomer) {
      setCustomers(prev => prev.map(c => c.id === data.id ? updatedCustomer : c));
      await syncInventoryLoans(oldCustomer?.borrowed_tanks, updatedCustomer.borrowed_tanks || []);
    }
  };
  const deleteCustomer = async (id: string) => {
    // Check if customer has sales before deleting
    const hasSales = sales.some(s => s.customer_id === id);
    if (hasSales) {
        alert('ไม่สามารถลบลูกค้ารายนี้ได้ เนื่องจากมีประวัติการซื้อขายในระบบ กรุณาลบรายการขายที่เกี่ยวข้องก่อน');
        return;
    }

    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบลูกค้ารายนี้?')) {
      const customerToDelete = customers.find(c => c.id === id);
      const { error } = await supabaseClient.from('customers').delete().eq('id', id);
      if (error) {
        alert(`Error deleting customer: ${formatSupabaseError(error)}`);
      } else {
        setCustomers(prev => prev.filter(c => c.id !== id));
        if (customerToDelete?.borrowed_tanks) {
            await syncInventoryLoans(customerToDelete.borrowed_tanks, []);
        }
      }
    }
  };

  // Sale
  const addSale = async (data: Omit<Sale, 'id'>) => {
    try {
        // Prepare safe data (sanitize)
        const safeData = JSON.parse(JSON.stringify(data));
        
        // Handle Cost Injection for Multi-items
        if (safeData.items && Array.isArray(safeData.items)) {
            safeData.items = safeData.items.map((item: SaleItem) => ({
                ...item,
                cost_price: item.cost_price || getStandardCost(item.brand, item.size)
            }));
        } else {
            // Fallback for single item legacy structure
            safeData.cost_price = safeData.cost_price || getStandardCost(safeData.tank_brand, safeData.tank_size);
        }

        const { data: newSale, error } = await supabaseClient.from('sales').insert(safeData).select().single();
        if (error) {
            if (error.code === '42703') {
                alert('ไม่สามารถบันทึกได้เนื่องจากโครงสร้างฐานข้อมูลยังไม่อัปเดต (ไม่พบคอลัมน์ items)\n\nกรุณาไปที่หน้า "ตั้งค่า" แล้วกด "เริ่มการทดสอบระบบ" เพื่อซ่อมแซมฐานข้อมูล');
            } else {
                alert(`Error adding sale: ${formatSupabaseError(error)}`);
            }
        } else if (newSale) {
            setSales(prev => [newSale, ...prev]);
            // Deduct Inventory
            if (newSale.items && Array.isArray(newSale.items)) {
                for (const item of newSale.items) {
                    await updateInventoryCount(item.brand, item.size, -item.quantity);
                }
            } else {
                // Legacy
                await updateInventoryCount(newSale.tank_brand, newSale.tank_size, -newSale.quantity);
            }
        }
    } catch (e) {
        console.error(e);
        alert(`Error: ${formatSupabaseError(e)}`);
    }
  };

  const updateSale = async (data: Sale) => {
    const originalSale = sales.find(s => s.id === data.id);
    const { id, created_at, ...updateData } = data;
    const safeData = JSON.parse(JSON.stringify(updateData));

    const { data: updatedSale, error } = await supabaseClient.from('sales').update(safeData).eq('id', id).select().single();
     if (error) {
        if (error.code === '42703') {
            alert('ไม่สามารถบันทึกได้เนื่องจากโครงสร้างฐานข้อมูลยังไม่อัปเดต\n\nกรุณาไปที่หน้า "ตั้งค่า" แล้วกด "เริ่มการทดสอบระบบ" เพื่อซ่อมแซมฐานข้อมูล');
        } else {
            alert(`Error updating sale: ${formatSupabaseError(error)}`);
        }
    } else if (updatedSale) {
        if (originalSale) {
            // Revert Original Inventory
            if (originalSale.items && Array.isArray(originalSale.items)) {
                for (const item of originalSale.items) {
                    await updateInventoryCount(item.brand, item.size, item.quantity);
                }
            } else {
                await updateInventoryCount(originalSale.tank_brand, originalSale.tank_size, originalSale.quantity);
            }

            // Deduct New Inventory
            if (updatedSale.items && Array.isArray(updatedSale.items)) {
                for (const item of updatedSale.items) {
                    await updateInventoryCount(item.brand, item.size, -item.quantity);
                }
            } else {
                await updateInventoryCount(updatedSale.tank_brand, updatedSale.tank_size, -updatedSale.quantity);
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
                alert(`Error deleting sale: ${formatSupabaseError(error)}`);
            } else {
                // Revert Inventory
                if (saleToDelete.items && Array.isArray(saleToDelete.items)) {
                    for (const item of saleToDelete.items) {
                        await updateInventoryCount(item.brand, item.size, item.quantity);
                    }
                } else {
                    await updateInventoryCount(saleToDelete.tank_brand, saleToDelete.tank_size, saleToDelete.quantity);
                }
                setSales(prev => prev.filter(s => s.id !== id));
            }
        }
    }
  };

  // Expense
  const addExpense = async (data: Omit<Expense, 'id'>) => {
    try {
        // Ensure data is sanitized (remove undefined)
        const safeData = JSON.parse(JSON.stringify(data));
        
        const { data: newExpense, error } = await supabaseClient.from('expenses').insert(safeData).select().single();
        if (error) {
            console.error("Expense Add Error:", JSON.stringify(error, null, 2));
            // Explicit check for schema mismatch
            if (error.code === '42703') {
                alert('ไม่สามารถบันทึกได้เนื่องจากโครงสร้างฐานข้อมูลยังไม่อัปเดต (ไม่พบคอลัมน์ที่จำเป็น)\n\nกรุณาไปที่หน้า "ตั้งค่า" แล้วกด "เริ่มการทดสอบระบบ" เพื่อซ่อมแซมฐานข้อมูล');
            } else {
                alert(`บันทึกรายจ่ายไม่สำเร็จ: ${formatSupabaseError(error)}`);
            }
        } else if (newExpense) {
            setExpenses(prev => [newExpense, ...prev]);
            // Handle Inventory Refill Update (If expense is refill)
            if (newExpense.refill_details && Array.isArray(newExpense.refill_details)) {
                for (const item of newExpense.refill_details) {
                    await updateInventoryCount(item.brand, item.size, item.quantity);
                }
            }
        }
    } catch (e) {
        console.error("Unexpected error in addExpense:", e);
        alert(`เกิดข้อผิดพลาดที่ไม่คาดคิด: ${formatSupabaseError(e)}`);
    }
  };
  
  const updateExpense = async (data: Expense) => {
    try {
        const originalExpense = expenses.find(e => e.id === data.id);
        const { id, created_at, ...updateData } = data;
        // Ensure data is sanitized
        const safeData = JSON.parse(JSON.stringify(updateData));

        const { data: updatedExpense, error } = await supabaseClient.from('expenses').update(safeData).eq('id', id).select().single();
         if (error) {
            console.error("Expense Update Error:", JSON.stringify(error, null, 2));
            if (error.code === '42703') {
                alert('ไม่สามารถบันทึกได้เนื่องจากโครงสร้างฐานข้อมูลยังไม่อัปเดต\n\nกรุณาไปที่หน้า "ตั้งค่า" แล้วกด "เริ่มการทดสอบระบบ" เพื่อซ่อมแซมฐานข้อมูล');
            } else {
                alert(`แก้ไขรายจ่ายไม่สำเร็จ: ${formatSupabaseError(error)}`);
            }
        } else if (updatedExpense) {
            // Revert old stock add
            if (originalExpense?.refill_details) {
                for (const item of originalExpense.refill_details) {
                     await updateInventoryCount(item.brand, item.size, -item.quantity);
                }
            }
            // Apply new stock add
            if (updatedExpense.refill_details) {
                for (const item of updatedExpense.refill_details) {
                     await updateInventoryCount(item.brand, item.size, item.quantity);
                }
            }
            setExpenses(prev => prev.map(e => e.id === data.id ? updatedExpense : e));
        }
    } catch (e) {
        alert(`เกิดข้อผิดพลาดในการแก้ไข: ${formatSupabaseError(e)}`);
    }
  };
  const deleteExpense = async (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบรายการจ่ายนี้?')) {
        const expenseToDelete = expenses.find(e => e.id === id);
        if (expenseToDelete) {
            const { error } = await supabaseClient.from('expenses').delete().eq('id', id);
            if (error) {
                 alert(`Error deleting expense: ${formatSupabaseError(error)}`);
            } else {
                if (expenseToDelete.refill_details) {
                    for (const item of expenseToDelete.refill_details) {
                        await updateInventoryCount(item.brand, item.size, -item.quantity);
                    }
                }
                setExpenses(prev => prev.filter(e => e.id !== id));
            }
        }
    }
  };
  
  // Inventory
  const addInventoryItem = async (data: Omit<InventoryItem, 'id'>) => {
     // Ensure brand/size are null if not provided (for Accessories)
     const safeData = {
         ...data,
         tank_brand: data.tank_brand || null,
         tank_size: data.tank_size || null
     };
     // Sanitize data
     const sanitizedData = JSON.parse(JSON.stringify(safeData));

     const { data: newItem, error } = await supabaseClient.from('inventory').insert(sanitizedData).select().single();
     if (error) {
        console.error("Inventory Add Error:", JSON.stringify(error, null, 2));
        if (error.code === '42703') {
            alert('ไม่สามารถบันทึกได้เนื่องจากโครงสร้างฐานข้อมูลยังไม่อัปเดต (ไม่พบคอลัมน์ที่จำเป็น)\n\nกรุณาไปที่หน้า "ตั้งค่า" แล้วกด "เริ่มการทดสอบระบบ" เพื่อซ่อมแซมฐานข้อมูล');
        } else {
            alert(`Error adding inventory item: ${formatSupabaseError(error)}`);
        }
     } else if (newItem) {
        setInventory(prev => [newItem, ...prev]);
     }
  };
  const updateInventoryItem = async (data: InventoryItem) => {
      const { id, created_at, ...updateData } = data;
      const sanitizedData = JSON.parse(JSON.stringify(updateData));

      const { data: updatedItem, error } = await supabaseClient.from('inventory').update(sanitizedData).eq('id', id).select().single();
      if (error) {
        console.error("Inventory Update Error:", JSON.stringify(error, null, 2));
        if (error.code === '42703') {
            alert('ไม่สามารถบันทึกได้เนื่องจากโครงสร้างฐานข้อมูลยังไม่อัปเดต (ไม่พบคอลัมน์ที่จำเป็น)\n\nกรุณาไปที่หน้า "ตั้งค่า" แล้วกด "เริ่มการทดสอบระบบ" เพื่อซ่อมแซมฐานข้อมูล');
        } else {
            alert(`Error updating inventory item: ${formatSupabaseError(error)}`);
        }
      } else if (updatedItem) {
        setInventory(prev => prev.map(i => i.id === data.id ? updatedItem : i));
      }
  };
  const deleteInventoryItem = async (id: string) => {
    if (window.confirm('คุณแน่ใจหรือไม่ว่าต้องการลบสต็อกสินค้านี้?')) {
        const { error } = await supabaseClient.from('inventory').delete().eq('id', id);
        if (error) {
            alert(`Error deleting inventory item: ${formatSupabaseError(error)}`);
        } else {
            setInventory(prev => prev.filter(i => i.id !== id));
        }
    }
  };

  // --- SUMMARIES ---

  const dailySummary = useMemo(() => {
    const dateSales = sales.filter(s => isSameDay(s.date, reportDate));
    const income = dateSales.reduce((acc, s) => acc + s.total_amount, 0);
    
    const profit = dateSales.reduce((acc, s) => {
        // Multi-item calculation
        if (s.items && Array.isArray(s.items) && s.items.length > 0) {
            const saleProfit = s.items.reduce((itemAcc, item) => {
                const cost = item.cost_price || getStandardCost(item.brand, item.size);
                return itemAcc + (item.total_price - (cost * item.quantity));
            }, 0);
            return acc + saleProfit;
        }
        // Legacy Calculation
        const cost = s.cost_price || getStandardCost(s.tank_brand, s.tank_size);
        return acc + (s.total_amount - (cost * s.quantity));
    }, 0);

    const cashIncome = dateSales.filter(s => s.payment_method === PaymentMethod.CASH).reduce((acc, s) => acc + s.total_amount, 0);
    const transferIncome = dateSales.filter(s => s.payment_method === PaymentMethod.TRANSFER).reduce((acc, s) => acc + s.total_amount, 0);
    const creditIncome = dateSales.filter(s => s.payment_method === PaymentMethod.CREDIT).reduce((acc, s) => acc + s.total_amount, 0);
    
    const dateExpenses = expenses.filter(e => isSameDay(e.date, reportDate));
    const expense = dateExpenses.reduce((acc, e) => acc + e.amount, 0);
    
    const netProfit = profit - expense;

    const salesByCustomerMap = dateSales.reduce((acc, sale) => {
        const customer = getCustomerById(sale.customer_id);
        const customerName = customer ? `${customer.name} (${customer.branch})` : 'ลูกค้าทั่วไป';
        if (!acc.get(sale.customer_id)) {
            acc.set(sale.customer_id, { customerId: sale.customer_id, customerName, totalAmount: 0 });
        }
        acc.get(sale.customer_id)!.totalAmount += sale.total_amount;
        return acc;
    }, new Map<string, { customerId: string; customerName: string; totalAmount: number }>());

    const salesByCustomer = (Array.from(salesByCustomerMap.values()) as { customerId: string; customerName: string; totalAmount: number }[]).sort((a, b) => b.totalAmount - a.totalAmount);

    return { income, expense, profit: netProfit, cashIncome, transferIncome, creditIncome, salesByCustomer };
  }, [sales, expenses, reportDate, customers, inventory]);

  const monthlySummary = useMemo(() => {
      const monthSales = sales.filter(s => isSameMonth(s.date, reportDate));
      const monthExpenses = expenses.filter(e => isSameMonth(e.date, reportDate));

      const income = monthSales.reduce((acc, s) => acc + s.total_amount, 0);
      const expense = monthExpenses.reduce((acc, e) => acc + e.amount, 0);
      
      const grossProfit = monthSales.reduce((acc, s) => {
        if (s.items && Array.isArray(s.items) && s.items.length > 0) {
            const saleProfit = s.items.reduce((itemAcc, item) => {
                const cost = item.cost_price || getStandardCost(item.brand, item.size);
                return itemAcc + (item.total_price - (cost * item.quantity));
            }, 0);
            return acc + saleProfit;
        }
        const cost = s.cost_price || getStandardCost(s.tank_brand, s.tank_size);
        return acc + (s.total_amount - (cost * s.quantity));
      }, 0);
      const profit = grossProfit - expense;

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
          entry.profit += currentSaleProfit;
      });
      const customerStats = Array.from(custMap.values()).sort((a, b) => b.total - a.total);

      // Gas Return
      const gasReturnKg = monthExpenses.reduce((acc, e) => acc + (e.gas_return_kg || 0), 0);
      const gasReturnValue = monthExpenses.reduce((acc, e) => acc + (e.gas_return_amount || 0), 0);

      // Refill Stats
      const refillMap = new Map<string, { size: string, count: number, cost: number }>();
      monthExpenses.forEach(e => {
          if (e.refill_details) {
              e.refill_details.forEach(item => {
                  const key = `${item.brand} ${item.size}`;
                  if (!refillMap.has(key)) refillMap.set(key, { size: key, count: 0, cost: 0 });
                  const r = refillMap.get(key)!;
                  r.count += item.quantity;
              });
          }
          // Legacy support
          if (e.refill_tank_brand && e.refill_tank_size) {
               const key = `${e.refill_tank_brand} ${e.refill_tank_size}`;
               if (!refillMap.has(key)) refillMap.set(key, { size: key, count: 0, cost: 0 });
               refillMap.get(key)!.count += (e.refill_quantity || 0);
          }
      });
      const refillStats = Array.from(refillMap.values());

      // Expense Breakdown
      const expenseBreakdownMap = new Map<string, { type: string, count: number, totalAmount: number, totalGasQty: number }>();

      monthExpenses.forEach(e => {
        const type = e.type || 'อื่นๆ';
        if (!expenseBreakdownMap.has(type)) {
            expenseBreakdownMap.set(type, { type, count: 0, totalAmount: 0, totalGasQty: 0 });
        }
        const entry = expenseBreakdownMap.get(type)!;
        entry.count += 1;
        entry.totalAmount += e.amount;

        if (e.refill_details && Array.isArray(e.refill_details)) {
            const qty = e.refill_details.reduce((sum, item) => sum + (item.quantity || 0), 0);
            entry.totalGasQty += qty;
        }
      });
      const expenseBreakdown = Array.from(expenseBreakdownMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

      return { income, expense, profit, customerStats, gasReturnKg, gasReturnValue, refillStats, expenseBreakdown };
  }, [sales, expenses, reportDate, customers, inventory]);

  const value = {
    loading, customers, sales, expenses, inventory, getCustomerById, reportDate, setReportDate, dailySummary, monthlySummary,
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
