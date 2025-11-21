
import React from 'react';
import { Sale, Customer, InvoiceType } from '../types';
import { SELLER_INFO } from '../constants';
import { thaiBahtText } from '../lib/utils';

interface InvoiceA4Props {
  sale: Sale;
  customer: Customer;
}

const InvoiceA4: React.FC<InvoiceA4Props> = ({ sale, customer }) => {
  const seller = SELLER_INFO;
  const isTaxInvoice = sale.invoice_type === InvoiceType.TAX_INVOICE;
  
  // Calculate VAT (assuming unit_price includes VAT)
  // Pre-VAT = Total / 1.07
  // VAT = Total - Pre-VAT
  const totalAmount = sale.total_amount;
  const preVatAmount = totalAmount / 1.07;
  const vatAmount = totalAmount - preVatAmount;

  const handlePrint = () => {
    window.print();
  };

  // Determine items to render: if sale.items exists use it, otherwise use legacy single item
  const itemsToRender = (sale.items && sale.items.length > 0) 
    ? sale.items 
    : [{ brand: sale.tank_brand, size: sale.tank_size, quantity: sale.quantity, unit_price: sale.unit_price, total_price: sale.total_amount }];

  return (
    <div className="bg-gray-200 p-4 min-h-screen flex flex-col items-center overflow-auto">
        <style>{`
          @page {
            size: A4;
            margin: 0;
          }
          @media print {
            body {
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
              min-height: 297mm;
              margin: 0;
              padding: 10mm; /* Custom margin inside the A4 sheet */
              background: white;
              box-shadow: none;
              border-radius: 0;
            }
            .no-print {
              display: none !important;
            }
          }
        `}</style>

      <div id="invoice-a4" className="w-[210mm] min-h-[297mm] bg-white p-[10mm] shadow-lg rounded-sm relative font-sans text-sm text-gray-700">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
            <div className="flex items-center">
                {/* Logo Placeholder */}
                <div className="w-16 h-16 rounded-full border-2 border-sky-600 flex items-center justify-center text-sky-700 font-bold text-xs mr-4">
                    LOGO
                </div>
            </div>
            <div className="text-right">
                <p className="text-xs text-gray-500">เอกสารออกเป็นชุด</p>
                <p className="text-xs text-gray-500">(ต้นฉบับ)</p>
                <h1 className="text-3xl font-bold text-green-500 mt-1">
                    {isTaxInvoice ? 'ใบเสร็จรับเงิน/ใบกำกับภาษี' : 'ใบเสร็จรับเงิน'}
                </h1>
            </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-12 gap-4 mb-6 bg-green-50/30 p-4 rounded-lg border border-green-100">
            {/* Seller */}
            <div className="col-span-7 space-y-1">
                <div className="flex">
                    <span className="w-20 font-bold text-gray-800">ผู้ขาย :</span>
                    <span className="font-bold text-gray-800">{seller.name}</span>
                </div>
                <div className="flex">
                    <span className="w-20 flex-shrink-0">ที่อยู่ :</span>
                    <span>{seller.address}</span>
                </div>
                <div className="flex">
                    <span className="w-20">เลขที่ภาษี :</span>
                    <span>{seller.taxId} (สำนักงานใหญ่)</span>
                </div>
            </div>

            {/* Document Details */}
            <div className="col-span-5 space-y-1 pl-4 border-l border-green-200">
                 <div className="flex justify-between">
                    <span className="font-bold bg-green-100 px-2 rounded text-green-800">เลขที่เอกสาร :</span>
                    <span className="font-bold">{sale.invoice_number}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold">วันที่ออก :</span>
                    <span>{new Date(sale.date).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}</span>
                </div>
                <div className="flex justify-between">
                    <span className="font-bold">อ้างอิง :</span>
                    <span>-</span>
                </div>
            </div>
        </div>

        {/* Customer & Contact */}
        <div className="grid grid-cols-12 gap-4 mb-8">
             <div className="col-span-7 space-y-1">
                <div className="flex">
                    <span className="w-20 font-bold text-gray-800">ลูกค้า :</span>
                    <span className="font-bold text-gray-800">{customer.name} {customer.branch}</span>
                </div>
                <div className="flex">
                    <span className="w-20 flex-shrink-0">ที่อยู่ :</span>
                    <span>{customer.address || '-'}</span>
                </div>
                <div className="flex">
                    <span className="w-20">เลขที่ภาษี :</span>
                    <span>{customer.tax_id || '-'}</span>
                </div>
            </div>
             <div className="col-span-5 pl-4">
                <p className="font-bold text-gray-600 mb-1">ติดต่อกลับที่ :</p>
                <p className="text-sm flex items-center gap-2"><span className="font-bold text-gray-800">{seller.name}</span></p>
                <p className="text-sm flex items-center gap-2">📞 {seller.phone}</p>
            </div>
        </div>

        {/* Items Table */}
        <table className="w-full mb-8 border-collapse">
            <thead>
                <tr className="bg-green-100 text-gray-700">
                    <th className="py-2 px-2 border border-green-200 w-10 text-center">#</th>
                    <th className="py-2 px-2 border border-green-200 text-left">คำอธิบาย</th>
                    <th className="py-2 px-2 border border-green-200 w-20 text-right">จำนวน</th>
                    <th className="py-2 px-2 border border-green-200 w-24 text-right">ราคา</th>
                    <th className="py-2 px-2 border border-green-200 w-20 text-right">ส่วนลด</th>
                    <th className="py-2 px-2 border border-green-200 w-16 text-center">VAT</th>
                    <th className="py-2 px-2 border border-green-200 w-32 text-right">มูลค่าก่อนภาษี</th>
                </tr>
            </thead>
            <tbody>
                {itemsToRender.map((item, idx) => {
                    const itemPreVat = item.total_price / 1.07;
                    const itemUnitPricePreVat = item.unit_price / 1.07;
                    return (
                        <tr key={idx}>
                            <td className="py-2 px-2 border-l border-r border-gray-100 text-center align-top">{idx + 1}.</td>
                            <td className="py-2 px-2 border-l border-r border-gray-100 align-top">
                                <p className="font-bold text-gray-800">LPG (ถัง {item.size})</p>
                                <p className="text-gray-500 text-xs">แบรนด์: {item.brand}</p>
                            </td>
                            <td className="py-2 px-2 border-l border-r border-gray-100 text-right align-top">{item.quantity.toFixed(2)}</td>
                            <td className="py-2 px-2 border-l border-r border-gray-100 text-right align-top">{itemUnitPricePreVat.toLocaleString('th-TH', {minimumFractionDigits: 3})}</td>
                            <td className="py-2 px-2 border-l border-r border-gray-100 text-right align-top">0.00</td>
                            <td className="py-2 px-2 border-l border-r border-gray-100 text-center align-top">7%</td>
                            <td className="py-2 px-2 border-l border-r border-gray-100 text-right align-top">{itemPreVat.toLocaleString('th-TH', {minimumFractionDigits: 2})}</td>
                        </tr>
                    );
                })}
                
                {/* Spacer Rows to fill A4 height */}
                {[...Array(Math.max(0, 8 - itemsToRender.length))].map((_, i) => (
                    <tr key={`spacer-${i}`}>
                        <td className="py-2 px-2 border-l border-r border-gray-100">&nbsp;</td>
                        <td className="py-2 px-2 border-l border-r border-gray-100">&nbsp;</td>
                        <td className="py-2 px-2 border-l border-r border-gray-100">&nbsp;</td>
                        <td className="py-2 px-2 border-l border-r border-gray-100">&nbsp;</td>
                        <td className="py-2 px-2 border-l border-r border-gray-100">&nbsp;</td>
                        <td className="py-2 px-2 border-l border-r border-gray-100">&nbsp;</td>
                        <td className="py-2 px-2 border-l border-r border-gray-100">&nbsp;</td>
                    </tr>
                ))}
                 <tr className="border-t border-gray-200">
                     <td colSpan={7}></td>
                 </tr>
            </tbody>
        </table>

        {/* Summary Section */}
        <div className="flex items-start mb-8">
            {/* Left Side: Summary Text */}
            <div className="flex-grow pr-8 space-y-1">
                <div className="flex justify-between text-xs text-gray-600">
                    <span>มูลค่าที่คำนวณภาษี 7%</span>
                    <span>{preVatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                </div>
                 <div className="flex justify-between text-xs text-gray-600">
                    <span>ภาษีมูลค่าเพิ่ม 7%</span>
                    <span>{vatAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                </div>
                 <div className="flex justify-between font-bold text-gray-800 pt-2">
                    <span>จำนวนเงินทั้งสิ้น</span>
                    <span>{thaiBahtText(totalAmount)}</span>
                </div>
            </div>

            {/* Right Side: Totals */}
            <div className="w-64 bg-gray-50 rounded-lg overflow-hidden">
                <div className="flex justify-between items-center bg-green-100/50 p-3 border-b border-green-100">
                    <span className="font-bold text-gray-700">จำนวนเงินทั้งสิ้น</span>
                    <span className="font-bold text-xl text-gray-800">{totalAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                </div>
                <div className="p-3 space-y-2">
                     <div className="flex justify-between text-sm">
                        <span>จำนวนเงินที่ถูกหัก ณ ที่จ่าย</span>
                        <span>0.00 บาท</span>
                    </div>
                     <div className="flex justify-between text-sm font-bold">
                        <span>จำนวนเงินที่ชำระ</span>
                        <span>{totalAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</span>
                    </div>
                </div>
            </div>
        </div>

        {/* Payment Info */}
        <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 mb-8 flex text-sm">
            <div className="w-24 font-bold">ชำระเงิน</div>
            <div className="flex-grow grid grid-cols-2 gap-4">
                <div>
                     <p><span className="font-semibold">วันที่ชำระ :</span> {new Date(sale.date).toLocaleDateString('th-TH')}</p>
                     <p><span className="font-semibold">จำนวนเงิน :</span> {totalAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})} บาท</p>
                </div>
                <div>
                    {/* Placeholder for Bank info */}
                    <p><span className="font-semibold">โดย :</span> {sale.payment_method}</p>
                </div>
            </div>
        </div>

        {/* Footer Notes */}
        <div className="text-xs text-gray-500 mb-12 flex">
            <div className="mr-2">💬 หมายเหตุ</div>
            <div>
                ใบเสร็จรับเงินฉบับนี้จะสมบูรณ์ต่อเมื่อได้เรียกเก็บเงินจากท่านเป็นที่เรียบร้อยแล้ว<br/>
                ได้รับสินค้าตามรายการข้างต้นเป็นที่ถูกต้องเรียบร้อย
            </div>
        </div>

        {/* Signatures */}
        <div className="grid grid-cols-4 gap-4 text-center text-xs">
             <div className="col-span-1">
                 <div className="h-16 border-b border-dotted border-gray-400 mb-2"></div>
                 <p>ผู้ออกเอกสาร</p>
             </div>
             <div className="col-span-1">
                 <div className="h-16 border-b border-dotted border-gray-400 mb-2"></div>
                 <p>ผู้รับเงิน</p>
             </div>
             <div className="col-span-1">
                 <div className="h-16 border-b border-dotted border-gray-400 mb-2 flex items-end justify-center">
                    <div className="border-2 border-gray-400 rounded-full w-12 h-12 flex items-center justify-center font-bold text-gray-400">
                        Stamp
                    </div>
                 </div>
                 <p>ตราประทับ (ผู้ขาย)</p>
             </div>
             <div className="col-span-1">
                 <div className="h-16 border-b border-dotted border-gray-400 mb-2"></div>
                 <p>ผู้รับเอกสาร</p>
             </div>
        </div>

      </div>

      <div className="fixed bottom-8 right-8 no-print">
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
