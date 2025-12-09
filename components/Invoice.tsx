
import React from 'react';
import { Sale, Customer, InvoiceType } from '../types';
import { useAppContext } from '../context/AppContext';

interface InvoiceProps {
  sale: Sale;
  customer: Customer;
}

const Invoice: React.FC<InvoiceProps> = ({ sale, customer }) => {
  const { companyInfo: seller } = useAppContext();
  const isTaxInvoice = sale.invoice_type === InvoiceType.TAX_INVOICE;

  const items = sale.items && sale.items.length > 0 ? sale.items : [{ brand: sale.tank_brand, size: sale.tank_size, quantity: sale.quantity, unit_price: sale.unit_price, total_price: sale.total_amount }];

  const subtotal = items.reduce((acc, item) => acc + item.total_price, 0);
  const returnDeduction = (sale.gas_return_kg || 0) * (sale.gas_return_price || 0);
  const netTotal = subtotal - returnDeduction;

  const vatAmount = isTaxInvoice ? netTotal * 0.07 : 0;
  const grandTotal = isTaxInvoice ? netTotal + vatAmount : netTotal;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div id="invoice-content" className="p-4 bg-white text-black text-sm font-sans">
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
        
        <header className="flex flex-col items-center text-center pb-4 border-b-2 border-gray-400">
          {seller.logo && <img src={seller.logo} alt="Logo" className="h-16 w-auto mb-2 object-contain" />}
          <h1 className="font-bold text-lg leading-tight mb-1">{seller.name}</h1>
          <p className="whitespace-pre-line text-xs mb-1">{seller.address}</p>
          <div className="flex gap-2 text-xs">
            <p>โทร: {seller.phone}</p>
            <p>เลขภาษี: {seller.taxId}</p>
          </div>
        </header>

        <div className="flex justify-between items-center py-2 border-b border-dotted border-gray-400">
            <h2 className="font-bold text-base">{isTaxInvoice ? 'ใบกำกับภาษี' : 'บิลเงินสด'}</h2>
            <div className="text-right text-xs">
                <p>เลขที่: {sale.invoice_number}</p>
                <p>วันที่: {new Date(sale.date).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}</p>
            </div>
        </div>

        <section className="py-2 border-b border-gray-300">
          <h3 className="font-bold text-xs">ลูกค้า:</h3>
          <p className="text-sm">{customer.name}</p>
          <p className="text-xs text-gray-600">{customer.branch}</p>
          {isTaxInvoice && (
            <div className="text-xs mt-1 text-gray-500">
              <p>{customer.address || '-'}</p>
              <p>เลขภาษี: {customer.tax_id || '-'}</p>
            </div>
          )}
        </section>

        <section className="py-2">
          <table className="w-full text-xs">
            <thead className="border-b border-gray-400">
              <tr>
                <th className="text-left py-1">รายการ</th>
                <th className="text-right py-1">จำนวน</th>
                <th className="text-right py-1">ราคา</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0">
                    <td className="py-1">
                        <div>แก๊ส {item.brand}</div>
                        <div className="text-[10px] text-gray-500">{item.size}</div>
                    </td>
                    <td className="text-right py-1 align-top">{item.quantity}</td>
                    <td className="text-right py-1 align-top">{item.total_price.toLocaleString()}</td>
                  </tr>
              ))}
              {sale.gas_return_kg && (
                 <tr className="border-t border-gray-300">
                    <td className="py-1 text-blue-800">คืนเนื้อ ({sale.gas_return_kg} กก.)</td>
                    <td className="text-right py-1"></td>
                    <td className="text-right py-1">-{returnDeduction.toLocaleString()}</td>
                 </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="flex flex-col items-end pt-2">
            <div className="w-full flex justify-between text-xs">
              <span>รวมเป็นเงิน</span>
              <span>{netTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
            {isTaxInvoice && (
              <div className="w-full flex justify-between text-xs">
                <span>VAT 7%</span>
                <span>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="w-full flex justify-between font-bold text-lg border-t-2 border-black mt-2 pt-1">
              <span>ยอดสุทธิ</span>
              <span>{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
        </section>

        <footer className="pt-6 text-center text-[10px] text-gray-500">
          <p>ขอบคุณที่ใช้บริการ</p>
          <p>Powered by Somkiat Service Gas</p>
        </footer>
      </div>
      
      <div className="p-4 bg-yellow-50 text-xs text-yellow-800 border-t border-yellow-200 no-print">
          <p className="font-bold">ตั้งค่าก่อนพิมพ์ (Short Receipt):</p>
          <ul className="list-disc ml-4">
              <li>Paper Size: 80mm / 58mm (ตามเครื่อง)</li>
              <li>Margin: None / 0</li>
              <li>Scale: 100%</li>
          </ul>
      </div>
      <div className="text-right mt-2 no-print pb-4 pr-4">
        <button onClick={handlePrint} className="px-6 py-2 bg-sky-500 text-white rounded-lg hover:bg-sky-600">
          พิมพ์ใบเสร็จ
        </button>
      </div>
    </div>
  );
};

export default Invoice;
