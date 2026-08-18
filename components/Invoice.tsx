
import React from 'react';
import { Sale, Customer, InvoiceType, VatType } from '../types';
import { useAppContext } from '../context/AppContext';
import { calculateInvoiceTotals } from '../lib/utils';

interface InvoiceProps {
  sale: Sale;
  customer: Customer;
}

const Invoice: React.FC<InvoiceProps> = ({ sale, customer }) => {
  const { companyInfo: seller } = useAppContext();
  const isTaxInvoice = sale.invoice_type === InvoiceType.TAX_INVOICE;

  // Single-source universal calculation engine (PART 17 & PART 18)
  const totals = calculateInvoiceTotals(sale, customer);
  const items = totals.items;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-[420px] mx-auto bg-white p-2">
      <div id="invoice-content" className="p-4 bg-white text-gray-900 text-xs font-sans">
        <style>{`
          @media print {
            @page { margin: 0; size: auto; }
            body * {
              visibility: hidden;
            }
            #invoice-content, #invoice-content * {
              visibility: visible;
            }
            #invoice-content {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              margin: 0;
              padding: 5px 10px;
            }
            .no-print {
              display: none;
            }
          }
        `}</style>
        
        {/* Header - Clean Business Standard (No Logo) */}
        <header className="flex flex-col items-center text-center pb-3 border-b-2 border-gray-800">
          <h1 className="font-bold text-base leading-tight mb-1 text-gray-950">{seller.name}</h1>
          <p className="whitespace-pre-line text-[11px] text-gray-600 mb-1 leading-normal">{seller.address}</p>
          <div className="flex flex-wrap justify-center gap-x-3 text-[11px] text-gray-700">
            <p><strong>โทร:</strong> {seller.phone}</p>
            <p><strong>เลขประจำตัวผู้เสียภาษี:</strong> {seller.taxId}</p>
          </div>
        </header>

        <div className="flex justify-between items-center py-2 border-b border-gray-300">
            <div>
              <h2 className="font-bold text-sm text-gray-950">{isTaxInvoice ? 'ใบกำกับภาษีอย่างย่อ' : 'บิลเงินสด / ใบเสร็จรับเงิน'}</h2>
              <p className="text-[10px] text-gray-500 font-semibold uppercase">{isTaxInvoice ? 'ABB. TAX INVOICE' : 'RECEIPT / CASH BILL'}</p>
            </div>
            <div className="text-right text-[11px]">
                <p><strong>เลขที่:</strong> <span className="font-bold text-gray-950">{sale.invoice_number}</span></p>
                <p><strong>วันที่:</strong> {new Date(sale.date).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
            </div>
        </div>

        <section className="py-2 border-b border-gray-300">
          <h3 className="font-bold text-[11px] text-gray-600 uppercase tracking-wider">ลูกค้า / สถานที่ส่ง:</h3>
          <p className="text-sm font-bold text-gray-950">{customer.name} {customer.branch ? `(${customer.branch})` : ''}</p>
          {isTaxInvoice && (
            <div className="text-[11px] mt-1 text-gray-600 space-y-0.5">
              <p>{customer.address || '-'}</p>
              {customer.tax_id && <p><strong>เลขประจำตัวผู้เสียภาษี:</strong> {customer.tax_id}</p>}
            </div>
          )}
        </section>

        {/* รายการสินค้า | จำนวน | ราคา/หน่วย | จำนวนเงิน */}
        <section className="py-2">
          <table className="w-full text-xs border-collapse">
            <thead className="border-b border-gray-400 text-gray-900 bg-gray-50">
              <tr>
                <th className="text-left py-1.5 px-1 font-bold">รายการสินค้า</th>
                <th className="text-center py-1.5 px-1 font-bold w-12">จำนวน</th>
                <th className="text-right py-1.5 px-1 font-bold w-20">ราคา/หน่วย</th>
                <th className="text-right py-1.5 px-1 font-bold w-20">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b border-gray-200 last:border-0">
                    <td className="py-1.5 px-1">
                        <div className="font-bold text-gray-950">
                          {item.item_type === 'ACCESSORY' ? (item.item_name || 'อุปกรณ์') : `แก๊ส ${item.brand}`}
                        </div>
                        {item.size && <div className="text-[10px] text-gray-500">ขนาด {item.size}</div>}
                    </td>
                    <td className="text-center py-1.5 px-1 align-top font-bold text-gray-900">{item.quantity}</td>
                    <td className="text-right py-1.5 px-1 align-top text-gray-800">
                      {Number(item.unit_price).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                    <td className="text-right py-1.5 px-1 align-top font-bold text-gray-950">
                      {Number(item.total_price).toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </td>
                  </tr>
              ))}
              {totals.gasReturnKg > 0 && totals.returnDeduction > 0 && (
                 <tr className="border-t border-gray-300 bg-gray-50">
                    <td colSpan={3} className="py-1.5 px-1 text-gray-800 font-semibold">
                      หักส่วนลดกำไรคืนแก๊ส ({totals.gasReturnKg} กก.)
                    </td>
                    <td className="text-right py-1.5 px-1 font-bold text-gray-950">
                      -{totals.returnDeduction.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Calculation Summary: Subtotal -> Discount -> PreVAT -> VAT -> GrandTotal */}
        <section className="flex flex-col items-end pt-2 border-t-2 border-gray-800 space-y-1 text-xs">
            <div className="w-full flex justify-between text-gray-700">
              <span>รวมเป็นเงิน (Subtotal):</span>
              <span className="font-semibold">{totals.subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
            </div>

            <div className="w-full flex justify-between text-gray-700">
              <span>หักส่วนลด:</span>
              <span className="font-semibold">
                {totals.returnDeduction > 0 
                  ? `-${totals.returnDeduction.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿` 
                  : '0.00 ฿'}
              </span>
            </div>

            {totals.vatType !== VatType.NO_VAT && (
              <>
                <div className="w-full flex justify-between text-gray-600 pt-1 border-t border-dotted border-gray-300">
                  <span>มูลค่าก่อนภาษี:</span>
                  <span>{totals.preVatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                </div>
                <div className="w-full flex justify-between text-gray-600">
                  <span>ภาษีมูลค่าเพิ่ม 7%:</span>
                  <span>{totals.vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                </div>
              </>
            )}

            <div className="w-full flex justify-between font-bold text-sm bg-gray-900 text-white p-2 rounded mt-2">
              <span>ยอดสุทธิ (Grand Total):</span>
              <span>{totals.grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
            </div>

            <div className="w-full text-right text-[11px] text-gray-800 font-bold mt-1">
              ({totals.thaiBaht})
            </div>
        </section>

        <footer className="pt-4 text-center text-[10px] text-gray-500 border-t border-dotted border-gray-300 mt-4 space-y-0.5">
          <p className="font-semibold text-gray-700">ขอบคุณที่ใช้บริการ</p>
          <p>ได้รับสินค้าตามรายการข้างต้นเป็นที่ถูกต้องเรียบร้อย</p>
        </footer>
      </div>
      
      <div className="p-3 bg-gray-50 text-xs text-gray-600 border border-gray-200 no-print rounded-lg mt-2">
          <p className="font-bold text-gray-800">ตั้งค่าก่อนพิมพ์ (Thermal Slip):</p>
          <ul className="list-disc ml-4 space-y-0.5 text-[11px]">
              <li>Paper Size: 80mm / 58mm (ตามเครื่องพิมพ์สลิป)</li>
              <li>Margin: None / 0</li>
              <li>Scale: 100%</li>
          </ul>
      </div>
      <div className="text-right mt-3 no-print pb-2">
        <button onClick={handlePrint} className="px-5 py-2 bg-gray-900 text-white text-xs font-bold rounded-lg hover:bg-black shadow flex items-center gap-1.5 ml-auto">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H7a2 2 0 00-2 2v4a2 2 0 002 2h6m-6-4h6" />
          </svg>
          พิมพ์ใบเสร็จย่อ (80mm)
        </button>
      </div>
    </div>
  );
};

export default Invoice;
