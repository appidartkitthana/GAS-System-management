
import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import { InventoryItem, Brand, Size, InventoryCategory } from '../types';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import Modal from '../components/Modal';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';

const InventoryForm: React.FC<{
  item: InventoryItem | null;
  onSave: (item: InventoryItem | Omit<InventoryItem, 'id'>) => void;
  onClose: () => void;
  category: InventoryCategory;
}> = ({ item, onSave, onClose, category }) => {
  const [formData, setFormData] = useState(() => {
    if (item) return { ...item, cost_price: item.cost_price?.toString() || '', notes: item.notes || '', low_stock_threshold: item.low_stock_threshold?.toString() || '' };
    return {
      category: category,
      tank_brand: category === InventoryCategory.GAS ? Brand.PTT : null,
      tank_size: category === InventoryCategory.GAS ? Size.S48 : null,
      name: '',
      total: 0,
      full: 0,
      on_loan: 0,
      cost_price: '',
      notes: '',
      low_stock_threshold: '',
    };
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const commonData = {
      category: formData.category,
      name: formData.name,
      total: parseInt(formData.total.toString(), 10) || 0,
      full: parseInt(formData.full.toString(), 10) || 0,
      on_loan: parseInt(formData.on_loan.toString(), 10) || 0,
      cost_price: parseFloat(formData.cost_price?.toString() || '0') || 0,
      tank_brand: category === InventoryCategory.ACCESSORY ? null : formData.tank_brand,
      tank_size: category === InventoryCategory.ACCESSORY ? null : formData.tank_size,
      notes: formData.notes,
      low_stock_threshold: formData.low_stock_threshold ? parseInt(formData.low_stock_threshold.toString(), 10) : null,
    };

    if (item) {
        const updateData: InventoryItem = {
            ...commonData,
            id: item.id,
            created_at: item.created_at
        };
        onSave(updateData);
    } else {
        onSave(commonData as Omit<InventoryItem, 'id'>);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {category === InventoryCategory.GAS ? (
        <>
            <select name="tank_brand" value={formData.tank_brand || Brand.PTT} onChange={handleChange} className="w-full p-2 border rounded" disabled={!!item}>
                {Object.values(Brand).map(b => <option key={b} value={b}>{b}</option>)}
            </select>
            <select name="tank_size" value={formData.tank_size || Size.S48} onChange={handleChange} className="w-full p-2 border rounded" disabled={!!item}>
                {Object.values(Size).map(s => <option key={s} value={s}>{s}</option>)}
            </select>
        </>
      ) : (
        <input name="name" value={formData.name || ''} onChange={handleChange} placeholder="ชื่ออุปกรณ์" className="w-full p-2 border rounded" required />
      )}

      <input name="total" value={formData.total} onChange={handleChange} placeholder="จำนวนทั้งหมด" type="number" className="w-full p-2 border rounded" required />
      
      {category === InventoryCategory.GAS && (
          <input name="full" value={formData.full} onChange={handleChange} placeholder="จำนวนถังเต็ม" type="number" className="w-full p-2 border rounded" required />
      )}
      
      <input name="cost_price" value={formData.cost_price} onChange={handleChange} placeholder="ราคาต้นทุน (บาท)" type="number" className="w-full p-2 border rounded" />
      
      <input name="low_stock_threshold" value={formData.low_stock_threshold} onChange={handleChange} placeholder="แจ้งเตือนเมื่อต่ำกว่า (จำนวน)" type="number" className="w-full p-2 border rounded border-orange-200 focus:ring-orange-200" />

      <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Note / รายละเอียดเพิ่มเติม" className="w-full p-2 border rounded" rows={2} />

      <div className="flex justify-end space-x-2 mt-2">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded-lg">ยกเลิก</button>
        <button type="submit" className="px-4 py-2 bg-sky-500 text-white rounded-lg">บันทึก</button>
      </div>
    </form>
  );
};

const Inventory: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useAppContext();
  const [activeTab, setActiveTab] = useState<InventoryCategory>(InventoryCategory.GAS);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

  const filteredInventory = useMemo(() => {
      return inventory.filter(i => i.category === activeTab || (!i.category && activeTab === InventoryCategory.GAS));
  }, [inventory, activeTab]);

  const handleOpenModal = (item: InventoryItem | null = null) => {
    setEditingItem(item);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingItem(null);
    setIsModalOpen(false);
  };

  const handleSave = async (data: InventoryItem | Omit<InventoryItem, 'id'>) => {
    if ('id' in data) {
      await updateInventoryItem(data as InventoryItem);
    } else {
      await addInventoryItem(data as Omit<InventoryItem, 'id'>);
    }
    handleCloseModal();
  };

  const summary = useMemo(() => {
    const gasItems = inventory.filter(i => i.category === InventoryCategory.GAS || !i.category);
    const totalTanks = gasItems.reduce((acc, item) => acc + item.total, 0);
    const totalFull = gasItems.reduce((acc, item) => acc + item.full, 0);
    const totalOnLoan = gasItems.reduce((acc, item) => acc + (item.on_loan || 0), 0);
    // Logic Changed: Empty is Total - Full - OnLoan
    const totalEmpty = totalTanks - totalFull - totalOnLoan;
    return { totalTanks, totalFull, totalEmpty, totalOnLoan };
  }, [inventory]);

  return (
    <div>
      <Header title="สต็อกสินค้า">
        <button onClick={() => handleOpenModal()} className="text-orange-500 hover:text-orange-600"><PlusCircleIcon /></button>
      </Header>

      <div className="flex bg-white/80 p-1 rounded-lg shadow-inner backdrop-blur-sm mb-4">
        <button onClick={() => setActiveTab(InventoryCategory.GAS)} className={`w-full py-2 rounded-md transition-colors ${activeTab === InventoryCategory.GAS ? 'bg-orange-400 text-white shadow' : 'text-gray-600'}`}>ก๊าซหุงต้ม</button>
        <button onClick={() => setActiveTab(InventoryCategory.ACCESSORY)} className={`w-full py-2 rounded-md transition-colors ${activeTab === InventoryCategory.ACCESSORY ? 'bg-orange-400 text-white shadow' : 'text-gray-600'}`}>อุปกรณ์</button>
      </div>

      {activeTab === InventoryCategory.GAS && (
        <Card className="mb-4">
            <div className="grid grid-cols-4 gap-2 text-center">
                <div><p className="text-sm text-gray-500">ถังทั้งหมด</p><p className="text-xl font-bold text-gray-800">{summary.totalTanks}</p></div>
                <div><p className="text-sm text-green-500">ถังเต็ม</p><p className="text-xl font-bold text-green-600">{summary.totalFull}</p></div>
                <div><p className="text-sm text-orange-500">ถังเปล่า</p><p className="text-xl font-bold text-orange-600">{summary.totalEmpty}</p></div>
                <div><p className="text-sm text-blue-500">ถูกยืม</p><p className="text-xl font-bold text-blue-600">{summary.totalOnLoan}</p></div>
            </div>
        </Card>
      )}

      <div className="space-y-3">
        {filteredInventory.map((item: InventoryItem) => {
          const isLowStock = item.low_stock_threshold !== undefined && item.low_stock_threshold !== null && item.full <= item.low_stock_threshold;
          return (
            <Card key={item.id} className={isLowStock ? 'border border-red-300 ring-2 ring-red-100' : ''}>
                {isLowStock && <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] px-2 py-0.5 rounded-bl rounded-tr">สินค้าใกล้หมด</div>}
                <h3 className="font-bold text-lg text-sky-700 pr-16">{item.category === InventoryCategory.ACCESSORY ? item.name : `${item.tank_brand} - ${item.tank_size}`}</h3>
                <div className="grid grid-cols-4 gap-2 mt-2 text-center">
                <div><p className="text-xs text-gray-500">ทั้งหมด</p><p className="font-bold text-xl">{item.total}</p></div>
                {item.category !== InventoryCategory.ACCESSORY && (
                    <>
                        <div><p className="text-xs text-green-500">เต็ม</p><p className={`font-bold text-xl ${isLowStock ? 'text-red-600' : 'text-green-600'}`}>{item.full}</p></div>
                        <div><p className="text-xs text-orange-500">เปล่า</p><p className="font-bold text-xl text-orange-600">{item.total - item.full - (item.on_loan || 0)}</p></div>
                    </>
                )}
                <div><p className="text-xs text-blue-500">ถูกยืม</p><p className="font-bold text-xl text-blue-600">{item.on_loan}</p></div>
                </div>
                <div className="flex justify-between items-center mt-2">
                    <p className="text-xs text-gray-400">ทุน: {item.cost_price?.toLocaleString() || 0} ฿</p>
                    {item.low_stock_threshold && <p className="text-xs text-gray-400">เตือนเมื่อต่ำกว่า: {item.low_stock_threshold}</p>}
                </div>
                {item.notes && <p className="text-xs text-gray-500 mt-1 italic">Note: {item.notes}</p>}
                <div className="absolute top-3 right-3 flex space-x-2">
                <button onClick={() => handleOpenModal(item)} className="text-gray-400 hover:text-sky-500"><PencilIcon /></button>
                <button onClick={() => deleteInventoryItem(item.id)} className="text-gray-400 hover:text-red-500"><TrashIcon /></button>
                </div>
            </Card>
        )})}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingItem ? 'แก้ไขสต็อก' : 'เพิ่มสต็อกใหม่'}>
        <InventoryForm item={editingItem} onSave={handleSave} onClose={handleCloseModal} category={activeTab} />
      </Modal>
    </div>
  );
};

export default Inventory;
