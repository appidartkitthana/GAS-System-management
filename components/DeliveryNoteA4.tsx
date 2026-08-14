import React, { useState } from 'react';
import { Sale, Customer } from '../types';
import { thaiBahtText } from '../lib/utils';
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
  defaultWithPrice = true,
  onClose 
}) => {
  const { companyInfo: seller } = useAppContext();
  const [showPrice, setShowPrice] = useState<boolean>(defaultWithPrice);

  const items = (sale.items && sale.items.length > 0)
    ? sale.items
    : [{ brand: sale.tank_brand, size: sale.tank_size, quantity: sale.quantity, unit_price: sale.unit_price, total_price: sale.total_amount }];

  const totalTanks = items.reduce((acc, item) => acc + item.quantity, 0);
  const subTotal = items.reduce((acc, item) => acc + item.total_price, 0);
  const returnDeduction = (sale.gas_return_kg || 0) * (sale.gas_return_price || 0);
  const finalTotal = subTotal - returnDeduction;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-gray-200 p-4 min-h-screen flex flex-col items-center overflow-auto">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 0;
        }
        @media print {
          html, body {
            width: 210mm;
            height: 297mm;
            overflow: hidden !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white;
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
            width: 210mm;
            height: 297mm;
            max-height: 297mm;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 8mm 12mm !important;
            background: white;
            box-shadow: none;
            border-radius: 0;
            overflow: hidden !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
          }
          .no-print {
            display: none !important;
          }
          thead { display: table-header-group; }
          tr { page-break-inside: avoid; }
        }
      `}</style>

      {/* Control Panel Bar */}
      <div className="bg-white border border-gray-300 shadow-md rounded-lg p-4 mb-4 w-full max-w-[210mm] flex flex-wrap justify-between items-center gap-3 no-print">
        <div className="flex items-center gap-3">
          <span className="font-bold text-gray-700 text-sm">รูปแบบใบส่งของ:</span>
          <div className="inline-flex rounded-md shadow-sm">
            <button
              type="button"
              onClick={() => setShowPrice(true)}
              className={`px-4 py-2 text-xs font-semibold rounded-l-lg border ${
                showPrice 
                  ? 'bg-orange-500 text-white border-orange-500' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              แบบมีราคา
            </button>
            <button
              type="button"
              onClick={() => setShowPrice(false)}
              className={`px-4 py-2 text-xs font-semibold rounded-r-lg border ${
                !showPrice 
                  ? 'bg-orange-500 text-white border-orange-500' 
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              แบบไม่มีราคา (จำนวนถังอย่างเดียว)
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300"
            >
              ปิดหน้าต่าง
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-700 flex items-center gap-1.5 shadow"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h6m-6-4h6" />
            </svg>
            พิมพ์ใบส่งของ (A4)
          </button>
        </div>
      </div>

      {/* Main Delivery Note Paper */}
      <div id="delivery-note-a4" className="w-[210mm] min-h-[297mm] bg-white p-[10mm] shadow-lg rounded-sm font-sans text-sm text-gray-800 flex flex-col justify-between">
        
        <div>
          {/* Header */}
          <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-orange-500">
            {/* Left: Seller Info */}
            <div className="flex gap-4 w-7/12">
              {seller.logo && (
                <img src={seller.logo} alt="Logo" className="h-20 w-auto object-contain flex-shrink-0" />
              )}
              <div className="flex flex-col justify-center">
                <h1 className="text-xl font-bold text-gray-900">{seller.name}</h1>
                <p className="text-xs text-gray-600 leading-tight mt-1">{seller.address}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                  <p><strong>โทร:</strong> {seller.phone}</p>
                  <p><strong>เลขภาษี:</strong> {seller.taxId}</p>
                </div>
              </div>
            </div>

            {/* Right: Document Title & Metadata */}
            <div className="w-5/12 text-right flex flex-col items-end">
              <h2 className="text-2xl font-bold text-orange-600 tracking-wide uppercase">
                ใบส่งของ / ใบส่งสินค้า
              </h2>
              <p className="text-xs text-gray-400 mb-2">DELIVERY NOTE {showPrice ? '(WITH PRICE)' : '(QUANTITY ONLY)'}</p>
              
              <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-right mt-1 text-xs">
                <span className="font-bold text-gray-700">เลขที่ใบส่งของ:</span>
                <span className="font-semibold text-gray-900">{sale.invoice_number || `DN-${sale.id.substring(0, 8)}`}</span>
                <span className="font-bold text-gray-700">วันที่ส่งสินค้า:</span>
                <span className="font-medium text-gray-900">{new Date(sale.date).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                <span className="font-bold text-gray-700">ชำระโดย:</span>
                <span className="font-medium text-gray-900">{sale.payment_method}</span>
              </div>
            </div>
          </div>

          {/* Customer Info Section */}
          <div className="mb-6 bg-orange-50/60 border border-orange-200 rounded p-4">
            <h3 className="text-xs font-bold text-orange-800 uppercase tracking-wider mb-2">ข้อมูลสถานที่ส่งมอบสินค้า / Customer</h3>
            <p className="text-base font-bold text-gray-900 mb-1">{customer.name} {customer.branch ? `(${customer.branch})` : ''}</p>
            <p className="text-xs text-gray-700 mb-1"><strong>สถานที่จัดส่ง:</strong> {customer.address || '-'}</p>
            {customer.tax_id && <p className="text-xs text-gray-600"><strong>เลขประจำตัวผู้เสียภาษี:</strong> {customer.tax_id}</p>}
          </div>

          {/* Items Table */}
          <div className="mb-6">
            {showPrice ? (
              /* TABLE WITH PRICE */
              <table className="w-full border-collapse table-fixed border border-gray-300">
                <thead>
                  <tr className="bg-orange-500 text-white text-xs uppercase tracking-wider">
                    <th className="py-2.5 px-2 w-12 text-center border border-orange-600">#</th>
                    <th className="py-2.5 px-3 text-left border border-orange-600">รายการสินค้า (Description)</th>
                    <th className="py-2.5 px-2 w-24 text-center border border-orange-600">จำนวน (ถัง)</th>
                    <th className="py-2.5 px-2 w-28 text-right border border-orange-600">ราคา/ถัง (฿)</th>
                    <th className="py-2.5 px-3 w-32 text-right border border-orange-600">จำนวนเงิน (฿)</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="py-3 px-2 text-center text-gray-500 border-r border-gray-200">{idx + 1}</td>
                      <td className="py-3 px-3 border-r border-gray-200">
                        <span className="font-bold text-gray-900">แก๊ส {item.brand}</span>
                        <span className="text-gray-600 ml-2">ขนาด {item.size}</span>
                      </td>
                      <td className="py-3 px-2 text-center font-bold text-gray-800 border-r border-gray-200">{item.quantity}</td>
                      <td className="py-3 px-2 text-right border-r border-gray-200">{item.unit_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                      <td className="py-3 px-3 text-right font-semibold text-gray-900">{item.total_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              /* TABLE WITHOUT PRICE (QUANTITY & TANK RETURN CHECKLIST ONLY) */
              <table className="w-full border-collapse table-fixed border border-gray-300">
                <thead>
                  <tr className="bg-orange-600 text-white text-xs uppercase tracking-wider">
                    <th className="py-2.5 px-2 w-12 text-center border border-orange-700">#</th>
                    <th className="py-2.5 px-3 text-left border border-orange-700">รายการแก๊ส / อุปกรณ์</th>
                    <th className="py-2.5 px-2 w-28 text-center border border-orange-700">จำนวนถังที่ส่ง</th>
                    <th className="py-2.5 px-2 w-32 text-center border border-orange-700">ถังเปล่าที่รับคืน</th>
                    <th className="py-2.5 px-3 text-left border border-orange-700">หมายเหตุ / สภาพถัง</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {items.map((item, idx) => (
                    <tr key={idx} className="border-b border-gray-200">
                      <td className="py-3.5 px-2 text-center text-gray-500 border-r border-gray-200">{idx + 1}</td>
                      <td className="py-3.5 px-3 border-r border-gray-200">
                        <span className="font-bold text-gray-900">แก๊ส {item.brand}</span>
                        <span className="text-gray-600 ml-2">(ขนาด {item.size})</span>
                      </td>
                      <td className="py-3.5 px-2 text-center font-bold text-lg text-orange-600 border-r border-gray-200">
                        {item.quantity} ถัง
                      </td>
                      <td className="py-3.5 px-2 text-center border-r border-gray-200">
                        <span className="text-gray-400 text-xs">[ ......... ถัง ]</span>
                      </td>
                      <td className="py-3.5 px-3 text-gray-400 text-xs">
                        ...................................................
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Delivery & Summary Details Box */}
          <div className="grid grid-cols-2 gap-4 border-t-2 border-gray-300 pt-4 mb-6">
            <div className="space-y-2 text-xs text-gray-700">
              <div className="p-3 bg-gray-50 rounded border border-gray-200 space-y-1">
                <p className="font-bold text-gray-800 text-sm">สรุปจำนวนถังส่งมอบ:</p>
                <p className="text-gray-700">รวมถังแก๊สที่จัดส่งทั้งสิ้น: <strong className="text-orange-600 text-base">{totalTanks} ถัง</strong></p>
                {sale.gas_return_kg && (
                  <p className="text-blue-700">ชั่งน้ำหนักคืนเนื้อแก๊ส: <strong>{sale.gas_return_kg} กิโลกรัม</strong></p>
                )}
              </div>

              {!showPrice && (
                <p className="text-[11px] text-gray-500 italic mt-2">
                  * หมายเหตุ: เอกสารนี้สำหรับใช้ในการตรวจรับและจัดส่งสินค้าถังแก๊สประจำวัน (ไม่แสดงยอดเงิน)
                </p>
              )}
            </div>

            {/* Price Calculations (Only when showPrice is true) */}
            {showPrice ? (
              <div className="space-y-2 text-sm pl-4">
                <div className="flex justify-between text-gray-700">
                  <span>ราคารวมสินค้า:</span>
                  <span className="font-semibold">{subTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                </div>
                {sale.gas_return_kg && (
                  <div className="flex justify-between text-blue-700 text-xs">
                    <span>ส่วนลดหักคืนเนื้อ ({sale.gas_return_kg} กก.):</span>
                    <span>-{returnDeduction.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                  </div>
                )}
                <div className="flex justify-between items-center bg-orange-600 text-white p-2.5 rounded mt-2 shadow-sm">
                  <span className="font-bold">ยอดเงินสุทธิที่ต้องชำระ:</span>
                  <span className="font-bold text-xl">{finalTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                </div>
                <p className="text-right text-xs font-bold text-orange-800 pt-1">
                  ({thaiBahtText(finalTotal)})
                </p>
              </div>
            ) : (
              <div className="p-3 bg-slate-50 rounded border border-slate-200 flex flex-col justify-center text-center">
                <p className="text-xs text-slate-500 mb-1">ยืนยันการรับสินค้าถูกต้องตามจำนวนถัง</p>
                <p className="text-sm font-bold text-slate-800">จำนวนส่งมอบรวม: {totalTanks} ถัง</p>
              </div>
            )}
          </div>
        </div>

        {/* Signatures Footer */}
        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-gray-300 break-inside-avoid text-center">
          <div>
            <div className="border-b border-gray-400 h-16 mb-2"></div>
            <p className="text-xs font-bold text-gray-700">ผู้จัดส่ง / Driver</p>
            <p className="text-[10px] text-gray-400 mt-1">วันที่ ..... / ..... / .........</p>
          </div>

          <div>
            <div className="border-b border-gray-400 h-16 mb-2"></div>
            <p className="text-xs font-bold text-gray-700">ผู้ตรวจสอบสินค้า / Inspector</p>
            <p className="text-[10px] text-gray-400 mt-1">วันที่ ..... / ..... / .........</p>
          </div>

          <div>
            <div className="border-b border-gray-400 h-16 mb-2"></div>
            <p className="text-xs font-bold text-gray-700">ผู้รับสินค้า / Customer Receiver</p>
            <p className="text-[10px] text-gray-400 mt-1">วันที่ ..... / ..... / .........</p>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DeliveryNoteA4;
