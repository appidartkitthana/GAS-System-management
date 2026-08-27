import React from 'react';
import { Expense, PaymentMethod, ExpenseType } from '../types';
import { getGasWeightKg } from '../lib/utils';
import { 
  Flame, 
  Receipt, 
  Calendar, 
  CreditCard, 
  User, 
  FileText, 
  Scale, 
  Printer, 
  Pencil, 
  Trash2, 
  X, 
  Tag,
  ArrowDownCircle,
  Clock
} from 'lucide-react';

interface ExpenseDetailModalProps {
  expense: Expense | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (expense: Expense) => void;
  onPrint?: (expense: Expense) => void;
  onDelete?: (expenseId: string) => void;
}

export const getExpenseTypeColor = (type: string) => {
  switch (type) {
    case ExpenseType.REFILL:
    case 'ค่าบรรจุก๊าซ':
      return {
        bg: 'bg-sky-100 text-sky-800 border-sky-300',
        badgeBg: 'bg-sky-50 text-sky-700',
        dot: 'bg-sky-500',
        border: 'border-sky-200',
        iconColor: 'text-sky-600'
      };
    case ExpenseType.FUEL:
    case 'ค่าน้ำมัน':
      return {
        bg: 'bg-amber-100 text-amber-800 border-amber-300',
        badgeBg: 'bg-amber-50 text-amber-700',
        dot: 'bg-amber-500',
        border: 'border-amber-200',
        iconColor: 'text-amber-600'
      };
    case ExpenseType.ACCOUNTING:
    case 'บัญชี':
      return {
        bg: 'bg-purple-100 text-purple-800 border-purple-300',
        badgeBg: 'bg-purple-50 text-purple-700',
        dot: 'bg-purple-500',
        border: 'border-purple-200',
        iconColor: 'text-purple-600'
      };
    case ExpenseType.TAX:
    case 'ค่าภาษี':
      return {
        bg: 'bg-indigo-100 text-indigo-800 border-indigo-300',
        badgeBg: 'bg-indigo-50 text-indigo-700',
        dot: 'bg-indigo-500',
        border: 'border-indigo-200',
        iconColor: 'text-indigo-600'
      };
    case ExpenseType.TRANSPORT:
    case 'ค่าขนส่ง':
      return {
        bg: 'bg-teal-100 text-teal-800 border-teal-300',
        badgeBg: 'bg-teal-50 text-teal-700',
        dot: 'bg-teal-500',
        border: 'border-teal-200',
        iconColor: 'text-teal-600'
      };
    case ExpenseType.TOLL:
    case 'ค่าทางด่วน':
      return {
        bg: 'bg-orange-100 text-orange-800 border-orange-300',
        badgeBg: 'bg-orange-50 text-orange-700',
        dot: 'bg-orange-500',
        border: 'border-orange-200',
        iconColor: 'text-orange-600'
      };
    case ExpenseType.LOADING:
    case 'ค่าขึ้นถัง':
      return {
        bg: 'bg-blue-100 text-blue-800 border-blue-300',
        badgeBg: 'bg-blue-50 text-blue-700',
        dot: 'bg-blue-500',
        border: 'border-blue-200',
        iconColor: 'text-blue-600'
      };
    default:
      return {
        bg: 'bg-slate-100 text-slate-800 border-slate-300',
        badgeBg: 'bg-slate-50 text-slate-700',
        dot: 'bg-slate-500',
        border: 'border-slate-200',
        iconColor: 'text-slate-600'
      };
  }
};

export const getPaymentMethodBadge = (method: PaymentMethod | string) => {
  switch (method) {
    case PaymentMethod.CASH:
      return {
        label: 'เงินสด',
        badge: 'bg-emerald-50 text-emerald-700 border-emerald-300',
        dot: 'bg-emerald-500'
      };
    case PaymentMethod.TRANSFER:
      return {
        label: 'เงินโอน',
        badge: 'bg-purple-50 text-purple-700 border-purple-300',
        dot: 'bg-purple-500'
      };
    case PaymentMethod.CREDIT:
      return {
        label: 'เครดิต (ค้างชำระ)',
        badge: 'bg-blue-50 text-blue-700 border-blue-300',
        dot: 'bg-blue-500'
      };
    default:
      return {
        label: method || 'ไม่ระบุ',
        badge: 'bg-gray-50 text-gray-700 border-gray-300',
        dot: 'bg-gray-400'
      };
  }
};

const ExpenseDetailModal: React.FC<ExpenseDetailModalProps> = ({
  expense,
  isOpen,
  onClose,
  onEdit,
  onPrint,
  onDelete
}) => {
  if (!isOpen || !expense) return null;

  const isRefill = expense.type === ExpenseType.REFILL || expense.type === 'ค่าบรรจุก๊าซ';
  const refillItems = expense.refill_details || [];
  
  // Calculate gas weights
  const totalRefillTanks = refillItems.reduce((sum, item) => sum + (item.quantity || 0), 0) || expense.refill_quantity || 0;
  const totalRefillWeightKg = refillItems.reduce((sum, item) => {
    const qty = item.quantity || 0;
    const w = getGasWeightKg(item.size);
    return sum + (qty * w);
  }, 0);

  const typeStyle = getExpenseTypeColor(expense.type);
  const paymentStyle = getPaymentMethodBadge(expense.payment_method);

  const dateObj = new Date(expense.date);
  const formattedDate = dateObj.toLocaleDateString('th-TH', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150">
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden border border-slate-200 transform transition-all"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white p-5 sm:p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3">
            <div className="p-3 bg-white/10 rounded-xl border border-white/10 backdrop-blur-md">
              {isRefill ? (
                <Flame className="w-6 h-6 text-orange-400" />
              ) : (
                <Receipt className="w-6 h-6 text-sky-400" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${typeStyle.bg}`}>
                  {expense.type}
                </span>
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${paymentStyle.badge}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${paymentStyle.dot}`}></span>
                  {paymentStyle.label}
                </span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1.5 tracking-tight">
                {expense.description || expense.type}
              </h2>
              <div className="flex items-center gap-2 text-xs text-slate-300 mt-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <span>{formattedDate}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-5 text-slate-700">
          
          {/* Main Amount Card */}
          <div className="bg-gradient-to-br from-rose-50 to-orange-50/40 border border-rose-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="text-xs font-semibold text-rose-800 uppercase tracking-wider block">
                ยอดเงินจ่ายรวมสุทธิ
              </span>
              <div className="text-3xl font-black text-rose-600 mt-0.5">
                -{expense.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-normal text-rose-700">บาท</span>
              </div>
            </div>
            <div className="text-right sm:border-l sm:border-rose-200 sm:pl-4">
              <span className="text-[11px] text-slate-500 block">วิธีชำระเงิน</span>
              <span className="font-bold text-slate-800 text-sm">{expense.payment_method}</span>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <Tag className="w-3.5 h-3.5 text-slate-400" />
                <span>หมวดหมู่รายจ่าย</span>
              </div>
              <p className="font-bold text-slate-800">{expense.type}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <User className="w-3.5 h-3.5 text-slate-400" />
                <span>ร้านค้า / ผู้รับเงิน (Payee)</span>
              </div>
              <p className="font-bold text-slate-800">
                {expense.payee ? expense.payee : <span className="text-slate-400 font-normal">- ไม่ได้ระบุ -</span>}
              </p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/80 sm:col-span-2">
              <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>รายละเอียด / คำอธิบายเพิ่มเติม</span>
              </div>
              <p className="text-sm font-semibold text-slate-800 whitespace-pre-wrap">
                {expense.description || '-'}
              </p>
            </div>
          </div>

          {/* Refill Details Section (If Refill Gas Expense) */}
          {isRefill && (
            <div className="bg-sky-50/60 border border-sky-200 rounded-xl p-4 space-y-3.5">
              <div className="flex items-center justify-between border-b border-sky-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <Flame className="w-4 h-4 text-sky-600" />
                  <h4 className="text-sm font-bold text-sky-900">
                    รายละเอียดการเติมแก๊สเข้าโรงบรรจุ
                  </h4>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold text-sky-800">
                  <span>รวม {totalRefillTanks} ถัง</span>
                  {totalRefillWeightKg > 0 && (
                    <>
                      <span>•</span>
                      <span>น้ำหนัก {totalRefillWeightKg.toLocaleString('th-TH')} กก.</span>
                    </>
                  )}
                </div>
              </div>

              {refillItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left bg-white rounded-lg border border-sky-200 overflow-hidden">
                    <thead className="bg-sky-100/80 text-sky-900 font-bold">
                      <tr>
                        <th className="py-2 px-3">#</th>
                        <th className="py-2 px-3">ยี่ห้อถัง</th>
                        <th className="py-2 px-3">ขนาดถัง</th>
                        <th className="py-2 px-3 text-center">จำนวน (ถัง)</th>
                        <th className="py-2 px-3 text-right">น้ำหนักรวม (กก.)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-sky-100">
                      {refillItems.map((item, idx) => {
                        const itemWeight = (item.quantity || 0) * getGasWeightKg(item.size);
                        return (
                          <tr key={idx} className="hover:bg-sky-50/50">
                            <td className="py-2 px-3 text-slate-500 font-mono">{idx + 1}</td>
                            <td className="py-2 px-3 font-semibold text-slate-800">{item.brand}</td>
                            <td className="py-2 px-3 text-slate-700">{item.size}</td>
                            <td className="py-2 px-3 text-center font-bold text-sky-700">{item.quantity} ถัง</td>
                            <td className="py-2 px-3 text-right text-slate-700">
                              {itemWeight > 0 ? `${itemWeight.toLocaleString('th-TH')} กก.` : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                    <tfoot className="bg-sky-50 font-bold border-t border-sky-200 text-sky-900">
                      <tr>
                        <td colSpan={3} className="py-2 px-3 text-right">รวมทั้งหมด:</td>
                        <td className="py-2 px-3 text-center text-sky-700">{totalRefillTanks} ถัง</td>
                        <td className="py-2 px-3 text-right text-sky-800">
                          {totalRefillWeightKg > 0 ? `${totalRefillWeightKg.toLocaleString('th-TH')} กก.` : '-'}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              ) : (
                <div className="p-3 bg-white rounded-lg border border-sky-200 text-xs text-slate-600">
                  {expense.refill_quantity ? (
                    <div className="flex items-center justify-between">
                      <span>จำนวนถัง: <strong>{expense.refill_quantity} ถัง</strong></span>
                      {expense.refill_tank_brand && <span>ยี่ห้อ: <strong>{expense.refill_tank_brand}</strong></span>}
                      {expense.refill_tank_size && <span>ขนาด: <strong>{expense.refill_tank_size}</strong></span>}
                    </div>
                  ) : (
                    <span className="text-slate-400">ไม่ได้ระบุรายการถังย่อย</span>
                  )}
                </div>
              )}

              {/* Gas return details */}
              {(expense.gas_return_kg || expense.gas_return_amount) && (
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs">
                    <span className="text-emerald-700 block text-[11px]">ปริมาณคืนเนื้อก๊าซ</span>
                    <strong className="text-emerald-900 text-sm">
                      {expense.gas_return_kg ? `${expense.gas_return_kg} กก.` : '-'}
                    </strong>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-xs">
                    <span className="text-emerald-700 block text-[11px]">มูลค่าคืนเนื้อก๊าซ</span>
                    <strong className="text-emerald-900 text-sm">
                      {expense.gas_return_amount ? `${expense.gas_return_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท` : '-'}
                    </strong>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`คุณต้องการลบรายการรายจ่าย "${expense.description || expense.type}" หรือไม่?`)) {
                    onDelete(expense.id);
                    onClose();
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-200 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                <span>ลบรายการ</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {onPrint && (
              <button
                type="button"
                onClick={() => {
                  onPrint(expense);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-xs transition-colors"
              >
                <Printer className="w-4 h-4 text-sky-600" />
                <span>พิมพ์ใบรับเงิน</span>
              </button>
            )}

            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(expense);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
              >
                <Pencil className="w-4 h-4" />
                <span>แก้ไขรายการ</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpenseDetailModal;
