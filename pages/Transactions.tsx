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
import { Sale, Expense, PaymentMethod, Customer, ExpenseType, Brand, Size, InvoiceType } from '../types';
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
    });
    const [totalAmount, setTotalAmount] = useState(0);

    useEffect(() => {
        const customer = customers.find(c => c.id === formData.customer_id);
        const quantity = parseInt(formData.quantity, 10) || 0;
        if (customer) {
            setTotalAmount(customer.price * quantity);
        }
    }, [formData.customer_id, formData.quantity, customers]);

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
            total_amount: totalAmount,
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
             <input name="gas_return_kg" type="number" step="0.1" value={formData.gas_return_kg} onChange={handleChange} placeholder="คืนเนื้อ (กก.) (ถ้ามี)" className="w-full p-2 border rounded" />
            <select name="payment_method" value={formData.payment_method} onChange={handleChange} className="w-full p-2 border rounded">
                {Object.values(PaymentMethod).map(pm => <option key={pm} value={pm}>{pm}</option>)}
            </select>
            <select name="invoice_type" value={formData.invoice_type} onChange={handleChange} className="w-full p-2 border rounded">
                {Object.values(InvoiceType).map(it => <option key={it} value={it}>{it}</option>)}
            </select>
            <input name="invoice_number" value={formData.invoice_number} onChange={handleChange} placeholder="เลขที่เอกสาร" className="w-full p-2 border rounded" />
            <input name="date" type="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" required />
            <p className="text-right font-bold text-lg">รวม: {totalAmount.toLocaleString('th-TH')} ฿</p>
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
        description: expense?.description || '',
        amount: expense?.amount.toString() || '',
        date: expense?.date ? formatDateForInput(new Date(expense.date)) : formatDateForInput(new Date()),
        payment_method: expense?.payment_method || PaymentMethod.CASH,
        refill_tank_brand: expense?.refill_tank_brand || Brand.PTT,
        refill_tank_size: expense?.refill_tank_size || Size.S48,
        refill_quantity: expense?.refill_quantity?.toString() || '0',
    });
    
    const isRefill = formData.type === ExpenseType.REFILL_CASH || formData.type === ExpenseType.REFILL_CREDIT;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const submissionData = {
            ...expense,
            type: formData.type,
            description: formData.description,
            amount: parseFloat(formData.amount) || 0,
            date: new Date(formData.date).toISOString(),
            payment_method: formData.payment_method,
            refill_tank_brand: isRefill ? formData.refill_tank_brand : undefined,
            refill_tank_size: isRefill ? formData.refill_tank_size : undefined,
            refill_quantity: isRefill ? (parseInt(formData.refill_quantity, 10) || 0) : undefined
        };
        onSave(submissionData as Expense | Omit<Expense, 'id'>);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border rounded">
                {Object.values(ExpenseType).map(et => <option key={et} value={et}>{et}</option>)}
            </select>
            <input name="description" value={formData.description} onChange={handleChange} placeholder="รายละเอียด" className="w-full p-2 border rounded" required />
            <input name="amount" type="number" value={formData.amount} onChange={handleChange} placeholder="จำนวนเงิน" className="w-full p-2 border rounded" required />
            <select name="payment_method" value={formData.payment_method} onChange={handleChange} className="w-full p-2 border rounded">
                {Object.values(PaymentMethod).map(pm => <option key={pm} value={pm}>{pm}</option>)}
            </select>
            <input name="date" type="date" value={formData.date} onChange={handleChange} className="w-full p-2 border rounded" required />

            {isRefill && (
                <div className="p-3 bg-slate-100 rounded-lg space-y-3 border">
                    <h4 className="font-semibold text-gray-600">รายละเอียดการเติมแก๊ส</h4>
                     <select name="refill_tank_brand" value={formData.refill_tank_brand} onChange={handleChange} className="w-full p-2 border rounded">
                        {Object.values(Brand).map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <select name="refill_tank_size" value={formData.refill_tank_size} onChange={handleChange} className="w-full p-2 border rounded">
                        {Object.values(Size).map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <input name="refill_quantity" type="number" value={formData.refill_quantity} onChange={handleChange} placeholder="จำนวนถังที่เติม" className="w-full p-2 border rounded" required min="0" />
                </div>
            )}

            <div className="flex justify-end space-x-2 mt-2">
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
      case PaymentMethod.CASH:
        return 'bg-lime-100 text-lime-700';
      case PaymentMethod.TRANSFER:
        return 'bg-purple-100 text-purple-700';
      case PaymentMethod.CREDIT:
        return 'bg-blue-100 text-blue-700';
      default:
        return 'bg-gray-100 text-gray-700';
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
                            <div className="flex items-center space-x-2 flex-wrap">
                                <p className="text-sm text-gray-500">{expense.description}</p>
                                <span className={`text-xs px-2 py-0.5 rounded-full ${getPaymentMethodClass(expense.payment_method)}`}>{expense.payment_method}</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-1">{new Date(expense.date).toLocaleDateString('th-TH')}</p>
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
                <button 
                    onClick={() => setActiveTab('sales')}
                    className={`w-full py-2 text-center rounded-md transition-colors duration-300 ${activeTab === 'sales' ? 'bg-orange-400 text-white shadow' : 'text-gray-600'}`}>
                    รายรับ
                </button>
                <button 
                    onClick={() => setActiveTab('expenses')}
                    className={`w-full py-2 text-center rounded-md transition-colors duration-300 ${activeTab === 'expenses' ? 'bg-orange-400 text-white shadow' : 'text-gray-600'}`}>
                    รายจ่าย
                </button>
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