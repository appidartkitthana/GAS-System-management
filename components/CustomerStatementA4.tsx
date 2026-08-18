import React, { useState } from 'react';
import { Customer } from '../types';
import { useAppContext } from '../context/AppContext';
import { thaiBahtText } from '../lib/utils';
import PrinterIcon from './icons/PrinterIcon';

interface CustomerStatementA4Props {
  selectedCustomer: Customer;
  selectedYear: number;
  selectedMonth: number; // 0-indexed
  onClose?: () => void;
}

const MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const CustomerStatementA4: React.FC<CustomerStatementA4Props> = ({
  selectedCustomer,
  selectedYear,
  selectedMonth,
  onClose
}) => {
  const { companyInfo: seller, sales } = useAppContext();

  // Filter sales for this customer in this month
  const customerSales = sales.filter(s => {
    const d = new Date(s.date);
    return s.customer_id === selectedCustomer.id &&
           d.getFullYear() === selectedYear &&
           d.getMonth() === selectedMonth;
  }).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const totalAmount = customerSales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalGasReturnKg = customerSales.reduce((acc, s) => acc + (s.gas_return_kg || 0), 0);
  const totalGasReturnDeduction = customerSales.reduce((acc, s) => acc + ((s.gas_return_kg || 0) * (s.gas_return_price || 0)), 0);

  const totalCylinders = customerSales.reduce((acc, s) => {
    if (s.items && s.items.length > 0) {
      return acc + s.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    return acc + s.quantity;
  }, 0);

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
          #customer-statement-a4, #customer-statement-a4 * {
            visibility: visible;
          }
          #customer-statement-a4 {
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
      <div className="bg-white border border-gray-300 shadow-md rounded-lg p-4 mb-4 w-full max-w-[210mm] flex justify-between items-center no-print">
        <div>
          <h2 className="font-bold text-gray-800 text-sm">ใบสรุปยอดส่งสินค้าลูกค้ารายบุคคล (Statement)</h2>
          <p className="text-xs text-gray-500">ลูกค้า: {selectedCustomer.name} ({selectedCustomer.branch}) | เดือน {MONTH_NAMES[selectedMonth]} {selectedYear + 543}</p>
        </div>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 text-gray-700 text-xs font-semibold rounded-lg hover:bg-gray-300"
            >
              ปิด
            </button>
          )}
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-emerald-600 text-white text-xs font-bold rounded-lg hover:bg-emerald-700 flex items-center gap-1.5 shadow"
          >
            <PrinterIcon className="h-4 w-4" />
            พิมพ์ใบสรุปยอดลูกค้า (A4)
          </button>
        </div>
      </div>

      {/* A4 Document Paper */}
      <div id="customer-statement-a4" className="w-[210mm] min-h-[297mm] bg-white p-[12mm] shadow-lg rounded-none font-sans text-xs text-gray-800 flex flex-col justify-between">
        
        <div>
          {/* Company Header (No Logo - Requirement 9) */}
          <div className="flex justify-between items-start pb-4 border-b-2 border-gray-800 mb-4">
            <div className="w-7/12 pr-4">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{seller.name}</h1>
              <p className="text-xs text-gray-600 leading-relaxed mt-1">{seller.address}</p>
              <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-xs text-gray-700">
                <p><strong>โทร:</strong> {seller.phone}</p>
                <p><strong>เลขประจำตัวผู้เสียภาษี:</strong> {seller.taxId}</p>
              </div>
            </div>

            <div className="w-5/12 text-right flex flex-col items-end">
              <h2 className="text-xl font-bold text-gray-900 tracking-tight uppercase">ใบสรุปรายการส่งสินค้าประจำเดือน</h2>
              <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider mb-2">MONTHLY CUSTOMER STATEMENT</p>
              <p className="text-xs font-bold text-gray-900 mt-0.5">ประจำเดือน {MONTH_NAMES[selectedMonth]} {selectedYear + 543}</p>
              <div className="mt-2 text-[10px] font-medium text-gray-500 border border-gray-300 px-2 py-0.5 rounded">
                ต้นฉบับ (Original)
              </div>
            </div>
          </div>

          {/* Customer Info Box */}
          <div className="bg-gray-50/70 border border-gray-300 rounded p-3 mb-4 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="font-bold text-gray-600 text-[11px] uppercase tracking-wider mb-1">ข้อมูลลูกค้า / Customer Info</p>
              <p className="text-sm font-bold text-gray-950">{selectedCustomer.name} {selectedCustomer.branch ? `(${selectedCustomer.branch})` : ''}</p>
              <p className="text-xs text-gray-700 mt-0.5"><strong>ที่อยู่:</strong> {selectedCustomer.address || '-'}</p>
              {selectedCustomer.tax_id && <p className="text-xs text-gray-700 mt-0.5"><strong>เลขประจำตัวผู้เสียภาษี:</strong> {selectedCustomer.tax_id}</p>}
            </div>

            <div className="text-right flex flex-col justify-between">
              <div>
                <p className="text-[11px] text-gray-600 font-bold uppercase tracking-wider mb-1">สรุปภาพรวมในเดือนนี้</p>
                <p className="text-xs text-gray-800">จำนวนบิลส่งของ: <strong>{customerSales.length} รายการ</strong></p>
                <p className="text-xs text-gray-800">รวมจำนวนถังแก๊สที่ส่ง: <strong className="text-gray-950 text-sm">{totalCylinders} ถัง</strong></p>
                {totalGasReturnKg > 0 && <p className="text-xs text-emerald-800">น้ำหนักคืนเนื้อแก๊สสะสม: <strong>{totalGasReturnKg} กก.</strong></p>}
              </div>
              <p className="text-[10px] text-gray-400">วันที่พิมพ์เอกสาร: {new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </div>

          {/* Deliveries Table */}
          <div className="mb-4">
            <table className="w-full border-collapse border border-gray-300 text-xs">
              <thead>
                <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-400">
                  <th className="py-2 px-2 text-center border border-gray-300 w-8">#</th>
                  <th className="py-2 px-2 text-center border border-gray-300 w-20">วันที่ส่ง</th>
                  <th className="py-2 px-2 text-center border border-gray-300 w-24">เลขที่ใบส่งของ</th>
                  <th className="py-2 px-3 text-left border border-gray-300">รายการสินค้า (แก๊ส/ขนาด)</th>
                  <th className="py-2 px-2 text-center border border-gray-300 w-16">ถังส่ง</th>
                  <th className="py-2 px-2 text-center border border-gray-300 w-20">คืนเนื้อ (กก.)</th>
                  <th className="py-2 px-2 text-center border border-gray-300 w-20">ชำระโดย</th>
                  <th className="py-2 px-3 text-right border border-gray-300 w-28">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {customerSales.length > 0 ? (
                  customerSales.map((s, idx) => {
                    const itemsDesc = (s.items && s.items.length > 0)
                      ? s.items.map(item => `${item.brand} ${item.size} (${item.quantity} ถัง)`).join(', ')
                      : `${s.tank_brand} ${s.tank_size} (${s.quantity} ถัง)`;

                    return (
                      <tr key={idx} className="border-b border-gray-200">
                        <td className="py-2 px-2 text-center border border-gray-200 text-gray-500">{idx + 1}</td>
                        <td className="py-2 px-2 text-center border border-gray-200 font-medium">{new Date(s.date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                        <td className="py-2 px-2 text-center border border-gray-200 font-mono text-gray-700">{s.invoice_number || `DN-${s.id.substring(0, 6)}`}</td>
                        <td className="py-2 px-3 border border-gray-200 font-medium text-gray-900">{itemsDesc}</td>
                        <td className="py-2 px-2 text-center border border-gray-200 font-bold text-gray-950">{s.quantity}</td>
                        <td className="py-2 px-2 text-center border border-gray-200 text-emerald-800 font-semibold">{s.gas_return_kg || '-'}</td>
                        <td className="py-2 px-2 text-center border border-gray-200 text-gray-600">{s.payment_method}</td>
                        <td className="py-2 px-3 text-right border border-gray-200 font-bold text-gray-900">
                          {s.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center py-6 text-gray-400">ไม่มีประวัติการส่งสินค้าให้ลูกค้ารายนี้ในเดือนนี้</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-400 font-bold text-gray-950">
                  <td colSpan={4} className="py-2.5 px-3 text-right">รวมยอดส่งสินค้าทั้งหมดในเดือนนี้:</td>
                  <td className="py-2.5 px-2 text-center text-xs font-bold">{totalCylinders} ถัง</td>
                  <td className="py-2.5 px-2 text-center text-emerald-800">{totalGasReturnKg} กก.</td>
                  <td className="py-2.5 px-2"></td>
                  <td className="py-2.5 px-3 text-right text-sm font-bold text-gray-950">
                    {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount In Thai Text Box */}
          <div className="p-2.5 bg-gray-50/80 border border-gray-300 rounded flex justify-between items-center mb-6">
            <span className="font-bold text-gray-700 text-xs">จำนวนเงินตัวอักษร:</span>
            <span className="font-bold text-sm text-gray-950">({thaiBahtText(totalAmount)})</span>
          </div>
        </div>

        {/* Payment Transfer Info & Signatures */}
        <div className="pt-4 border-t border-gray-400 break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="border-b border-gray-400 h-12 mb-2 w-3/4 mx-auto"></div>
              <p className="text-xs font-bold text-gray-800">ผู้ส่งมอบเอกสาร / เจ้าหน้าที่บัญชี</p>
              <p className="text-[10px] text-gray-500 mt-1">({seller.name})</p>
            </div>

            <div>
              <div className="border-b border-gray-400 h-12 mb-2 w-3/4 mx-auto"></div>
              <p className="text-xs font-bold text-gray-800">ผู้รับเอกสาร / ผู้ตรวจสอบรายการ</p>
              <p className="text-[10px] text-gray-500 mt-1">({selectedCustomer.name})</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerStatementA4;
