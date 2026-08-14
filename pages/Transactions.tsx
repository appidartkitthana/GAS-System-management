


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
import DeliveryNoteA4 from '../components/DeliveryNoteA4';
import ExpenseReceipt from '../components/ExpenseReceipt';
import { Sale, Expense, PaymentMethod, ExpenseType, Brand, Size, InvoiceType, RefillItem, SaleItem, InventoryCategory } from '../types';
import { formatDateForInput } from '../lib/utils';
import Settings from './Settings';

// --- FORMS ---

const SaleForm: React.FC<{ sale: Sale | null; onSave: (data: Sale | Omit<Sale, 'id'>) => void; onClose: () => void; }> = ({ sale, onSave, onClose }) => {
    const { customers, inventory } = useAppContext();
    const accessoriesInStock = inventory.filter(i => i.category === InventoryCategory.ACCESSORY);
    
    // Construct initial items accurately without losing price/quantity on edit
    const initialItems: SaleItem[] = (() => {
        if (sale?.items && sale.items.length > 0) {
            return sale.items.map(item => ({
                ...item,
                item_type: item.item_type || 'GAS',
                total_price: item.total_price || (item.quantity * item.unit_price)
            }));
        }
        if (sale) {
            const deduction = (sale.gas_return_kg || 0) * (sale.gas_return_price || 0);
            const grossAmount = sale.total_amount + deduction;
            const derivedUnitPrice = (sale.quantity > 0) 
                ? Math.round((grossAmount / sale.quantity) * 100) / 100 
                : (sale.unit_price || 0);

            return [{
                brand: sale.tank_brand || Brand.PTT,
                size: sale.tank_size || Size.S48,
                quantity: sale.quantity || 1,
                unit_price: derivedUnitPrice,
                total_price: derivedUnitPrice * (sale.quantity || 1),
                item_type: 'GAS'
            }];
        }
        return [{ brand: Brand.PTT, size: Size.S48, quantity: 1, unit_price: 0, total_price: 0, item_type: 'GAS' }];
    })();

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

    const applyCustomerPriceToItem = (index: number, customerId: string, item: SaleItem) => {
        const customer = customers.find(c => c.id === customerId);
        if (!customer) return item;
        
        let price = customer.price;
        if (customer.price_list) {
            const sp = customer.price_list.find(p => p.brand === item.brand && p.size === item.size);
            if (sp) price = sp.price;
        }
        return {
            ...item,
            unit_price: price,
            total_price: item.quantity * price
        };
    };

    // On NEW sale, apply customer price to initial empty item once
    useEffect(() => {
        if (formData.customer_id && !sale && items.length === 1 && items[0].unit_price === 0) {
            setItems(prev => [applyCustomerPriceToItem(0, formData.customer_id, prev[0])]);
        }
    }, [formData.customer_id]);

    const handleItemChange = (index: number, field: keyof SaleItem, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            const item = { ...newItems[index], [field]: value };
            
            // Auto-calc total price for line
            if (field === 'quantity' || field === 'unit_price') {
                const qty = typeof item.quantity === 'number' ? item.quantity : parseFloat(item.quantity) || 0;
                const unitP = typeof item.unit_price === 'number' ? item.unit_price : parseFloat(item.unit_price) || 0;
                item.total_price = Math.round(qty * unitP * 100) / 100;
            }
            
            // If Brand or Size Changed on a gas item, pull default price from customer price list if available
            if ((field === 'brand' || field === 'size') && item.item_type === 'GAS') {
                const customer = customers.find(c => c.id === formData.customer_id);
                if (customer) {
                    let p = customer.price;
                    if (customer.price_list) {
                        const sp = customer.price_list.find(x => x.brand === item.brand && x.size === item.size);
                        if (sp) p = sp.price;
                    }
                    item.unit_price = p;
                    item.total_price = Math.round(item.quantity * p * 100) / 100;
                }
            }

            newItems[index] = item;
            return newItems;
        });
    };

    const handleAccessorySelect = (index: number, accessoryId: string) => {
        const acc = accessoriesInStock.find(i => i.id === accessoryId);
        setItems(prev => {
            const newItems = [...prev];
            if (acc) {
                const qty = newItems[index].quantity || 1;
                const unitP = acc.cost_price ? acc.cost_price * 1.2 : 0; // Default price if not set
                newItems[index] = {
                    ...newItems[index],
                    item_type: 'ACCESSORY',
                    inventory_id: acc.id,
                    item_name: acc.name || 'อุปกรณ์',
                    cost_price: acc.cost_price || 0,
                    unit_price: unitP,
                    total_price: Math.round(qty * unitP * 100) / 100
                };
            }
            return newItems;
        });
    };

    const addItem = (type: 'GAS' | 'ACCESSORY' = 'GAS') => {
        const customer = customers.find(c => c.id === formData.customer_id);
        if (type === 'ACCESSORY') {
            const firstAcc = accessoriesInStock[0];
            const newItem: SaleItem = {
                brand: Brand.OTHER,
                size: Size.OTHER,
                item_type: 'ACCESSORY',
                inventory_id: firstAcc?.id,
                item_name: firstAcc?.name || 'อุปกรณ์',
                quantity: 1,
                cost_price: firstAcc?.cost_price || 0,
                unit_price: (firstAcc?.cost_price || 0) * 1.2,
                total_price: (firstAcc?.cost_price || 0) * 1.2
            };
            setItems([...items, newItem]);
        } else {
            let defaultPrice = customer?.price || 0;
            if (customer && customer.price_list) {
                const sp = customer.price_list.find(x => x.brand === Brand.PTT && x.size === Size.S48);
                if (sp) defaultPrice = sp.price;
            }
            const newItem: SaleItem = {
                brand: Brand.PTT,
                size: Size.S48,
                item_type: 'GAS',
                quantity: 1,
                unit_price: defaultPrice,
                total_price: defaultPrice
            };
            setItems([...items, newItem]);
        }
    };

    const removeItem = (index: number) => {
        if (items.length === 1) {
            alert("ต้องมีอย่างน้อย 1 รายการ");
            return;
        }
        setItems(items.filter((_, i) => i !== index));
    };

    const calculateGrandTotal = () => {
        const itemsTotal = items.reduce((acc, item) => acc + (item.total_price || 0), 0);
        const returnKg = parseFloat(formData.gas_return_kg) || 0;
        const returnPrice = parseFloat(formData.gas_return_price) || 0;
        const deduction = returnKg * returnPrice;
        return Math.round((itemsTotal - deduction) * 100) / 100;
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const customer = customers.find(c => c.id === formData.customer_id);
        if (!customer) {
            alert("กรุณาเลือกลูกค้า");
            return;
        }

        const finalTotal = calculateGrandTotal();
        const totalQuantity = items.reduce((acc, i) => acc + (i.quantity || 0), 0);
        const primaryGasItem = items.find(i => i.item_type === 'GAS') || items[0];

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
            quantity: totalQuantity,
            tank_brand: primaryGasItem.brand || Brand.OTHER,
            tank_size: primaryGasItem.size || Size.OTHER,
            unit_price: primaryGasItem.unit_price || (totalQuantity > 0 ? Math.round((finalTotal / totalQuantity) * 100) / 100 : 0), 
            total_amount: finalTotal,
        };
        onSave(submissionData as Sale | Omit<Sale, 'id'>);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 h-[75vh] overflow-y-auto pr-2 text-xs">
            <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">ลูกค้า</label>
                <select name="customer_id" value={formData.customer_id} onChange={handleChange} className="w-full p-2 border rounded text-sm font-semibold" required>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.branch || 'สำนักงานใหญ่'}</option>)}
                </select>
            </div>
            
            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
                <div className="flex justify-between items-center mb-2 pb-1 border-b border-slate-200">
                    <label className="text-xs font-bold text-slate-700">รายการสินค้า (แก๊ส & อุปกรณ์)</label>
                    <div className="flex gap-2">
                        <button type="button" onClick={() => addItem('GAS')} className="text-xs bg-sky-600 text-white px-2.5 py-1 rounded font-semibold hover:bg-sky-700 shadow-sm">
                            + เพิ่มแก๊ส
                        </button>
                        <button type="button" onClick={() => addItem('ACCESSORY')} className="text-xs bg-amber-600 text-white px-2.5 py-1 rounded font-semibold hover:bg-amber-700 shadow-sm">
                            + เพิ่มอุปกรณ์
                        </button>
                    </div>
                </div>

                {items.map((item, index) => {
                    const isAccessory = item.item_type === 'ACCESSORY';
                    return (
                        <div key={index} className="p-2.5 mb-2.5 bg-white rounded border border-slate-200 shadow-sm space-y-2">
                            {/* Line Item Type Toggle */}
                            <div className="flex justify-between items-center text-[11px] text-gray-500">
                                <span className="font-bold text-gray-700">รายการที่ {index + 1}</span>
                                <div className="flex items-center gap-1">
                                    <button
                                        type="button"
                                        onClick={() => handleItemChange(index, 'item_type', 'GAS')}
                                        className={`px-2 py-0.5 text-[10px] rounded font-semibold ${!isAccessory ? 'bg-sky-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                                    >
                                        ก๊าซหุงต้ม
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => handleItemChange(index, 'item_type', 'ACCESSORY')}
                                        className={`px-2 py-0.5 text-[10px] rounded font-semibold ${isAccessory ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}
                                    >
                                        อุปกรณ์
                                    </button>
                                </div>
                            </div>

                            <div className="flex flex-wrap items-end gap-2">
                                {!isAccessory ? (
                                    <>
                                        <div className="w-28 flex-grow">
                                            <label className="text-[10px] text-gray-400">ยี่ห้อถัง</label>
                                            <select value={item.brand} onChange={(e) => handleItemChange(index, 'brand', e.target.value)} className="w-full p-1.5 text-xs border rounded font-semibold">
                                                {Object.values(Brand).map(b => <option key={b} value={b}>{b}</option>)}
                                            </select>
                                        </div>
                                        <div className="w-32 flex-grow">
                                            <label className="text-[10px] text-gray-400">ขนาด</label>
                                            <select value={item.size} onChange={(e) => handleItemChange(index, 'size', e.target.value)} className="w-full p-1.5 text-xs border rounded font-semibold">
                                                {Object.values(Size).map(s => <option key={s} value={s}>{s}</option>)}
                                            </select>
                                        </div>
                                    </>
                                ) : (
                                    <div className="flex-grow">
                                        <label className="text-[10px] text-gray-400">เลือกอุปกรณ์จากสต็อก / ระบุชื่อ</label>
                                        {accessoriesInStock.length > 0 ? (
                                            <select 
                                                value={item.inventory_id || ''} 
                                                onChange={(e) => handleAccessorySelect(index, e.target.value)}
                                                className="w-full p-1.5 text-xs border rounded font-semibold bg-amber-50"
                                            >
                                                <option value="">-- เลือกอุปกรณ์จากระบบสต็อก --</option>
                                                {accessoriesInStock.map(a => (
                                                    <option key={a.id} value={a.id}>{a.name} (คงเหลือ: {a.total} ชิ้น)</option>
                                                ))}
                                            </select>
                                        ) : (
                                            <input 
                                                type="text" 
                                                value={item.item_name || ''} 
                                                onChange={(e) => handleItemChange(index, 'item_name', e.target.value)}
                                                placeholder="ชื่ออุปกรณ์ / สินค้า"
                                                className="w-full p-1.5 text-xs border rounded"
                                            />
                                        )}
                                    </div>
                                )}

                                <div className="w-16">
                                    <label className="text-[10px] text-gray-400">จำนวน</label>
                                    <input 
                                        type="number" 
                                        min="1"
                                        value={item.quantity} 
                                        onChange={(e) => handleItemChange(index, 'quantity', Math.max(0, parseFloat(e.target.value) || 0))} 
                                        className="w-full p-1.5 text-xs border rounded font-bold text-center" 
                                    />
                                </div>
                                <div className="w-24">
                                    <label className="text-[10px] text-gray-400">ราคา/หน่วย (บาท)</label>
                                    <input 
                                        type="number" 
                                        step="0.01"
                                        value={item.unit_price} 
                                        onChange={(e) => handleItemChange(index, 'unit_price', parseFloat(e.target.value) || 0)} 
                                        className="w-full p-1.5 text-xs border rounded text-right font-semibold" 
                                    />
                                </div>
                                <div className="w-24 text-right">
                                     <label className="text-[10px] text-gray-400 block">รวมเงิน</label>
                                     <div className="text-sm font-bold text-sky-700 py-1">{(item.total_price || 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</div>
                                </div>
                                <button type="button" onClick={() => removeItem(index)} className="p-1 text-red-400 hover:text-red-600 mb-1" title="ลบรายการนี้">
                                    <TrashIcon className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="bg-blue-50 p-3 rounded-lg border border-blue-100 grid grid-cols-2 gap-2">
                <div>
                     <label className="text-xs font-bold text-blue-800">น้ำหนักคืน (กก.)</label>
                     <input name="gas_return_kg" type="number" step="0.01" value={formData.gas_return_kg} onChange={handleChange} placeholder="0.00" className="w-full p-2 border rounded mt-1 font-semibold" />
                </div>
                <div>
                     <label className="text-xs font-bold text-blue-800">ส่วนลดคืนเนื้อ (บาท/กก.)</label>
                     <input name="gas_return_price" type="number" step="0.01" value={formData.gas_return_price} onChange={handleChange} placeholder="0.00" className="w-full p-2 border rounded mt-1 font-semibold" />
                </div>
                {(parseFloat(formData.gas_return_kg) > 0 || parseFloat(formData.gas_return_price) > 0) && (
                    <div className="col-span-2 text-right text-xs text-blue-700">
                        มูลค่าหักส่วนลด: <span className="font-bold">-{( (parseFloat(formData.gas_return_kg) || 0) * (parseFloat(formData.gas_return_price) || 0) ).toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                    </div>
                )}
            </div>
            
            <div className="flex justify-between items-center bg-emerald-50 p-3 rounded-lg border border-emerald-200 shadow-sm">
                <span className="font-bold text-emerald-800 text-sm">ยอดรวมสุทธิ (Grand Total):</span>
                <span className="font-bold text-2xl text-emerald-700">{calculateGrandTotal().toLocaleString('th-TH', {minimumFractionDigits: 2})} ฿</span>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[10px] text-gray-500 mb-1">วิธีชำระเงิน</label>
                    <select name="payment_method" value={formData.payment_method} onChange={handleChange} className="w-full p-2 border rounded">
                        {Object.values(PaymentMethod).map(pm => <option key={pm} value={pm}>{pm}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-[10px] text-gray-500 mb-1">ประเภทเอกสาร</label>
                    <select name="invoice_type" value={formData.invoice_type} onChange={handleChange} className="w-full p-2 border rounded">
                        {Object.values(InvoiceType).map(it => <option key={it} value={it}>{it}</option>)}
                    </select>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
                <div>
                    <label className="block text-[10px] text-gray-500 mb-1">เลขที่เอกสาร / ใบเสร็จ</label>
                    <input name="invoice_number" value={formData.invoice_number} onChange={handleChange} placeholder="ระบุเลขที่เอกสาร" className="w-full p-2 border rounded" />
                </div>
                <div>
                    <label className="block text-[10px] text-gray-500 mb-1">วันที่ทำรายการ</label>
                    <input name="date" type="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" required />
                </div>
            </div>
            
            <div className="flex justify-end space-x-2 pt-2 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 font-semibold rounded-lg">ยกเลิก</button>
                <button type="submit" className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-lg shadow">บันทึกรายการขาย</button>
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
  const [deliveryNoteData, setDeliveryNoteData] = useState<{ sale: Sale; defaultWithPrice: boolean } | null>(null);

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
                    <div className="bg-slate-50/70 px-4 py-2.5 flex flex-wrap justify-end gap-2 items-center border-t border-slate-200/80">
                        <button 
                            onClick={() => setDeliveryNoteData({ sale, defaultWithPrice: true })} 
                            className="px-2.5 py-1 text-xs font-medium text-orange-700 bg-orange-50 hover:bg-orange-100 border border-orange-200 rounded flex items-center gap-1" 
                            title="พิมพ์ใบส่งของ (แบบมีราคา)"
                        >
                            <span>ใบส่งของ (มีราคา)</span>
                        </button>

                        <button 
                            onClick={() => setDeliveryNoteData({ sale, defaultWithPrice: false })} 
                            className="px-2.5 py-1 text-xs font-medium text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded flex items-center gap-1" 
                            title="พิมพ์ใบส่งของ (แบบไม่มีราคา - จำนวนถังอย่างเดียว)"
                        >
                            <span>ใบส่งของ (ไม่มีราคา)</span>
                        </button>

                        <div className="h-4 w-px bg-gray-300 mx-1"></div>

                        <button onClick={() => handleOpenReceiptA4Modal(sale)} className="p-1 text-green-600 hover:bg-green-50 rounded" title="พิมพ์ใบกำกับภาษี/ใบเสร็จ A4"><DocumentIcon /></button>
                        <button onClick={() => handleOpenReceiptModal(sale)} className="p-1 text-sky-600 hover:bg-sky-50 rounded" title="พิมพ์ใบเสร็จย่อ 80mm"><PrinterIcon /></button>
                        <button onClick={() => handleOpenFormModal(sale)} className="p-1 text-gray-500 hover:text-sky-500" title="แก้ไข"><PencilIcon /></button>
                        <button onClick={() => deleteSale(sale.id)} className="p-1 text-gray-400 hover:text-red-500" title="ลบ"><TrashIcon /></button>
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

      {/* A4 Delivery Note Modal - Full Screen Overlay */}
      {deliveryNoteData && getCustomerById(deliveryNoteData.sale.customer_id) && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 flex justify-center overflow-auto py-4 print:p-0 print:overflow-visible">
             <DeliveryNoteA4 
                sale={deliveryNoteData.sale} 
                customer={getCustomerById(deliveryNoteData.sale.customer_id)!} 
                defaultWithPrice={deliveryNoteData.defaultWithPrice}
                onClose={() => setDeliveryNoteData(null)}
             />
        </div>
      )}
    </div>
  );
};

export default Transactions;