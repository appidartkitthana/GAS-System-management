
import React from 'react';
import { Sale, Customer, InvoiceType, VatType } from '../types';
import { generateRunningNumber, calculateInvoiceTotals } from '../lib/utils';
import { useAppContext } from '../context/AppContext';

interface InvoiceA4Props {
  sale: Sale;
  customer: Customer;
}

const InvoiceA4: React.FC<InvoiceA4Props> = ({ sale, customer }) => {
  const { companyInfo: seller, sales } = useAppContext();
  const isTaxInvoice = sale.invoice_type === InvoiceType.TAX_INVOICE;
  
  // Single-source universal calculation engine (PART 17 & PART 18)
  const totals = calculateInvoiceTotals(sale, customer);
  const items = totals.items;

  const docTypePrefix = isTaxInvoice ? 'IVT' : 'REC';
  const documentNumber = sale.invoice_number || generateRunningNumber(docTypePrefix, sale.date, sales);

  const documentTitleThai = isTaxInvoice ? 'ใบเสร็จรับเงิน / ใบกำกับภาษี' : 'ใบเสร็จรับเงิน / บิลเงินสด';
  const documentTitleEng = isTaxInvoice ? 'TAX INVOICE / RECEIPT' : 'RECEIPT / CASH BILL';

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
          #invoice-a4, #invoice-a4 * {
            visibility: visible;
          }
          #invoice-a4 {
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

    {/* Print preview paper container */}
    <div id="invoice-a4" className="w-[210mm] min-h-[285mm] bg-white p-[10mm] shadow-lg rounded-none relative font-sans text-xs text-gray-800 flex flex-col justify-between">
      
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

            {/* Right: Document Info */}
            <div className="w-5/12 text-right flex flex-col items-end">
                 <h2 className="text-lg font-bold text-gray-950 tracking-tight uppercase">
                    {documentTitleThai}
                 </h2>
                 <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-1">
                    {documentTitleEng}
                 </p>
                 <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-right mt-1 text-xs">
                    <span className="font-bold text-gray-700">เลขที่เอกสาร:</span>
                    <span className="font-bold text-gray-950">{documentNumber}</span>
                    <span className="font-bold text-gray-700">วันที่:</span>
                    <span className="font-semibold text-gray-900">{new Date(sale.date).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                 </div>
                 <div className="mt-1.5 text-[9px] font-medium text-gray-500 border border-gray-300 px-2 py-0.5 rounded">
                     ต้นฉบับ (Original)
                 </div>
            </div>
        </div>

        {/* Customer Info Section */}
        <div className="mb-3 bg-gray-50/70 border border-gray-300 rounded p-2.5">
            <h3 className="text-[10px] font-bold text-gray-600 uppercase tracking-wider mb-0.5">ข้อมูลลูกค้า / Customer</h3>
            <p className="text-sm font-bold text-gray-950 leading-tight mb-0.5">{customer.name} {customer.branch ? `(${customer.branch})` : ''}</p>
            <p className="text-xs text-gray-700 mb-0.5"><strong>ที่อยู่ / สถานที่ส่ง:</strong> {customer.address || '-'}</p>
            {customer.tax_id && (
              <p className="text-xs text-gray-700"><strong>เลขประจำตัวผู้เสียภาษี:</strong> {customer.tax_id}</p>
            )}
        </div>

        {/* Items Table - Unified styling */}
        <div className="mb-3">
            <table className="w-full border-collapse table-fixed border border-gray-300 text-xs">
                <thead>
                    <tr className="bg-gray-100 text-gray-900 font-bold border-b border-gray-400">
                        <th className="py-1.5 px-2 w-10 text-center border border-gray-300">#</th>
                        <th className="py-1.5 px-3 text-left border border-gray-300">รายการสินค้า (Description)</th>
                        <th className="py-1.5 px-2 w-16 text-center border border-gray-300">จำนวน</th>
                        <th className="py-1.5 px-2 w-28 text-right border border-gray-300">
                            {totals.vatType === VatType.INCLUDED 
                                ? 'ราคา/หน่วย (รวม VAT)' 
                                : totals.vatType === VatType.EXCLUDED 
                                    ? 'ราคา/หน่วย (ก่อน VAT)' 
                                    : 'ราคา/หน่วย (บาท)'}
                        </th>
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
                              {Number(item.unit_price).toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                            <td className="py-2 px-3 text-right font-bold text-gray-950">
                              {Number(item.total_price).toLocaleString('th-TH', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Summary Section - Strict Layout */}
        <div className="flex flex-col sm:flex-row items-start justify-between border-t-2 border-gray-300 pt-2.5 mb-3 break-inside-avoid">
            
            {/* Left: Text Amount & Notes */}
            <div className="w-full sm:w-7/12 pr-4 space-y-2">
                 {/* Return profit notice */}
                 {totals.gasReturnKg > 0 && totals.returnDeduction > 0 && (
                    <div className="bg-emerald-50 text-emerald-800 p-2 rounded text-xs border border-emerald-200 flex justify-between items-center">
                        <span><strong>หักส่วนลดกำไรคืนแก๊ส:</strong> {totals.gasReturnKg} กก. (@ {totals.gasReturnPrice || 0} บาท/กก.)</span>
                        <span className="font-bold">-{totals.returnDeduction.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                    </div>
                 )}
                
                <div className="p-2 bg-gray-50/80 rounded border border-gray-300">
                     <p className="text-[9px] text-gray-500 uppercase tracking-wider mb-0.5">จำนวนเงินตัวอักษร (Amount in Words)</p>
                     <p className="text-xs font-bold text-gray-950">{totals.thaiBaht}</p>
                </div>

                <div className="text-xs text-gray-600 space-y-0.5 bg-gray-50/60 p-2 rounded border border-gray-200">
                    <p><strong>วิธีชำระเงิน:</strong> {sale.payment_method}</p>
                    <p className="font-bold text-gray-800 text-[11px]">หมายเหตุ:</p>
                    <ul className="list-disc list-inside text-[10px] text-gray-600 space-y-0.5">
                      <li>ใบเสร็จรับเงินฉบับนี้จะสมบูรณ์ต่อเมื่อได้เรียกเก็บเงินจากท่านเป็นที่เรียบร้อยแล้ว</li>
                      <li>ได้รับสินค้าตามรายการข้างต้นเป็นที่ถูกต้องเรียบร้อย</li>
                    </ul>
                </div>
            </div>

            {/* Right: Calculation Breakdown */}
            <div className="w-full sm:w-5/12 pl-2">
                <div className="space-y-1 text-xs">
                    <div className="flex justify-between text-gray-700">
                        <span>รวมเป็นเงิน (Subtotal):</span>
                        <span className="font-semibold">{totals.subtotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} ฿</span>
                    </div>

                    <div className="flex justify-between text-gray-700">
                        <span>หักส่วนลด:</span>
                        <span className="font-semibold">
                            {totals.returnDeduction > 0 
                                ? `-${totals.returnDeduction.toLocaleString('th-TH', {minimumFractionDigits: 2})} ฿` 
                                : '0.00 ฿'}
                        </span>
                    </div>

                    {totals.vatType !== VatType.NO_VAT && (
                        <>
                            <div className="flex justify-between text-gray-600 pt-1 border-t border-dotted border-gray-300">
                                <span>มูลค่าก่อนภาษี (Pre-VAT):</span>
                                <span>{totals.preVatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} ฿</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>ภาษีมูลค่าเพิ่ม 7% (VAT):</span>
                                <span>{totals.vatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} ฿</span>
                            </div>
                        </>
                    )}
                     
                    <div className="flex justify-between items-center bg-gray-900 text-white p-2 rounded mt-1.5 shadow-sm">
                        <span className="font-bold text-xs">ยอดสุทธิ (Grand Total):</span>
                        <span className="font-bold text-sm">{totals.grandTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} ฿</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Signatures Footer */}
      <div className="grid grid-cols-2 gap-8 pt-3 border-t border-gray-400 break-inside-avoid text-center">
           <div>
               <div className="border-b border-gray-400 h-10 mb-1.5"></div>
               <p className="text-xs font-bold text-gray-800">ผู้รับเงิน / Collector</p>
               <p className="text-[10px] text-gray-500 mt-0.5">วันที่ ..... / ..... / .........</p>
           </div>

           <div>
               <div className="border-b border-gray-400 h-10 mb-1.5"></div>
               <p className="text-xs font-bold text-gray-800">ผู้รับสินค้า / Customer Receiver</p>
               <p className="text-[10px] text-gray-500 mt-0.5">วันที่ ..... / ..... / .........</p>
           </div>
      </div>

    </div>

    {/* Print Button (No Print) */}
    <div className="fixed bottom-8 right-8 no-print z-50">
      <button 
          onClick={handlePrint} 
          className="bg-gray-900 text-white px-6 py-3 rounded-full shadow-xl hover:bg-black font-bold flex items-center gap-2 transition-transform hover:scale-105"
      >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h6m-6-4h6" />
          </svg>
          พิมพ์เอกสาร (A4)
      </button>
    </div>
  </div>
  );
};

export default InvoiceA4;
