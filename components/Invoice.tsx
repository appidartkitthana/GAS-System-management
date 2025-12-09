
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
              padding: 10px 15px; /* Reduced top padding */
            }
            .no-print {
              display: none;
            }
          }
        `}</style>
        
        <header className="flex justify-between items-start pb-2 border-b-2 border-gray-400">
          <div className="flex flex-col">
            {seller.logo && <img src={seller.logo} alt="Logo" className="h-10 w-auto mb-2 self-start object-contain" />}
            <h1 className="font-bold text-lg">{seller.name}</h1>
            <p className="whitespace-pre-line text-xs">{seller.address}</p>
            <p className="text-xs">โทร: {seller.phone}</p>
            <p className="text-xs">เลขภาษี: {seller.taxId}</p>
          </div>
          <div className="text-right">
            <h2 className="font-bold text-lg">{isTaxInvoice ? 'ใบกำกับภาษี' : 'บิลเงินสด'}</h2>
            <p className="text-xs">
              <span className="font-semibold">เลขที่:</span> {sale.invoice_number}
            </p>
            <p className="text-xs">
              <span className="font-semibold">วันที่:</span> {new Date(sale.date).toLocaleDateString('th-TH', { year: 'numeric', month: '2-digit', day: '2-digit' })}
            </p>
          </div>
        </header>

        <section className="py-2 border-b border-gray-300">
          <h3 className="font-bold text-xs">ลูกค้า:</h3>
          <p className="text-sm">{customer.name} ({customer.branch})</p>
          {isTaxInvoice && (
            <div className="text-xs">
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
                <th className="text-right py-1">หน่วยละ</th>
                <th className="text-right py-1">รวม</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                  <tr key={idx} className="border-b border-gray-100 last:border-0">
                    <td className="py-1">แก๊ส {item.brand} {item.size}</td>
                    <td className="text-right py-1">{item.quantity}</td>
                    <td className="text-right py-1">{item.unit_price.toLocaleString()}</td>
                    <td className="text-right py-1">{item.total_price.toLocaleString()}</td>
                  </tr>
              ))}
              {sale.gas_return_kg && (
                 <tr className="border-t border-gray-300">
                    <td className="py-1 text-blue-800">คืนเนื้อ ({sale.gas_return_kg} กก.)</td>
                    <td className="text-right py-1"></td>
                    <td className="text-right py-1"></td>
                    <td className="text-right py-1">-{returnDeduction.toLocaleString()}</td>
                 </tr>
              )}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end pt-2">
          <div className="w-2/3">
            <div className="flex justify-between text-xs">
              <span>รวมเป็นเงิน</span>
              <span>{netTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
            {isTaxInvoice && (
              <div className="flex justify-between text-xs">
                <span>VAT 7%</span>
                <span>{vatAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-base border-t border-b border-gray-400 my-1 py-1">
              <span>ยอดสุทธิ</span>
              <span>{grandTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })}</span>
            </div>
          </div>
        </section>

        <footer className="pt-4 text-center text-[10px] text-gray-500">
          <p>ขอบคุณที่ใช้บริการ</p>
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
