
import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import { Customer, Brand, Size, BorrowedTank, CustomerPriceItem } from '../types';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import Modal from '../components/Modal';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';
import MapPinIcon from '../components/icons/MapPinIcon';

const CustomerForm: React.FC<{ customer: Customer | null; onSave: (customer: Customer | Omit<Customer, 'id'>) => void; onClose: () => void; }> = ({ customer, onSave, onClose }) => {
    const [formData, setFormData] = useState({
        name: customer?.name || '',
        branch: customer?.branch || '',
        price: customer?.price.toString() || '',
        tank_brand: customer?.tank_brand || Brand.PTT,
        tank_size: customer?.tank_size || Size.S48,
        address: customer?.address || '',
        google_map_url: customer?.google_map_url || '',
        tax_id: customer?.tax_id || '',
        notes: customer?.notes || '',
    });
    
    const [borrowedTanks, setBorrowedTanks] = useState<BorrowedTank[]>(customer?.borrowed_tanks || []);
    const [priceList, setPriceList] = useState<CustomerPriceItem[]>(customer?.price_list || []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    // Helper to generate search link if no URL is specified
    const handleSearchMap = () => {
        const query = `${formData.name} ${formData.branch} ${formData.address}`.trim();
        if (query) {
            window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`, '_blank');
        } else {
            alert('กรุณากรอกชื่อหรือที่อยู่ก่อนค้นหาแผนที่');
        }
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

                <textarea name="address" value={formData.address} onChange={handleChange} placeholder="ที่อยู่ (สำหรับจัดส่ง / ออกใบกำกับภาษี)" className="w-full p-2 border rounded" rows={2}></textarea>
                
                {/* Google Maps Location Input */}
                <div className="p-3 bg-emerald-50 rounded border border-emerald-200">
                    <label className="block text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                        <MapPinIcon className="h-4 w-4 text-emerald-600" />
                        ลิงก์แผนที่ Google Maps / พิกัด GPS
                    </label>
                    <div className="flex gap-2">
                        <input 
                            name="google_map_url" 
                            value={formData.google_map_url} 
                            onChange={handleChange} 
                            placeholder="วางลิงก์ Google Maps เช่น https://maps.app.goo.gl/..." 
                            className="w-full p-2 text-xs border rounded bg-white" 
                        />
                        <button 
                            type="button" 
                            onClick={handleSearchMap}
                            className="px-2 py-1 bg-emerald-600 text-white rounded text-xs whitespace-nowrap hover:bg-emerald-700 flex items-center gap-1"
                            title="ค้นหาที่อยู่ใน Google Maps"
                        >
                            ค้นหาแผนที่
                        </button>
                    </div>
                </div>

                <input name="tax_id" value={formData.tax_id} onChange={handleChange} placeholder="เลขประจำตัวผู้เสียภาษี" className="w-full p-2 border rounded" />
                <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="หมายเหตุ / Note" className="w-full p-2 border rounded" rows={2}></textarea>
            </div>
            <div className="flex justify-end space-x-2 mt-6 pt-4 border-t">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">ยกเลิก</button>
                <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded-lg">บันทึก</button>
            </div>
        </form>
    );
};

const BorrowedTankQuickModal: React.FC<{
    customer: Customer;
    isOpen: boolean;
    onClose: () => void;
    onSave: (updatedCustomer: Customer) => void;
}> = ({ customer, isOpen, onClose, onSave }) => {
    const [borrowedTanks, setBorrowedTanks] = useState<BorrowedTank[]>(customer.borrowed_tanks || []);

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

    const handleSave = () => {
        onSave({
            ...customer,
            borrowed_tanks: borrowedTanks
        });
        onClose();
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`แก้ไขถังยืม - ${customer.name} (${customer.branch || 'สำนักงานใหญ่'})`}>
            <div className="space-y-4">
                <div className="p-3 bg-orange-50/80 rounded-lg border border-orange-200">
                    <div className="flex justify-between items-center mb-3">
                        <span className="font-bold text-xs text-orange-800">รายการถังที่ยืมอยู่ปัจจุบัน</span>
                        <button type="button" onClick={handleAddBorrowed} className="px-2.5 py-1 bg-orange-500 text-white text-xs font-semibold rounded hover:bg-orange-600">
                            + เพิ่มถังยืม
                        </button>
                    </div>
                    {borrowedTanks.map((item, index) => (
                        <div key={index} className="flex items-center gap-2 mb-2 bg-white p-2 rounded border border-orange-100">
                            <select value={item.brand} onChange={(e) => handleBorrowedChange(index, 'brand', e.target.value)} className="w-1/3 text-xs p-1.5 border rounded">
                                {Object.values(Brand).map(b => <option key={b} value={b}>{b}</option>)}
                            </select>
                            <select value={item.size} onChange={(e) => handleBorrowedChange(index, 'size', e.target.value)} className="w-1/3 text-xs p-1.5 border rounded">
                                {Object.values(Size).map(s => <option key={s} value={s}>{s}</option>)}
                            </select>
                            <input type="number" min="0" value={item.quantity} onChange={(e) => handleBorrowedChange(index, 'quantity', parseInt(e.target.value) || 0)} className="w-20 text-xs p-1.5 border rounded font-bold text-center" placeholder="จำนวน" />
                            <button type="button" onClick={() => handleRemoveBorrowed(index)} className="p-1 text-red-500 hover:text-red-700">
                                <TrashIcon className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    {borrowedTanks.length === 0 && <p className="text-xs text-gray-400 italic text-center py-2">ไม่มีรายการถังยืม</p>}
                </div>
                <div className="flex justify-end gap-2 pt-2 border-t">
                    <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-xs font-bold rounded-lg hover:bg-gray-300">ยกเลิก</button>
                    <button type="button" onClick={handleSave} className="px-4 py-2 bg-orange-500 text-white text-xs font-bold rounded-lg hover:bg-orange-600">บันทึกถังยืม</button>
                </div>
            </div>
        </Modal>
    );
};

const Customers: React.FC = () => {
    const { customers, addCustomer, updateCustomer, deleteCustomer } = useAppContext();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
    const [editingBorrowedCustomer, setEditingBorrowedCustomer] = useState<Customer | null>(null);
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
                        <div className="bg-orange-50/80 p-2 rounded-lg mt-2 border border-orange-100">
                            <div className="flex justify-between items-center mb-1">
                                <p className="font-semibold text-gray-700 text-xs">ถังยืม ({getTotalBorrowed(customer)} ถัง):</p>
                                <button 
                                    onClick={() => setEditingBorrowedCustomer(customer)}
                                    className="text-[11px] bg-orange-100 text-orange-800 px-2 py-0.5 rounded font-medium hover:bg-orange-200 transition-colors"
                                >
                                    แก้ไขถังยืม
                                </button>
                            </div>
                            {customer.borrowed_tanks && customer.borrowed_tanks.length > 0 ? (
                                customer.borrowed_tanks.map((b, idx) => (
                                    <p key={idx} className="text-xs ml-1 text-gray-600">- {b.brand} {b.size}: <span className="font-bold text-orange-700">{b.quantity}</span></p>
                                ))
                            ) : (
                                <p className="text-xs text-gray-400 italic ml-1">ไม่มีรายการถังยืม</p>
                            )}
                        </div>

                        {customer.address && <p className="text-xs text-gray-600 mt-1"><span className="font-semibold text-gray-500">ที่อยู่:</span> {customer.address}</p>}
                        
                        {/* Map Link Button */}
                        <div className="pt-1">
                            <a 
                                href={customer.google_map_url || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((customer.name + ' ' + (customer.branch || '') + ' ' + (customer.address || '')).trim())}`} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                            >
                                <MapPinIcon className="h-3.5 w-3.5 text-emerald-600" />
                                <span>ดูแผนที่ร้าน (Google Maps)</span>
                            </a>
                        </div>

                        {customer.notes && <p className="text-xs text-gray-500 italic mt-1">Note: {customer.notes}</p>}
                    </div>
                </div>
                 <div className="absolute top-3 right-3 flex space-x-2">
                    <button onClick={() => handleOpenModal(customer)} className="text-gray-400 hover:text-sky-500" title="แก้ไขลูกค้า"><PencilIcon /></button>
                    <button onClick={() => deleteCustomer(customer.id)} className="text-gray-400 hover:text-red-500" title="ลบลูกค้า"><TrashIcon /></button>
                </div>
            </Card>
          )) : <Card><p className="text-center text-gray-500">ไม่พบลูกค้า</p></Card>}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingCustomer ? 'แก้ไขข้อมูลลูกค้า' : 'เพิ่มลูกค้าใหม่'}>
        <CustomerForm customer={editingCustomer} onSave={handleSave} onClose={handleCloseModal} />
      </Modal>

      {editingBorrowedCustomer && (
        <BorrowedTankQuickModal 
            customer={editingBorrowedCustomer}
            isOpen={!!editingBorrowedCustomer}
            onClose={() => setEditingBorrowedCustomer(null)}
            onSave={(updated) => {
                updateCustomer(updated);
                setEditingBorrowedCustomer(null);
            }}
        />
      )}
    </div>
  );
};

export default Customers;
