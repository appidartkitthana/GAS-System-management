
import React from 'react';
import { Sale, Customer, InvoiceType } from '../types';
import { thaiBahtText } from '../lib/utils';
import { useAppContext } from '../context/AppContext';

interface InvoiceA4Props {
  sale: Sale;
  customer: Customer;
}

const InvoiceA4: React.FC<InvoiceA4Props> = ({ sale, customer }) => {
  const { companyInfo: seller } = useAppContext();
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
            #invoice-a4, #invoice-a4 * {
              visibility: visible;
            }
            #invoice-a4 {
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
            /* Table formatting for print */
            thead { display: table-header-group; }
            tr { page-break-inside: avoid; }
          }
        `}</style>
      
      {/* Print Instructions for User */}
      <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-3 rounded mb-4 max-w-[210mm] no-print">
          <p className="font-bold">คำแนะนำการพิมพ์:</p>
          <ul className="list-disc ml-5 text-sm">
              <li>ตั้งค่าขนาดกระดาษเป็น <strong>A4</strong></li>
              <li>ตั้งค่า Margin เป็น <strong>None</strong> หรือ <strong>Default (0)</strong></li>
              <li>Scale: <strong>100%</strong></li>
          </ul>
      </div>

      <div id="invoice-a4" className="w-[210mm] min-h-[297mm] bg-white p-[10mm] shadow-lg rounded-sm relative font-sans text-sm text-gray-700 flex flex-col">
        
        {/* Header Section */}
        <div className="flex justify-between items-start mb-6 pb-4 border-b-2 border-green-500">
            {/* Left: Seller Info */}
            <div className="flex gap-4 w-7/12">
                {seller.logo && (
                    <img src={seller.logo} alt="Logo" className="h-20 w-auto object-contain flex-shrink-0" />
                )}
                <div className="flex flex-col justify-center">
                    <h1 className="text-xl font-bold text-gray-800">{seller.name}</h1>
                    <p className="text-xs text-gray-600 leading-tight mt-1">{seller.address}</p>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs">
                         <p><strong>โทร:</strong> {seller.phone}</p>
                         <p><strong>เลขประจำตัวผู้เสียภาษี:</strong> {seller.taxId}</p>
                    </div>
                </div>
            </div>

            {/* Right: Document Info */}
            <div className="w-5/12 text-right flex flex-col items-end">
                 <h2 className="text-2xl font-bold text-green-600 tracking-wide uppercase">
                    {isTaxInvoice ? 'ใบเสร็จรับเงิน/ใบกำกับภาษี' : 'ใบเสร็จรับเงิน'}
                 </h2>
                 <p className="text-xs text-gray-400 mb-2">RECEIPT / TAX INVOICE</p>
                 <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-right mt-1">
                    <span className="font-bold text-gray-700">เลขที่เอกสาร:</span>
                    <span className="font-medium text-gray-900">{sale.invoice_number}</span>
                    <span className="font-bold text-gray-700">วันที่:</span>
                    <span className="font-medium text-gray-900">{new Date(sale.date).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                 </div>
                 <div className="mt-2 text-[10px] text-gray-400 border border-gray-300 px-2 py-0.5 rounded">
                     เอกสารออกเป็นชุด (ต้นฉบับ)
                 </div>
            </div>
        </div>

        {/* Customer Info Section */}
        <div className="flex mb-6 bg-slate-50 border border-slate-200 rounded p-4">
             <div className="w-full">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">ลูกค้า / Customer</h3>
                <p className="text-lg font-bold text-gray-800 leading-none mb-1">{customer.name} {customer.branch ? `(${customer.branch})` : ''}</p>
                <p className="text-sm text-gray-600 mb-2">{customer.address || '-'}</p>
                <p className="text-sm text-gray-600"><strong>เลขประจำตัวผู้เสียภาษี:</strong> {customer.tax_id || '-'}</p>
             </div>
        </div>

        {/* Items Table */}
        <div className="flex-grow">
            <table className="w-full mb-6 border-collapse table-fixed">
                <thead>
                    <tr className="bg-green-600 text-white text-xs uppercase tracking-wider">
                        <th className="py-2 px-2 w-12 text-center rounded-tl">#</th>
                        <th className="py-2 px-2 w-auto text-left">รายการ (Description)</th>
                        <th className="py-2 px-2 w-20 text-right">จำนวน</th>
                        <th className="py-2 px-2 w-24 text-right">ราคา/หน่วย</th>
                        <th className="py-2 px-2 w-24 text-right rounded-tr">จำนวนเงิน</th>
                    </tr>
                </thead>
                <tbody className="text-sm">
                    {items.map((item, idx) => (
                        <tr key={idx} className="border-b border-gray-100 hover:bg-gray-50">
                            <td className="py-3 px-2 text-center text-gray-500">{idx + 1}</td>
                            <td className="py-3 px-2">
                                <div className="font-bold text-gray-800">แก๊ส {item.brand} (ขนาด {item.size})</div>
                            </td>
                            <td className="py-3 px-2 text-right">{item.quantity}</td>
                            <td className="py-3 px-2 text-right">{item.unit_price.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                            <td className="py-3 px-2 text-right font-medium">{item.total_price.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                        </tr>
                    ))}
                    {/* Add blank rows to fill space if needed, or just padding */}
                </tbody>
            </table>
        </div>

        {/* Summary Section */}
        <div className="flex flex-col sm:flex-row items-start justify-between border-t-2 border-gray-200 pt-4 mb-8 break-inside-avoid">
            
            {/* Left: Text Amount & Notes */}
            <div className="w-full sm:w-7/12 pr-8 space-y-4">
                 {/* Return deduction notice */}
                 {sale.gas_return_kg && (
                    <div className="bg-blue-50 text-blue-800 p-2 rounded text-xs border border-blue-100 flex justify-between items-center">
                        <span><strong>รายการหัก:</strong> คืนเนื้อแก๊ส ({sale.gas_return_kg} กก. @ {sale.gas_return_price})</span>
                        <span className="font-bold">-{returnDeduction.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                    </div>
                )}
                
                <div className="p-3 bg-gray-50 rounded border border-gray-200">
                     <p className="text-xs text-gray-500 mb-1">จำนวนเงินตัวอักษร (Amount in Words)</p>
                     <p className="text-lg font-bold text-green-700">{thaiBahtText(finalTotal)}</p>
                </div>

                <div className="text-xs text-gray-500 space-y-1">
                    <p><strong>ชำระโดย:</strong> {sale.payment_method}</p>
                    <p><strong>หมายเหตุ:</strong> สินค้าซื้อแล้วไม่รับเปลี่ยนหรือคืน</p>
                </div>
            </div>

            {/* Right: Calculation */}
            <div className="w-full sm:w-5/12 pl-4">
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-gray-600">
                        <span>รวมเป็นเงิน (Subtotal)</span>
                        <span className="font-medium">{subTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                    </div>
                     {sale.gas_return_kg && (
                         <div className="flex justify-between text-blue-600">
                            <span>หักคืนเนื้อ</span>
                            <span>-{returnDeduction.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                        </div>
                     )}
                     {isTaxInvoice && (
                         <>
                            <div className="flex justify-between text-gray-600">
                                <span>มูลค่าก่อนภาษี (Pre-VAT)</span>
                                <span>{preVatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                            </div>
                            <div className="flex justify-between text-gray-600">
                                <span>ภาษีมูลค่าเพิ่ม 7% (VAT)</span>
                                <span>{vatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                            </div>
                         </>
                     )}
                     
                     <div className="flex justify-between items-center bg-green-600 text-white p-2 rounded mt-2 shadow-sm">
                        <span className="font-bold">ยอดสุทธิ (Grand Total)</span>
                        <span className="font-bold text-xl">{finalTotal.toLocaleString('th-TH', {minimumFractionDigits: 2})}</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-2 gap-8 mt-auto pt-8 break-inside-avoid">
             <div className="text-center">
                 <div className="border-b border-gray-300 h-24 mb-2"></div>
                 <p className="text-xs font-bold text-gray-600">ผู้รับเงิน / Collector</p>
                 <p className="text-[10px] text-gray-400">วันที่ ........................................</p>
             </div>
             <div className="text-center">
                 <div className="border-b border-gray-300 h-24 mb-2"></div>
                 <p className="text-xs font-bold text-gray-600">ผู้รับสินค้า / Receiver</p>
                 <p className="text-[10px] text-gray-400">วันที่ ........................................</p>
             </div>
        </div>

      </div>

      <div className="fixed bottom-8 right-8 no-print z-50">
        <button 
            onClick={handlePrint} 
            className="bg-green-600 text-white px-6 py-3 rounded-full shadow-lg hover:bg-green-700 font-bold flex items-center gap-2 transition-transform hover:scale-105"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h6m-6-4h6" />
            </svg>
            พิมพ์ (A4)
        </button>
      </div>
    </div>
  );
};

export default InvoiceA4;
