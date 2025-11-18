import React from 'react';
import { Sale, Customer, InvoiceType, CompanyInfo } from '../types';
import { SELLER_INFO } from '../constants';

interface InvoiceProps {
  sale: Sale;
  customer: Customer;
}

const Invoice: React.FC<InvoiceProps> = ({ sale, customer }) => {
  const seller = SELLER_INFO;
  const isTaxInvoice = sale.invoice_type === InvoiceType.TAX_INVOICE;

  const subtotal = sale.total_amount;
  const vatAmount = isTaxInvoice ? subtotal * 0.07 : 0;
  const grandTotal = isTaxInvoice ? subtotal + vatAmount : subtotal;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div id="invoice-content" className="p-4 bg-white text-black text-sm font-sans">
        <style>{`
          @media print {
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
            }
            .no-print {
              display: none;
            }
          }
        `}</style>
        
        <header className="flex justify-between items-start pb-4 border-b-2 border-gray-400">
          <div>
            <h1 className="font-bold text-lg">{seller.name}</h1>
            <p className="whitespace-pre-line">{seller.address}</p>
            <p>โทร: {seller.phone}</p>
            <p>เลขประจำตัวผู้เสียภาษี: {seller.taxId}</p>
          </div>
          <div className="text-right">
            <h2 className="font-bold text-xl">{isTaxInvoice ? 'ใบส่งของ / ใบกำกับภาษี' : 'บิลเงินสด'}</h2>
            <p>
              <span className="font-semibold">เลขที่:</span> {sale.invoice_number}
            </p>
            <p>
              <span className="font-semibold">วันที่:</span> {new Date(sale.date).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </p>
          </div>
        </header>

        <section className="py-4 border-b border-gray-300">
          <h3 className="font-bold mb-2">ลูกค้า:</h3>
          <p>{customer.name} ({customer.branch})</p>
          {isTaxInvoice && (
            <>
              <p>{customer.address || 'ไม่มีข้อมูลที่อยู่'}</p>
              <p>เลขประจำตัวผู้เสียภาษี: {customer.tax_id || 'ไม่มีข้อมูล'}</p>
            </>
          )}
        </section>

        <section className="py-2">
          <table className="w-full">
            <thead className="border-b-2 border-gray-400">
              <tr>
                <th className="text-left font-bold py-2">รายการ</th>
                <th className="text-right font-bold py-2">จำนวน</th>
                <th className="text-right font-bold py-2">ราคา/หน่วย</th>
                <th className="text-right font-bold py-2">จำนวนเงิน</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-300">
                <td className="py-2">แก๊สหุงต้ม {sale.tank_brand} {sale.tank_size}</td>
                <td className="text-right py-2">{sale.quantity}</td>
                <td className="text-right py-2">{sale.unit_price.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
                <td className="text-right py-2">{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</td>
              </tr>
              {sale.gas_return_kg && (
                 <tr className="border-b border-gray-300">
                    <td className="py-2 text-blue-600">คืนเนื้อ (กก.)</td>
                    <td className="text-right py-2 text-blue-600">{sale.gas_return_kg.toFixed(2)}</td>
                    <td className="py-2"></td>
                    <td className="py-2"></td>
                 </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end pt-4">
          <div className="w-1/2">
            <div className="flex justify-between">
              <span>รวมเป็นเงิน</span>
              <span>{subtotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
            {isTaxInvoice && (
              <div className="flex justify-between">
                <span>ภาษีมูลค่าเพิ่ม 7%</span>
                <span>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg border-t-2 border-b-2 border-gray-400 my-2 py-1">
              <span>ยอดรวมสุทธิ</span>
              <span>{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </section>

        <footer className="pt-8 text-center text-xs text-gray-500">
          <p>ขอบคุณที่ใช้บริการ</p>
        </footer>
      </div>
      <div className="text-right mt-4 no-print">
        <button onClick={handlePrint} className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600">
          พิมพ์
        </button>
      </div>
    </div>
  );
};

export default Invoice;
