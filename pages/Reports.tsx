import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import { formatDateForInput } from '../lib/utils';
import { calculateReportMetrics, formatThaiDate } from '../lib/reportCalculations';
import { Customer } from '../types';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import PrinterIcon from '../components/icons/PrinterIcon';
import MonthlyReportA4 from '../components/MonthlyReportA4';
import CustomerStatementA4 from '../components/CustomerStatementA4';

type ReportTab = 'DAILY' | 'CUSTOMERS' | 'PRODUCTS' | 'EXPENSES';

const Reports: React.FC = () => {
  const { sales, expenses, customers, inventory, companyInfo } = useAppContext();

  // Initial date state: Start of current month to Today
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [inputStartDate, setInputStartDate] = useState<string>(formatDateForInput(firstDayOfMonth));
  const [inputEndDate, setInputEndDate] = useState<string>(formatDateForInput(today));

  // Applied date range state
  const [appliedStartDate, setAppliedStartDate] = useState<string>(formatDateForInput(firstDayOfMonth));
  const [appliedEndDate, setAppliedEndDate] = useState<string>(formatDateForInput(today));

  // Active view tab
  const [activeTab, setActiveTab] = useState<ReportTab>('DAILY');

  // Modals for Printing
  const [showMonthlyReportModal, setShowMonthlyReportModal] = useState<boolean>(false);
  const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

  const handleSearch = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (inputStartDate > inputEndDate) {
      alert("วันที่เริ่มต้นต้องไม่มากกว่าวันที่สิ้นสุด");
      return;
    }
    setAppliedStartDate(inputStartDate);
    setAppliedEndDate(inputEndDate);
  };

  const handleReset = () => {
    const start = formatDateForInput(firstDayOfMonth);
    const end = formatDateForInput(today);
    setInputStartDate(start);
    setInputEndDate(end);
    setAppliedStartDate(start);
    setAppliedEndDate(end);
  };

  // Quick Presets
  const setPresetRange = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30_DAYS' | 'THIS_YEAR') => {
    const now = new Date();
    if (preset === 'THIS_MONTH') {
      const start = formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 1));
      const end = formatDateForInput(new Date(now.getFullYear(), now.getMonth() + 1, 0));
      setInputStartDate(start);
      setInputEndDate(end);
      setAppliedStartDate(start);
      setAppliedEndDate(end);
    } else if (preset === 'LAST_MONTH') {
      const start = formatDateForInput(new Date(now.getFullYear(), now.getMonth() - 1, 1));
      const end = formatDateForInput(new Date(now.getFullYear(), now.getMonth(), 0));
      setInputStartDate(start);
      setInputEndDate(end);
      setAppliedStartDate(start);
      setAppliedEndDate(end);
    } else if (preset === 'LAST_30_DAYS') {
      const end = formatDateForInput(new Date());
      const past = new Date();
      past.setDate(past.getDate() - 30);
      const start = formatDateForInput(past);
      setInputStartDate(start);
      setInputEndDate(end);
      setAppliedStartDate(start);
      setAppliedEndDate(end);
    } else if (preset === 'THIS_YEAR') {
      const start = formatDateForInput(new Date(now.getFullYear(), 0, 1));
      const end = formatDateForInput(new Date(now.getFullYear(), 11, 31));
      setInputStartDate(start);
      setInputEndDate(end);
      setAppliedStartDate(start);
      setAppliedEndDate(end);
    }
  };

  const handleMonthSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.value) return;
    const [year, month] = e.target.value.split('-').map(Number);
    const start = formatDateForInput(new Date(year, month - 1, 1));
    const end = formatDateForInput(new Date(year, month, 0));
    setInputStartDate(start);
    setInputEndDate(end);
    setAppliedStartDate(start);
    setAppliedEndDate(end);
  };

  // Calculate Single-Source-of-Truth Metrics matching Dashboard 100%
  const reportData = useMemo(() => {
    return calculateReportMetrics(
      sales,
      expenses,
      customers,
      inventory,
      appliedStartDate,
      appliedEndDate
    );
  }, [sales, expenses, customers, inventory, appliedStartDate, appliedEndDate]);

  const handlePrintCustomerStatement = (customerId: string, customerName: string) => {
    const found = customers.find(c => c.id === customerId || c.name === customerName);
    if (found) {
      setStatementCustomer(found);
    } else {
      setStatementCustomer({
        id: customerId || 'temp',
        name: customerName,
        branch: '-',
        price: 0,
        tank_brand: undefined as any,
        tank_size: undefined as any,
      });
    }
  };

  // Export to Excel / CSV function with UTF-8 BOM
  const exportToExcelCSV = () => {
    if (reportData.dailyRows.length === 0) {
      alert("ไม่มีข้อมูลในช่วงวันที่เลือก เพื่อทำการส่งออก");
      return;
    }

    let csv = '';

    // Company Header
    csv += `"${companyInfo.name || 'ร้านก๊าซหุงต้ม'}"\n`;
    csv += `"รายงานสรุปยอดขาย การส่งสินค้า รายจ่าย และกำไรประจำช่วงเวลา"\n`;
    csv += `"ช่วงวันที่: ${formatThaiDate(appliedStartDate)} ถึง ${formatThaiDate(appliedEndDate)}"\n`;
    csv += `"วันที่พิมพ์รายงาน: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}"\n\n`;

    // Grand Summary Section
    csv += `"--- สรุปรวมผลรวมประจำช่วงวันที่เลือก (Grand Totals) ---"\n`;
    csv += `"SUM(รายรับ / ยอดขาย) (บาท)","SUM(รายจ่าย) (บาท)","SUM(กำไรสุทธิ) (บาท)","SUM(กำไรขั้นต้น) (บาท)","SUM(จำนวนถังแก๊สขาย) (ถัง)","SUM(จำนวนสินค้าทั้งหมด) (ชิ้น)","SUM(กิโลกรัมแก๊ส) (กก.)","SUM(ถังเติม) (ถัง)","SUM(เนื้อแก๊สคืน) (กก.)","บิลขายรวม","รายการจ่ายรวม"\n`;
    csv += `"${reportData.totalSalesAmount.toFixed(2)}","${reportData.totalExpensesAmount.toFixed(2)}","${reportData.netProfit.toFixed(2)}","${reportData.grossProfit.toFixed(2)}","${reportData.totalGasTanksSold}","${reportData.totalItemsSold}","${reportData.totalGasWeightKg.toFixed(2)}","${reportData.totalRefillTanks}","${reportData.totalGasReturnKg.toFixed(2)}","${reportData.totalSalesBills}","${reportData.totalExpenseRecords}"\n\n`;

    // Section 1: Daily Breakdown Table
    csv += `"--- 1. รายละเอียดแยกรายวัน (Daily Breakdown) ---"\n`;
    csv += `"ลำดับ","วันที่","ส่งที่ไหนบ้าง","บิลส่ง","SUM(จำนวนถังส่ง)","SUM(สินค้าทั้งหมด)","SUM(กิโลกรัม) (กก.)","SUM(รายรับ) (บาท)","บิลเติม","SUM(ถังเติม)","ขนาดถังเติม","ยอดเติมแก๊ส (บาท)","รายจ่ายอื่นๆ (บาท)","SUM(รายจ่าย) (บาท)","SUM(กำไรสุทธิ) (บาท)","SUM(กำไรขั้นต้น) (บาท)","เนื้อแก๊สคืน (กก.)"\n`;

    reportData.dailyRows.forEach((row, index) => {
      const locationsStr = row.deliveryLocations.join(' | ') || 'ไม่มีรายการส่ง';
      const safeSizes = row.refillSizesText.replace(/"/g, '""');

      csv += `"${index + 1}",`;
      csv += `"${row.formattedDate}",`;
      csv += `"${locationsStr.replace(/"/g, '""')}",`;
      csv += `"${row.salesBillsCount}",`;
      csv += `"${row.salesTanksCount}",`;
      csv += `"${row.totalItemsCount}",`;
      csv += `"${row.salesTotalWeightKg.toFixed(2)}",`;
      csv += `"${row.salesTotalAmount.toFixed(2)}",`;
      csv += `"${row.refillBillsCount}",`;
      csv += `"${row.refillTanksCount}",`;
      csv += `"${safeSizes}",`;
      csv += `"${row.refillTotalAmount.toFixed(2)}",`;
      csv += `"${row.otherExpensesAmount.toFixed(2)}",`;
      csv += `"${row.totalExpensesAmount.toFixed(2)}",`;
      csv += `"${row.dailyNetProfit.toFixed(2)}",`;
      csv += `"${row.grossProfit.toFixed(2)}",`;
      csv += `"${row.gasReturnKg.toFixed(2)}"\n`;
    });

    // Total Row
    csv += `"ยอดรวมท้ายตาราง","ช่วง ${formatThaiDate(appliedStartDate)} - ${formatThaiDate(appliedEndDate)}","${reportData.dailyRows.length} วัน","${reportData.totalSalesBills}","${reportData.totalGasTanksSold}","${reportData.totalItemsSold}","${reportData.totalGasWeightKg.toFixed(2)}","${reportData.totalSalesAmount.toFixed(2)}","${reportData.totalRefillBills}","${reportData.totalRefillTanks}","-","${reportData.totalRefillAmount.toFixed(2)}","${reportData.totalOtherExpenses.toFixed(2)}","${reportData.totalExpensesAmount.toFixed(2)}","${reportData.netProfit.toFixed(2)}","${reportData.grossProfit.toFixed(2)}","${reportData.totalGasReturnKg.toFixed(2)}"\n\n`;

    // Section 2: Customer Sales Summary
    csv += `"--- 2. สรุปยอดขายจำแนกตามลูกค้า (Customer Sales Summary) ---"\n`;
    csv += `"ลำดับ","ชื่อลูกค้า","สาขา","บิลขาย","SUM(จำนวนถัง)","SUM(อุปกรณ์)","SUM(กิโลกรัม) (กก.)","SUM(รายรับ / ยอดขาย) (บาท)","SUM(กำไรขั้นต้น) (บาท)","SUM(เนื้อแก๊สคืน) (กก.)","เงินสด (บาท)","เงินโอน (บาท)","เครดิต (บาท)"\n`;
    reportData.customerSummaries.forEach((c, idx) => {
      csv += `"${idx + 1}","${c.customerName.replace(/"/g, '""')}","${c.branch.replace(/"/g, '""')}","${c.salesCount}","${c.tanksCount}","${c.accessoriesCount}","${c.totalWeightKg.toFixed(2)}","${c.totalAmount.toFixed(2)}","${c.grossProfit.toFixed(2)}","${c.gasReturnKg.toFixed(2)}","${c.cashAmount.toFixed(2)}","${c.transferAmount.toFixed(2)}","${c.creditAmount.toFixed(2)}"\n`;
    });
    csv += `"รวมทั้งสิ้น","-","${reportData.customerSummaries.length} ราย","${reportData.totalSalesBills}","${reportData.totalGasTanksSold}","${reportData.totalAccessoriesSold}","${reportData.totalGasWeightKg.toFixed(2)}","${reportData.totalSalesAmount.toFixed(2)}","${reportData.grossProfit.toFixed(2)}","${reportData.totalGasReturnKg.toFixed(2)}","${reportData.cashIncome.toFixed(2)}","${reportData.transferIncome.toFixed(2)}","${reportData.creditIncome.toFixed(2)}"\n\n`;

    // Section 3: Product Summary
    csv += `"--- 3. สรุปยอดขายจำแนกตามสินค้าและขนาดถัง ---"\n`;
    csv += `"ลำดับ","รายการสินค้า / ขนาดถัง","ประเภท","SUM(จำนวน)","SUM(กิโลกรัม) (กก.)","SUM(ยอดขาย) (บาท)","SUM(กำไรขั้นต้น) (บาท)","ขายสด/โอน (ชิ้น)","ขายเครดิต (ชิ้น)","บิลภาษี (ชิ้น)"\n`;
    reportData.productSummaries.forEach((p, idx) => {
      csv += `"${idx + 1}","${p.name.replace(/"/g, '""')}","${p.itemType === 'ACCESSORY' ? 'อุปกรณ์เสริม' : 'ก๊าซหุงต้ม'}","${p.quantity}","${p.weightKg.toFixed(2)}","${p.totalAmount.toFixed(2)}","${p.grossProfit.toFixed(2)}","${p.cashTransferQty}","${p.creditQty}","${p.taxInvoiceQty}"\n`;
    });
    csv += `"รวมทั้งสิ้น","-","-","${reportData.totalItemsSold}","${reportData.totalGasWeightKg.toFixed(2)}","${reportData.totalSalesAmount.toFixed(2)}","${reportData.grossProfit.toFixed(2)}","-","-","-"\n`;

    // Trigger File Download
    const bom = '\uFEFF'; // UTF-8 BOM
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานสรุปประจำเดือน_${appliedStartDate}_ถึง_${appliedEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Modals for Printing */}
      {showMonthlyReportModal && (
        <div className="fixed inset-0 bg-black/70 z-50 overflow-y-auto flex justify-center items-start p-2 sm:p-4">
          <div className="relative w-full max-w-5xl my-4">
            <MonthlyReportA4
              selectedYear={new Date(appliedStartDate).getFullYear()}
              selectedMonth={new Date(appliedStartDate).getMonth()}
              onClose={() => setShowMonthlyReportModal(false)}
            />
          </div>
        </div>
      )}

      {statementCustomer && (
        <div className="fixed inset-0 bg-black/70 z-50 overflow-y-auto flex justify-center items-start p-2 sm:p-4">
          <div className="relative w-full max-w-5xl my-4">
            <CustomerStatementA4
              customer={statementCustomer}
              selectedYear={new Date(appliedStartDate).getFullYear()}
              selectedMonth={new Date(appliedStartDate).getMonth()}
              onClose={() => setStatementCustomer(null)}
            />
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-wrap justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-sky-600 text-white rounded-xl shadow-md">
            <ChartBarIcon className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">
              หน้าสรุปรายงานประจำเดือน
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              รายงานสรุปยอดขาย รายรับ รายจ่าย กำไร และสินค้า คำนวณจากฐานข้อมูลจริง 100%
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setShowMonthlyReportModal(true)}
            className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-blue-700 hover:from-sky-700 hover:to-blue-800 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
            title="เปิดหน้าต่างพิมพ์รายงานสรุปประจำเดือนแบบ A4"
          >
            <PrinterIcon className="h-4 w-4" />
            <span>พิมพ์รายงานประจำเดือน A4</span>
          </button>

          <button
            type="button"
            onClick={exportToExcelCSV}
            className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow transition-all flex items-center gap-1.5"
            title="ดาวน์โหลดไฟล์ Excel (.csv) รองรับภาษาไทยสมบูรณ์"
          >
            <span>📊</span>
            <span>Export Excel (CSV)</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Control Panel */}
      <Card className="bg-white border border-slate-200 shadow-sm p-4 rounded-xl">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="flex flex-wrap justify-between items-center gap-2 border-b border-slate-100 pb-2.5">
            <div className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
              <span className="text-orange-500 text-base">📅</span>
              <span>เลือกช่วงวันที่เพื่อดูรายงานสรุป (Date Filter)</span>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => setPresetRange('THIS_MONTH')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-sky-500 hover:text-white border border-slate-200 transition-all"
              >
                เดือนนี้
              </button>
              <button
                type="button"
                onClick={() => setPresetRange('LAST_MONTH')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-sky-500 hover:text-white border border-slate-200 transition-all"
              >
                เดือนก่อน
              </button>
              <button
                type="button"
                onClick={() => setPresetRange('LAST_30_DAYS')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-sky-500 hover:text-white border border-slate-200 transition-all"
              >
                30 วันล่าสุด
              </button>
              <button
                type="button"
                onClick={() => setPresetRange('THIS_YEAR')}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-slate-100 text-slate-700 hover:bg-sky-500 hover:text-white border border-slate-200 transition-all"
              >
                ปีนี้
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ตั้งแต่วันที่ (Start Date)
              </label>
              <input
                type="date"
                value={inputStartDate}
                onChange={(e) => setInputStartDate(e.target.value)}
                className="w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 font-semibold bg-slate-50 border-slate-300"
                required
              />
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs font-bold text-gray-700 mb-1">
                ถึงวันที่ (End Date)
              </label>
              <input
                type="date"
                value={inputEndDate}
                onChange={(e) => setInputEndDate(e.target.value)}
                className="w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 font-semibold bg-slate-50 border-slate-300"
                required
              />
            </div>

            <div className="sm:col-span-4 flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-bold text-gray-500 mb-1">
                  เลือกเดือนเร็ว
                </label>
                <input
                  type="month"
                  onChange={handleMonthSelect}
                  className="w-full p-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 bg-slate-50 border-slate-300"
                  title="เลือกเดือนเพื่อปรับวันที่ทั้งเดือนอัตโนมัติ"
                />
              </div>

              <button
                type="submit"
                className="h-[34px] px-4 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center justify-center gap-1 mt-auto"
              >
                <span>🔍</span>
                <span>ค้นหา</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="h-[34px] px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg transition-colors border border-slate-300 mt-auto"
                title="รีเซ็ตเป็นเดือนปัจจุบัน"
              >
                🔄
              </button>
            </div>
          </div>
        </form>
      </Card>

      {/* ========================================================================= */}
      {/* 8 GRAND OVERVIEW SUMMARY METRICS CARDS (ผลรวมทั้งหมดประจำช่วงเวลา) */}
      {/* ========================================================================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 2xl:grid-cols-8 gap-3">
        {/* 1. SUM(รายรับ) */}
        <div className="bg-gradient-to-br from-emerald-600 to-green-700 text-white p-3.5 rounded-xl shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-emerald-100 font-bold uppercase tracking-wider">
              1. SUM(รายรับ)
            </span>
            <span className="text-base">💰</span>
          </div>
          <div className="text-xl font-black mt-1">
            {reportData.totalSalesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">฿</span>
          </div>
          <div className="text-[10px] text-emerald-100 mt-1 flex justify-between">
            <span>บิลขาย: <strong>{reportData.totalSalesBills}</strong> บิล</span>
            <span>เฉลี่ย {reportData.totalSalesBills > 0 ? (reportData.totalSalesAmount / reportData.totalSalesBills).toLocaleString('th-TH', { maximumFractionDigits: 0 }) : 0} ฿</span>
          </div>
        </div>

        {/* 2. SUM(รายจ่าย) */}
        <div className="bg-gradient-to-br from-rose-600 to-red-700 text-white p-3.5 rounded-xl shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-rose-100 font-bold uppercase tracking-wider">
              2. SUM(รายจ่าย)
            </span>
            <span className="text-base">💸</span>
          </div>
          <div className="text-xl font-black mt-1">
            {reportData.totalExpensesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">฿</span>
          </div>
          <div className="text-[10px] text-rose-100 mt-1 flex justify-between">
            <span>เติมแก๊ส: <strong>{reportData.totalRefillAmount.toLocaleString()}</strong> ฿</span>
            <span>อื่นๆ: <strong>{reportData.totalOtherExpenses.toLocaleString()}</strong> ฿</span>
          </div>
        </div>

        {/* 3. SUM(กำไรสุทธิ) */}
        <div className={`text-white p-3.5 rounded-xl shadow-md relative overflow-hidden ${reportData.netProfit >= 0 ? 'bg-gradient-to-br from-sky-600 to-blue-700' : 'bg-gradient-to-br from-red-600 to-rose-800'}`}>
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-sky-100 font-bold uppercase tracking-wider">
              3. SUM(กำไรสุทธิ)
            </span>
            <span className="text-base">📈</span>
          </div>
          <div className="text-xl font-black mt-1">
            {reportData.netProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">฿</span>
          </div>
          <div className="text-[10px] text-sky-100 mt-1 flex justify-between">
            <span>กำไรขั้นต้น: <strong>{reportData.grossProfit.toLocaleString()}</strong> ฿</span>
          </div>
        </div>

        {/* 4. SUM(จำนวนถังแก๊ส/สินค้า) */}
        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-3.5 rounded-xl shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-amber-100 font-bold uppercase tracking-wider">
              4. SUM(จำนวน)
            </span>
            <span className="text-base">🛢️</span>
          </div>
          <div className="text-xl font-black mt-1">
            {reportData.totalGasTanksSold.toLocaleString('th-TH')} <span className="text-xs font-normal">ถัง</span>
          </div>
          <div className="text-[10px] text-amber-100 mt-1 flex justify-between">
            <span>อุปกรณ์: <strong>{reportData.totalAccessoriesSold}</strong> ชิ้น</span>
            <span>รวม: <strong>{reportData.totalItemsSold}</strong></span>
          </div>
        </div>

        {/* 5. SUM(กิโลกรัม) */}
        <div className="bg-gradient-to-br from-purple-600 to-indigo-700 text-white p-3.5 rounded-xl shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-purple-100 font-bold uppercase tracking-wider">
              5. SUM(กิโลกรัม)
            </span>
            <span className="text-base">⚖️</span>
          </div>
          <div className="text-xl font-black mt-1">
            {reportData.totalGasWeightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })} <span className="text-xs font-normal">กก.</span>
          </div>
          <div className="text-[10px] text-purple-100 mt-1 flex justify-between">
            <span>ปริมาณก๊าซ: <strong>{(reportData.totalGasWeightKg / 1000).toFixed(2)}</strong> ตัน</span>
          </div>
        </div>

        {/* 6. SUM(ถังเติมเข้า) */}
        <div className="bg-gradient-to-br from-cyan-600 to-teal-700 text-white p-3.5 rounded-xl shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-cyan-100 font-bold uppercase tracking-wider">
              6. SUM(ถังเติม)
            </span>
            <span className="text-base">🏭</span>
          </div>
          <div className="text-xl font-black mt-1">
            {reportData.totalRefillTanks.toLocaleString('th-TH')} <span className="text-xs font-normal">ถัง</span>
          </div>
          <div className="text-[10px] text-cyan-100 mt-1 flex justify-between">
            <span>บิลเติม: <strong>{reportData.totalRefillBills}</strong> บิล</span>
            <span>{reportData.totalRefillWeightKg.toLocaleString()} กก.</span>
          </div>
        </div>

        {/* 7. SUM(เนื้อแก๊สคืน) */}
        <div className="bg-gradient-to-br from-teal-600 to-emerald-800 text-white p-3.5 rounded-xl shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-teal-100 font-bold uppercase tracking-wider">
              7. SUM(ถังคืน/เนื้อ)
            </span>
            <span className="text-base">🔄</span>
          </div>
          <div className="text-xl font-black mt-1">
            {reportData.totalGasReturnKg.toFixed(2)} <span className="text-xs font-normal">กก.</span>
          </div>
          <div className="text-[10px] text-teal-100 mt-1 flex justify-between">
            <span>มูลค่าคืน: <strong>{reportData.totalGasReturnValue.toLocaleString()}</strong> ฿</span>
          </div>
        </div>

        {/* 8. ถังยืมคงค้าง */}
        <div className="bg-gradient-to-br from-slate-700 to-slate-800 text-white p-3.5 rounded-xl shadow-md relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-[11px] text-slate-200 font-bold uppercase tracking-wider">
              8. ถังยืม (คงค้าง)
            </span>
            <span className="text-base">🤝</span>
          </div>
          <div className="text-xl font-black mt-1">
            {reportData.totalBorrowedTanks.toLocaleString('th-TH')} <span className="text-xs font-normal">ถัง</span>
          </div>
          <div className="text-[10px] text-slate-300 mt-1 flex justify-between">
            <span>อยู่กับลูกค้า</span>
            <span className="text-amber-300 font-semibold">ในระบบ</span>
          </div>
        </div>
      </div>

      {/* Applied Date Banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 text-xs text-sky-900 flex justify-between items-center flex-wrap gap-2 shadow-sm">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sky-800">📊 ข้อมูลประจำช่วงวันที่:</span>
          <span className="font-black text-sky-950 bg-sky-100 px-2 py-0.5 rounded border border-sky-300">
            {formatThaiDate(appliedStartDate)} ถึง {formatThaiDate(appliedEndDate)}
          </span>
          <span className="text-sky-700">({reportData.dailyRows.length} วันที่มีบันทึกรายการในระบบ)</span>
        </div>
        <div className="text-[11px] text-slate-500 font-medium">
          ชำระเงิน: สด <strong className="text-emerald-700">{reportData.cashIncome.toLocaleString()}</strong> | โอน <strong className="text-purple-700">{reportData.transferIncome.toLocaleString()}</strong> | เครดิต <strong className="text-orange-700">{reportData.creditIncome.toLocaleString()}</strong> ฿
        </div>
      </div>

      {/* Navigation View Tabs */}
      <div className="flex flex-wrap border-b border-slate-200 bg-white rounded-t-xl p-1 shadow-sm gap-1">
        <button
          onClick={() => setActiveTab('DAILY')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'DAILY'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>📅</span>
          <span>ตารางสรุปแยกรายวัน (Daily Breakdown)</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {reportData.dailyRows.length} วัน
          </span>
        </button>

        <button
          onClick={() => setActiveTab('CUSTOMERS')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'CUSTOMERS'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>👥</span>
          <span>สรุปแยกตามลูกค้า (Customer Sales)</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {reportData.customerSummaries.length} ราย
          </span>
        </button>

        <button
          onClick={() => setActiveTab('PRODUCTS')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'PRODUCTS'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>🛢️</span>
          <span>สรุปตามสินค้าและขนาดถัง (Product & Size)</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {reportData.productSummaries.length} ขนาด
          </span>
        </button>

        <button
          onClick={() => setActiveTab('EXPENSES')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
            activeTab === 'EXPENSES'
              ? 'bg-sky-600 text-white shadow-md'
              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <span>💸</span>
          <span>สรุปรายจ่าย & การเติมแก๊ส (Expenses & Refill)</span>
          <span className="ml-1 text-[10px] px-1.5 py-0.2 rounded-full bg-white/20">
            {reportData.expenseTypeSummaries.length} หมวด
          </span>
        </button>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: DAILY BREAKDOWN TABLE (ตารางสรุปแยกรายวัน พร้อมยอดรวมท้ายตาราง) */}
      {/* ========================================================================= */}
      {activeTab === 'DAILY' && (
        <Card className="overflow-hidden border border-slate-200 p-0 shadow-md rounded-b-xl rounded-t-none">
          <div className="p-3 bg-slate-900 text-white font-bold text-xs flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-orange-400 text-sm">📅</span>
              <span>ตารางสรุปการส่งสินค้า การเติมแก๊ส รายรับ รายจ่าย และกำไรรายวัน</span>
            </div>
            <span className="text-[11px] text-slate-300 font-normal">
              ช่วงวันที่ {formatThaiDate(appliedStartDate)} ถึง {formatThaiDate(appliedEndDate)}
            </span>
          </div>

          {reportData.dailyRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-slate-800 text-white font-semibold">
                    <th className="p-2 text-center w-10 border-r border-slate-700">#</th>
                    <th className="p-2 text-center w-24 border-r border-slate-700">วันที่</th>
                    <th className="p-2 border-r border-slate-700 min-w-[150px]">ส่งที่ไหนบ้าง</th>
                    <th className="p-2 text-center w-14 border-r border-slate-700">บิลส่ง</th>
                    <th className="p-2 text-center w-20 border-r border-slate-700 bg-slate-800/90 text-amber-300">
                      SUM(จำนวน)<br /><span className="text-[10px] font-normal text-amber-200">ถัง/สินค้า</span>
                    </th>
                    <th className="p-2 text-center w-20 border-r border-slate-700 bg-slate-800/90 text-purple-300">
                      SUM(กก.)<br /><span className="text-[10px] font-normal text-purple-200">น้ำหนักแก๊ส</span>
                    </th>
                    <th className="p-2 text-right w-24 border-r border-slate-700 text-emerald-300">
                      SUM(รายรับ)<br /><span className="text-[10px] font-normal text-emerald-200">ยอดขาย (บาท)</span>
                    </th>
                    <th className="p-2 text-center w-16 border-r border-slate-700">
                      ถังเติม<br /><span className="text-[10px] font-normal text-slate-300">บิล/ถัง</span>
                    </th>
                    <th className="p-2 border-r border-slate-700 min-w-[120px]">ขนาดถังเติม</th>
                    <th className="p-2 text-right w-24 border-r border-slate-700 text-rose-300">
                      SUM(รายจ่าย)<br /><span className="text-[10px] font-normal text-rose-200">รวมจ่าย (บาท)</span>
                    </th>
                    <th className="p-2 text-right w-28 border-r border-slate-700 text-sky-300">
                      SUM(กำไรสุทธิ)<br /><span className="text-[10px] font-normal text-sky-200">รายรับ-รายจ่าย</span>
                    </th>
                    <th className="p-2 text-center w-20">
                      คืนเนื้อ<br /><span className="text-[10px] font-normal text-slate-300">(กก.)</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.dailyRows.map((row, idx) => (
                    <tr
                      key={row.dateStr}
                      className={`hover:bg-sky-50/60 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                      }`}
                    >
                      <td className="p-2 text-center text-gray-400 border-r border-slate-100 font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-2 text-center font-bold text-gray-800 border-r border-slate-100">
                        {row.formattedDate}
                      </td>

                      {/* Delivery Destinations */}
                      <td className="p-2 border-r border-slate-100">
                        {row.deliveryLocations.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {row.deliveryLocations.map((loc, lIdx) => (
                              <span
                                key={lIdx}
                                className="inline-block bg-sky-50 text-sky-800 border border-sky-100 px-1.5 py-0.5 rounded text-[10px] font-medium"
                              >
                                {loc}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[11px]">-</span>
                        )}
                      </td>

                      {/* Sales Bills */}
                      <td className="p-2 text-center font-semibold text-gray-700 border-r border-slate-100">
                        {row.salesBillsCount}
                      </td>

                      {/* SUM(จำนวนถังส่ง / สินค้า) */}
                      <td className="p-2 text-center font-bold text-amber-700 bg-amber-50/40 border-r border-slate-100">
                        <span>{row.salesTanksCount}</span>
                        {row.salesAccessoriesCount > 0 && (
                          <span className="text-[10px] text-gray-500 block font-normal">
                            (+{row.salesAccessoriesCount} อุปกรณ์)
                          </span>
                        )}
                      </td>

                      {/* SUM(กิโลกรัม) */}
                      <td className="p-2 text-center font-bold text-purple-700 bg-purple-50/40 border-r border-slate-100">
                        {row.salesTotalWeightKg > 0 ? row.salesTotalWeightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 }) : '-'}
                      </td>

                      {/* SUM(รายรับ) */}
                      <td className="p-2 text-right font-black text-emerald-600 border-r border-slate-100">
                        {row.salesTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Refill Bills & Tanks */}
                      <td className="p-2 text-center font-semibold text-cyan-800 border-r border-slate-100">
                        {row.refillTanksCount > 0 ? (
                          <span>
                            {row.refillBillsCount} บิล / <strong>{row.refillTanksCount}</strong> ถัง
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Refill Sizes */}
                      <td className="p-2 text-[11px] text-slate-700 border-r border-slate-100">
                        {row.refillSizesText}
                      </td>

                      {/* SUM(รายจ่าย) */}
                      <td className="p-2 text-right font-bold text-rose-600 border-r border-slate-100">
                        {row.totalExpensesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>

                      {/* SUM(กำไรสุทธิ) */}
                      <td
                        className={`p-2 text-right font-black border-r border-slate-100 ${
                          row.dailyNetProfit >= 0 ? 'text-sky-700' : 'text-red-600'
                        }`}
                      >
                        {row.dailyNetProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Gas Return Kg */}
                      <td className="p-2 text-center font-semibold text-teal-700">
                        {row.gasReturnKg > 0 ? `${row.gasReturnKg.toFixed(2)} กก.` : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* ========================================================================= */}
                {/* ยอดรวมท้ายตาราง (GRAND TOTAL FOOTER) - ชัดเจน เด่นชัด ตรงตามสเปกทุกประการ */}
                {/* ========================================================================= */}
                <tfoot>
                  <tr className="bg-slate-900 text-white font-extrabold text-xs border-t-2 border-orange-500 shadow-inner">
                    <td colSpan={3} className="p-3 text-center border-r border-slate-700 text-orange-400 uppercase tracking-wide text-sm">
                      🌟 ยอดรวมท้ายตาราง ({reportData.dailyRows.length} วัน)
                    </td>
                    
                    {/* SUM บิลส่ง */}
                    <td className="p-3 text-center border-r border-slate-700 text-slate-200">
                      {reportData.totalSalesBills} บิล
                    </td>

                    {/* SUM(จำนวน) */}
                    <td className="p-3 text-center border-r border-slate-700 text-amber-300 text-sm bg-slate-800">
                      <div>{reportData.totalGasTanksSold.toLocaleString()} ถัง</div>
                      {reportData.totalAccessoriesSold > 0 && (
                        <div className="text-[10px] text-amber-200 font-normal">
                          (+{reportData.totalAccessoriesSold} อุปกรณ์)
                        </div>
                      )}
                    </td>

                    {/* SUM(กิโลกรัม) */}
                    <td className="p-3 text-center border-r border-slate-700 text-purple-300 text-sm bg-slate-800">
                      <div>{reportData.totalGasWeightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })} กก.</div>
                      <div className="text-[10px] text-purple-200 font-normal">
                        ({(reportData.totalGasWeightKg / 1000).toFixed(2)} ตัน)
                      </div>
                    </td>

                    {/* SUM(รายรับ) */}
                    <td className="p-3 text-right border-r border-slate-700 text-emerald-300 text-sm bg-slate-800">
                      {reportData.totalSalesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </td>

                    {/* SUM ถังเติม */}
                    <td className="p-3 text-center border-r border-slate-700 text-cyan-300 text-xs">
                      {reportData.totalRefillBills} บิล / {reportData.totalRefillTanks.toLocaleString()} ถัง
                    </td>

                    {/* ขนาดถัง */}
                    <td className="p-3 text-center border-r border-slate-700 text-[11px] text-slate-300">
                      เติม {reportData.refillSummaries.length} ขนาด
                    </td>

                    {/* SUM(รายจ่าย) */}
                    <td className="p-3 text-right border-r border-slate-700 text-rose-300 text-sm bg-slate-800">
                      {reportData.totalExpensesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </td>

                    {/* SUM(กำไร) */}
                    <td className={`p-3 text-right border-r border-slate-700 text-sm bg-slate-800 ${reportData.netProfit >= 0 ? 'text-sky-300' : 'text-red-400'}`}>
                      <div>{reportData.netProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿</div>
                      <div className="text-[10px] text-emerald-300 font-normal">
                        (กำไรขั้นต้น: {reportData.grossProfit.toLocaleString()} ฿)
                      </div>
                    </td>

                    {/* SUM(เนื้อแก๊สคืน) */}
                    <td className="p-3 text-center text-teal-300 text-xs">
                      {reportData.totalGasReturnKg.toFixed(2)} กก.
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              <span className="text-3xl block mb-2">📭</span>
              ไม่พบข้อมูลการส่งสินค้าหรือเติมแก๊สในช่วงวันที่เลือก
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: CUSTOMER SALES BREAKDOWN TABLE (สรุปแยกตามลูกค้า พร้อมยอดรวมท้ายตาราง) */}
      {/* ========================================================================= */}
      {activeTab === 'CUSTOMERS' && (
        <Card className="overflow-hidden border border-slate-200 p-0 shadow-md rounded-b-xl rounded-t-none">
          <div className="p-3 bg-sky-950 text-white font-bold text-xs flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-sky-400 text-sm">👥</span>
              <span>สรุปยอดส่งแก๊ส ยอดขาย และกำไรจำแนกตามลูกค้า (Customer Sales Summary)</span>
            </div>
            <span className="text-[11px] text-sky-200 font-normal">
              รวมลูกค้า {reportData.customerSummaries.length} รายการ
            </span>
          </div>

          {reportData.customerSummaries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-sky-900 text-white font-semibold">
                    <th className="p-2 text-center w-10 border-r border-sky-800">#</th>
                    <th className="p-2 border-r border-sky-800 min-w-[160px]">ชื่อลูกค้า</th>
                    <th className="p-2 border-r border-sky-800 w-24">สาขา</th>
                    <th className="p-2 text-center w-16 border-r border-sky-800">บิลขาย</th>
                    <th className="p-2 text-center w-24 border-r border-sky-800 text-amber-300">
                      SUM(จำนวนถัง)
                    </th>
                    <th className="p-2 text-center w-20 border-r border-sky-800 text-purple-300">
                      SUM(กก.)
                    </th>
                    <th className="p-2 text-right w-28 border-r border-sky-800 text-emerald-300">
                      SUM(รายรับ)
                    </th>
                    <th className="p-2 text-right w-24 border-r border-sky-800 text-sky-300">
                      SUM(กำไรขั้นต้น)
                    </th>
                    <th className="p-2 text-center w-20 border-r border-sky-800 text-teal-300">
                      คืนเนื้อ (กก.)
                    </th>
                    <th className="p-2 text-right w-24 border-r border-sky-800 text-orange-300">
                      ยอดเครดิต
                    </th>
                    <th className="p-2 text-center w-14">พิมพ์</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.customerSummaries.map((c, idx) => (
                    <tr
                      key={c.customerId}
                      className={`hover:bg-sky-50/60 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                      }`}
                    >
                      <td className="p-2 text-center text-gray-400 border-r border-slate-100 font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-2 font-bold text-gray-900 border-r border-slate-100">
                        {c.customerName}
                      </td>
                      <td className="p-2 text-gray-600 border-r border-slate-100">
                        {c.branch}
                      </td>
                      <td className="p-2 text-center font-semibold text-gray-700 border-r border-slate-100">
                        {c.salesCount}
                      </td>
                      <td className="p-2 text-center font-bold text-amber-700 bg-amber-50/30 border-r border-slate-100">
                        {c.tanksCount} ถัง
                        {c.accessoriesCount > 0 && (
                          <span className="text-[10px] text-gray-500 block font-normal">
                            (+{c.accessoriesCount} อุปกรณ์)
                          </span>
                        )}
                      </td>
                      <td className="p-2 text-center font-bold text-purple-700 bg-purple-50/30 border-r border-slate-100">
                        {c.totalWeightKg > 0 ? c.totalWeightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 }) : '-'}
                      </td>
                      <td className="p-2 text-right font-black text-emerald-600 border-r border-slate-100">
                        {c.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right font-bold text-sky-700 border-r border-slate-100">
                        {c.grossProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center font-semibold text-teal-700 border-r border-slate-100">
                        {c.gasReturnKg > 0 ? `${c.gasReturnKg.toFixed(2)}` : '-'}
                      </td>
                      <td className="p-2 text-right font-bold text-orange-600 border-r border-slate-100">
                        {c.creditAmount > 0 ? c.creditAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 }) : '-'}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handlePrintCustomerStatement(c.customerId, c.customerName)}
                          className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                          title="พิมพ์ใบสรุปยอดส่งลูกค้ารายนี้ (Customer Statement)"
                        >
                          <PrinterIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* ยอดรวมท้ายตารางลูกค้า */}
                <tfoot>
                  <tr className="bg-sky-950 text-white font-extrabold text-xs border-t-2 border-sky-400">
                    <td colSpan={3} className="p-3 text-center border-r border-sky-900 text-sky-300 text-sm">
                      🌟 รวมทั้งสิ้น ({reportData.customerSummaries.length} ร้านค้า/ลูกค้า)
                    </td>
                    <td className="p-3 text-center border-r border-sky-900">
                      {reportData.totalSalesBills} บิล
                    </td>
                    <td className="p-3 text-center border-r border-sky-900 text-amber-300 text-sm bg-sky-900/60">
                      {reportData.totalGasTanksSold.toLocaleString()} ถัง
                    </td>
                    <td className="p-3 text-center border-r border-sky-900 text-purple-300 text-sm bg-sky-900/60">
                      {reportData.totalGasWeightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })} กก.
                    </td>
                    <td className="p-3 text-right border-r border-sky-900 text-emerald-300 text-sm bg-sky-900/60">
                      {reportData.totalSalesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </td>
                    <td className="p-3 text-right border-r border-sky-900 text-sky-300 text-sm bg-sky-900/60">
                      {reportData.grossProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </td>
                    <td className="p-3 text-center border-r border-sky-900 text-teal-300">
                      {reportData.totalGasReturnKg.toFixed(2)} กก.
                    </td>
                    <td className="p-3 text-right border-r border-sky-900 text-orange-300">
                      {reportData.creditIncome.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </td>
                    <td className="p-3 text-center text-slate-400">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              ไม่พบข้อมูลลูกค้าในช่วงวันที่เลือก
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: PRODUCT & SIZE SUMMARY (สรุปตามสินค้าและขนาดถัง พร้อมยอดรวมท้ายตาราง) */}
      {/* ========================================================================= */}
      {activeTab === 'PRODUCTS' && (
        <Card className="overflow-hidden border border-slate-200 p-0 shadow-md rounded-b-xl rounded-t-none">
          <div className="p-3 bg-amber-950 text-white font-bold text-xs flex justify-between items-center">
            <div className="flex items-center gap-2">
              <span className="text-amber-400 text-sm">🛢️</span>
              <span>สรุปยอดขายจำแนกตามสินค้าและขนาดถัง (Product & Tank Size Summary)</span>
            </div>
            <span className="text-[11px] text-amber-200 font-normal">
              รวม {reportData.productSummaries.length} รายการสินค้า
            </span>
          </div>

          {reportData.productSummaries.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-amber-900 text-white font-semibold">
                    <th className="p-2 text-center w-10 border-r border-amber-800">#</th>
                    <th className="p-2 border-r border-amber-800 min-w-[160px]">รายการสินค้า / ขนาดถัง</th>
                    <th className="p-2 text-center border-r border-amber-800 w-24">ประเภท</th>
                    <th className="p-2 text-center w-24 border-r border-amber-800 text-amber-300">
                      SUM(จำนวนขาย)
                    </th>
                    <th className="p-2 text-center w-24 border-r border-amber-800 text-purple-300">
                      SUM(กิโลกรัม)
                    </th>
                    <th className="p-2 text-right w-28 border-r border-amber-800 text-emerald-300">
                      SUM(ยอดขายรวม)
                    </th>
                    <th className="p-2 text-right w-28 border-r border-amber-800 text-sky-300">
                      SUM(กำไรขั้นต้น)
                    </th>
                    <th className="p-2 text-center w-20 border-r border-amber-800 text-lime-300">
                      สด/โอน
                    </th>
                    <th className="p-2 text-center w-20 border-r border-amber-800 text-orange-300">
                      เครดิต
                    </th>
                    <th className="p-2 text-center w-20 text-cyan-300">
                      บิลภาษี
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.productSummaries.map((p, idx) => (
                    <tr
                      key={p.key}
                      className={`hover:bg-amber-50/40 transition-colors ${
                        idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/70'
                      }`}
                    >
                      <td className="p-2 text-center text-gray-400 border-r border-slate-100 font-mono">
                        {idx + 1}
                      </td>
                      <td className="p-2 font-bold text-gray-900 border-r border-slate-100">
                        {p.name}
                      </td>
                      <td className="p-2 text-center border-r border-slate-100">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                            p.itemType === 'ACCESSORY'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-orange-100 text-orange-800'
                          }`}
                        >
                          {p.itemType === 'ACCESSORY' ? 'เตา/อุปกรณ์' : 'ก๊าซหุงต้ม'}
                        </span>
                      </td>
                      <td className="p-2 text-center font-black text-amber-700 bg-amber-50/30 border-r border-slate-100">
                        {p.quantity} {p.itemType === 'ACCESSORY' ? 'ชิ้น' : 'ถัง'}
                      </td>
                      <td className="p-2 text-center font-bold text-purple-700 bg-purple-50/30 border-r border-slate-100">
                        {p.weightKg > 0 ? `${p.weightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })} กก.` : '-'}
                      </td>
                      <td className="p-2 text-right font-black text-emerald-600 border-r border-slate-100">
                        {p.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-right font-bold text-sky-700 border-r border-slate-100">
                        {p.grossProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-2 text-center text-gray-700 border-r border-slate-100 font-semibold">
                        {p.cashTransferQty}
                      </td>
                      <td className="p-2 text-center text-orange-600 border-r border-slate-100 font-semibold">
                        {p.creditQty}
                      </td>
                      <td className="p-2 text-center text-cyan-700 font-semibold">
                        {p.taxInvoiceQty}
                      </td>
                    </tr>
                  ))}
                </tbody>

                {/* ยอดรวมท้ายตารางสินค้า */}
                <tfoot>
                  <tr className="bg-amber-950 text-white font-extrabold text-xs border-t-2 border-amber-400">
                    <td colSpan={3} className="p-3 text-center border-r border-amber-900 text-amber-300 text-sm">
                      🌟 รวมยอดสินค้าทั้งหมด ({reportData.productSummaries.length} รายการ)
                    </td>
                    <td className="p-3 text-center border-r border-amber-900 text-amber-300 text-sm bg-amber-900/60">
                      {reportData.totalItemsSold.toLocaleString()} ชิ้น/ถัง
                    </td>
                    <td className="p-3 text-center border-r border-amber-900 text-purple-300 text-sm bg-amber-900/60">
                      {reportData.totalGasWeightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })} กก.
                    </td>
                    <td className="p-3 text-right border-r border-amber-900 text-emerald-300 text-sm bg-amber-900/60">
                      {reportData.totalSalesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </td>
                    <td className="p-3 text-right border-r border-amber-900 text-sky-300 text-sm bg-amber-900/60">
                      {reportData.grossProfit.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </td>
                    <td colSpan={3} className="p-3 text-center text-slate-400">
                      -
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center text-gray-400">
              ไม่พบข้อมูลสินค้าในช่วงวันที่เลือก
            </div>
          )}
        </Card>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: EXPENSES & REFILL SUMMARY (สรุปรายจ่ายและการเติมแก๊สเข้าโรงบรรจุ) */}
      {/* ========================================================================= */}
      {activeTab === 'EXPENSES' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Expense Categories Breakdown */}
          <Card className="p-0 overflow-hidden border border-slate-200 shadow-md">
            <div className="p-3 bg-rose-950 text-white font-bold text-xs flex justify-between items-center">
              <span>สรุปจำแนกตามหมวดหมู่รายจ่าย (Expense Categories)</span>
              <span className="text-rose-200 font-normal">
                {reportData.expenseTypeSummaries.length} หมวด
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-rose-900 text-white font-semibold">
                    <th className="p-2 text-center w-10 border-r border-rose-800">#</th>
                    <th className="p-2 border-r border-rose-800">หมวดหมู่รายจ่าย</th>
                    <th className="p-2 text-center w-16 border-r border-rose-800">รายการ</th>
                    <th className="p-2 text-right w-28 border-r border-rose-800 text-rose-200">SUM(รายจ่าย)</th>
                    <th className="p-2 text-center w-16 text-rose-200">สัดส่วน</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.expenseTypeSummaries.map((et, idx) => {
                    const percent = reportData.totalExpensesAmount > 0
                      ? ((et.totalAmount / reportData.totalExpensesAmount) * 100).toFixed(1)
                      : '0';
                    return (
                      <tr key={et.type} className={idx % 2 === 0 ? 'bg-white' : 'bg-rose-50/20'}>
                        <td className="p-2 text-center text-gray-400 border-r border-slate-100 font-mono">{idx + 1}</td>
                        <td className="p-2 font-bold text-gray-900 border-r border-slate-100">{et.type}</td>
                        <td className="p-2 text-center font-semibold text-gray-700 border-r border-slate-100">{et.count}</td>
                        <td className="p-2 text-right font-black text-rose-700 border-r border-slate-100">
                          {et.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-center font-semibold text-slate-600">{percent}%</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-rose-950 text-white font-bold text-xs border-t-2 border-rose-400">
                    <td colSpan={2} className="p-2.5 text-center border-r border-rose-900 text-rose-300">
                      รวมรายจ่ายทั้งหมด
                    </td>
                    <td className="p-2.5 text-center border-r border-rose-900">
                      {reportData.totalExpenseRecords}
                    </td>
                    <td className="p-2.5 text-right border-r border-rose-900 text-rose-300 text-sm">
                      {reportData.totalExpensesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </td>
                    <td className="p-2.5 text-center text-rose-300">100%</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>

          {/* Plant Refill Breakdown */}
          <Card className="p-0 overflow-hidden border border-slate-200 shadow-md">
            <div className="p-3 bg-cyan-950 text-white font-bold text-xs flex justify-between items-center">
              <span>สรุปการเติมแก๊สเข้าโรงบรรจุ (Plant Refill Summary)</span>
              <span className="text-cyan-200 font-normal">
                {reportData.refillSummaries.length} ขนาดถัง
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead>
                  <tr className="bg-cyan-900 text-white font-semibold">
                    <th className="p-2 text-center w-10 border-r border-cyan-800">#</th>
                    <th className="p-2 border-r border-cyan-800">ยี่ห้อและขนาดถัง</th>
                    <th className="p-2 text-center w-24 border-r border-cyan-800 text-cyan-200">SUM(ถังเติม)</th>
                    <th className="p-2 text-center w-24 border-r border-cyan-800 text-purple-200">SUM(กิโลกรัม)</th>
                    <th className="p-2 text-center w-16 text-cyan-200">สด/เครดิต</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {reportData.refillSummaries.map((rf, idx) => (
                    <tr key={rf.key} className={idx % 2 === 0 ? 'bg-white' : 'bg-cyan-50/20'}>
                      <td className="p-2 text-center text-gray-400 border-r border-slate-100 font-mono">{idx + 1}</td>
                      <td className="p-2 font-bold text-gray-900 border-r border-slate-100">{rf.key}</td>
                      <td className="p-2 text-center font-black text-cyan-800 border-r border-slate-100">
                        {rf.quantity} ถัง
                      </td>
                      <td className="p-2 text-center font-bold text-purple-700 border-r border-slate-100">
                        {rf.weightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })} กก.
                      </td>
                      <td className="p-2 text-center text-gray-600 text-[11px]">
                        สด {rf.cashQty} / ตั้ง {rf.creditQty}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-cyan-950 text-white font-bold text-xs border-t-2 border-cyan-400">
                    <td colSpan={2} className="p-2.5 text-center border-r border-cyan-900 text-cyan-300">
                      รวมถังเติมทั้งหมด
                    </td>
                    <td className="p-2.5 text-center border-r border-cyan-900 text-cyan-300 text-sm">
                      {reportData.totalRefillTanks.toLocaleString()} ถัง
                    </td>
                    <td className="p-2.5 text-center border-r border-cyan-900 text-purple-300 text-sm">
                      {reportData.totalRefillWeightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })} กก.
                    </td>
                    <td className="p-2.5 text-center text-cyan-300">-</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </Card>
        </div>
      )}

      {/* Fullscreen Printable Monthly Report Modal */}
      {showMonthlyReportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-center items-start overflow-y-auto p-2 sm:p-6 no-print">
          <MonthlyReportA4
            selectedYear={new Date(appliedStartDate).getFullYear()}
            selectedMonth={new Date(appliedStartDate).getMonth()}
            customStartDate={appliedStartDate}
            customEndDate={appliedEndDate}
            onClose={() => setShowMonthlyReportModal(false)}
          />
        </div>
      )}

      {/* Fullscreen Printable Customer Statement Modal */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-center items-start overflow-y-auto p-2 sm:p-6 no-print">
          <CustomerStatementA4
            selectedCustomer={statementCustomer}
            selectedYear={new Date(appliedStartDate).getFullYear()}
            selectedMonth={new Date(appliedStartDate).getMonth()}
            onClose={() => setStatementCustomer(null)}
          />
        </div>
      )}
    </div>
  );
};

export default Reports;
