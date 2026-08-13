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
          size: A4;
          margin: 0;
        }
        @media print {
          html, body {
            height: auto;
            overflow: visible;
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
            height: auto;
            min-height: 297mm;
            margin: 0;
            padding: 10mm 15mm;
            background: white;
            box-shadow: none;
            border-radius: 0;
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
      <div id="customer-statement-a4" className="w-[210mm] min-h-[297mm] bg-white p-[10mm] shadow-lg rounded-sm font-sans text-xs text-gray-800 flex flex-col justify-between">
        
        <div>
          {/* Company Header */}
          <div className="flex justify-between items-start pb-4 border-b-2 border-emerald-600 mb-4">
            <div className="flex gap-3">
              {seller.logo && (
                <img src={seller.logo} alt="Logo" className="h-16 w-auto object-contain flex-shrink-0" />
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-900">{seller.name}</h1>
                <p className="text-[11px] text-gray-600">{seller.address}</p>
                <p className="text-[11px] text-gray-600">โทร: {seller.phone} | เลขประจำตัวผู้เสียภาษี: {seller.taxId}</p>
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-xl font-bold text-emerald-700 uppercase tracking-tight">ใบสรุปรายการส่งสินค้าประจำเดือน</h2>
              <p className="text-xs font-semibold text-gray-700 mt-1">MONTHLY CUSTOMER STATEMENT</p>
              <p className="text-xs font-bold text-emerald-800 mt-0.5">ประจำเดือน {MONTH_NAMES[selectedMonth]} พ.ศ. {selectedYear + 543}</p>
            </div>
          </div>

          {/* Customer Info Box */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded p-3 mb-4 grid grid-cols-2 gap-2 text-xs">
            <div>
              <p className="font-bold text-gray-500 text-[10px] uppercase">ข้อมูลลูกค้า / Customer Info</p>
              <p className="text-sm font-bold text-gray-900">{selectedCustomer.name}</p>
              <p className="text-gray-700"><strong>สาขา:</strong> {selectedCustomer.branch || '-'}</p>
              <p className="text-gray-700"><strong>ที่อยู่:</strong> {selectedCustomer.address || '-'}</p>
              {selectedCustomer.tax_id && <p className="text-gray-700"><strong>เลขผู้เสียภาษี:</strong> {selectedCustomer.tax_id}</p>}
            </div>

            <div className="text-right flex flex-col justify-between">
              <div>
                <p className="text-[10px] text-gray-500 font-bold uppercase">สรุปภาพรวมในเดือนนี้</p>
                <p className="text-xs text-gray-800">จำนวนบิลส่งของ: <strong>{customerSales.length} รายการ</strong></p>
                <p className="text-xs text-gray-800">รวมจำนวนถังแก๊สที่ส่ง: <strong className="text-emerald-700 text-sm">{totalCylinders} ถัง</strong></p>
                {totalGasReturnKg > 0 && <p className="text-xs text-blue-700">น้ำหนักคืนเนื้อแก๊สสะสม: <strong>{totalGasReturnKg} กก.</strong></p>}
              </div>
              <p className="text-[10px] text-gray-400">วันที่พิมพ์เอกสาร: {new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </div>

          {/* Deliveries Table */}
          <div className="mb-4">
            <table className="w-full border-collapse border border-gray-300 text-[11px]">
              <thead>
                <tr className="bg-emerald-700 text-white font-semibold">
                  <th className="py-2 px-2 text-center border border-emerald-800 w-8">#</th>
                  <th className="py-2 px-2 text-center border border-emerald-800 w-20">วันที่ส่ง</th>
                  <th className="py-2 px-2 text-center border border-emerald-800 w-24">เลขที่ใบส่งของ</th>
                  <th className="py-2 px-3 text-left border border-emerald-800">รายการสินค้า (แก๊ส/ขนาด)</th>
                  <th className="py-2 px-2 text-center border border-emerald-800 w-16">ถังส่ง</th>
                  <th className="py-2 px-2 text-center border border-emerald-800 w-20">คืนเนื้อ (กก.)</th>
                  <th className="py-2 px-2 text-center border border-emerald-800 w-20">ชำระโดย</th>
                  <th className="py-2 px-3 text-right border border-emerald-800 w-28">จำนวนเงิน (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {customerSales.length > 0 ? (
                  customerSales.map((s, idx) => {
                    const itemsDesc = (s.items && s.items.length > 0)
                      ? s.items.map(item => `${item.brand} ${item.size} (${item.quantity} ถัง)`).join(', ')
                      : `${s.tank_brand} ${s.tank_size} (${s.quantity} ถัง)`;

                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-emerald-50/20'}>
                        <td className="py-2 px-2 text-center border border-gray-200 text-gray-500">{idx + 1}</td>
                        <td className="py-2 px-2 text-center border border-gray-200 font-medium">{new Date(s.date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit', year: '2-digit' })}</td>
                        <td className="py-2 px-2 text-center border border-gray-200 font-mono text-gray-700">{s.invoice_number || `DN-${s.id.substring(0, 6)}`}</td>
                        <td className="py-2 px-3 border border-gray-200 font-medium text-gray-900">{itemsDesc}</td>
                        <td className="py-2 px-2 text-center border border-gray-200 font-bold text-emerald-800">{s.quantity}</td>
                        <td className="py-2 px-2 text-center border border-gray-200 text-blue-700 font-semibold">{s.gas_return_kg || '-'}</td>
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
                <tr className="bg-emerald-100 border-t-2 border-emerald-600 font-bold text-emerald-950">
                  <td colSpan={4} className="py-2.5 px-3 text-right">รวมยอดส่งสินค้าทั้งหมดในเดือนนี้:</td>
                  <td className="py-2.5 px-2 text-center text-sm font-bold">{totalCylinders} ถัง</td>
                  <td className="py-2.5 px-2 text-center text-blue-800">{totalGasReturnKg} กก.</td>
                  <td className="py-2.5 px-2"></td>
                  <td className="py-2.5 px-3 text-right text-base font-bold text-emerald-900">
                    {totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Amount In Thai Text Box */}
          <div className="p-3 bg-gray-50 border border-gray-300 rounded flex justify-between items-center mb-6">
            <span className="font-bold text-gray-700">จำนวนเงินตัวอักษร:</span>
            <span className="font-bold text-sm text-emerald-800">({thaiBahtText(totalAmount)})</span>
          </div>
        </div>

        {/* Payment Transfer Info & Signatures */}
        <div className="pt-4 border-t border-gray-300 break-inside-avoid">
          <div className="grid grid-cols-2 gap-6 text-center">
            <div>
              <div className="border-b border-gray-400 h-14 mb-2 w-3/4 mx-auto"></div>
              <p className="text-xs font-bold text-gray-800">ผู้ส่งมอบเอกสาร / เจ้าหน้าที่บัญชี</p>
              <p className="text-[10px] text-gray-400 mt-1">({seller.name})</p>
            </div>

            <div>
              <div className="border-b border-gray-400 h-14 mb-2 w-3/4 mx-auto"></div>
              <p className="text-xs font-bold text-gray-800">ผู้รับเอกสาร / ผู้ตรวจสอบรายการ</p>
              <p className="text-[10px] text-gray-400 mt-1">({selectedCustomer.name})</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default CustomerStatementA4;
