
import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import { Customer, Brand, Size, BorrowedTank, CustomerPriceItem } from '../types';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import Modal from '../components/Modal';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';

const CustomerForm: React.FC<{ customer: Customer | null; onSave: (customer: Customer | Omit<Customer, 'id'>) => void; onClose: () => void; }> = ({ customer, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        branch: customer?.branch || '',
        price: customer?.price.toString() || '',
        tank_brand: customer?.tank_brand || Brand.PTT,
        tank_size: customer?.tank_size || Size.S48,
        address: customer?.address || '',
        tax_id: customer?.tax_id || '',
        notes: customer?.notes || '',
    });
    
    const [borrowedTanks, setBorrowedTanks] = useState<BorrowedTank[]>(customer?.borrowed_tanks || []);
    const [priceList, setPriceList] = useState<CustomerPriceItem[]>(customer?.price_list || []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // --- Borrowed Tanks Logic ---
    const handleAddBorrowed = () => {
        setBorrowedTanks([...borrowedTanks, { brand: Brand.PTT, size: Size.S48, quantity: 1 }]);
    };
    const handleBorrowedChange = (index: number, field: keyof BorrowedTank, value: any) => {
        const updated = [...borrowedTanks];
        updated[index] = { ...updated[index], [field]: value };
        setBorrowedTanks(updated);
    };
    const handleRemoveBorrowed = (index: number) => {
        setBorrowedTanks(borrowedTanks.filter((_, i) => i !== index));
    };

    // --- Price List Logic ---
    const handleAddPrice = () => {
        setPriceList([...priceList, { brand: Brand.PTT, size: Size.S48, price: 0 }]);
    };
    const handlePriceChange = (index: number, field: keyof CustomerPriceItem, value: any) => {
        const updated = [...priceList];
        updated[index] = { ...updated[index], [field]: value };
        setPriceList(updated);
    };
    const handleRemovePrice = (index: number) => {
        setPriceList(priceList.filter((_, i) => i !== index));
    };


    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const submissionData = {
            ...customer,
            ...formData,
            price: parseFloat(formData.price) || 0,
            borrowed_tanks: borrowedTanks,
            price_list: priceList,
        };
        onSave(submissionData as Customer | Omit<Customer, 'id'>);
    };

    return (
        <form onSubmit={handleSubmit}>
            <div className="space-y-4 h-[70vh] overflow-y-auto pr-2">
                <input name="name" value={formData.name} onChange={handleChange} placeholder="ชื่อลูกค้า" className="w-full p-2 border rounded" required />
                <input name="branch" value={formData.branch} onChange={handleChange} placeholder="สาขา" className="w-full p-2 border rounded" required />
                
                {/* Default/Base Price */}
                <div className="p-3 bg-slate-50 rounded border border-slate-200">
                    <label className="block text-xs font-bold text-slate-800 mb-2">ข้อมูลราคาพื้นฐาน & ความชอบ (Default)</label>
                    <div className="flex gap-2 mb-2">
                        <select name="tank_brand" value={formData.tank_brand} onChange={handleChange} className="w-1/2 p-2 border rounded">
                            {Object.values(Brand).map(b => <option key={b} value={b}>{b}</option>)}
                        </select>
                        <select name="tank_size" value={formData.tank_size} onChange={handleChange} className="w-1/2 p-2 border rounded">
                            {Object.values(Size).map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <input name="price" value={formData.price} onChange={handleChange} placeholder="ราคาขายมาตรฐาน (บาท)" type="number" className="w-full p-2 border rounded" />
                </div>

                {/* Specific Price List */}
                <div className="p-3 bg-purple-50 rounded border border-purple-100">
                    <div className="flex justify-between items-center mb-2">
                         <label className="block text-xs font-bold text-purple-800">รายการสินค้าราคาพิเศษ</label>
                         <button type="button" onClick={handleAddPrice} className="text-xs bg-purple-200 text-purple-800 px-2 py-1 rounded hover:bg-purple-300">+ เพิ่มราคา</button>
                    </div>
                    {priceList.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2 mb-2">
                             <select value={item.brand} onChange={(e) => handlePriceChange(index, 'brand', e.target.value)} className="w-1/3 text-xs p-1 border rounded">
                                {Object.values(Brand).map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select value={item.size} onChange={(e) => handlePriceChange(index, 'size', e.target.value)} className="w-1/3 text-xs p-1 border rounded">
                                {Object.values(Size).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input type="number" value={item.price} onChange={(e) => handlePriceChange(index, 'price', parseFloat(e.target.value) || 0)} className="w-20 text-xs p-1 border rounded text-right" placeholder="ราคา" />
                            <button type="button" onClick={() => handleRemovePrice(index)} className="text-red-500"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                    ))}
                    {priceList.length === 0 && <p className="text-xs text-gray-400 italic">ใช้ราคามาตรฐาน</p>}
                </div>


                {/* Borrowed Tanks */}
                <div className="p-3 bg-orange-50 rounded border border-orange-100">
                    <div className="flex justify-between items-center mb-2">
                         <label className="block text-xs font-bold text-orange-800">รายการถังยืม</label>
                         <button type="button" onClick={handleAddBorrowed} className="text-xs bg-orange-200 text-orange-800 px-2 py-1 rounded hover:bg-orange-300">+ เพิ่มรายการ</button>
                    </div>
                    {borrowedTanks.map((item, index) => (
                        <div key={index} className="flex items-center space-x-2 mb-2">
                             <select value={item.brand} onChange={(e) => handleBorrowedChange(index, 'brand', e.target.value)} className="w-1/3 text-xs p-1 border rounded">
                                {Object.values(Brand).map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select value={item.size} onChange={(e) => handleBorrowedChange(index, 'size', e.target.value)} className="w-1/3 text-xs p-1 border rounded">
                                {Object.values(Size).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input type="number" value={item.quantity} onChange={(e) => handleBorrowedChange(index, 'quantity', parseInt(e.target.value) || 0)} className="w-16 text-xs p-1 border rounded" placeholder="จำนวน" />
                            <button type="button" onClick={() => handleRemoveBorrowed(index)} className="text-red-500"><TrashIcon className="h-4 w-4"/></button>
                        </div>
                    ))}
                    {borrowedTanks.length === 0 && <p className="text-xs text-gray-400 italic">ไม่มีรายการยืม</p>}
                </div>

                <textarea name="address" value={formData.address} onChange={handleChange} placeholder="ที่อยู่ (สำหรับใบกำกับภาษี)" className="w-full p-2 border rounded" rows={2}></textarea>
                <input name="tax_id" value={formData.tax_id} onChange={handleChange} placeholder="เลขประจำตัวผู้เสียภาษี" className="w-full p-2 border rounded" />
                <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="หมายเหตุ / Note" className="w-full p-2 border rounded" rows={2}></textarea>
            </div>
            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded-lg">บันทึก</button>
            </div>
        </form>
    )
}

const Customers: React.FC = () => {
    const { customers, addCustomer, updateCustomer, deleteCustomer } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const handleOpenModal = (customer: Customer | null = null) => {
        setEditingCustomer(customer);
        setIsModalOpen(true);
    };

    const handleCloseModal = () => {
        setEditingCustomer(null);
        setIsModalOpen(false);
    };

    const handleSave = async (data: Customer | Omit<Customer, 'id'>) => {
        if ('id' in data) {
            await updateCustomer(data as Customer);
        } else {
            await addCustomer(data as Omit<Customer, 'id'>);
        }
        handleCloseModal();
    }

    const filteredCustomers = useMemo(() => {
        if (!searchQuery.trim()) return customers;
        const lowercasedQuery = searchQuery.toLowerCase();
        return customers.filter(customer =>
            customer.name.toLowerCase().includes(lowercasedQuery) ||
            customer.branch.toLowerCase().includes(lowercasedQuery)
        );
    }, [customers, searchQuery]);

    const getTotalBorrowed = (c: Customer) => {
        if (!c.borrowed_tanks) return 0;
        return c.borrowed_tanks.reduce((acc, curr) => acc + curr.quantity, 0);
    };

  return (
    <div>
       <Header title="ลูกค้า">
        <button onClick={() => handleOpenModal()} className="text-orange-500 hover:text-orange-600">
            <PlusCircleIcon />
        </button>
      </Header>
      <div className="mb-4">
        <input type="text" placeholder="ค้นหาลูกค้า..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full p-3 border border-gray-300 rounded-lg bg-white/80 shadow-inner focus:ring-2 focus:ring-orange-400 focus:outline-none" />
      </div>
      <div className="space-y-3">
        {filteredCustomers.length > 0 ? filteredCustomers.map((customer: Customer) => (
            <Card key={customer.id}>
                <div className="pr-16">
                    <h3 className="font-bold text-lg text-sky-700">{customer.name}</h3>
                    <p className="text-gray-600">{customer.branch}</p>
                    <div className="mt-2 pt-2 border-t border-gray-200 text-sm space-y-1">
                        <p><span className="font-semibold text-gray-500">ราคามาตรฐาน:</span> {customer.price.toLocaleString('th-TH')} ฿</p>
                        {customer.price_list && customer.price_list.length > 0 && (
                            <p className="text-xs text-purple-600">มีรายการราคาสินค้า {customer.price_list.length} รายการ</p>
                        )}
                        {customer.borrowed_tanks && customer.borrowed_tanks.length > 0 && (
                             <div className="bg-orange-50 p-1 rounded mt-1">
                                <p className="font-semibold text-gray-500 text-xs">ถังยืม ({getTotalBorrowed(customer)}):</p>
                                {customer.borrowed_tanks.map((b, idx) => (
                                    <p key={idx} className="text-xs ml-2">- {b.brand} {b.size}: {b.quantity}</p>
                                ))}
                             </div>
                        )}
                        {customer.notes && <p className="text-xs text-gray-500 italic mt-1">Note: {customer.notes}</p>}
                    </div>
                </div>
                 <div className="absolute top-3 right-3 flex space-x-2">
                    <button onClick={() => handleOpenModal(customer)} className="text-gray-400 hover:text-sky-500"><PencilIcon /></button>
                    <button onClick={() => deleteCustomer(customer.id)} className="text-gray-400 hover:text-red-500"><TrashIcon /></button>
                </div>
            </Card>
          )) : <Card><p className="text-center text-gray-500">ไม่พบลูกค้า</p></Card>}
      </div>
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}>
        <CustomerForm customer={editingCustomer} onSave={handleSave} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default Customers;
