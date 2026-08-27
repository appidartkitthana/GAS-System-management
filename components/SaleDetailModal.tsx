import React from 'react';
import { Sale, Customer, PaymentMethod, InvoiceType, VatType, Brand, Size } from '../types';
import { getGasWeightKg, calculateVatBreakdown } from '../lib/utils';
import { 
  ShoppingBag, 
  Flame, 
  FileText, 
  Calendar, 
  CreditCard, 
  User, 
  MapPin, 
  Phone, 
  Printer, 
  Pencil, 
  Trash2, 
  X, 
  Truck, 
  Receipt, 
  Percent, 
  ArrowDownCircle, 
  Sparkles,
  Tag
} from 'lucide-react';

interface SaleDetailModalProps {
  sale: Sale | null;
  customer?: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (sale: Sale) => void;
  onPrintA4?: (sale: Sale) => void;
  onPrintSlip?: (sale: Sale) => void;
  onPrintDeliveryNote?: (sale: Sale, withPrice: boolean) => void;
  onDelete?: (saleId: string) => void;
}

export const getPaymentBadgeStyle = (method: PaymentMethod | string) => {
  switch (method) {
    case PaymentMethod.CASH:
      return {
        label: 'เงินสด',
        badge: 'bg-emerald-100 text-emerald-800 border-emerald-300',
        dot: 'bg-emerald-500'
      };
    case PaymentMethod.TRANSFER:
      return {
        label: 'เงินโอน',
        badge: 'bg-purple-100 text-purple-800 border-purple-300',
        dot: 'bg-purple-500'
      };
    case PaymentMethod.CREDIT:
      return {
        label: 'เครดิต (ค้างชำระ)',
        badge: 'bg-blue-100 text-blue-800 border-blue-300',
        dot: 'bg-blue-500'
      };
    default:
      return {
        label: method || 'ไม่ระบุ',
        badge: 'bg-gray-100 text-gray-800 border-gray-300',
        dot: 'bg-gray-400'
      };
  }
};

export const getVatBadgeStyle = (vatType?: VatType) => {
  switch (vatType) {
    case VatType.INCLUDED:
      return {
        label: 'รวม VAT 7%',
        badge: 'bg-blue-50 text-blue-700 border-blue-300'
      };
    case VatType.EXCLUDED:
      return {
        label: 'ก่อน VAT (+7%)',
        badge: 'bg-amber-50 text-amber-700 border-amber-300'
      };
    case VatType.NO_VAT:
    default:
      return {
        label: 'ไม่มี VAT',
        badge: 'bg-slate-100 text-slate-700 border-slate-300'
      };
  }
};

const SaleDetailModal: React.FC<SaleDetailModalProps> = ({
  sale,
  customer,
  isOpen,
  onClose,
  onEdit,
  onPrintA4,
  onPrintSlip,
  onPrintDeliveryNote,
  onDelete
}) => {
  if (!isOpen || !sale) return null;

  const paymentStyle = getPaymentBadgeStyle(sale.payment_method);
  const vatStyle = getVatBadgeStyle(sale.vat_type);
  const isTaxInvoice = sale.invoice_type === InvoiceType.TAX_INVOICE;

  // Calculate items and weights
  const items = sale.items && sale.items.length > 0 ? sale.items : [
    {
      brand: sale.tank_brand || Brand.PTT,
      size: sale.tank_size || Size.S15,
      quantity: sale.quantity || 1,
      unit_price: sale.unit_price || (sale.total_amount / (sale.quantity || 1)),
      total_price: sale.total_amount || 0,
      item_type: 'GAS' as const,
      item_name: `${sale.tank_brand || 'PTT'} ${sale.tank_size || '15 กก.'}`
    }
  ];

  const totalTanks = items.reduce((sum, it) => sum + (it.quantity || 0), 0);
  const totalGasWeightKg = items.reduce((sum, it) => {
    const qty = it.quantity || 0;
    const w = getGasWeightKg(it.size);
    return sum + (qty * w);
  }, 0);

  // Calculate gas return deduction
  const gasReturnKg = sale.gas_return_kg || 0;
  const gasReturnPrice = sale.gas_return_price || 0;
  const gasReturnAmount = gasReturnKg * gasReturnPrice;

  // VAT breakdown
  const rawSubtotal = items.reduce((sum, it) => sum + (it.total_price || (it.quantity * it.unit_price)), 0);
  const vatBreakdown = calculateVatBreakdown(
    rawSubtotal,
    gasReturnAmount,
    sale.vat_type || VatType.NO_VAT
  );

  const customerName = customer ? customer.name : 'ลูกค้าทั่วไป';
  const customerBranch = customer?.branch ? `(${customer.branch})` : '';
  const dateObj = new Date(sale.date);
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
        <div className="relative bg-gradient-to-r from-emerald-900 via-slate-800 to-emerald-950 text-white p-5 sm:p-6">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white transition-colors"
            title="ปิดหน้าต่าง"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-start gap-3">
            <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-400/20 backdrop-blur-md">
              <ShoppingBag className="w-6 h-6 text-emerald-400" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${paymentStyle.badge}`}>
                  {paymentStyle.label}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold border ${vatStyle.badge}`}>
                  {vatStyle.label}
                </span>
                {isTaxInvoice && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-400/20 text-amber-300 border border-amber-400/30">
                    ใบกำกับภาษี
                  </span>
                )}
              </div>
              
              <h2 className="text-xl sm:text-2xl font-bold text-white mt-1.5 tracking-tight flex items-center gap-2">
                <span>{customerName}</span>
                {customerBranch && <span className="text-sm font-normal text-slate-300">{customerBranch}</span>}
              </h2>

              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1 flex-wrap">
                <span className="font-mono bg-white/10 px-2 py-0.5 rounded border border-white/10">
                  เลขที่: {sale.invoice_number}
                </span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  {formattedDate}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 max-h-[70vh] overflow-y-auto space-y-5 text-slate-700">
          
          {/* Main Total Card */}
          <div className="bg-gradient-to-br from-emerald-50 to-teal-50/40 border border-emerald-200 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
                ยอดขายรวมสุทธิ (Grand Total)
              </span>
              <div className="text-3xl font-black text-emerald-600 mt-0.5">
                +{sale.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-sm font-normal text-emerald-800">บาท</span>
              </div>
            </div>
            <div className="text-right sm:border-l sm:border-emerald-200 sm:pl-4">
              <span className="text-[11px] text-slate-500 block">รูปแบบบิล</span>
              <span className="font-bold text-slate-800 text-sm">
                {sale.invoice_type || 'บิลเงินสด'}
              </span>
            </div>
          </div>

          {/* Customer Info Card (if available) */}
          {customer && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-3.5 space-y-2 text-xs">
              <div className="flex items-center justify-between font-bold text-slate-800 border-b border-slate-200 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-sky-600" />
                  ข้อมูลลูกค้า
                </span>
                {customer.tax_id && (
                  <span className="text-slate-500 font-normal">
                    เลขประจำตัวผู้เสียภาษี: <strong className="text-slate-700">{customer.tax_id}</strong>
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                {customer.address && (
                  <div className="flex items-start gap-1.5 sm:col-span-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" />
                    <span>{customer.address}</span>
                  </div>
                )}
                {customer.notes && (
                  <div className="sm:col-span-2 text-slate-500 bg-white p-2 rounded border border-slate-200">
                    <strong>หมายเหตุ:</strong> {customer.notes}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Sold Items Table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-4 h-4 text-orange-500" />
                รายการสินค้าที่ขาย ({items.length} รายการ)
              </h4>
              <span className="text-xs font-bold text-slate-600">
                รวม {totalTanks} หน่วย {totalGasWeightKg > 0 && `(น้ำหนักก๊าซ ${totalGasWeightKg.toLocaleString()} กก.)`}
              </span>
            </div>

            <div className="overflow-x-auto rounded-lg border border-slate-200">
              <table className="w-full text-xs text-left bg-white">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">#</th>
                    <th className="py-2.5 px-3">รายการสินค้า / ยี่ห้อ-ขนาด</th>
                    <th className="py-2.5 px-3 text-center w-24">จำนวน</th>
                    <th className="py-2.5 px-3 text-right w-28">ราคา/หน่วย</th>
                    <th className="py-2.5 px-3 text-right w-32">ราคารวม (฿)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {items.map((item, idx) => {
                    const lineTotal = item.total_price || (item.quantity * item.unit_price);
                    const isAccessory = item.item_type === 'ACCESSORY';

                    return (
                      <tr key={idx} className="hover:bg-slate-50/80">
                        <td className="py-2.5 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {isAccessory ? (
                            <span className="text-indigo-700">{item.item_name || 'อุปกรณ์เตาแก๊ส'}</span>
                          ) : (
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 bg-slate-100 rounded text-[10px] text-slate-600 font-mono">
                                {item.brand}
                              </span>
                              <span>{item.size}</span>
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center font-bold text-slate-700">
                          {item.quantity} {isAccessory ? 'ชิ้น' : 'ถัง'}
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-600">
                          {item.unit_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                          {lineTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Gas Return & VAT Financial Breakdown */}
          <div className="bg-slate-50 rounded-xl border border-slate-200 p-4 space-y-2 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>ยอดรวมค่าสินค้า (Subtotal):</span>
              <span className="font-semibold text-slate-800">
                {rawSubtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
              </span>
            </div>

            {gasReturnKg > 0 && (
              <div className="flex justify-between text-emerald-700 bg-emerald-50/80 p-2 rounded-lg border border-emerald-200">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>หักคืนเนื้อก๊าซ ({gasReturnKg} กก. @ {gasReturnPrice || 0} ฿/กก.):</span>
                </span>
                <span className="font-bold">
                  -{gasReturnAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                </span>
              </div>
            )}

            {sale.vat_type === VatType.INCLUDED && (
              <>
                <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200">
                  <span>มูลค่าสินค้าก่อนภาษี (Pre-VAT 7% Included):</span>
                  <span>{vatBreakdown.preVatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>ภาษีมูลค่าเพิ่ม 7% ในยอดเงิน:</span>
                  <span>{vatBreakdown.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                </div>
              </>
            )}

            {sale.vat_type === VatType.EXCLUDED && (
              <>
                <div className="flex justify-between text-slate-500 pt-1 border-t border-slate-200">
                  <span>มูลค่าก่อนภาษี:</span>
                  <span>{vatBreakdown.preVatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                </div>
                <div className="flex justify-between text-amber-700 font-medium">
                  <span>บวกภาษีมูลค่าเพิ่ม 7% (VAT +7%):</span>
                  <span>+{vatBreakdown.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                </div>
              </>
            )}

            <div className="flex justify-between text-sm font-bold text-slate-900 pt-2 border-t-2 border-slate-300">
              <span>ยอดเงินสุทธิที่ต้องชำระ:</span>
              <span className="text-base font-black text-emerald-700">
                {sale.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
              </span>
            </div>
          </div>

        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  if (confirm(`คุณต้องการลบรายการขายเลขที่ "${sale.invoice_number}" หรือไม่?`)) {
                    onDelete(sale.id);
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

          <div className="flex flex-wrap items-center gap-2">
            {/* Delivery Note buttons */}
            {onPrintDeliveryNote && (
              <div className="inline-flex rounded-lg border border-orange-300 bg-orange-50 p-0.5">
                <button
                  type="button"
                  onClick={() => onPrintDeliveryNote(sale, false)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-100 rounded transition-colors flex items-center gap-1"
                  title="พิมพ์ใบส่งของแบบมาตรฐาน (ไม่มีราคา)"
                >
                  <Truck className="w-3.5 h-3.5 text-orange-600" />
                  <span>ใบส่งของ (ไม่แสดงราคา)</span>
                </button>
                <button
                  type="button"
                  onClick={() => onPrintDeliveryNote(sale, true)}
                  className="px-2.5 py-1.5 text-xs font-semibold text-orange-800 hover:bg-orange-100 rounded transition-colors"
                  title="พิมพ์ใบส่งของแบบแสดงราคา"
                >
                  (แสดงราคา)
                </button>
              </div>
            )}

            {/* Print A4 */}
            {onPrintA4 && (
              <button
                type="button"
                onClick={() => onPrintA4(sale)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-xs transition-colors"
                title="พิมพ์ใบกำกับภาษี/ใบเสร็จ A4"
              >
                <FileText className="w-3.5 h-3.5 text-emerald-600" />
                <span>พิมพ์ A4</span>
              </button>
            )}

            {/* Print Slip 80mm */}
            {onPrintSlip && (
              <button
                type="button"
                onClick={() => onPrintSlip(sale)}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 rounded-lg border border-slate-300 shadow-xs transition-colors"
                title="พิมพ์ใบเสร็จย่อ 80mm"
              >
                <Printer className="w-3.5 h-3.5 text-sky-600" />
                <span>พิมพ์สลิป 80mm</span>
              </button>
            )}

            {/* Edit */}
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEdit(sale);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-sky-600 hover:bg-sky-700 rounded-lg shadow-xs transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" />
                <span>แก้ไข</span>
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-semibold text-slate-600 bg-slate-200 hover:bg-slate-300 rounded-lg transition-colors"
            >
              ปิด
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaleDetailModal;
