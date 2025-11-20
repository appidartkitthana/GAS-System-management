
import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import PrinterIcon from '../components/icons/PrinterIcon';
import Modal from '../components/Modal';
import Invoice from '../components/Invoice';
import ExpenseReceipt from '../components/ExpenseReceipt';
import { Sale, Expense, PaymentMethod, ExpenseType, Brand, Size, InvoiceType, RefillItem } from '../types';
import { formatDateForInput } from '../lib/utils';

// --- FORMS ---

const SaleForm: React.FC<{ sale: Sale | null; onSave: (data: Sale | Omit<Sale, 'id'>) => void; onClose: () => void; }> = ({ sale, onSave, onClose }) => {
    const { customers } = useAppContext();
    const [formData, setFormData] = useState({
        customer_id: sale?.customer_id || (customers.length > 0 ? customers[0].id : ''),
        quantity: sale?.quantity.toString() || '1',
        date: sale?.date ? formatDateForInput(new Date(sale.date)) : formatDateForInput(new Date()),
        payment_method: sale?.payment_method || PaymentMethod.CASH,
        invoice_type: sale?.invoice_type || InvoiceType.CASH,
        invoice_number: sale?.invoice_number || '',
        gas_return_kg: sale?.gas_return_kg?.toString() || '',
        total_amount: sale?.total_amount?.toString() || '',
    });

    // Auto-calculate total amount when dependencies change
    useEffect(() => {
        const customer = customers.find(c => c.id === formData.customer_id);
        const quantity = parseInt(formData.quantity, 10) || 0;
        const gasReturn = parseFloat(formData.gas_return_kg) || 0;
        
        if (customer) {
            // Formula requested: (quantity - gas_return_kg) * unit_price
            // Ensure we don't get negative values if return is mistakenly high, or allow it if intended? 
            // Usually total shouldn't be negative, but let's stick to the formula.
            const calcAmount = (quantity - gasReturn) * customer.price;
            
            // Only update if the value is different to avoid cursor jumps or unnecessary renders
            // Format to 2 decimal places for currency
            const formattedAmount = calcAmount.toFixed(2);
            
            setFormData(prev => {
                // If user has manually edited the price to something else, this auto-calc might overwrite it.
                // But per request "Make it automatic", we enforce the formula.
                if (parseFloat(prev.total_amount).toFixed(2) === formattedAmount) return prev;
                return { ...prev, total_amount: formattedAmount };
            });
        }
    }, [formData.customer_id, formData.quantity, formData.gas_return_kg, customers]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const customer = customers.find(c => c.id === formData.customer_id);
        if (!customer) return;

        const submissionData = {
            ...sale,
            customer_id: formData.customer_id,
            quantity: parseInt(formData.quantity, 10),
            date: new Date(formData.date).toISOString(),
            payment_method: formData.payment_method,
            unit_price: customer.price,
            total_amount: parseFloat(formData.total_amount) || 0,
            tank_brand: customer.tank_brand,
            tank_size: customer.tank_size,
            invoice_type: formData.invoice_type,
            invoice_number: formData.invoice_number,
            gas_return_kg: parseFloat(formData.gas_return_kg) || undefined,
        };
        onSave(submissionData as Sale | Omit<Sale, 'id'>);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <select name="customer_id" value={formData.customer_id} onChange={handleChange} className="w-full p-2 border rounded" required>
                {customers.map(c => <option key={c.id} value={c.id}>{c.name} - {c.branch}</option>)}
            </select>
            <input name="quantity" type="number" value={formData.quantity} onChange={handleChange} placeholder="จำนวน" className="w-full p-2 border rounded" required min="1" />
            <input name="gas_return_kg" type="number" step="0.01" value={formData.gas_return_kg} onChange={handleChange} placeholder="คืนเนื้อ (กก.) (ถ้ามี)" className="w-full p-2 border rounded" />
            
            <div className="flex items-center space-x-2">
                <span className="font-bold whitespace-nowrap">ยอดรวม:</span>
                <input name="total_amount" type="number" step="0.01" value={formData.total_amount} onChange={handleChange} className="w-full p-2 border rounded font-bold text-green-600" placeholder="ยอดรวมสุทธิ" required />
                <span className="font-bold">฿</span>
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
    const [formData, setFormData] = useState({
        type: expense?.type || ExpenseType.OTHER,
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

    // Refill Items Logic
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

    return (
        <form onSubmit={handleSubmit} className="space-y-4 h-[70vh] overflow-y-auto pr-2">
            <select name="type" value={isCustomType ? 'CUSTOM' : formData.type} onChange={(e) => setFormData({...formData, type: e.target.value, custom_type: ''})} className="w-full p-2 border rounded">
                {Object.values(ExpenseType).map(et => <option key={et} value={et}>{et}</option>)}
                <option value="CUSTOM">กำหนดเอง...</option>
            </select>
            {isCustomType && (
                <input name="custom_type" value={formData.custom_type} onChange={handleChange} placeholder="ระบุประเภทค่าใช้จ่าย" className="w-full p-2 border rounded" required />
            )}
            
            <input name="description" value={formData.description} onChange={handleChange} placeholder="รายละเอียด" className="w-full p-2 border rounded" required />
            <input name="payee" value={formData.payee} onChange={handleChange} placeholder="ร้านค้า / ผู้รับเงิน" className="w-full p-2 border rounded" />
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
            return (
                <Card key={sale.id} className="!p-0">
                    <div className="p-4">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="font-semibold pr-4">{customer?.name} ({customer?.branch})</p>
                                <div className="flex items-center space-x-2 flex-wrap">
                                    <p className="text-sm text-gray-500">{sale.quantity} x {sale.tank_brand} {sale.tank_size}</p>
                                    <span className={`text-xs px-2 py-0.5 rounded-full ${getPaymentMethodClass(sale.payment_method)}`}>{sale.payment_method}</span>
                                </div>
                                {sale.gas_return_kg && <p className="text-sm text-blue-600">คืนเนื้อ: {sale.gas_return_kg} กก.</p>}
                                <p className="text-xs text-gray-400 mt-1">{new Date(sale.date).toLocaleDateString('th-TH')} - {sale.invoice_number}</p>
                            </div>
                            <p className="text-lg font-bold text-green-600 whitespace-nowrap">+{sale.total_amount.toLocaleString('th-TH')} ฿</p>
                        </div>
                    </div>
                    <div className="bg-slate-50/70 px-4 py-2 flex justify-end space-x-3 items-center border-t border-slate-200/80">
                        <button onClick={() => handleOpenReceiptModal(sale)} className="text-gray-500 hover:text-sky-500"><PrinterIcon /></button>
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
    </div>
  );
};

export default Transactions;
