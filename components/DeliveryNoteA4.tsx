import React, { useState, useMemo } from 'react';
import { Sale, Customer } from '../types';
import { generateRunningNumber, calculateInvoiceTotals, getGasWeightKg } from '../lib/utils';
import { useAppContext } from '../context/AppContext';

interface DeliveryNoteA4Props {
  sale: Sale;
  customer: Customer;
  defaultWithPrice?: boolean;
  onClose?: () => void;
}

const DeliveryNoteA4: React.FC<DeliveryNoteA4Props> = ({ 
  sale, 
  customer, 
  defaultWithPrice = false,
  onClose 
}) => {
  const { companyInfo: seller, sales } = useAppContext();
  const [showPrice, setShowPrice] = useState<boolean>(defaultWithPrice);

  // Single-source universal calculation engine (PART 17 & PART 18)
  const totals = calculateInvoiceTotals(sale, customer);
  const items = totals.items;

  const totalDeliveredTanks = items.reduce((acc: number, item: any) => {
    return acc + (item.quantity || 0);
  }, 0);

  // Auto calculate total gas weight in Kg
  const calculatedTotalGasWeight = useMemo(() => {
    return items.reduce((acc: number, item: any) => {
      if (item.item_type === 'ACCESSORY') return acc;
      const unitWeight = getGasWeightKg(item.size);
      return acc + ((item.quantity || 0) * unitWeight);
    }, 0);
  }, [items]);

  // Delivery & Tank Loan specific state (Part 10 & Part 11)
  const [emptyReturnedTanks, setEmptyReturnedTanks] = useState<number>(sale.gas_return_qty || 0);
  const [borrowedTanks, setBorrowedTanks] = useState<number>(
    Math.max(0, totalDeliveredTanks - (sale.gas_return_qty || 0))
  );
  const [totalWeightKg, setTotalWeightKg] = useState<number>(calculatedTotalGasWeight);
  const [noteText, setNoteText] = useState<string>('ได้รับสินค้าและถังแก๊สตามรายการข้างต้นในสภาพสมบูรณ์และถูกต้องเรียบร้อย');
  const [tankCondition, setTankCondition] = useState<string>('สภาพสมบูรณ์ปกติ');

  // When empty returned tanks change, auto-adjust borrowed tanks
  const handleEmptyReturnChange = (val: number) => {
    const safeVal = Math.max(0, val);
    setEmptyReturnedTanks(safeVal);
    setBorrowedTanks(Math.max(0, totalDeliveredTanks - safeVal));
  };

  // Running number for Delivery Note
  const deliveryNoteNumber = (sale.invoice_number && sale.invoice_number.startsWith('DN-'))
    ? sale.invoice_number
    : generateRunningNumber('DN', sale.date, sales);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-gray-200 p-4 min-h-screen flex flex-col items-center overflow-auto">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 6mm 8mm;
        }
        @media print {
          html, body {
            width: 210mm;
            height: 297mm;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            font-family: 'Kanit', sans-serif, system-ui;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
          body * {
            visibility: hidden;
          }
          #delivery-note-a4, #delivery-note-a4 * {
            visibility: visible;
          }
          #delivery-note-a4 {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 210mm !important;
            height: auto !important;
            max-height: 285mm !important;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 6mm 8mm !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid !important; break-inside: avoid !important; }
        }
      `}</style>

      {/* Control Panel Bar */}
      <div className="bg-white border border-gray-300 shadow-md rounded-lg p-3 mb-3 w-full max-w-[210mm] no-print space-y-2.5">
        <div className="flex flex-wrap justify-between items-center gap-2 pb-2 border-b border-gray-200">
          <div className="flex items-center gap-2">
            <span className="font-bold text-gray-700 text-xs">รูปแบบเอกสาร:</span>
            <div className="inline-flex rounded-md shadow-xs">
              <button
                type="button"
                onClick={() => setShowPrice(false)}
                className={`px-3 py-1 text-xs font-semibold rounded-l-lg border ${
                  !showPrice 
                    ? 'bg-gray-900 text-white border-gray-900' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                แบบไม่มีราคา (มาตรฐาน)
              </button>
              <button
                type="button"
                onClick={() => setShowPrice(true)}
                className={`px-3 py-1 text-xs font-semibold rounded-r-lg border ${
                  showPrice 
                    ? 'bg-gray-900 text-white border-gray-900' 
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                แบบมีราคา
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onClose && (
              <button
                onClick={onClose}
                className="px-3 py-1 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300"
              >
                ปิดหน้าต่าง
              </button>
            )}
            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black flex items-center gap-1.5 shadow"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h6m-6-4h6" />
              </svg>
              พิมพ์ใบส่งของ (A4)
            </button>
          </div>
        </div>

        {/* Quick Edit Inputs for Tank Loan & Delivery Info */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs bg-gray-50 p-2 rounded border border-gray-200">
          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-0.5">ถังเปล่ารับคืน (ถัง):</label>
            <input 
              type="number" 
              min="0"
              value={emptyReturnedTanks} 
              onChange={(e) => handleEmptyReturnChange(parseInt(e.target.value) || 0)} 
              className="w-full p-1 border border-gray-300 rounded font-semibold text-center bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-0.5">ถังยืม (ถัง):</label>
            <input 
              type="number" 
              min="0"
              value={borrowedTanks} 
              onChange={(e) => setBorrowedTanks(parseInt(e.target.value) || 0)} 
              className="w-full p-1 border border-gray-300 rounded font-semibold text-center bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-0.5">น้ำหนักรวม (กก.):</label>
            <input 
              type="number" 
              step="0.1"
              value={totalWeightKg} 
              onChange={(e) => setTotalWeightKg(parseFloat(e.target.value) || 0)} 
              className="w-full p-1 border border-gray-300 rounded font-semibold text-center bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold text-gray-700 mb-0.5">สถานะถัง / สภาพ:</label>
            <input 
              type="text" 
              value={tankCondition} 
              onChange={(e) => setTankCondition(e.target.value)} 
              className="w-full p-1 border border-gray-300 rounded font-medium bg-white text-xs"
            />
          </div>
          <div className="col-span-2 sm:col-span-4">
            <label className="block text-[10px] font-bold text-gray-700 mb-0.5">หมายเหตุ:</label>
            <input 
              type="text" 
              value={noteText} 
              onChange={(e) => setNoteText(e.target.value)} 
              className="w-full p-1 border border-gray-300 rounded font-medium bg-white text-xs"
            />
          </div>
        </div>
      </div>

      {/* Main Delivery Note Paper (Clean Standard Layout, No Logo) */}
      <div id="delivery-note-a4" className="w-[210mm] min-h-[285mm] bg-white p-[10mm] shadow-lg rounded-none relative font-sans text-xs text-gray-800 flex flex-col justify-between">
        
        <div>
          {/* Header Section - Clean Business Standard (No Logo) */}
          <div className="flex justify-between items-start mb-3 pb-3 border-b-2 border-gray-800">
            {/* Left: Seller Info */}
            <div className="w-7/12 pr-3">
              <h1 className="text-lg font-bold text-gray-950 tracking-tight">{seller.name}</h1>
              <p className="text-xs text-gray-600 leading-relaxed mt-0.5">{seller.address}</p>
              <div className="flex flex-wrap gap-x-3 gap-y-0.5 mt-1 text-xs text-gray-700">
                <p><strong>โทรศัพท์:</strong> {seller.phone}</p>
                <p><strong>เลขประจำตัวผู้เสียภาษี:</strong> {seller.taxId}</p>
              </div>
            </div>

            {/* Right: Document Title & Metadata */}
            <div className="w-5/12 text-right flex flex-col items-end">
              <h2 className="text-lg font-bold text-gray-950 tracking-tight uppercase">
                ใบส่งของ / ใบส่งสินค้า
              </h2>
              <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                DELIVERY NOTE {showPrice ? '(WITH PRICE)' : '(QUANTITY ONLY)'}
              </p>
              
              <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-right mt-1 text-xs">
                <span className="font-bold text-gray-700">เลขที่เอกสาร:</span>
                <span className="font-bold text-gray-950">{deliveryNoteNumber}</span>
                <span className="font-bold text-gray-700">วันที่:</span>
                <span className="font-semibold text-gray-900">{new Date(sale.date).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                {showPrice && (
                  <>
                    <span className="font-bold text-gray-700">วิธีชำระเงิน:</span>
                    <span className="font-semibold text-gray-900">{sale.payment_method}</span>
                  </>
                )}
              </div>
              <div className="mt-1.5 text-[9px] font-medium text-gray-500 border border-gray-300 px-2 py-0.5 rounded">
                ต้นฉบับ (Original)
              </div>
            </div>
          </div>

          {/* Customer Info Section */}
          <div className="mb-3 bg-gray-50/70 border border-gray-300 rounded p-2.5">
            <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">ข้อมูลลูกค้า / สถานที่จัดส่งสินค้า</h3>
            <p className="text-sm font-bold text-gray-950 leading-tight mb-0.5">{customer.name} {customer.branch ? `(${customer.branch})` : ''}</p>
            <p className="text-xs text-gray-700 mb-0.5"><strong>สถานที่จัดส่ง:</strong> {customer.address || '-'}</p>
            {customer.tax_id && <p className="text-xs text-gray-700"><strong>เลขประจำตัวผู้เสียภาษี:</strong> {customer.tax_id}</p>}
          </div>

          {/* Items Table */}
          <div className="mb-3">
            {!showPrice ? (
              /* PART 10: TABLE WITHOUT PRICE (QUANTITY, RETURN CYLINDERS, AND STATUS ONLY) */
              <table className="w-full border-collapse table-fixed border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-400">
                    <th className="py-1.5 px-2 w-10 text-center border border-gray-300">#</th>
                    <th className="py-1.5 px-3 text-left border border-gray-300">รายการแก๊ส / สินค้า (Description)</th>
                    <th className="py-1.5 px-2 w-24 text-center border border-gray-300">จำนวนที่ส่ง</th>
                    <th className="py-1.5 px-2 w-28 text-center border border-gray-300">ถังเปล่าที่รับคืน</th>
                    <th className="py-1.5 px-3 text-left border border-gray-300">หมายเหตุ / สถานะถัง</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2.5 px-2 text-center text-gray-500 border-r border-gray-200">{idx + 1}</td>
                      <td className="py-2.5 px-3 border-r border-gray-200">
                        <span className="font-bold text-gray-950">
                          {item.item_type === 'ACCESSORY' ? (item.item_name || 'อุปกรณ์แก๊ส') : `แก๊ส ${item.brand}`}
                        </span>
                        {item.size && <span className="text-gray-600 ml-2">({item.size})</span>}
                      </td>
                      <td className="py-2.5 px-2 text-center font-bold text-sm text-gray-950 border-r border-gray-200">
                        {item.quantity} {item.item_type === 'ACCESSORY' ? 'ชิ้น' : 'ถัง'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-semibold text-gray-900 border-r border-gray-200">
                        {items.length === 1 ? `${emptyReturnedTanks} ถัง` : `${idx === 0 ? emptyReturnedTanks : 0} ถัง`}
                      </td>
                      <td className="py-2.5 px-3 text-gray-700 text-xs">
                        {tankCondition || 'สภาพสมบูรณ์ปกติ'}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold text-gray-950">
                    <td colSpan={2} className="py-1.5 px-3 text-right">รวมจำนวนส่งมอบทั้งหมด:</td>
                    <td className="py-1.5 px-2 text-center text-sm font-bold">{totalDeliveredTanks} ถัง</td>
                    <td className="py-1.5 px-2 text-center text-sm font-bold">{emptyReturnedTanks} ถัง</td>
                    <td className="py-1.5 px-3"></td>
                  </tr>
                </tfoot>
              </table>
            ) : (
              /* TABLE WITH PRICE (OPTIONAL MODE) */
              <table className="w-full border-collapse table-fixed border border-gray-300 text-xs">
                <thead>
                  <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-400">
                    <th className="py-1.5 px-2 w-10 text-center border border-gray-300">#</th>
                    <th className="py-1.5 px-3 text-left border border-gray-300">รายการสินค้า (Description)</th>
                    <th className="py-1.5 px-2 w-16 text-center border border-gray-300">จำนวน</th>
                    <th className="py-1.5 px-2 w-28 text-right border border-gray-300">ราคา/หน่วย (บาท)</th>
                    <th className="py-1.5 px-3 w-28 text-right border border-gray-300">จำนวนเงิน (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item: any, idx: number) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-2 px-2 text-center text-gray-500 border-r border-gray-200">{idx + 1}</td>
                      <td className="py-2 px-3 border-r border-gray-200">
                        <span className="font-bold text-gray-950">
                          {item.item_type === 'ACCESSORY' ? (item.item_name || 'อุปกรณ์แก๊ส') : `แก๊ส ${item.brand}`}
                        </span>
                        {item.size && <span className="text-gray-600 ml-2">({item.size})</span>}
                      </td>
                      <td className="py-2 px-2 text-center font-bold text-gray-900 border-r border-gray-200">{item.quantity}</td>
                      <td className="py-2 px-2 text-right border-r border-gray-200 text-gray-800">
                        {Number(item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-2 px-3 text-right font-bold text-gray-950">
                        {Number(item.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* PART 11 — TANK LOAN & DELIVERY SUMMARY SECTION */}
          {!showPrice ? (
            <div className="border-t-2 border-gray-300 pt-2.5 mb-3 break-inside-avoid space-y-2">
              {/* Prominent Tank Loan & Delivery Summary Grid */}
              <div className="bg-gray-50/90 border border-gray-300 rounded p-3">
                <h4 className="text-xs font-bold text-gray-900 uppercase tracking-wider mb-2 pb-1 border-b border-gray-200 flex items-center justify-between">
                  <span>สรุปรายการส่งแก๊สและข้อมูลถังยืม</span>
                  <span className="text-[10px] font-normal text-gray-500">CYLINDER DELIVERY & LOAN SUMMARY</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                  <div className="bg-white border border-gray-200 rounded p-2 text-center shadow-2xs">
                    <p className="text-[10px] font-semibold text-gray-600">จำนวนถังที่ส่ง</p>
                    <p className="text-sm font-bold text-gray-950 mt-0.5">{totalDeliveredTanks} ถัง</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded p-2 text-center shadow-2xs">
                    <p className="text-[10px] font-semibold text-gray-600">ถังเปล่าที่รับคืน</p>
                    <p className="text-sm font-bold text-gray-950 mt-0.5">{emptyReturnedTanks} ถัง</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded p-2 text-center shadow-2xs">
                    <p className="text-[10px] font-semibold text-gray-600">จำนวนถังยืม</p>
                    <p className="text-sm font-bold text-blue-900 mt-0.5">{borrowedTanks} ถัง</p>
                  </div>

                  <div className="bg-white border border-gray-200 rounded p-2 text-center shadow-2xs">
                    <p className="text-[10px] font-semibold text-gray-600">น้ำหนักรวม</p>
                    <p className="text-sm font-bold text-gray-950 mt-0.5">{totalWeightKg} กก.</p>
                  </div>
                </div>

                {/* Notes Section */}
                <div className="mt-2.5 pt-2 border-t border-gray-200 text-xs">
                  <div className="flex items-start gap-2">
                    <span className="font-bold text-gray-800 whitespace-nowrap text-[11px]">หมายเหตุ:</span>
                    <span className="text-gray-700 leading-relaxed text-[11px]">{noteText}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* WITH PRICE SUMMARY (OPTIONAL) */
            <div className="flex flex-col sm:flex-row items-start justify-between border-t-2 border-gray-300 pt-2.5 mb-3 break-inside-avoid">
              <div className="w-full sm:w-7/12 pr-4 space-y-2">
                <div className="p-2 bg-gray-50/80 rounded border border-gray-300 space-y-0.5 text-xs">
                  <p className="font-bold text-gray-800 text-xs">สรุปจำนวนถังส่งมอบ:</p>
                  <p className="text-gray-700">รวมถังแก๊สที่จัดส่งทั้งสิ้น: <strong className="text-gray-950">{totalDeliveredTanks} ถัง</strong></p>
                  <p className="text-gray-700">ถังเปล่ารับคืน: <strong>{emptyReturnedTanks} ถัง</strong> | ถังยืม: <strong>{borrowedTanks} ถัง</strong> | น้ำหนักรวม: <strong>{totalWeightKg} กก.</strong></p>
                </div>

                <div className="p-2 bg-gray-50/80 rounded border border-gray-300">
                  <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">จำนวนเงินตัวอักษร (Amount in Words)</p>
                  <p className="text-xs font-bold text-gray-950">{totals.thaiBaht}</p>
                </div>

                <div className="text-xs text-gray-600 space-y-0.5 bg-gray-50/60 p-2 rounded border border-gray-200">
                  <p className="font-bold text-gray-800 text-[11px]">หมายเหตุ:</p>
                  <p className="text-[10px] text-gray-700">{noteText}</p>
                </div>
              </div>

              <div className="w-full sm:w-5/12 pl-2">
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-gray-700">
                    <span>รวมเป็นเงิน (Subtotal):</span>
                    <span className="font-semibold">{totals.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                  </div>
                  <div className="flex justify-between text-gray-700">
                    <span>หักส่วนลด:</span>
                    <span className="font-semibold">
                      {totals.returnDeduction > 0 
                        ? `-${totals.returnDeduction.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿` 
                        : '0.00 ฿'}
                    </span>
                  </div>
                  <div className="flex justify-between items-center bg-gray-900 text-white p-2 rounded mt-1.5 shadow-sm">
                    <span className="font-bold text-xs">ยอดสุทธิ (Grand Total):</span>
                    <span className="font-bold text-sm">{totals.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Signatures Footer */}
        <div className="grid grid-cols-3 gap-6 pt-3 border-t border-gray-400 break-inside-avoid text-center">
          <div>
            <div className="border-b border-gray-400 h-10 mb-1.5"></div>
            <p className="text-xs font-bold text-gray-800">ผู้จัดส่ง / Driver</p>
            <p className="text-[10px] text-gray-500 mt-0.5">วันที่ ..... / ..... / .........</p>
          </div>

          <div>
            <div className="border-b border-gray-400 h-10 mb-1.5"></div>
            <p className="text-xs font-bold text-gray-800">ผู้ตรวจสอบสินค้า / Inspector</p>
            <p className="text-[10px] text-gray-500 mt-0.5">วันที่ ..... / ..... / .........</p>
          </div>

          <div>
            <div className="border-b border-gray-400 h-10 mb-1.5"></div>
            <p className="text-xs font-bold text-gray-800">ผู้รับสินค้า / Customer Receiver</p>
            <p className="text-[10px] text-gray-500 mt-0.5">วันที่ ..... / ..... / .........</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DeliveryNoteA4;
