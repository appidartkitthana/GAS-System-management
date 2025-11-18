import React from 'react';
import { Expense } from '../types';
import { SELLER_INFO } from '../constants';

interface ExpenseReceiptProps {
  expense: Expense;
}

const ExpenseReceipt: React.FC<ExpenseReceiptProps> = ({ expense }) => {
  const seller = SELLER_INFO;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div>
      <div id="expense-receipt-content" className="p-4 bg-white text-black text-sm font-sans">
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            #expense-receipt-content, #expense-receipt-content * {
              visibility: visible;
            }
            #expense-receipt-content {
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

        <header className="text-center pb-4 border-b">
          <h1 className="font-bold text-lg">{seller.name}</h1>
          <h2 className="font-semibold text-xl">ใบรับเงิน</h2>
        </header>

        <section className="py-4 space-y-2">
            <div className="flex justify-between">
                <span className="font-semibold">วันที่:</span>
                <span>{new Date(expense.date).toLocaleDateString('th-TH')}</span>
            </div>
             <div className="flex justify-between">
                <span className="font-semibold">ประเภท:</span>
                <span>{expense.type}</span>
            </div>
             <div className="flex justify-between">
                <span className="font-semibold">รายละเอียด:</span>
                <span>{expense.description}</span>
            </div>
             <div className="flex justify-between">
                <span className="font-semibold">วิธีชำระเงิน:</span>
                <span>{expense.payment_method}</span>
            </div>
        </section>

        <section className="flex justify-end pt-4 mt-4 border-t-2 border-dashed">
            <div className="flex justify-between font-bold text-lg w-1/2">
              <span>รวมเป็นเงิน</span>
              <span>{expense.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
            </div>
        </section>

         <footer className="pt-8 mt-8 border-t text-sm">
          <div className="grid grid-cols-2 gap-8">
            <div className="text-center">
                <p>........................................</p>
                <p>(ผู้รับเงิน)</p>
            </div>
             <div className="text-center">
                <p>........................................</p>
                <p>(ผู้จ่ายเงิน)</p>
            </div>
          </div>
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

export default ExpenseReceipt;