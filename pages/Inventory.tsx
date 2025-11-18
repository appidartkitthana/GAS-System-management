import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import { InventoryItem, Brand, Size } from '../types';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import Modal from '../components/Modal';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';

const InventoryForm: React.FC<{
  item: InventoryItem | null;
  onSave: (item: InventoryItem | Omit<InventoryItem, 'id'>) => void;
  onClose: () => void;
}> = ({ item, onSave, onClose }) => {
  const [formData, setFormData] = useState(() => {
    if (item) {
      return {
        tank_brand: item.tank_brand,
        tank_size: item.tank_size,
        total: item.total.toString(),
        full: item.full.toString(),
        on_loan: item.on_loan.toString(),
      };
    }
    return {
      tank_brand: Brand.PTT,
      tank_size: Size.S48,
      total: '',
      full: '',
      on_loan: '0',
    };
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const total = parseInt(formData.total, 10) || 0;
    const full = parseInt(formData.full, 10) || 0;

    if (full > total) {
      alert('จำนวนถังเต็มต้องไม่มากกว่าจำนวนทั้งหมด');
      return;
    }

    const submissionData = {
      ...item,
      ...formData,
      total,
      full,
      on_loan: parseInt(formData.on_loan, 10) || 0,
    };

    onSave(submissionData as InventoryItem | Omit<InventoryItem, 'id'>);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <select
        name="tank_brand"
        value={formData.tank_brand}
        onChange={handleChange}
        className="w-full p-2 border rounded"
        disabled={!!item}
      >
        {Object.values(Brand).map(b => (
          <option key={b} value={b}>{b}</option>
        ))}
      </select>

      <select
        name="tank_size"
        value={formData.tank_size}
        onChange={handleChange}
        className="w-full p-2 border rounded"
        disabled={!!item}
      >
        {Object.values(Size).map(s => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      <input
        name="total"
        value={formData.total}
        onChange={handleChange}
        placeholder="จำนวนทั้งหมด"
        type="number"
        className="w-full p-2 border rounded"
        required
      />

      <input
        name="full"
        value={formData.full}
        onChange={handleChange}
        placeholder="จำนวนถังเต็ม"
        type="number"
        className="w-full p-2 border rounded"
        required
      />

      <input
        name="on_loan"
        value={formData.on_loan}
        onChange={handleChange}
        placeholder="จำนวนถังยืม"
        type="number"
        className="w-full p-2 border rounded"
      />

      <div className="flex justify-end space-x-2 mt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 rounded-lg"
        >
          ยกเลิก
        </button>
        <button
          type="submit"
          className="px-4 py-2 bg-sky-500 text-white rounded-lg"
        >
          บันทึก
        </button>
      </div>
    </form>
  );
};

const Inventory: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useAppContext();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);

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
    const totalTanks = inventory.reduce((acc, item) => acc + item.total, 0);
    const totalFull = inventory.reduce((acc, item) => acc + item.full, 0);
    const totalEmpty = totalTanks - totalFull;
    return { totalTanks, totalFull, totalEmpty };
  }, [inventory]);

  return (
    <div>
      <Header title="สต็อกสินค้า">
        <button
          onClick={() => handleOpenModal()}
          className="text-orange-500 hover:text-orange-600"
        >
          <PlusCircleIcon />
        </button>
      </Header>

      <Card className="mb-4">
        <h2 className="text-lg font-semibold mb-2 text-gray-700">สรุปสต็อกทั้งหมด</h2>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-gray-500">ถังทั้งหมด</p>
            <p className="text-2xl font-bold text-gray-800">{summary.totalTanks}</p>
          </div>
          <div>
            <p className="text-sm text-green-500">ถังเต็ม</p>
            <p className="text-2xl font-bold text-green-600">{summary.totalFull}</p>
          </div>
          <div>
            <p className="text-sm text-orange-500">ถังเปล่า</p>
            <p className="text-2xl font-bold text-orange-600">{summary.totalEmpty}</p>
          </div>
        </div>
      </Card>

      <div className="space-y-3">
        {inventory.map((item: InventoryItem) => (
          <Card key={item.id}>
            <h3 className="font-bold text-lg text-sky-700 pr-16">{item.tank_brand} - {item.tank_size}</h3>
            <div className="grid grid-cols-4 gap-2 mt-2 text-center">
              <div>
                <p className="text-xs text-gray-500">ทั้งหมด</p>
                <p className="font-bold text-xl">{item.total}</p>
              </div>
              <div>
                <p className="text-xs text-green-500">เต็ม</p>
                <p className="font-bold text-xl text-green-600">{item.full}</p>
              </div>
              <div>
                <p className="text-xs text-orange-500">เปล่า</p>
                <p className="font-bold text-xl text-orange-600">{item.total - item.full}</p>
              </div>
              <div>
                <p className="text-xs text-blue-500">ยืม</p>
                <p className="font-bold text-xl text-blue-600">{item.on_loan}</p>
              </div>
            </div>
            <div className="absolute top-3 right-3 flex space-x-2">
              <button onClick={() => handleOpenModal(item)} className="text-gray-400 hover:text-sky-500"><PencilIcon /></button>
              <button onClick={() => deleteInventoryItem(item.id)} className="text-gray-400 hover:text-red-500"><TrashIcon /></button>
            </div>
          </Card>
        ))}
      </div>

      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingItem ? 'แก้ไขสต็อก' : 'เพิ่มสต็อกใหม่'}>
        <InventoryForm item={editingItem} onSave={handleSave} onClose={handleCloseModal} />
      </Modal>
    </div>
  );
};

export default Inventory;
