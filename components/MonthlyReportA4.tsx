import React from 'react';
import { useAppContext } from '../context/AppContext';
import { thaiBahtText, formatDateForInput } from '../lib/utils';
import { calculateReportMetrics } from '../lib/reportCalculations';
import PrinterIcon from './icons/PrinterIcon';

interface MonthlyReportA4Props {
  selectedYear: number;
  selectedMonth: number; // 0-indexed (0 = Jan, 11 = Dec)
  customStartDate?: string;
  customEndDate?: string;
  onClose?: () => void;
}

const MONTH_NAMES = [
  'มกราคม', 'กุมภาพันธ์', 'มีนาคม', 'เมษายน', 'พฤษภาคม', 'มิถุนายน',
  'กรกฎาคม', 'สิงหาคม', 'กันยายน', 'ตุลาคม', 'พฤศจิกายน', 'ธันวาคม'
];

const MonthlyReportA4: React.FC<MonthlyReportA4Props> = ({
  selectedYear,
  selectedMonth,
  customStartDate,
  customEndDate,
  onClose
}) => {
  const { companyInfo, sales, expenses, customers, inventory } = useAppContext();

  // Compute start and end dates for selected month or custom range
  const startDate = customStartDate || formatDateForInput(new Date(selectedYear, selectedMonth, 1));
  const endDate = customEndDate || formatDateForInput(new Date(selectedYear, selectedMonth + 1, 0));

  // Use the single source of truth report calculations
  const metrics = calculateReportMetrics(sales, expenses, customers, inventory, startDate, endDate);

  const monthlySales = sales.filter(s => {
    const d = s.date ? s.date.split('T')[0] : '';
    return d >= startDate && d <= endDate;
  });

  const monthlyExpenses = expenses.filter(e => {
    const d = e.date ? e.date.split('T')[0] : '';
    return d >= startDate && d <= endDate;
  });

  const totalIncome = metrics.totalSalesAmount;
  const totalExpenses = metrics.totalExpensesAmount;
  const netProfit = metrics.netProfit;

  // Payment channel breakdowns for income
  const incomeCash = metrics.cashIncome;
  const incomeTransfer = metrics.transferIncome;
  const incomeCredit = metrics.creditIncome;

  // Total cylinders delivered
  const totalCylindersDelivered = metrics.totalGasTanksSold;

  // Customer summaries
  const customerSummaries = metrics.customerSummaries.map(c => ({
    customerName: c.customerName,
    branch: c.branch,
    salesCount: c.salesCount,
    totalAmount: c.totalAmount,
    totalTanks: c.tanksCount + c.accessoriesCount,
    totalGasReturnKg: c.gasReturnKg,
  }));

  // Expense breakdown
  const expenseTypeSummaries = metrics.expenseTypeSummaries.map(e => [e.type, e.totalAmount] as [string, number]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="bg-gray-200 p-4 min-h-screen flex flex-col items-center overflow-auto">
      <style>{`
        @page {
          size: A4 portrait;
          margin: 10mm 10mm 12mm 10mm;
        }
        @media print {
          html, body {
            width: 210mm;
            height: auto;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
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
            width: 190mm !important;
            max-width: 190mm !important;
            height: auto;
            min-height: auto;
            box-sizing: border-box !important;
            margin: 0 auto !important;
            padding: 0 !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .print-section {
            page-break-inside: avoid;
            break-inside: avoid;
            margin-bottom: 16px;
          }
          thead {
            display: table-header-group;
          }
          tfoot {
            display: table-footer-group;
          }
          tr {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Control Panel Bar */}
      <div className="bg-white border border-gray-300 shadow-md rounded-lg p-4 mb-4 w-full max-w-[210mm] flex justify-between items-center no-print">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-800 text-sm">รายงานสรุปประจำเดือน & ตรวจสอบภาษี A4</h2>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
              ✓ ข้อมูลเชื่อมโยง Dashboard 100%
            </span>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            ประจำช่วง {startDate} ถึง {endDate} (เดือน {MONTH_NAMES[selectedMonth]} {selectedYear + 543})
          </p>
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
                      <td className="py-1.5 px-2 text-center text-blue-600 border border-gray-200">
                        {c.totalGasReturnKg > 0 ? `${c.totalGasReturnKg.toFixed(2)} กก.` : '-'}
                      </td>
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
                    {metrics.customerGasReturnKg > 0 ? `${metrics.customerGasReturnKg.toFixed(2)} กก.` : (metrics.totalGasReturnKg > 0 ? `${metrics.totalGasReturnKg.toFixed(2)} กก.` : '-')}
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
              3. สรุปประเภทรายจ่ายทั้งหมดประจำเดือน (Expense Summary)
            </h3>

            <table className="w-full border-collapse border border-gray-300 text-[11px] mb-3">
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

          {/* Section 4: Detailed Gas Refills at Plant */}
          <div className="mb-5 print-section">
            <h3 className="text-xs font-bold text-sky-800 bg-sky-50 border-l-4 border-sky-600 px-2 py-1 mb-2 uppercase">
              4. รายละเอียดการเติมแก๊สเข้าโรงบรรจุ (Gas Refill Breakdown)
            </h3>

            <table className="w-full border-collapse border border-gray-300 text-[11px] mb-3">
              <thead>
                <tr className="bg-amber-700 text-white font-semibold">
                  <th className="py-1.5 px-2 text-center border border-amber-800 w-8">#</th>
                  <th className="py-1.5 px-2 text-center border border-amber-800 w-20">วันที่เติม</th>
                  <th className="py-1.5 px-2 text-left border border-amber-800">โรงบรรจุแก๊ส / ผู้รับเงิน</th>
                  <th className="py-1.5 px-2 text-left border border-amber-800">รายการเติมถัง</th>
                  <th className="py-1.5 px-2 text-right border border-amber-800 w-28">คืนเนื้อแก๊ส (กก./บาท)</th>
                  <th className="py-1.5 px-2 text-right border border-amber-800 w-28">ค่าเติมสุทธิ (บาท)</th>
                </tr>
              </thead>
              <tbody>
                {monthlyExpenses.filter(e => e.type === 'ค่าบรรจุก๊าซ' || (e.refill_details && e.refill_details.length > 0)).length > 0 ? (
                  monthlyExpenses
                    .filter(e => e.type === 'ค่าบรรจุก๊าซ' || (e.refill_details && e.refill_details.length > 0))
                    .map((e, idx) => {
                      const refillDesc = (e.refill_details && e.refill_details.length > 0)
                        ? e.refill_details.map(item => `${item.brand} ${item.size} (${item.quantity} ถัง)`).join(', ')
                        : (e.notes || 'ค่าเติมแก๊ส');

                      return (
                        <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/20'}>
                          <td className="py-1.5 px-2 text-center border border-gray-200 text-gray-500">{idx + 1}</td>
                          <td className="py-1.5 px-2 text-center border border-gray-200">{new Date(e.date).toLocaleDateString('th-TH', { day: '2-digit', month: '2-digit' })}</td>
                          <td className="py-1.5 px-2 font-bold text-gray-800 border border-gray-200">{e.payee || '-'}</td>
                          <td className="py-1.5 px-2 text-gray-700 border border-gray-200">{refillDesc}</td>
                          <td className="py-1.5 px-2 text-right text-emerald-700 font-semibold border border-gray-200">
                            {e.gas_return_kg ? (
                              <div>
                                <span className="font-bold">{e.gas_return_kg} กก.</span>
                                {e.gas_return_amount ? <span className="text-[9px] text-gray-500 block">({e.gas_return_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿)</span> : null}
                              </div>
                            ) : (e.gas_return_amount ? `${e.gas_return_amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿` : '-')}
                          </td>
                          <td className="py-1.5 px-2 text-right font-bold text-gray-900 border border-gray-200">
                            {e.amount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                          </td>
                        </tr>
                      );
                    })
                ) : (
                  <tr>
                    <td colSpan={6} className="text-center py-3 text-gray-400">ไม่มีบันทึกการเติมแก๊สเข้าโรงบรรจุในเดือนนี้</td>
                  </tr>
                )}
              </tbody>
              <tfoot>
                <tr className="bg-amber-100 font-bold border-t-2 border-amber-700 text-amber-950">
                  <td colSpan={4} className="py-2 px-2 text-right">รวมการเติมแก๊สเข้าโรงบรรจุ:</td>
                  <td className="py-2 px-2 text-right text-emerald-800 font-bold">
                    {metrics.plantGasReturnKg > 0 ? `${metrics.plantGasReturnKg.toFixed(2)} กก.` : '-'}
                  </td>
                  <td className="py-2 px-2 text-right text-rose-800 font-bold">
                    {metrics.totalRefillAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Section 5: Tax & Accounting Audit Comparison */}
          {metrics.taxComparison && (
            <div className="mb-5 print-section border border-gray-300 rounded-lg p-3 bg-gray-50/80">
              <div className="flex justify-between items-center pb-2 mb-2 border-b border-gray-300">
                <h3 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 uppercase">
                  <span>⚖️</span>
                  5. สรุปเปรียบเทียบยอดสำหรับตรวจสอบภาษี & บัญชี (Tax Invoice vs. Credit Refill)
                </h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  metrics.taxComparison.status === 'SAFE'
                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                    : metrics.taxComparison.status === 'EQUAL'
                    ? 'bg-amber-100 text-amber-800 border-amber-300'
                    : 'bg-rose-100 text-rose-800 border-rose-300'
                }`}>
                  {metrics.taxComparison.statusLabel}
                </span>
              </div>

              <table className="w-full border-collapse border border-gray-300 text-[11px] mb-2 bg-white">
                <thead>
                  <tr className="bg-slate-700 text-white font-semibold">
                    <th className="py-1.5 px-2 text-left border border-slate-800">รายการเปรียบเทียบ</th>
                    <th className="py-1.5 px-2 text-center border border-slate-800 w-20">จำนวนบิล/ครั้ง</th>
                    <th className="py-1.5 px-2 text-center border border-slate-800 w-24">จำนวนถัง</th>
                    <th className="py-1.5 px-2 text-center border border-slate-800 w-24">น้ำหนักก๊าซ (กก.)</th>
                    <th className="py-1.5 px-2 text-right border border-slate-800 w-32">ยอดเงินรวม (บาท)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="py-1.5 px-2 font-semibold text-emerald-900 border border-gray-200">
                      1. ยอดขายออกใบกำกับภาษี (Tax Invoice Sales)
                    </td>
                    <td className="py-1.5 px-2 text-center border border-gray-200">
                      {metrics.taxComparison.taxSales.billsCount}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-emerald-700 border border-gray-200">
                      {metrics.taxComparison.taxSales.tanksCount} ถัง
                    </td>
                    <td className="py-1.5 px-2 text-center border border-gray-200">
                      {metrics.taxComparison.taxSales.weightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })}
                    </td>
                    <td className="py-1.5 px-2 text-right font-bold text-emerald-800 border border-gray-200">
                      {metrics.taxComparison.taxSales.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                  <tr className="bg-gray-50">
                    <td className="py-1.5 px-2 font-semibold text-blue-900 border border-gray-200">
                      2. ยอดซื้อเติมแก๊สเครดิต (Credit Gas Refills at Plant)
                    </td>
                    <td className="py-1.5 px-2 text-center border border-gray-200">
                      {metrics.taxComparison.creditRefill.billsCount}
                    </td>
                    <td className="py-1.5 px-2 text-center font-bold text-blue-700 border border-gray-200">
                      {metrics.taxComparison.creditRefill.tanksCount} ถัง
                    </td>
                    <td className="py-1.5 px-2 text-center border border-gray-200">
                      {metrics.taxComparison.creditRefill.weightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })}
                    </td>
                    <td className="py-1.5 px-2 text-right font-bold text-blue-800 border border-gray-200">
                      {metrics.taxComparison.creditRefill.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr className="bg-slate-100 font-bold border-t-2 border-slate-600 text-slate-900">
                    <td className="py-2 px-2 text-left">
                      ส่วนต่างเปรียบเทียบ (ยอดขายใบกำกับ - ยอดเติมเครดิต):
                    </td>
                    <td className="py-2 px-2 text-center">
                      {metrics.taxComparison.difference.billsCount > 0 ? '+' : ''}{metrics.taxComparison.difference.billsCount}
                    </td>
                    <td className={`py-2 px-2 text-center ${metrics.taxComparison.difference.tanksCount >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {metrics.taxComparison.difference.tanksCount > 0 ? '+' : ''}{metrics.taxComparison.difference.tanksCount} ถัง
                    </td>
                    <td className={`py-2 px-2 text-center ${metrics.taxComparison.difference.weightKg >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                      {metrics.taxComparison.difference.weightKg > 0 ? '+' : ''}{metrics.taxComparison.difference.weightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })}
                    </td>
                    <td className={`py-2 px-2 text-right text-sm font-bold ${metrics.taxComparison.difference.totalAmount >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
                      {metrics.taxComparison.difference.totalAmount > 0 ? '+' : ''}{metrics.taxComparison.difference.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}

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
