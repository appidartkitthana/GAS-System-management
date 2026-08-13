import React from 'react';
import { useAppContext } from '../context/AppContext';
import { thaiBahtText } from '../lib/utils';
import PrinterIcon from './icons/PrinterIcon';

interface MonthlyReportA4Props {
  selectedYear: number;
  selectedMonth: number; // 0-indexed (0 = Jan, 11 = Dec)
  onClose?: () => void;
}

const MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const MonthlyReportA4: React.FC<MonthlyReportA4Props> = ({
  selectedYear,
  selectedMonth,
  onClose
}) => {
  const { companyInfo, sales, expenses, customers } = useAppContext();

  // Filter sales & expenses for the selected month and year
  const monthlySales = sales.filter(s => {
    const d = new Date(s.date);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });

  const monthlyExpenses = expenses.filter(e => {
    const d = new Date(e.date);
    return d.getFullYear() === selectedYear && d.getMonth() === selectedMonth;
  });

  // Calculate Financials
  const totalIncome = monthlySales.reduce((acc, s) => acc + s.total_amount, 0);
  const totalCostOfGoods = monthlySales.reduce((acc, s) => acc + (s.cost_price || 0), 0);
  const totalGasReturnDeduction = monthlySales.reduce((acc, s) => acc + ((s.gas_return_kg || 0) * (s.gas_return_price || 0)), 0);
  
  const totalExpenses = monthlyExpenses.reduce((acc, e) => acc + e.amount, 0);
  const totalGasReturnRefundFromRefill = monthlyExpenses.reduce((acc, e) => acc + (e.gas_return_amount || 0), 0);
  
  const netProfit = totalIncome - totalCostOfGoods - totalExpenses + totalGasReturnRefundFromRefill;

  // Payment channel breakdowns for income
  const incomeCash = monthlySales.filter(s => s.payment_method === 'เงินสด').reduce((a, b) => a + b.total_amount, 0);
  const incomeTransfer = monthlySales.filter(s => s.payment_method === 'เงินโอน').reduce((a, b) => a + b.total_amount, 0);
  const incomeCredit = monthlySales.filter(s => s.payment_method === 'เครดิต').reduce((a, b) => a + b.total_amount, 0);

  // Total cylinders delivered
  const totalCylindersDelivered = monthlySales.reduce((acc, s) => {
    if (s.items && s.items.length > 0) {
      return acc + s.items.reduce((sum, item) => sum + item.quantity, 0);
    }
    return acc + s.quantity;
  }, 0);

  // Group sales by Customer
  const customerMap = new Map<string, {
    customerName: string;
    branch: string;
    salesCount: number;
    totalAmount: number;
    totalTanks: number;
    totalGasReturnKg: number;
  }>();

  monthlySales.forEach(s => {
    const c = customers.find(cust => cust.id === s.customer_id);
    const key = s.customer_id;
    const name = c ? c.name : 'ลูกค้าทั่วไป / หน้าร้าน';
    const branch = c ? c.branch : '-';

    const tanks = (s.items && s.items.length > 0)
      ? s.items.reduce((sum, item) => sum + item.quantity, 0)
      : s.quantity;

    const existing = customerMap.get(key) || {
      customerName: name,
      branch: branch,
      salesCount: 0,
      totalAmount: 0,
      totalTanks: 0,
      totalGasReturnKg: 0,
    };

    existing.salesCount += 1;
    existing.totalAmount += s.total_amount;
    existing.totalTanks += tanks;
    existing.totalGasReturnKg += (s.gas_return_kg || 0);

    customerMap.set(key, existing);
  });

  const customerSummaries = Array.from(customerMap.values()).sort((a, b) => b.totalAmount - a.totalAmount);

  // Group expenses by Type
  const expenseTypeMap = new Map<string, number>();
  monthlyExpenses.forEach(e => {
    const curr = expenseTypeMap.get(e.type) || 0;
    expenseTypeMap.set(e.type, curr + e.amount);
  });
  const expenseTypeSummaries = Array.from(expenseTypeMap.entries()).sort((a, b) => b[1] - a[1]);

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
          #monthly-report-a4, #monthly-report-a4 * {
            visibility: visible;
          }
          #monthly-report-a4 {
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
          <h2 className="font-bold text-gray-800 text-sm">รายงานสรุปประจำเดือน A4</h2>
          <p className="text-xs text-gray-500">ประจำเดือน {MONTH_NAMES[selectedMonth]} {selectedYear + 543}</p>
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
            className="px-5 py-2 bg-sky-600 text-white text-xs font-bold rounded-lg hover:bg-sky-700 flex items-center gap-1.5 shadow"
          >
            <PrinterIcon className="h-4 w-4" />
            พิมพ์รายงานประจำเดือน (A4)
          </button>
        </div>
      </div>

      {/* A4 Report Body */}
      <div id="monthly-report-a4" className="w-[210mm] min-h-[297mm] bg-white p-[10mm] shadow-lg rounded-sm font-sans text-xs text-gray-800 flex flex-col justify-between">
        
        <div>
          {/* Company Header */}
          <div className="flex justify-between items-start pb-4 border-b-2 border-sky-600 mb-4">
            <div className="flex gap-3">
              {companyInfo.logo && (
                <img src={companyInfo.logo} alt="Logo" className="h-16 w-auto object-contain flex-shrink-0" />
              )}
              <div>
                <h1 className="text-lg font-bold text-gray-900">{companyInfo.name}</h1>
                <p className="text-[11px] text-gray-600">{companyInfo.address}</p>
                <p className="text-[11px] text-gray-600">โทร: {companyInfo.phone} | เลขประจำตัวผู้เสียภาษี: {companyInfo.taxId}</p>
              </div>
            </div>

            <div className="text-right">
              <h2 className="text-xl font-bold text-sky-700 uppercase tracking-tight">รายงานสรุปประจำเดือน</h2>
              <p className="text-sm font-bold text-gray-800 mt-0.5">เดือน {MONTH_NAMES[selectedMonth]} พ.ศ. {selectedYear + 543}</p>
              <p className="text-[10px] text-gray-400 mt-1">วันที่ออกเอกสาร: {new Date().toLocaleDateString('th-TH')}</p>
            </div>
          </div>

          {/* Section 1: Financial Overview */}
          <div className="mb-5">
            <h3 className="text-xs font-bold text-sky-800 bg-sky-50 border-l-4 border-sky-600 px-2 py-1 mb-2 uppercase">
              1. สรุปภาพรวมทางการเงิน (Financial Overview)
            </h3>
            
            <div className="grid grid-cols-4 gap-2 text-center mb-3">
              <div className="p-2 bg-emerald-50 border border-emerald-200 rounded">
                <span className="text-[10px] text-emerald-700 font-semibold block">ยอดขายรวม (Total Income)</span>
                <span className="text-sm font-bold text-emerald-800">{totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                <span className="text-[9px] text-emerald-600 block mt-0.5">({monthlySales.length} รายการขาย)</span>
              </div>

              <div className="p-2 bg-blue-50 border border-blue-200 rounded">
                <span className="text-[10px] text-blue-700 font-semibold block">จำนวนแก๊สที่จัดส่งรวม</span>
                <span className="text-sm font-bold text-blue-800">{totalCylindersDelivered.toLocaleString('th-TH')} ถัง</span>
                <span className="text-[9px] text-blue-600 block mt-0.5">({customerSummaries.length} ร้านค้า/ลูกค้า)</span>
              </div>

              <div className="p-2 bg-rose-50 border border-rose-200 rounded">
                <span className="text-[10px] text-rose-700 font-semibold block">รายจ่ายรวม (Total Expense)</span>
                <span className="text-sm font-bold text-rose-800">{totalExpenses.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</span>
                <span className="text-[9px] text-rose-600 block mt-0.5">({monthlyExpenses.length} รายการจ่าย)</span>
              </div>

              <div className="p-2 bg-amber-50 border border-amber-300 rounded">
                <span className="text-[10px] text-amber-800 font-semibold block">กำไรสุทธิประมาณการ</span>
                <span className={`text-sm font-bold ${netProfit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {netProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                </span>
                <span className="text-[9px] text-amber-700 block mt-0.5">({thaiBahtText(Math.abs(netProfit))})</span>
              </div>
            </div>

            {/* Income Channel Breakdown */}
            <div className="bg-gray-50 border border-gray-200 rounded p-2 flex justify-around text-center text-xs">
              <div>
                <span className="text-gray-500 text-[10px]">ชำระเงินสด:</span>
                <p className="font-bold text-gray-800">{incomeCash.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</p>
              </div>
              <div className="border-l border-gray-300 pl-4">
                <span className="text-gray-500 text-[10px]">ชำระเงินโอน:</span>
                <p className="font-bold text-gray-800">{incomeTransfer.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</p>
              </div>
              <div className="border-l border-gray-300 pl-4">
                <span className="text-gray-500 text-[10px]">ยอดตั้งเครดิต (ค้างชำระ):</span>
                <p className="font-bold text-orange-600">{incomeCredit.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</p>
              </div>
            </div>
          </div>

          {/* Section 2: Customer Delivery Breakdown Table */}
          <div className="mb-5">
            <h3 className="text-xs font-bold text-sky-800 bg-sky-50 border-l-4 border-sky-600 px-2 py-1 mb-2 uppercase">
              2. สรุปยอดส่งแก๊สและยอดขายจำแนกตามลูกค้า (Customer Sales & Delivery Summary)
            </h3>

            <table className="w-full border-collapse border border-gray-300 text-[11px]">
              <thead>
                <tr className="bg-sky-700 text-white font-semibold">
                  <th className="py-1.5 px-2 text-center border border-sky-800 w-8">#</th>
                  <th className="py-1.5 px-2 text-left border border-sky-800">ชื่อลูกค้า</th>
                  <th className="py-1.5 px-2 text-left border border-sky-800 w-24">สาขา</th>
                  <th className="py-1.5 px-2 text-center border border-sky-800 w-16">บิลขาย</th>
                  <th className="py-1.5 px-2 text-center border border-sky-800 w-20">จำนวนถัง</th>
                  <th className="py-1.5 px-2 text-center border border-sky-800 w-20">คืนเนื้อ (กก.)</th>
                  <th className="py-1.5 px-2 text-right border border-sky-800 w-28">ยอดขายรวม (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {customerSummaries.length > 0 ? (
                  customerSummaries.map((c, idx) => (
                    <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="py-1.5 px-2 text-center border border-gray-200 text-gray-500">{idx + 1}</td>
                      <td className="py-1.5 px-2 font-bold text-gray-900 border border-gray-200">{c.customerName}</td>
                      <td className="py-1.5 px-2 border border-gray-200 text-gray-600">{c.branch}</td>
                      <td className="py-1.5 px-2 text-center border border-gray-200">{c.salesCount} บิล</td>
                      <td className="py-1.5 px-2 text-center font-bold text-sky-700 border border-gray-200">{c.totalTanks} ถัง</td>
                      <td className="py-1.5 px-2 text-center text-blue-600 border border-gray-200">{c.totalGasReturnKg || '-'}</td>
                      <td className="py-1.5 px-2 text-right font-bold text-gray-900 border border-gray-200">
                        {c.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={7} className="text-center py-4 text-gray-400">ไม่มีข้อมูลการขายในเดือนนี้</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-sky-100 font-bold border-t-2 border-sky-600 text-sky-900">
                  <td colSpan={3} className="py-2 px-2 text-right">รวมทั้งสิ้น ({customerSummaries.length} ร้านค้า):</td>
                  <td className="py-2 px-2 text-center">{monthlySales.length} บิล</td>
                  <td className="py-2 px-2 text-center font-bold text-sky-900">{totalCylindersDelivered} ถัง</td>
                  <td className="py-2 px-2 text-center text-blue-800">
                    {monthlySales.reduce((sum, s) => sum + (s.gas_return_kg || 0), 0)} กก.
                  </td>
                  <td className="py-2 px-2 text-right text-sm font-bold text-emerald-800">
                    {totalIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section 3: Expense Categories Breakdown */}
          <div className="mb-5">
            <h3 className="text-xs font-bold text-sky-800 bg-sky-50 border-l-4 border-sky-600 px-2 py-1 mb-2 uppercase">
              3. สรุปประเภทรายจ่ายทั้งหมดประจำเดือน (Expense Breakdown)
            </h3>

            <table className="w-full border-collapse border border-gray-300 text-[11px]">
              <thead>
                <tr className="bg-slate-700 text-white font-semibold">
                  <th className="py-1.5 px-2 text-center border border-slate-800 w-8">#</th>
                  <th className="py-1.5 px-2 text-left border border-slate-800">หมวดหมู่รายจ่าย</th>
                  <th className="py-1.5 px-2 text-right border border-slate-800 w-36">รวมจำนวนเงิน (บาท)</th>
                  <th className="py-1.5 px-2 text-center border border-slate-800 w-24">สัดส่วน (%)</th>
                </tr>
              </thead>
              <tbody>
                {expenseTypeSummaries.length > 0 ? (
                  expenseTypeSummaries.map(([type, amount], idx) => {
                    const percent = totalExpenses > 0 ? ((amount / totalExpenses) * 100).toFixed(1) : '0';
                    return (
                      <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-1.5 px-2 text-center border border-gray-200 text-gray-500">{idx + 1}</td>
                        <td className="py-1.5 px-2 font-semibold text-gray-800 border border-gray-200">{type}</td>
                        <td className="py-1.5 px-2 text-right font-semibold text-gray-900 border border-gray-200">
                          {amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-1.5 px-2 text-center text-gray-600 border border-gray-200">{percent}%</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4} className="text-center py-3 text-gray-400">ไม่มีข้อมูลรายจ่ายในเดือนนี้</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 font-bold border-t-2 border-slate-600 text-slate-900">
                  <td colSpan={2} className="py-2 px-2 text-right">รวมรายจ่ายทั้งหมด:</td>
                  <td className="py-2 px-2 text-right text-rose-700 font-bold">
                    {totalExpenses.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                  </td>
                  <td className="py-2 px-2 text-center">100%</td>
                </tr>
              </tfoot>
            </table>
          </div>

        </div>

        {/* Report Footer / Signature */}
        <div className="pt-6 border-t border-gray-300 break-inside-avoid">
          <div className="grid grid-cols-2 gap-8 text-center">
            <div>
              <div className="border-b border-gray-400 h-12 mb-2 w-3/4 mx-auto"></div>
              <p className="text-xs font-bold text-gray-800">ผู้จัดทำรายงาน / ผู้สรุปยอด</p>
              <p className="text-[10px] text-gray-400 mt-1">วันที่ ..... / ..... / .........</p>
            </div>

            <div>
              <div className="border-b border-gray-400 h-12 mb-2 w-3/4 mx-auto"></div>
              <p className="text-xs font-bold text-gray-800">เจ้าของร้าน / ผู้รับรองรายงาน</p>
              <p className="text-[10px] text-gray-400 mt-1">({companyInfo.name})</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default MonthlyReportA4;
