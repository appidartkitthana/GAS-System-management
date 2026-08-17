
import React from 'react';
import { Sale, Customer, InvoiceType } from '../types';
import { thaiBahtText, generateRunningNumber } from '../lib/utils';
import { useAppContext } from '../context/AppContext';

interface InvoiceA4Props {
  sale: Sale;
  customer: Customer;
}

const InvoiceA4: React.FC<InvoiceA4Props> = ({ sale, customer }) => {
  const { companyInfo: seller, sales } = useAppContext();
  const isTaxInvoice = sale.invoice_type === InvoiceType.TAX_INVOICE;
  
  // Calculate Totals
  const items = (sale.items && sale.items.length > 0) 
    ? sale.items 
    : [{ brand: sale.tank_brand, size: sale.tank_size, quantity: sale.quantity, unit_price: sale.unit_price, total_price: sale.total_amount }];

  const subTotal = items.reduce((acc, item) => acc + item.total_price, 0);
  const returnDeduction = (sale.gas_return_kg || 0) * (sale.gas_return_price || 0);
  const totalAfterReturn = subTotal - returnDeduction;

  const preVatAmount = totalAfterReturn / 1.07;
  const vatAmount = totalAfterReturn - preVatAmount;
  const finalTotal = totalAfterReturn;

  const docTypePrefix = isTaxInvoice ? 'IVT' : 'SHORT_TAX_INVOICE';
  const documentNumber = sale.invoice_number || generateRunningNumber(docTypePrefix, sale.date, sales);

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
          #invoice-a4, #invoice-a4 * {
            visibility: visible;
          }
          #invoice-a4 {
            position: absolute;
            left: 0;
            top: 0;
            width: 210mm;
            height: 297mm;
            max-height: 297mm;
            box-sizing: border-box !important;
            margin: 0 !important;
            padding: 10mm 12mm !important;
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

    <div id="invoice-a4" className="w-[210mm] min-h-[297mm] bg-white p-[10mm] shadow-lg rounded-sm relative font-sans text-sm text-gray-700 flex flex-col justify-between">
      
      <div>
        {/* Header Section - No Logo (Requirement 9) */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-emerald-600">
            {/* Left: Seller Info */}
            <div className="w-7/12 pr-4">
                <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{seller.name}</h1>
                <p className="text-xs text-gray-600 leading-relaxed mt-1">{seller.address}</p>
                <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-gray-700">
                     <p><strong>โทรศัพท์:</strong> {seller.phone}</p>
                     <p><strong>เลขประจำตัวผู้เสียภาษี:</strong> {seller.taxId}</p>
                </div>
            </div>

            {/* Right: Document Info */}
            <div className="w-5/12 text-right flex flex-col items-end">
                 <h2 className="text-2xl font-bold text-emerald-700 tracking-wide uppercase">
                    {isTaxInvoice ? 'ใบเสร็จรับเงิน/ใบกำกับภาษี' : 'ใบเสร็จรับเงิน'}
                 </h2>
                 <p className="text-xs text-gray-500 mb-2">{isTaxInvoice ? 'TAX INVOICE / RECEIPT' : 'RECEIPT'}</p>
                 <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-right mt-1 text-xs">
                    <span className="font-bold text-gray-700">เลขที่เอกสาร:</span>
                    <span className="font-bold text-emerald-800">{documentNumber}</span>
                    <span className="font-bold text-gray-700">วันที่:</span>
                    <span className="font-medium text-gray-900">{new Date(sale.date).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                 </div>
                 <div className="mt-2 text-[10px] text-gray-500 border border-gray-300 px-2 py-0.5 rounded">
                     เอกสารออกเป็นชุด (ต้นฉบับ)
                 </div>
            </div>
        </div>

        {/* Customer Info Section */}
        <div className="mb-6 bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">ลูกค้า / Customer</h3>
            <p className="text-lg font-bold text-gray-900 leading-none mb-1">{customer.name} {customer.branch ? `(${customer.branch})` : ''}</p>
            <p className="text-xs text-gray-600 mb-1">{customer.address || '-'}</p>
            <p className="text-xs text-gray-600"><strong>เลขประจำตัวผู้เสียภาษี:</strong> {customer.tax_id || '-'}</p>
        </div>

        {/* Items Table */}
        <div className="mb-6">
            <table className="w-full border-collapse table-fixed border border-gray-200">
                <thead>
                    <tr className="bg-emerald-600 text-white text-xs uppercase tracking-wider">
                        <th className="py-2.5 px-2 w-12 text-center border border-emerald-700">#</th>
                        <th className="py-2.5 px-3 text-left border border-emerald-700">รายการสินค้า (Description)</th>
                        <th className="py-2.5 px-2 w-20 text-center border border-emerald-700">จำนวน</th>
                        <th className="py-2.5 px-2 w-28 text-right border border-emerald-700">ราคา/หน่วย (บาท)</th>
                        <th className="py-2.5 px-3 w-32 text-right border border-emerald-700">จำนวนเงิน (บาท)</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-200">
                            <td className="py-3 px-2 text-center text-gray-500 border-r border-gray-200">{idx + 1}</td>
                            <td className="py-3 px-3 border-r border-gray-200">
                                <span className="font-bold text-gray-900">แก๊ส {item.brand}</span>
                                <span className="text-gray-600 ml-2">(ขนาด {item.size})</span>
                            </td>
                            <td className="py-3 px-2 text-center font-semibold border-r border-gray-200">{item.quantity}</td>
                            <td className="py-3 px-2 text-right border-r border-gray-200">{item.unit_price.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                            <td className="py-3 px-3 text-right font-semibold text-gray-900">{item.total_price.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>

        {/* Summary Section */}
        <div className="flex flex-col sm:flex-row items-start justify-between border-t-2 border-gray-300 pt-4 mb-6 break-inside-avoid">
            
            {/* Left: Text Amount & Notes */}
            <div className="w-full sm:w-7/12 pr-6 space-y-3">
                 {/* Return profit notice */}
                 {sale.gas_return_kg && (
                    <div className="bg-emerald-50 text-emerald-800 p-2.5 rounded text-xs border border-emerald-200 flex justify-between items-center">
                        <span><strong>หักส่วนลดกำไรแก๊ส:</strong> {sale.gas_return_kg} กก. (@ {sale.gas_return_price || 0} บาท/กก.)</span>
                        <span className="font-bold">-{returnDeduction.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                    </div>
                )}
                
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                     <p className="text-[10px] text-gray-500 uppercase tracking-wider mb-0.5">จำนวนเงินตัวอักษร (Amount in Words)</p>
                     <p className="text-base font-bold text-emerald-800">{thaiBahtText(finalTotal)}</p>
                </div>

                <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-2.5 rounded border border-gray-200">
                    <p><strong>วิธีชำระเงิน:</strong> {sale.payment_method}</p>
                    <p className="font-bold text-gray-800">หมายเหตุ:</p>
                    <ul className="list-disc list-inside text-[11px] text-gray-600 space-y-0.5">
                      <li>ใบเสร็จรับเงินฉบับนี้จะสมบูรณ์ต่อเมื่อได้เรียกเก็บเงินจากท่านเป็นที่เรียบร้อยแล้ว</li>
                      <li>ได้รับสินค้าตามรายการข้างต้นเป็นที่ถูกต้องเรียบร้อย</li>
                    </ul>
                </div>
            </div>

            {/* Right: Calculation */}
            <div className="w-full sm:w-5/12 pl-2">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                        <span>รวมเป็นเงิน (Subtotal):</span>
                        <span className="font-medium">{subTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} ฿</span>
                    </div>
                     {sale.gas_return_kg && (
                         <div className="flex justify-between text-emerald-700 text-xs">
                            <span>หักส่วนลดกำไรแก๊ส:</span>
                            <span>-{returnDeduction.toLocaleString('th-TH', {minimumFractionDigits: 2})} ฿</span>
                        </div>
                     )}
                     {isTaxInvoice && (
                         <>
                            <div className="flex justify-between text-gray-600 text-xs">
                                <span>มูลค่าก่อนภาษี (Pre-VAT):</span>
                                <span>{preVatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} ฿</span>
                            </div>
                            <div className="flex justify-between text-gray-600 text-xs">
                                <span>ภาษีมูลค่าเพิ่ม 7% (VAT):</span>
                                <span>{vatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} ฿</span>
                            </div>
                         </>
                     )}
                     
                     <div className="flex justify-between items-center bg-emerald-600 text-white p-2.5 rounded mt-2 shadow-sm">
                        <span className="font-bold">ยอดสุทธิ (Grand Total):</span>
                        <span className="font-bold text-xl">{finalTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})} ฿</span>
                    </div>
                </div>
            </div>
        </div>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-8 pt-4 border-t border-gray-300 break-inside-avoid text-center">
           <div>
               <div className="border-b border-gray-400 h-14 mb-2"></div>
               <p className="text-xs font-bold text-gray-700">ผู้รับเงิน / Collector</p>
               <p className="text-[10px] text-gray-400 mt-1">วันที่ ..... / ..... / .........</p>
           </div>

           <div>
               <div className="border-b border-gray-400 h-14 mb-2"></div>
               <p className="text-xs font-bold text-gray-700">ผู้รับสินค้า / Customer Receiver</p>
               <p className="text-[10px] text-gray-400 mt-1">วันที่ ..... / ..... / .........</p>
           </div>
      </div>

    </div>

    <div className="fixed bottom-8 right-8 no-print z-50">
      <button 
          onClick={handlePrint} 
          className="bg-emerald-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-emerald-700 font-bold flex items-center gap-2 transition-transform hover:scale-105"
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
