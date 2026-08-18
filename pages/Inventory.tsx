import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import { InventoryItem, Brand, Size, InventoryCategory, TankLoanAuditLog } from '../types';
import PlusCircleIcon from '../components/icons/PlusCircleIcon';
import Modal from '../components/Modal';
import PencilIcon from '../components/icons/PencilIcon';
import TrashIcon from '../components/icons/TrashIcon';

// --- Direct Tank Loan & Quick Adjust Modal (PART 13 & PART 14) ---
interface DirectTankLoanModalProps {
  item: InventoryItem;
  isOpen: boolean;
  onClose: () => void;
  onSave: (
    updatedItem: InventoryItem,
    auditData: { customerName: string; customerId?: string; editedBy: string; reason: string; oldLoan: number; newLoan: number }
  ) => void;
}

const DirectTankLoanModal: React.FC<DirectTankLoanModalProps> = ({ item, isOpen, onClose, onSave }) => {
  const { customers } = useAppContext();

  // Tank counts state
  const [total, setTotal] = useState<number>(item.total || 0);
  const [full, setFull] = useState<number>(item.full || 0);
  const [onLoan, setOnLoan] = useState<number>(item.on_loan || 0);

  // Audit info state (PART 14)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [customCustomerName, setCustomCustomerName] = useState<string>('');
  const [editedBy, setEditedBy] = useState<string>('เจ้าหน้าที่');
  const [reason, setReason] = useState<string>('ปรับปรุงจำนวนถังยืม');

  // Recalculate empty tanks immediately: Empty = Total - Full - OnLoan
  const calculatedEmpty = total - full - onLoan;
  const isNegativeEmpty = calculatedEmpty < 0;
  const isNegativeAny = total < 0 || full < 0 || onLoan < 0 || calculatedEmpty < 0;

  const handleCustomerChange = (custId: string) => {
    setSelectedCustomerId(custId);
    if (custId) {
      const cust = customers.find(c => c.id === custId);
      if (cust) {
        setCustomCustomerName(`${cust.name} (${cust.branch || 'สำนักงานใหญ่'})`);
      }
    } else {
      setCustomCustomerName('สต๊อกกลาง / ปรับยอดร้าน');
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (isNegativeEmpty) {
      alert(`⚠️ คำเตือน: จำนวนถังเปล่าจะติดลบ (${calculatedEmpty} ถัง)!\nถังเต็ม (${full}) + ถังยืม (${onLoan}) รวมเป็น ${full + onLoan} ถัง ซึ่งมากกว่าถังทั้งหมด (${total})\nกรุณาปรับปรุงจำนวนถังทั้งหมดหรือถังเต็มก่อนบันทึก`);
      return;
    }

    if (total < 0 || full < 0 || onLoan < 0) {
      alert('⚠️ ข้อผิดพลาด: จำนวนถังต้องไม่ต่ำกว่า 0');
      return;
    }

    const customerName = selectedCustomerId 
      ? (customers.find(c => c.id === selectedCustomerId)?.name || customCustomerName || 'ลูกค้า')
      : (customCustomerName.trim() || 'สต๊อกกลาง / ปรับยอดร้าน');

    const updatedItem: InventoryItem = {
      ...item,
      total: Math.max(0, total),
      full: Math.max(0, full),
      on_loan: Math.max(0, onLoan),
    };

    onSave(updatedItem, {
      customerId: selectedCustomerId || undefined,
      customerName,
      editedBy: editedBy.trim() || 'เจ้าหน้าที่',
      reason: reason.trim() || 'ปรับปรุงจำนวนถังยืม',
      oldLoan: item.on_loan || 0,
      newLoan: onLoan,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`ปรับปรุงสต๊อก & ถังยืม: ${item.tank_brand} ${item.tank_size}`}>
      <form onSubmit={handleSave} className="space-y-4">
        {/* Real-time Cylinder Calculation Card */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              สถานะถังแบบเรียลไทม์ (Live Recalculate)
            </span>
            <span className="text-[11px] font-medium text-slate-500">
              ถังเปล่า = ถังทั้งหมด - ถังเต็ม - ถังยืม
            </span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center">
            <div className="bg-white p-2 rounded border border-gray-200 shadow-2xs">
              <p className="text-[11px] text-gray-500 font-semibold">ถังทั้งหมด</p>
              <p className="text-lg font-bold text-gray-900 mt-0.5">{total}</p>
            </div>
            <div className="bg-white p-2 rounded border border-gray-200 shadow-2xs">
              <p className="text-[11px] text-emerald-600 font-semibold">ถังเต็ม</p>
              <p className="text-lg font-bold text-emerald-600 mt-0.5">{full}</p>
            </div>
            <div className={`p-2 rounded border shadow-2xs ${isNegativeEmpty ? 'bg-red-50 border-red-300 ring-2 ring-red-200' : 'bg-white border-gray-200'}`}>
              <p className={`text-[11px] font-semibold ${isNegativeEmpty ? 'text-red-700' : 'text-orange-600'}`}>ถังเปล่า</p>
              <p className={`text-lg font-bold mt-0.5 ${isNegativeEmpty ? 'text-red-700' : 'text-orange-600'}`}>
                {calculatedEmpty}
              </p>
            </div>
            <div className="bg-blue-50 p-2 rounded border border-blue-200 shadow-2xs">
              <p className="text-[11px] text-blue-700 font-bold">ถังยืม</p>
              <p className="text-lg font-bold text-blue-700 mt-0.5">{onLoan}</p>
            </div>
          </div>

          {/* Warning Banner if negative empty cylinders */}
          {isNegativeEmpty && (
            <div className="p-2.5 bg-red-100 border border-red-300 text-red-800 rounded-md text-xs flex items-start gap-2 animate-pulse">
              <span className="text-base font-bold leading-none">⚠️</span>
              <div>
                <p className="font-bold">คำเตือน: ถังเปล่าติดลบ ({calculatedEmpty} ถัง)</p>
                <p className="text-[11px] mt-0.5 leading-normal">
                  ถังเต็ม ({full}) + ถังยืม ({onLoan}) = {full + onLoan} ถัง ซึ่งมากกว่าถังทั้งหมด ({total}) กรุณาเพิ่มจำนวนถังทั้งหมดหรือปรับลดถังเต็ม/ถังยืม
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Tank Editing Inputs */}
        <div className="p-3 bg-white border border-gray-200 rounded-lg space-y-3">
          <label className="block text-xs font-bold text-gray-800">
            1. ปรับจำนวนถังโดยตรง (Direct Tank Edit)
          </label>
          
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-blue-700 mb-1">
                จำนวนถังยืม:
              </label>
              <div className="flex items-center">
                <button
                  type="button"
                  onClick={() => setOnLoan(prev => Math.max(0, prev - 1))}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-l border border-r-0 border-gray-300 text-xs font-bold"
                >
                  -
                </button>
                <input
                  type="number"
                  min="0"
                  value={onLoan}
                  onChange={(e) => setOnLoan(parseInt(e.target.value) || 0)}
                  className="w-full p-1.5 border border-blue-400 text-center font-bold text-blue-700 text-sm focus:ring-2 focus:ring-blue-300 focus:outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setOnLoan(prev => prev + 1)}
                  className="px-2 py-1 bg-gray-200 hover:bg-gray-300 rounded-r border border-l-0 border-gray-300 text-xs font-bold"
                >
                  +
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-emerald-700 mb-1">
                จำนวนถังเต็ม:
              </label>
              <input
                type="number"
                min="0"
                value={full}
                onChange={(e) => setFull(parseInt(e.target.value) || 0)}
                className="w-full p-1.5 border border-gray-300 rounded text-center font-bold text-emerald-700 text-sm focus:ring-2 focus:ring-emerald-300 focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                ถังทั้งหมดในระบบ:
              </label>
              <input
                type="number"
                min="0"
                value={total}
                onChange={(e) => setTotal(parseInt(e.target.value) || 0)}
                className="w-full p-1.5 border border-gray-300 rounded text-center font-bold text-gray-800 text-sm focus:ring-2 focus:ring-gray-300 focus:outline-none"
                required
              />
            </div>
          </div>
        </div>

        {/* Audit Log Information (PART 14) */}
        <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg space-y-3">
          <div className="flex justify-between items-center">
            <label className="block text-xs font-bold text-amber-900">
              2. ข้อมูลการบันทึกประวัติถังยืม (Audit Trail)
            </label>
            <span className="text-[10px] text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded font-medium">
              เดิม: {item.on_loan || 0} → ใหม่: {onLoan} ({onLoan - (item.on_loan || 0) >= 0 ? `+${onLoan - (item.on_loan || 0)}` : onLoan - (item.on_loan || 0)} ถัง)
            </span>
          </div>

          <div className="space-y-2 text-xs">
            <div>
              <label className="block text-[11px] font-medium text-gray-700 mb-1">
                ลูกค้าที่เกี่ยวข้อง (หรือสต๊อกกลาง):
              </label>
              <select
                value={selectedCustomerId}
                onChange={(e) => handleCustomerChange(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded bg-white font-medium"
              >
                <option value="">-- สต๊อกกลาง / ปรับยอดร้าน --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.branch ? `(${c.branch})` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  ผู้แก้ไข:
                </label>
                <input
                  type="text"
                  value={editedBy}
                  onChange={(e) => setEditedBy(e.target.value)}
                  placeholder="เช่น Admin, ช่างส่งของ"
                  className="w-full p-1.5 border border-gray-300 rounded bg-white"
                  required
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-gray-700 mb-1">
                  เหตุผล / หมายเหตุ:
                </label>
                <input
                  type="text"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="เช่น ลูกค้ายืมเพิ่ม 2 ถัง, คืนถัง"
                  className="w-full p-1.5 border border-gray-300 rounded bg-white"
                  required
                />
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end space-x-2 pt-3 border-t">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300"
          >
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={isNegativeAny}
            className={`px-4 py-2 text-white text-xs font-bold rounded-lg shadow transition-colors ${
              isNegativeAny
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            บันทึกการแก้ไข & ประวัติ
          </button>
        </div>
      </form>
    </Modal>
  );
};

// --- Full Inventory Item Form ---
const InventoryForm: React.FC<{
  item: InventoryItem | null;
  onSave: (item: InventoryItem | Omit<InventoryItem, 'id'>, auditData?: { customerName: string; editedBy: string; reason: string; oldLoan: number; newLoan: number }) => void;
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

  const [editedBy, setEditedBy] = useState('เจ้าหน้าที่');
  const [auditReason, setAuditReason] = useState('แก้ไขสต็อกสินค้า');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const totalNum = parseInt(formData.total.toString(), 10) || 0;
  const fullNum = parseInt(formData.full.toString(), 10) || 0;
  const onLoanNum = parseInt(formData.on_loan.toString(), 10) || 0;
  const calculatedEmpty = totalNum - fullNum - onLoanNum;
  const isNegativeEmpty = category === InventoryCategory.GAS && calculatedEmpty < 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isNegativeEmpty) {
      alert(`⚠️ คำเตือน: จำนวนถังเปล่าจะติดลบ (${calculatedEmpty} ถัง)!\nถังเต็ม (${fullNum}) + ถังยืม (${onLoanNum}) รวมเป็น ${fullNum + onLoanNum} ถัง ซึ่งมากกว่าถังทั้งหมด (${totalNum})`);
      return;
    }

    const commonData = {
      category: formData.category,
      name: formData.name,
      total: totalNum,
      full: fullNum,
      on_loan: onLoanNum,
      cost_price: parseFloat(formData.cost_price?.toString() || '0') || 0,
      tank_brand: category === InventoryCategory.ACCESSORY ? null : formData.tank_brand,
      tank_size: category === InventoryCategory.ACCESSORY ? null : formData.tank_size,
      notes: formData.notes,
      low_stock_threshold: formData.low_stock_threshold ? parseInt(formData.low_stock_threshold.toString(), 10) : null,
    };

    const oldLoan = item?.on_loan || 0;
    const loanChanged = category === InventoryCategory.GAS && item && oldLoan !== onLoanNum;

    const auditData = loanChanged ? {
      customerName: 'สต๊อกกลาง / ปรับยอดร้าน',
      editedBy: editedBy.trim() || 'เจ้าหน้าที่',
      reason: auditReason.trim() || 'ปรับปรุงสต็อก',
      oldLoan,
      newLoan: onLoanNum
    } : undefined;

    if (item) {
      const updateData: InventoryItem = {
        ...commonData,
        id: item.id,
        created_at: item.created_at
      };
      onSave(updateData, auditData);
    } else {
      onSave(commonData as Omit<InventoryItem, 'id'>, auditData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {category === InventoryCategory.GAS ? (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ยี่ห้อแก๊ส:</label>
              <select name="tank_brand" value={formData.tank_brand || Brand.PTT} onChange={handleChange} className="w-full p-2 border rounded text-xs" disabled={!!item}>
                {Object.values(Brand).map(b => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">ขนาดถัง:</label>
              <select name="tank_size" value={formData.tank_size || Size.S48} onChange={handleChange} className="w-full p-2 border rounded text-xs" disabled={!!item}>
                {Object.values(Size).map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>

          {/* Live Recalculation Badge */}
          <div className="bg-slate-50 border border-slate-200 rounded p-2.5 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-700 font-bold">
              <span>คำนวณสถานะถังแบบเรียลไทม์:</span>
              <span className={isNegativeEmpty ? 'text-red-600' : 'text-orange-600'}>
                ถังเปล่า: <strong>{calculatedEmpty} ถัง</strong>
              </span>
            </div>
            {isNegativeEmpty && (
              <p className="text-[11px] text-red-600 font-medium">
                ⚠️ ถังเต็ม ({fullNum}) + ถังยืม ({onLoanNum}) เกินถังทั้งหมด ({totalNum})
              </p>
            )}
          </div>
        </>
      ) : (
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">ชื่ออุปกรณ์:</label>
          <input name="name" value={formData.name || ''} onChange={handleChange} placeholder="ชื่ออุปกรณ์" className="w-full p-2 border rounded text-xs" required />
        </div>
      )}

      <div className="grid grid-cols-3 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">ถังทั้งหมด:</label>
          <input name="total" value={formData.total} onChange={handleChange} placeholder="จำนวนทั้งหมด" type="number" min="0" className="w-full p-2 border rounded text-xs font-bold text-center" required />
        </div>
        {category === InventoryCategory.GAS && (
          <>
            <div>
              <label className="block text-xs font-semibold text-emerald-700 mb-1">ถังเต็ม:</label>
              <input name="full" value={formData.full} onChange={handleChange} placeholder="จำนวนถังเต็ม" type="number" min="0" className="w-full p-2 border rounded text-xs font-bold text-emerald-700 text-center" required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-blue-700 mb-1">ถังยืม (On Loan):</label>
              <input name="on_loan" value={formData.on_loan} onChange={handleChange} placeholder="จำนวนถังยืม" type="number" min="0" className="w-full p-2 border rounded text-xs font-bold text-blue-700 text-center" required />
            </div>
          </>
        )}
      </div>
      
      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">ราคาต้นทุน (บาท):</label>
          <input name="cost_price" value={formData.cost_price} onChange={handleChange} placeholder="ราคาต้นทุน (บาท)" type="number" step="0.01" className="w-full p-2 border rounded text-xs" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-700 mb-1">เตือนเมื่อถังเต็มต่ำกว่า:</label>
          <input name="low_stock_threshold" value={formData.low_stock_threshold} onChange={handleChange} placeholder="จำนวนถังขั้นต่ำ" type="number" className="w-full p-2 border rounded text-xs border-orange-200 focus:ring-orange-200" />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-gray-700 mb-1">หมายเหตุเพิ่มเติม:</label>
        <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Note / รายละเอียดเพิ่มเติม" className="w-full p-2 border rounded text-xs" rows={2} />
      </div>

      {/* If loan changed in gas item, ask for audit trail */}
      {category === InventoryCategory.GAS && item && item.on_loan !== onLoanNum && (
        <div className="p-2.5 bg-amber-50 border border-amber-200 rounded text-xs space-y-2">
          <p className="font-bold text-amber-900 text-[11px]">บันทึกประวัติการเปลี่ยนถังยืม ({item.on_loan || 0} → {onLoanNum} ถัง):</p>
          <div className="grid grid-cols-2 gap-2">
            <input type="text" value={editedBy} onChange={(e) => setEditedBy(e.target.value)} placeholder="ผู้แก้ไข" className="p-1.5 border rounded bg-white text-xs" />
            <input type="text" value={auditReason} onChange={(e) => setAuditReason(e.target.value)} placeholder="เหตุผลการแก้ไข" className="p-1.5 border rounded bg-white text-xs" />
          </div>
        </div>
      )}

      <div className="flex justify-end space-x-2 mt-4 pt-3 border-t">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300">ยกเลิก</button>
        <button type="submit" disabled={isNegativeEmpty} className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shadow">บันทึก</button>
      </div>
    </form>
  );
};

// --- MAIN INVENTORY COMPONENT ---
const Inventory: React.FC = () => {
  const { inventory, addInventoryItem, updateInventoryItem, deleteInventoryItem, tankLoanLogs, addTankLoanLog, clearTankLoanLogs } = useAppContext();
  
  // Navigation & View State
  const [activeMainView, setActiveMainView] = useState<'STOCK' | 'LOGS'>('STOCK');
  const [activeTab, setActiveTab] = useState<InventoryCategory>(InventoryCategory.GAS);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  const [directLoanItem, setDirectLoanItem] = useState<InventoryItem | null>(null);

  // Audit Logs Filter State (PART 14)
  const [logSearchQuery, setLogSearchQuery] = useState('');
  const [logBrandFilter, setLogBrandFilter] = useState<string>('ALL');
  const [logDateFilter, setLogDateFilter] = useState<string>('');

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

  const handleSave = async (
    data: InventoryItem | Omit<InventoryItem, 'id'>, 
    auditData?: { customerName: string; editedBy: string; reason: string; oldLoan: number; newLoan: number }
  ) => {
    if ('id' in data) {
      await updateInventoryItem(data as InventoryItem);
      if (auditData && data.tank_brand && data.tank_size) {
        addTankLoanLog({
          customer_name: auditData.customerName,
          tank_brand: data.tank_brand,
          tank_size: data.tank_size,
          old_quantity: auditData.oldLoan,
          new_quantity: auditData.newLoan,
          diff_quantity: auditData.newLoan - auditData.oldLoan,
          edited_by: auditData.editedBy,
          reason: auditData.reason,
        });
      }
    } else {
      await addInventoryItem(data as Omit<InventoryItem, 'id'>);
    }
    handleCloseModal();
  };

  const handleDirectLoanSave = async (
    updatedItem: InventoryItem,
    auditData: { customerName: string; customerId?: string; editedBy: string; reason: string; oldLoan: number; newLoan: number }
  ) => {
    await updateInventoryItem(updatedItem);
    if (updatedItem.tank_brand && updatedItem.tank_size) {
      addTankLoanLog({
        customer_id: auditData.customerId,
        customer_name: auditData.customerName,
        tank_brand: updatedItem.tank_brand,
        tank_size: updatedItem.tank_size,
        old_quantity: auditData.oldLoan,
        new_quantity: auditData.newLoan,
        diff_quantity: auditData.newLoan - auditData.oldLoan,
        edited_by: auditData.editedBy,
        reason: auditData.reason,
      });
    }
  };

  const summary = useMemo(() => {
    const gasItems = inventory.filter(i => i.category === InventoryCategory.GAS || !i.category);
    const totalTanks = gasItems.reduce((acc, item) => acc + item.total, 0);
    const totalFull = gasItems.reduce((acc, item) => acc + item.full, 0);
    const totalOnLoan = gasItems.reduce((acc, item) => acc + (item.on_loan || 0), 0);
    const totalEmpty = totalTanks - totalFull - totalOnLoan;
    return { totalTanks, totalFull, totalEmpty, totalOnLoan };
  }, [inventory]);

  // Filtered Audit Logs (PART 14)
  const filteredLogs = useMemo(() => {
    return tankLoanLogs.filter(log => {
      const matchSearch = !logSearchQuery.trim() || 
        log.customer_name?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        log.reason?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        log.edited_by?.toLowerCase().includes(logSearchQuery.toLowerCase()) ||
        `${log.tank_brand} ${log.tank_size}`.toLowerCase().includes(logSearchQuery.toLowerCase());
      
      const matchBrand = logBrandFilter === 'ALL' || log.tank_brand === logBrandFilter;
      const matchDate = !logDateFilter || log.date === logDateFilter;

      return matchSearch && matchBrand && matchDate;
    });
  }, [tankLoanLogs, logSearchQuery, logBrandFilter, logDateFilter]);

  return (
    <div className="space-y-4">
      <Header title="สต็อกสินค้า & จัดการถังยืม">
        <div className="flex items-center gap-2">
          {activeMainView === 'STOCK' && (
            <button 
              onClick={() => handleOpenModal()} 
              className="px-3 py-1.5 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow"
            >
              <PlusCircleIcon className="h-4 w-4" />
              <span>เพิ่มสต็อกใหม่</span>
            </button>
          )}
        </div>
      </Header>

      {/* Top View Selector: Stock vs Audit Trail */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-200">
        <button
          onClick={() => setActiveMainView('STOCK')}
          className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeMainView === 'STOCK'
              ? 'bg-orange-500 text-white shadow'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
          </svg>
          <span>สต็อกสินค้า (Cylinder Stock)</span>
        </button>

        <button
          onClick={() => setActiveMainView('LOGS')}
          className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 ${
            activeMainView === 'LOGS'
              ? 'bg-orange-500 text-white shadow'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
          }`}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>ประวัติการแก้ไขถังยืม (Audit Logs)</span>
          {tankLoanLogs.length > 0 && (
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${activeMainView === 'LOGS' ? 'bg-white text-orange-600' : 'bg-orange-100 text-orange-800'}`}>
              {tankLoanLogs.length}
            </span>
          )}
        </button>
      </div>

      {/* --- VIEW 1: INVENTORY STOCK --- */}
      {activeMainView === 'STOCK' && (
        <div className="space-y-4">
          <div className="flex bg-white/90 p-1 rounded-lg shadow-inner border border-gray-200">
            <button 
              onClick={() => setActiveTab(InventoryCategory.GAS)} 
              className={`w-full py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === InventoryCategory.GAS ? 'bg-slate-800 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              ก๊าซหุงต้ม (Gas Cylinders)
            </button>
            <button 
              onClick={() => setActiveTab(InventoryCategory.ACCESSORY)} 
              className={`w-full py-1.5 text-xs font-bold rounded-md transition-colors ${activeTab === InventoryCategory.ACCESSORY ? 'bg-slate-800 text-white shadow' : 'text-gray-600 hover:text-gray-900'}`}
            >
              อุปกรณ์ (Accessories)
            </button>
          </div>

          {activeTab === InventoryCategory.GAS && (
            <Card className="border border-slate-200">
              <div className="flex justify-between items-center mb-2 pb-2 border-b border-gray-100">
                <span className="text-xs font-bold text-gray-700">ภาพรวมสต็อกแก๊สทั้งหมดในระบบ</span>
                <span className="text-[11px] text-gray-500 font-medium">สูตร: ถังเปล่า = ถังทั้งหมด - ถังเต็ม - ถังยืม</span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center">
                <div className="p-2 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-500 font-medium">ถังทั้งหมด</p>
                  <p className="text-xl font-bold text-gray-900 mt-0.5">{summary.totalTanks}</p>
                </div>
                <div className="p-2 bg-emerald-50 rounded border border-emerald-200">
                  <p className="text-xs text-emerald-700 font-semibold">ถังเต็ม</p>
                  <p className="text-xl font-bold text-emerald-600 mt-0.5">{summary.totalFull}</p>
                </div>
                <div className="p-2 bg-amber-50 rounded border border-amber-200">
                  <p className="text-xs text-amber-700 font-semibold">ถังเปล่า</p>
                  <p className="text-xl font-bold text-amber-600 mt-0.5">{summary.totalEmpty}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded border border-blue-200">
                  <p className="text-xs text-blue-700 font-semibold">ถังยืม (ถูกยืม)</p>
                  <p className="text-xl font-bold text-blue-600 mt-0.5">{summary.totalOnLoan}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredInventory.map((item: InventoryItem) => {
              const isLowStock = item.low_stock_threshold !== undefined && item.low_stock_threshold !== null && item.full <= item.low_stock_threshold;
              const emptyTanks = item.total - item.full - (item.on_loan || 0);
              const isNegativeEmpty = item.category === InventoryCategory.GAS && emptyTanks < 0;

              return (
                <Card key={item.id} className={`relative flex flex-col justify-between ${isLowStock ? 'border border-red-300 ring-2 ring-red-100' : ''}`}>
                  {isLowStock && (
                    <div className="absolute top-0 right-0 bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-bl rounded-tr shadow-2xs">
                      สินค้าใกล้หมด
                    </div>
                  )}

                  <div>
                    <h3 className="font-bold text-base text-sky-800 pr-14 leading-snug">
                      {item.category === InventoryCategory.ACCESSORY ? item.name : `${item.tank_brand} - ${item.tank_size}`}
                    </h3>

                    {/* Cylinder Numbers Breakdown */}
                    <div className="grid grid-cols-4 gap-1.5 mt-3 text-center">
                      <div className="bg-gray-50 p-1.5 rounded border border-gray-200">
                        <p className="text-[10px] text-gray-500 font-medium">ทั้งหมด</p>
                        <p className="font-bold text-base text-gray-900">{item.total}</p>
                      </div>

                      {item.category !== InventoryCategory.ACCESSORY && (
                        <>
                          <div className="bg-emerald-50/60 p-1.5 rounded border border-emerald-200">
                            <p className="text-[10px] text-emerald-700 font-medium">เต็ม</p>
                            <p className={`font-bold text-base ${isLowStock ? 'text-red-600' : 'text-emerald-700'}`}>{item.full}</p>
                          </div>
                          <div className={`p-1.5 rounded border ${isNegativeEmpty ? 'bg-red-50 border-red-300 text-red-700 font-bold' : 'bg-orange-50/60 border-orange-200 text-orange-700'}`}>
                            <p className="text-[10px] font-medium">เปล่า</p>
                            <p className="font-bold text-base">{emptyTanks}</p>
                          </div>
                        </>
                      )}

                      <div className="bg-blue-50 p-1.5 rounded border border-blue-200">
                        <p className="text-[10px] text-blue-700 font-bold">ถูกยืม</p>
                        <p className="font-bold text-base text-blue-700">{item.on_loan || 0}</p>
                      </div>
                    </div>

                    {isNegativeEmpty && (
                      <p className="text-[10px] text-red-600 font-bold mt-1.5 bg-red-50 p-1 rounded border border-red-200 text-center">
                        ⚠️ ถังเปล่าติดลบ ({emptyTanks})
                      </p>
                    )}

                    <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-gray-100 text-xs">
                      <p className="text-[11px] text-gray-500">ทุน: <strong>{item.cost_price?.toLocaleString() || 0} ฿</strong></p>
                      {item.low_stock_threshold && (
                        <p className="text-[11px] text-gray-500">เตือนเมื่อ: <strong>{item.low_stock_threshold}</strong></p>
                      )}
                    </div>
                    {item.notes && <p className="text-[11px] text-gray-500 mt-1 italic line-clamp-1">Note: {item.notes}</p>}
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-3 pt-2.5 border-t border-gray-100 flex justify-between items-center">
                    {item.category === InventoryCategory.GAS ? (
                      <button
                        onClick={() => setDirectLoanItem(item)}
                        className="w-full py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-xs font-bold rounded-md border border-blue-200 flex items-center justify-center gap-1 transition-colors"
                        title="แก้ไขจำนวนถังยืมและสต๊อกโดยตรง"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                        <span>แก้ไขถังยืม / สต๊อก</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => handleOpenModal(item)}
                        className="w-full py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 text-xs font-semibold rounded-md border border-gray-200 flex items-center justify-center gap-1"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                        <span>แก้ไขอุปกรณ์</span>
                      </button>
                    )}
                  </div>

                  {/* Corner quick tools */}
                  <div className="absolute top-2.5 right-2.5 flex space-x-1.5">
                    <button onClick={() => handleOpenModal(item)} className="p-1 text-gray-400 hover:text-sky-600" title="แก้ไขข้อมูลทั้งหมด">
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button onClick={() => deleteInventoryItem(item.id)} className="p-1 text-gray-400 hover:text-red-500" title="ลบรายการ">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* --- VIEW 2: TANK LOAN AUDIT TRAIL / LOGS (PART 14) --- */}
      {activeMainView === 'LOGS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-3.5 rounded-xl border border-gray-200 shadow-sm space-y-3">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="ค้นหาประวัติถังยืม (ชื่อลูกค้า, ยี่ห้อ, ผู้แก้ไข, เหตุผล)..."
                  value={logSearchQuery}
                  onChange={(e) => setLogSearchQuery(e.target.value)}
                  className="w-full p-2.5 border border-gray-300 rounded-lg text-xs bg-gray-50 focus:bg-white focus:ring-2 focus:ring-orange-400 focus:outline-none"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={logBrandFilter}
                  onChange={(e) => setLogBrandFilter(e.target.value)}
                  className="p-2 border border-gray-300 rounded-lg text-xs bg-white font-medium"
                >
                  <option value="ALL">ทุกยี่ห้อแก๊ส</option>
                  {Object.values(Brand).map(b => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>

                <input
                  type="date"
                  value={logDateFilter}
                  onChange={(e) => setLogDateFilter(e.target.value)}
                  className="p-2 border border-gray-300 rounded-lg text-xs bg-white"
                  title="กรองตามวันที่"
                />

                {logDateFilter && (
                  <button
                    onClick={() => setLogDateFilter('')}
                    className="px-2 py-1 bg-gray-200 text-gray-700 text-xs rounded hover:bg-gray-300"
                  >
                    ล้างวันที่
                  </button>
                )}

                {clearTankLoanLogs && tankLoanLogs.length > 0 && (
                  <button
                    onClick={clearTankLoanLogs}
                    className="px-3 py-2 bg-red-50 text-red-700 border border-red-200 text-xs font-semibold rounded-lg hover:bg-red-100 transition-colors"
                  >
                    ล้างประวัติ
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="p-3 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-xs text-gray-800 uppercase tracking-wider">
                ประวัติการแก้ไขและบันทึกถังยืม ({filteredLogs.length} รายการ)
              </h3>
              <span className="text-[11px] text-gray-500">
                เรียงตามวันเวลาล่าสุด
              </span>
            </div>

            {filteredLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-gray-100/80 text-gray-700 uppercase font-bold border-b border-gray-200">
                    <tr>
                      <th className="py-2.5 px-3 w-36">วันที่ & เวลา</th>
                      <th className="py-2.5 px-3 w-40">รายการแก๊ส</th>
                      <th className="py-2.5 px-3">ลูกค้า / แหล่งที่มา</th>
                      <th className="py-2.5 px-3 w-32 text-center">จำนวนเดิม → ใหม่</th>
                      <th className="py-2.5 px-3 w-28">ผู้แก้ไข</th>
                      <th className="py-2.5 px-3">เหตุผล / หมายเหตุ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {filteredLogs.map((log: TankLoanAuditLog) => {
                      const isIncrease = log.diff_quantity > 0;
                      const isDecrease = log.diff_quantity < 0;

                      return (
                        <tr key={log.id} className="hover:bg-orange-50/40 transition-colors">
                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-semibold text-gray-900">
                              {new Date(log.timestamp).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}
                            </span>
                            <span className="text-gray-500 ml-1.5 text-[11px]">
                              {log.time || new Date(log.timestamp).toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="font-bold text-gray-900">{log.tank_brand}</span>
                            <span className="text-gray-600 ml-1">({log.tank_size})</span>
                          </td>

                          <td className="py-2.5 px-3 font-semibold text-gray-900">
                            {log.customer_name}
                          </td>

                          <td className="py-2.5 px-3 text-center whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-gray-500 font-medium">{log.old_quantity}</span>
                              <span className="text-gray-400">→</span>
                              <span className="font-bold text-gray-900">{log.new_quantity}</span>
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isIncrease 
                                  ? 'bg-emerald-100 text-emerald-800' 
                                  : isDecrease 
                                  ? 'bg-amber-100 text-amber-800' 
                                  : 'bg-gray-100 text-gray-700'
                              }`}>
                                {isIncrease ? `+${log.diff_quantity}` : `${log.diff_quantity}`}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-3 whitespace-nowrap">
                            <span className="bg-slate-100 text-slate-800 px-2 py-0.5 rounded font-medium text-[11px]">
                              {log.edited_by || 'เจ้าหน้าที่'}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 text-gray-700">
                            {log.reason || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-8 text-center text-gray-500 space-y-1">
                <p className="font-semibold text-sm">ยังไม่มีประวัติการแก้ไขถังยืม</p>
                <p className="text-xs text-gray-400">เมื่อมีการปรับปรุงหรือแก้ไขจำนวนถังยืม ระบบจะบันทึกประวัติไว้ที่นี่โดยอัตโนมัติ</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Standard Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={handleCloseModal} title={editingItem ? 'แก้ไขสต็อกสินค้า' : 'เพิ่มสต็อกสินค้าใหม่'}>
        <InventoryForm item={editingItem} onSave={handleSave} onClose={handleCloseModal} category={activeTab} />
      </Modal>

      {/* Direct Tank Loan & Quick Adjust Modal (PART 13 & PART 14) */}
      {directLoanItem && (
        <DirectTankLoanModal
          item={directLoanItem}
          isOpen={!!directLoanItem}
          onClose={() => setDirectLoanItem(null)}
          onSave={handleDirectLoanSave}
        />
      )}
    </div>
  );
};

export default Inventory;
