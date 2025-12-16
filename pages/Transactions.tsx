


import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PrinterIcon from '../components/icons/PrinterIcon';
import DocumentIcon from '../components/icons/DocumentIcon';
import CogIcon from '../components/icons/CogIcon';
import Modal from '../components/Modal';
import Invoice from '../components/Invoice';
import InvoiceA4 from '../components/InvoiceA4';
import ExpenseReceipt from '../components/ExpenseReceipt';
import { Sale, Expense, PaymentMethod, ExpenseType, Brand, Size, InvoiceType, RefillItem, SaleItem } from '../types';
import { formatDateForInput } from '../lib/utils';
import Settings from './Settings';

// --- FORMS ---

const SaleForm: React.FC<{ sale: Sale | null; onSave: (data: Sale | Omit<Sale, 'id'>) => void; onClose: () => void; }> = ({ sale, onSave, onClose }) => {
    const { customers } = useAppContext();
    
    const initialItems: SaleItem[] = sale?.items && sale.items.length > 0 
        ? sale.items 
        : (sale ? [{ brand: sale.tank_brand, size: sale.tank_size, quantity: sale.quantity, unit_price: sale.unit_price, total_price: sale.total_amount }] 
               : [{ brand: Brand.PTT, size: Size.S48, quantity: 1, unit_price: 0, total_price: 0 }]);

    const [formData, setFormData] = useState({
        customer_id: sale?.customer_id || (customers.length > 0 ? customers[0].id : ''),
        date: sale?.date ? formatDateForInput(new Date(sale.date)) : formatDateForInput(new Date()),
        payment_method: sale?.payment_method || PaymentMethod.CASH,
        invoice_type: sale?.invoice_type || InvoiceType.CASH,
        invoice_number: sale?.invoice_number || '',
        gas_return_kg: sale?.gas_return_kg?.toString() || '',
        gas_return_price: sale?.gas_return_price?.toString() || '',
    });

    const [items, setItems] = useState<SaleItem[]>(initialItems);

    const updateItemPrice = (index: number, customerId: string, brand: Brand, size: Size) => {
        const customer = customers.find(c => c.id === customerId);
        if (customer) {
            setItems(prev => {
                const newItems = [...prev];
                // Check if customer has specific price
                let price = customer.price; // Default
                if (customer.price_list) {
                    const specificPrice = customer.price_list.find(p => p.brand === brand && p.size === size);
                    if (specificPrice) price = specificPrice.price;
                }
                
                newItems[index].unit_price = price;
                newItems[index].total_price = newItems[index].quantity * price;
                return newItems;
            });
        }
    };

    useEffect(() => {
        if (formData.customer_id && !sale) {
             // On new sale, update price for initial empty item
             updateItemPrice(0, formData.customer_id, items[0].brand, items[0].size);
        }
    }, [formData.customer_id]);

    const handleItemChange = (index: number, field: keyof SaleItem, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            const item = { ...newItems[index], [field]: value };
            
            // Auto-calc total price for line
            if (field === 'quantity' || field === 'unit_price') {
                item.total_price = item.quantity * item.unit_price;
            }
            
            newItems[index] = item;
            
            // If Brand or Size Changed, try to fetch price again
            if (field === 'brand' || field === 'size') {
                 // We need to defer this slightly or just call update logic directly.
                 // Ideally separate function, but here we can just do it next render cycle or manually invoke
                 // Simpler: Just rely on user to check price or complex effect.
                 // Let's do instant update if unit_price wasn't manually touched? Hard to track.
                 // Force update from customer price list:
                 const customer = customers.find(c => c.id === formData.customer_id);
                 if (customer && customer.price_list) {
                     const p = customer.price_list.find(x => x.brand === item.brand && x.size === item.size);
                     if (p) {
                         item.unit_price = p.price;
                         item.total_price = item.quantity * p.price;
                     } else {
                         // Revert to base price if defined, or keep current? 
                         // Let's default to base price if specific not found
                         item.unit_price = customer.price;
                         item.total_price = item.quantity * customer.price;
                     }
                 }
            }
            return newItems;
        });
    };

    const addItem = () => {
        const customer = customers.find(c => c.id === formData.customer_id);
        const newItem = { brand: Brand.PTT, size: Size.S48, quantity: 1, unit_price: customer?.price || 0, total_price: customer?.price || 0 };
        // Check for specific price
        if (customer && customer.price_list) {
            const p = customer.price_list.find(x => x.brand === Brand.PTT && x.size === Size.S48);
            if (p) {
                newItem.unit_price = p.price;
                newItem.total_price = p.price;
            }
        }
        setItems([...items, newItem]);
    };

    const removeItem = (index: number) => {
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateGrandTotal = () => {
        const itemsTotal = items.reduce((acc, item) => acc + item.total_price, 0);
        const returnKg = parseFloat(formData.gas_return_kg) || 0;
        const returnPrice = parseFloat(formData.gas_return_price) || 0;
        const deduction = returnKg * returnPrice;
        return itemsTotal - deduction;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const customer = customers.find(c => c.id === formData.customer_id);
        if (!customer) return;

        const finalTotal = calculateGrandTotal();

        const submissionData = {
            ...sale,
            customer_id: formData.customer_id,
            date: new Date(formData.date).toISOString(),
            payment_method: formData.payment_method,
            invoice_type: formData.invoice_type,
            invoice_number: formData.invoice_number,
            gas_return_kg: parseFloat(formData.gas_return_kg) || undefined,
            gas_return_price: parseFloat(formData.gas_return_price) || undefined,
            items: items,
            // Summary fields
            quantity: items.reduce((acc, i) => acc + i.quantity, 0),
            tank_brand: items[0]?.brand || Brand.OTHER,
            tank_size: items[0]?.size || Size.OTHER,
            unit_price: 0, 
            total_amount: finalTotal,
        };
        onSave(submissionData as Sale | Omit<Sale, 'id'>);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 h-[70vh] overflow-y-auto pr-2">
            <select name="customer_id" value={formData.customer_id} onChange={handleChange} className="w-full p-2 border rounded" required>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.branch}</option>)}
            </select>
            
            <div className="bg-slate-50 p-3 rounded border border-slate-200">
                <div className="flex justify-between items-center mb-2">
                    <label className="text-xs font-bold text-slate-600">รายการสินค้า</label>
                    <button type="button" onClick={addItem} className="text-xs bg-sky-100 text-sky-600 px-2 py-1 rounded">+ เพิ่ม</button>
                </div>
                {items.map((item, index) => (
                    <div key={index} className="flex flex-wrap items-end gap-2 mb-3 pb-3 border-b border-slate-100 last:border-0">
                        <div className="w-1/3 flex-grow">
                            <label className="text-[10px] text-gray-400">ยี่ห้อ</label>
                            <select value={item.brand} onChange={(e) => handleItemChange(index, 'brand', e.target.value)} className="w-full p-1 text-xs border rounded">
                                {Object.values(Brand).map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                        </div>
                        <div className="w-1/3 flex-grow">
                            <label className="text-[10px] text-gray-400">ขนาด</label>
                            <select value={item.size} onChange={(e) => handleItemChange(index, 'size', e.target.value)} className="w-full p-1 text-xs border rounded">
                                {Object.values(Size).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                        </div>
                        <div className="w-16">
                            <label className="text-[10px] text-gray-400">จำนวน</label>
                            <input type="number" value={item.quantity} onChange={(e) => handleItemChange(index, 'quantity', parseFloat(e.target.value) || 0)} className="w-full p-1 text-xs border rounded" />
                        </div>
                        <div className="w-20">
                            <label className="text-[10px] text-gray-400">ราคา/หน่วย</label>
                            <input type="number" value={item.unit_price} onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} className="w-full p-1 text-xs border rounded text-right" />
                        </div>
                        <div className="w-20">
                             <label className="text-[10px] text-gray-400">รวม</label>
                             <div className="text-xs font-bold text-right py-1">{item.total_price.toLocaleString()}</div>
                        </div>
                        <button type="button" onClick={() => removeItem(index)} className="text-red-400 hover:text-red-600 pb-1">
                            <TrashIcon className="h-4 w-4" />
                        </button>
                    </div>
                ))}
            </div>

            <div className="bg-blue-50 p-3 rounded border border-blue-100 grid grid-cols-2 gap-2">
                <div>
                     <label className="text-xs font-bold text-blue-800">น้ำหนักคืน (กก.)</label>
                     <input name="gas_return_kg" type="number" step="0.01" value={formData.gas_return_kg} onChange={handleChange} placeholder="0.00" className="w-full p-2 border rounded mt-1" />
                </div>
                <div>
                     <label className="text-xs font-bold text-blue-800">ส่วนลดคืนเนื้อ (บาท/กก.)</label>
                     <input name="gas_return_price" type="number" step="0.01" value={formData.gas_return_price} onChange={handleChange} placeholder="0.00" className="w-full p-2 border rounded mt-1" />
                </div>
                {(parseFloat(formData.gas_return_kg) > 0 || parseFloat(formData.gas_return_price) > 0) && (
                    <div className="col-span-2 text-right text-sm text-blue-700">
                        มูลค่าส่วนลด: <span className="font-bold">-{( (parseFloat(formData.gas_return_kg) || 0) * (parseFloat(formData.gas_return_price) || 0) ).toLocaleString()} ฿</span>
                    </div>
                )}
            </div>
            
            <div className="flex justify-between items-center bg-green-50 p-3 rounded border border-green-100">
                <span className="font-bold text-green-800">ยอดรวมสุทธิ:</span>
                <span className="font-bold text-xl text-green-600">{calculateGrandTotal().toLocaleString('th-TH', {minimumFractionDigits: 2})} ฿</span>
            </div>

            <select name="payment_method" value={formData.payment_method} onChange={handleChange} className="w-full p-2 border rounded">
                {Object.values(PaymentMethod).map(pm => <option key={pm} value={pm}>{pm}</option>)}
            </select>
            <select name="invoice_type" value={formData.invoice_type} onChange={handleChange} className="w-full p-2 border rounded">
                {Object.values(InvoiceType).map(it => <option key={it} value={it}>{it}</option>)}
            </select>
            <input name="invoice_number" value={formData.invoice_number} onChange={handleChange} placeholder="เลขที่เอกสาร" className="w-full p-2 border rounded" />
            <input name="date" type="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" required />
            
            <div className="flex justify-end space-x-2 mt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded-lg">บันทึก</button>
            </div>
        </form>
    );
};

const ExpenseForm: React.FC<{ expense: Expense | null; onSave: (data: Expense | Omit<Expense, 'id'>) => void; onClose: () => void; }> = ({ expense, onSave, onClose }) => {
    const { expenseTypes, setActivePage } = useAppContext();
    const [showSettings, setShowSettings] = useState(false);
    
    // Default to the first type (usually 'ค่าบรรจุก๊าซ') if new
    const [formData, setFormData] = useState({
        type: expense?.type || (expenseTypes.length > 0 ? expenseTypes[0] : ExpenseType.REFILL),
        custom_type: '',
        description: expense?.description || '',
        payee: expense?.payee || '',
        amount: expense?.amount.toString() || '',
        date: expense?.date ? formatDateForInput(new Date(expense.date)) : formatDateForInput(new Date()),
        payment_method: expense?.payment_method || PaymentMethod.CASH,
        gas_return_kg: expense?.gas_return_kg?.toString() || '',
        gas_return_amount: expense?.gas_return_amount?.toString() || '',
    });
    
    const [refillItems, setRefillItems] = useState<RefillItem[]>(expense?.refill_details || []);

    const isRefill = formData.type === ExpenseType.REFILL;
    const isCustomType = formData.type === 'CUSTOM';

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const addRefillItem = () => {
        setRefillItems([...refillItems, { brand: Brand.PTT, size: Size.S48, quantity: 1 }]);
    };
    const removeRefillItem = (index: number) => {
        setRefillItems(refillItems.filter((_, i) => i !== index));
    };
    const updateRefillItem = (index: number, field: keyof RefillItem, value: any) => {
        const updated = [...refillItems];
        updated[index] = { ...updated[index], [field]: value };
        setRefillItems(updated);
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const finalType = isCustomType ? formData.custom_type : formData.type;
        const amount = parseFloat(formData.amount);

        if (isNaN(amount)) {
            alert("กรุณาระบุจำนวนเงินที่ถูกต้อง");
            return;
        }
        
        const submissionData = {
            ...expense,
            type: finalType,
            description: formData.description,
            payee: formData.payee,
            amount: amount,
            date: new Date(formData.date).toISOString(),
            payment_method: formData.payment_method,
            refill_details: isRefill ? refillItems : undefined,
            gas_return_kg: isRefill ? parseFloat(formData.gas_return_kg) || 0 : undefined,
            gas_return_amount: isRefill ? parseFloat(formData.gas_return_amount) || 0 : undefined,
        };
        onSave(submissionData as Expense | Omit<Expense, 'id'>);
    };
    
    // Quick access to settings if user wants to add types
    if (showSettings) {
        return (
            <div className="h-[70vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold">จัดการประเภทค่าใช้จ่าย</h3>
                    <button onClick={() => setShowSettings(false)} className="text-sm text-blue-500">กลับ</button>
                </div>
                <div className="p-2 border rounded bg-slate-50 mb-4">
                    <p className="text-xs text-gray-500 mb-2">ไปที่เมนูตั้งค่าเพื่อจัดการรายการทั้งหมด</p>
                    <button onClick={() => setActivePage('SETTINGS')} className="w-full bg-orange-100 text-orange-700 py-2 rounded text-sm">ไปที่หน้าตั้งค่า</button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-4 h-[70vh] overflow-y-auto pr-2">
            <div className="flex gap-2">
                <div className="flex-grow">
                     <select name="type" value={isCustomType ? 'CUSTOM' : formData.type} onChange={(e) => setFormData({...formData, type: e.target.value, custom_type: ''})} className="w-full p-2 border rounded">
                        {expenseTypes.map(et => <option key={et} value={et}>{et}</option>)}
                        <option value="CUSTOM">กำหนดเอง...</option>
                    </select>
                </div>
                {/* Shortcut to Settings */}
                <button type="button" onClick={() => setShowSettings(true)} className="p-2 bg-gray-100 rounded text-gray-500 hover:text-orange-500" title="จัดการประเภท">
                    <CogIcon />
                </button>
            </div>
           
            {isCustomType && (
                <input name="custom_type" value={formData.custom_type} onChange={handleChange} placeholder="ระบุประเภทค่าใช้จ่าย" className="w-full p-2 border rounded" required />
            )}
            
            <input name="description" value={formData.description} onChange={handleChange} placeholder="รายละเอียด" className="w-full p-2 border rounded" required />
            <input name="payee" value={formData.payee} onChange={handleChange} placeholder="ร้านค้า / ผู้รับเงิน (ไม่บังคับ)" className="w-full p-2 border rounded" />
            <input name="amount" type="number" value={formData.amount} onChange={handleChange} placeholder="จำนวนเงินรวม" className="w-full p-2 border rounded" required />
            <select name="payment_method" value={formData.payment_method} onChange={handleChange} className="w-full p-2 border rounded">
                {Object.values(PaymentMethod).map(pm => <option key={pm} value={pm}>{pm}</option>)}
            </select>
            <input name="date" type="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" required />

            {isRefill && (
                <div className="p-3 bg-slate-100 rounded-lg space-y-3 border">
                    <div className="flex justify-between items-center">
                         <h4 className="font-semibold text-gray-600">รายละเอียดการเติมแก๊ส</h4>
                         <button type="button" onClick={addRefillItem} className="text-xs bg-sky-100 text-sky-600 px-2 py-1 rounded">+ เพิ่มรายการ</button>
                    </div>
                    {refillItems.map((item, index) => (
                         <div key={index} className="flex items-center space-x-2 mb-2 pb-2 border-b border-gray-200 last:border-0">
                             <select value={item.brand} onChange={(e) => updateRefillItem(index, 'brand', e.target.value)} className="w-1/3 text-xs p-1 border rounded">
                                {Object.values(Brand).map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select value={item.size} onChange={(e) => updateRefillItem(index, 'size', e.target.value)} className="w-1/3 text-xs p-1 border rounded">
                                {Object.values(Size).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input type="number" value={item.quantity} onChange={(e) => updateRefillItem(index, 'quantity', parseInt(e.target.value) || 0)} className="w-16 text-xs p-1 border rounded" placeholder="จำนวน" />
                            <button type="button" onClick={() => removeRefillItem(index)} className="text-red-500"><TrashIcon className="h-4 w-4" /></button>
                        </div>
                    ))}
                    <div className="pt-2 grid grid-cols-2 gap-2">
                        <input name="gas_return_kg" type="number" step="0.1" value={formData.gas_return_kg} onChange={handleChange} placeholder="คืนเนื้อ (กก.)" className="text-sm p-2 border rounded" />
                        <input name="gas_return_amount" type="number" value={formData.gas_return_amount} onChange={handleChange} placeholder="มูลค่าคืนเนื้อ (บาท)" className="text-sm p-2 border rounded" />
                    </div>
                </div>
            )}

            <div className="flex justify-end space-x-2 mt-2 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded-lg">บันทึก</button>
            </div>
        </form>
    );
};


// --- MAIN COMPONENT ---

const Transactions: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'sales' | 'expenses'>('sales');
  const { sales, expenses, getCustomerById, addSale, updateSale, deleteSale, addExpense, updateExpense, deleteExpense } = useAppContext();
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Sale | Expense | null>(null);
  const [receiptData, setReceiptData] = useState<Sale | Expense | null>(null);
  const [receiptA4Data, setReceiptA4Data] = useState<Sale | null>(null);

  const handleOpenFormModal = (item: Sale | Expense | null = null) => {
    setEditingItem(item);
    setIsFormModalOpen(true);
  };

  const handleCloseFormModal = () => {
    setEditingItem(null);
    setIsFormModalOpen(false);
  };
  
  const handleOpenReceiptModal = (item: Sale | Expense) => {
    setReceiptData(item);
  };
  
  const handleCloseReceiptModal = () => {
    setReceiptData(null);
  };

  const handleOpenReceiptA4Modal = (item: Sale) => {
    setReceiptA4Data(item);
  };

  const handleCloseReceiptA4Modal = () => {
    setReceiptA4Data(null);
  };

  const handleSave = async (data: Sale | Expense | Omit<Sale, 'id'> | Omit<Expense, 'id'>) => {
      if (activeTab === 'sales') {
          if ('id' in data) {
              await updateSale(data as Sale);
          } else {
              await addSale(data as Omit<Sale, 'id'>);
          }
      } else {
          if ('id' in data) {
              await updateExpense(data as Expense);
          } else {
              await addExpense(data as Omit<Expense, 'id'>);
          }
      }
      handleCloseFormModal();
  };

  const getPaymentMethodClass = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.CASH: return 'bg-lime-100 text-lime-700';
      case PaymentMethod.TRANSFER: return 'bg-purple-100 text-purple-700';
      case PaymentMethod.CREDIT: return 'bg-blue-100 text-blue-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };


  const renderSales = () => (
    <div className="space-y-3">
        {sales.map((sale: Sale) => {
            const customer = getCustomerById(sale.customer_id);
            const customerDisplay = customer ? `${customer.name} ${customer.branch ? '(' + customer.branch + ')' : ''}` : 'ลูกค้าทั่วไป';
            
            return (
                <Card key={sale.id} className="!p-0">
                    <div className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold pr-4">{customerDisplay}</p>
                                <div className="text-sm text-gray-500 mt-1">
                                    {sale.items && sale.items.length > 0 ? (
                                        sale.items.map((item, idx) => (
                                            <div key={idx}>• {item.quantity} x {item.brand} {item.size}</div>
                                        ))
                                    ) : (
                                        <div>{sale.quantity} x {sale.tank_brand} {sale.tank_size}</div>
                                    )}
                                </div>
                                <div className="flex items-center space-x-2 mt-2">
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPaymentMethodClass(sale.payment_method)}`}>{sale.payment_method}</span>
                                    {sale.gas_return_kg && <span className="text-xs text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">คืนเนื้อ: {sale.gas_return_kg} กก.</span>}
                                </div>
                                <p className="text-xs text-gray-400 mt-1">{new Date(sale.date).toLocaleDateString('th-TH')} - {sale.invoice_number}</p>
                            </div>
                            <p className="text-lg font-bold text-green-600 whitespace-nowrap">+{sale.total_amount.toLocaleString('th-TH')} ฿</p>
                        </div>
                    </div>
                    <div className="bg-slate-50/70 px-4 py-2 flex justify-end space-x-3 items-center border-t border-slate-200/80">
                        <button onClick={() => handleOpenReceiptA4Modal(sale)} className="text-green-600 hover:text-green-700" title="พิมพ์ A4"><DocumentIcon /></button>
                        <button onClick={() => handleOpenReceiptModal(sale)} className="text-gray-500 hover:text-sky-500" title="พิมพ์ใบเสร็จย่อ"><PrinterIcon /></button>
                        <button onClick={() => handleOpenFormModal(sale)} className="text-gray-500 hover:text-sky-500"><PencilIcon /></button>
                        <button onClick={() => deleteSale(sale.id)} className="text-gray-500 hover:text-red-500"><TrashIcon /></button>
                    </div>
                </Card>
            );
        })}
    </div>
  );

  const renderExpenses = () => (
     <div className="space-y-3">
        {expenses.map((expense: Expense) => (
            <Card key={expense.id} className="!p-0">
                <div className="p-4">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-semibold pr-4">{expense.type}</p>
                            <p className="text-sm text-gray-500">{expense.description} {expense.payee && `(${expense.payee})`}</p>
                             {expense.refill_details && expense.refill_details.length > 0 && (
                                <div className="mt-1">
                                    {expense.refill_details.map((item, idx) => (
                                        <span key={idx} className="text-xs bg-gray-100 px-1 rounded mr-1">{item.quantity}x {item.size}</span>
                                    ))}
                                </div>
                            )}
                            <p className="text-xs text-gray-400 mt-1">{new Date(expense.date).toLocaleDateString('th-TH')} - {expense.payment_method}</p>
                        </div>
                        <p className="text-lg font-bold text-red-600 whitespace-nowrap">-{expense.amount.toLocaleString('th-TH')} ฿</p>
                    </div>
                </div>
                <div className="bg-slate-50/70 px-4 py-2 flex justify-end space-x-3 items-center border-t border-slate-200/80">
                    <button onClick={() => handleOpenReceiptModal(expense)} className="text-gray-500 hover:text-sky-500"><PrinterIcon /></button>
                    <button onClick={() => handleOpenFormModal(expense)} className="text-gray-500 hover:text-sky-500"><PencilIcon /></button>
                    <button onClick={() => deleteExpense(expense.id)} className="text-gray-500 hover:text-red-500"><TrashIcon /></button>
                </div>
            </Card>
        ))}
     </div>
  );

  const getFormModalTitle = () => {
      const action = editingItem ? 'แก้ไข' : 'เพิ่ม';
      const type = activeTab === 'sales' ? 'รายรับ' : 'รายจ่าย';
      return `${action}${type}`;
  }

  const customerForReceipt = receiptData && 'customer_id' in receiptData ? getCustomerById(receiptData.customer_id) : null;
  const customerForReceiptA4 = receiptA4Data ? getCustomerById(receiptA4Data.customer_id) : null;

  return (
    <div>
      <Header title="รายการ">
        <button className="text-orange-500 hover:text-orange-600" onClick={() => handleOpenFormModal()}>
            <PlusCircleIcon />
        </button>
      </Header>

        <div className="mb-4">
            <div className="flex bg-white/80 p-1 rounded-lg shadow-inner backdrop-blur-sm">
                <button onClick={() => setActiveTab('sales')} className={`w-full py-2 text-center rounded-md transition-colors duration-300 ${activeTab === 'sales' ? 'bg-orange-400 text-white shadow' : 'text-gray-600'}`}>รายรับ</button>
                <button onClick={() => setActiveTab('expenses')} className={`w-full py-2 text-center rounded-md transition-colors duration-300 ${activeTab === 'expenses' ? 'bg-orange-400 text-white shadow' : 'text-gray-600'}`}>รายจ่าย</button>
            </div>
        </div>

      {activeTab === 'sales' ? renderSales() : renderExpenses()}

      <Modal isOpen={isFormModalOpen} onClose={handleCloseFormModal} title={getFormModalTitle()}>
        {activeTab === 'sales' 
            ? <SaleForm sale={editingItem as Sale | null} onSave={handleSave} onClose={handleCloseFormModal} /> 
            : <ExpenseForm expense={editingItem as Expense | null} onSave={handleSave} onClose={handleCloseFormModal} />
        }
      </Modal>

      <Modal isOpen={!!receiptData} onClose={handleCloseReceiptModal} title="พิมพ์เอกสาร">
        {receiptData && 'customer_id' in receiptData && customerForReceipt && (
            <Invoice sale={receiptData} customer={customerForReceipt} />
        )}
        {receiptData && !('customer_id' in receiptData) && (
            <ExpenseReceipt expense={receiptData as Expense} />
        )}
      </Modal>

      {/* A4 Invoice Modal - Full Screen Overlay */}
      {receiptA4Data && customerForReceiptA4 && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex justify-center overflow-auto py-8 print:p-0 print:overflow-visible">
             <button onClick={handleCloseReceiptA4Modal} className="fixed top-4 right-4 text-white text-4xl hover:text-gray-300 z-50 no-print">&times;</button>
             <InvoiceA4 sale={receiptA4Data} customer={customerForReceiptA4} />
        </div>
      )}
    </div>
  );
};

export default Transactions;