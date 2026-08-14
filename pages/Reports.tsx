import React, { useState, useMemo } from 'react';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import { formatDateForInput } from '../lib/utils';
import ChartBarIcon from '../components/icons/ChartBarIcon';
import PrinterIcon from '../components/icons/PrinterIcon';

interface DailyReportRow {
  dateStr: string; // YYYY-MM-DD
  formattedDate: string; // e.g. 13/08/2569
  // Sales
  deliveryLocations: string[]; // List of customer names and branches
  salesBillsCount: number;
  salesTanksCount: number;
  salesTotalAmount: number;
  // Refill Expenses
  refillBillsCount: number;
  refillTanksCount: number;
  refillSizesText: string;
  refillTotalAmount: number;
  // Other Expenses
  otherExpensesAmount: number;
  totalExpensesAmount: number;
  // Net
  dailyNetTotal: number;
}

const Reports: React.FC = () => {
  const { sales, expenses, customers, companyInfo } = useAppContext();

  // Initial date state: Start of current month to Today
  const today = new Date();
  const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

  const [inputStartDate, setInputStartDate] = useState<string>(formatDateForInput(firstDayOfMonth));
  const [inputEndDate, setInputEndDate] = useState<string>(formatDateForInput(today));

  // Applied date range state
  const [appliedStartDate, setAppliedStartDate] = useState<string>(formatDateForInput(firstDayOfMonth));
  const [appliedEndDate, setAppliedEndDate] = useState<string>(formatDateForInput(today));

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

  // Helper function to extract YYYY-MM-DD from any date string
  const normalizeDate = (dStr: string) => {
    if (!dStr) return '';
    return dStr.split('T')[0];
  };

  // Process Daily Aggregation based on real DB sales & expenses within applied range
  const { dailyRows, grandTotals } = useMemo(() => {
    const filteredSales = sales.filter(s => {
      const dateOnly = normalizeDate(s.date);
      return dateOnly >= appliedStartDate && dateOnly <= appliedEndDate;
    });

    const filteredExpenses = expenses.filter(e => {
      const dateOnly = normalizeDate(e.date);
      return dateOnly >= appliedStartDate && dateOnly <= appliedEndDate;
    });

    // Collect all distinct dates in range
    const dateSet = new Set<string>();
    filteredSales.forEach(s => dateSet.add(normalizeDate(s.date)));
    filteredExpenses.forEach(e => dateSet.add(normalizeDate(e.date)));

    // Sort dates descending (latest day first)
    const sortedDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

    let totalSalesBills = 0;
    let totalSalesTanks = 0;
    let totalSalesAmount = 0;
    let totalRefillBills = 0;
    let totalRefillTanks = 0;
    let totalRefillAmount = 0;
    let totalOtherExpenses = 0;
    let totalExpensesAmount = 0;

    const rows: DailyReportRow[] = sortedDates.map(dateStr => {
      const daySales = filteredSales.filter(s => normalizeDate(s.date) === dateStr);
      const dayExpenses = filteredExpenses.filter(e => normalizeDate(e.date) === dateStr);

      // 1. Sales metrics
      const locationsSet = new Set<string>();
      let daySalesTanks = 0;
      let daySalesTotal = 0;

      daySales.forEach(s => {
        const cust = customers.find(c => c.id === s.customer_id);
        const nameText = cust ? `${cust.name}${cust.branch ? ` (${cust.branch})` : ''}` : 'ลูกค้าทั่วไป';
        locationsSet.add(nameText);

        daySalesTotal += (s.total_amount || 0);

        if (s.items && s.items.length > 0) {
          s.items.forEach(item => {
            if (item.item_type !== 'ACCESSORY') {
              daySalesTanks += (item.quantity || 0);
            }
          });
        } else {
          daySalesTanks += (s.quantity || 0);
        }
      });

      // 2. Refill Expenses metrics
      const dayRefillExpenses = dayExpenses.filter(e => 
        e.type === 'ค่าบรรจุก๊าซ' || (e.refill_details && e.refill_details.length > 0)
      );

      let dayRefillTanks = 0;
      let dayRefillTotal = 0;
      const sizeCountMap: { [key: string]: number } = {};

      dayRefillExpenses.forEach(e => {
        dayRefillTotal += (e.amount || 0);

        if (e.refill_details && e.refill_details.length > 0) {
          e.refill_details.forEach(item => {
            const qty = item.quantity || 0;
            dayRefillTanks += qty;
            const sizeLabel = item.size || 'ไม่ระบุขนาด';
            sizeCountMap[sizeLabel] = (sizeCountMap[sizeLabel] || 0) + qty;
          });
        } else if (e.refill_quantity) {
          const qty = e.refill_quantity;
          dayRefillTanks += qty;
          const sizeLabel = e.refill_tank_size || 'ไม่ระบุขนาด';
          sizeCountMap[sizeLabel] = (sizeCountMap[sizeLabel] || 0) + qty;
        }
      });

      const refillSizesText = Object.entries(sizeCountMap)
        .map(([size, count]) => `${size}: ${count} ถัง`)
        .join(', ') || '-';

      // 3. Other Expenses
      const dayOtherExpensesList = dayExpenses.filter(e => 
        e.type !== 'ค่าบรรจุก๊าซ' && (!e.refill_details || e.refill_details.length === 0)
      );
      const dayOtherTotal = dayOtherExpensesList.reduce((sum, e) => sum + (e.amount || 0), 0);
      const dayAllExpensesTotal = dayRefillTotal + dayOtherTotal;

      // Net total = Sales Income - Total Expenses
      const dailyNet = daySalesTotal - dayAllExpensesTotal;

      // Accumulate Grand Totals
      totalSalesBills += daySales.length;
      totalSalesTanks += daySalesTanks;
      totalSalesAmount += daySalesTotal;
      totalRefillBills += dayRefillExpenses.length;
      totalRefillTanks += dayRefillTanks;
      totalRefillAmount += dayRefillTotal;
      totalOtherExpenses += dayOtherTotal;
      totalExpensesAmount += dayAllExpensesTotal;

      // Format Date to Thai locale string DD/MM/YYYY
      const dateParts = dateStr.split('-');
      const formattedDate = dateParts.length === 3 
        ? `${dateParts[2]}/${dateParts[1]}/${parseInt(dateParts[0]) + 543}`
        : dateStr;

      return {
        dateStr,
        formattedDate,
        deliveryLocations: Array.from(locationsSet),
        salesBillsCount: daySales.length,
        salesTanksCount: daySalesTanks,
        salesTotalAmount: daySalesTotal,
        refillBillsCount: dayRefillExpenses.length,
        refillTanksCount: dayRefillTanks,
        refillSizesText,
        refillTotalAmount: dayRefillTotal,
        otherExpensesAmount: dayOtherTotal,
        totalExpensesAmount: dayAllExpensesTotal,
        dailyNetTotal: dailyNet,
      };
    });

    return {
      dailyRows: rows,
      grandTotals: {
        totalDays: rows.length,
        totalSalesBills,
        totalSalesTanks,
        totalSalesAmount,
        totalRefillBills,
        totalRefillTanks,
        totalRefillAmount,
        totalOtherExpenses,
        totalExpensesAmount,
        grandNetTotal: totalSalesAmount - totalExpensesAmount,
      }
    };
  }, [sales, expenses, customers, appliedStartDate, appliedEndDate]);

  // Export to Excel / CSV function with UTF-8 BOM for perfect Thai language rendering
  const exportToExcelCSV = () => {
    if (dailyRows.length === 0) {
      alert("ไม่มีข้อมูลในช่วงวันที่เลือก เพื่อทำการส่งออก");
      return;
    }

    let csv = '';

    // Company Header
    csv += `"${companyInfo.name || 'ร้านก๊าซหุงต้ม'}"\n`;
    csv += `"รายงานสรุปการส่งสินค้าและการเติมแก๊สประจำวัน"\n`;
    csv += `"ช่วงวันที่: ${appliedStartDate} ถึง ${appliedEndDate}"\n`;
    csv += `"วันที่พิมพ์รายงาน: ${new Date().toLocaleDateString('th-TH')} ${new Date().toLocaleTimeString('th-TH')}"\n\n`;

    // Grand Summary Table
    csv += `"--- สรุปรวมช่วงวันที่เลือก ---"\n`;
    csv += `"ยอดรวมขายสินค้า (บาท)","จำนวนบิลส่งรวม","จำนวนถังส่งรวม","ยอดรวมจ่ายเติมแก๊ส (บาท)","จำนวนบิลเติมรวม","จำนวนถังเติมรวม","ยอดรายจ่ายอื่นๆ (บาท)","ยอดรายจ่ายรวมทั้งหมด (บาท)","ยอดเงินรวมสุทธิ (บาท)"\n`;
    csv += `"${grandTotals.totalSalesAmount.toFixed(2)}","${grandTotals.totalSalesBills}","${grandTotals.totalSalesTanks}","${grandTotals.totalRefillAmount.toFixed(2)}","${grandTotals.totalRefillBills}","${grandTotals.totalRefillTanks}","${grandTotals.totalOtherExpenses.toFixed(2)}","${grandTotals.totalExpensesAmount.toFixed(2)}","${grandTotals.grandNetTotal.toFixed(2)}"\n\n`;

    // Daily Breakdown Table
    csv += `"--- รายละเอียดแยกรายวัน ---"\n`;
    csv += `"ลำดับ","วันที่","ส่งที่ไหนบ้าง","จำนวนบิลส่ง","จำนวนถังส่ง (ถัง)","ยอดเงินส่งสินค้า (บาท)","จำนวนบิลเติม","จำนวนถังเติม (ถัง)","ขนาดถังที่เติม","ยอดเงินเติมแก๊ส (บาท)","รายจ่ายอื่นๆ (บาท)","รายจ่ายรวม (บาท)","ยอดเงินสุทธิประจำวัน (บาท)"\n`;

    dailyRows.forEach((row, index) => {
      const locationsStr = row.deliveryLocations.join(' | ') || 'ไม่มีรายการส่ง';
      const safeSizes = row.refillSizesText.replace(/"/g, '""');

      csv += `"${index + 1}",`;
      csv += `"${row.formattedDate}",`;
      csv += `"${locationsStr.replace(/"/g, '""')}",`;
      csv += `"${row.salesBillsCount}",`;
      csv += `"${row.salesTanksCount}",`;
      csv += `"${row.salesTotalAmount.toFixed(2)}",`;
      csv += `"${row.refillBillsCount}",`;
      csv += `"${row.refillTanksCount}",`;
      csv += `"${safeSizes}",`;
      csv += `"${row.refillTotalAmount.toFixed(2)}",`;
      csv += `"${row.otherExpensesAmount.toFixed(2)}",`;
      csv += `"${row.totalExpensesAmount.toFixed(2)}",`;
      csv += `"${row.dailyNetTotal.toFixed(2)}"\n`;
    });

    // Append Total Row
    csv += `"รวม","ช่วง ${appliedStartDate} ถึง ${appliedEndDate}","${dailyRows.length} วัน","${grandTotals.totalSalesBills}","${grandTotals.totalSalesTanks}","${grandTotals.totalSalesAmount.toFixed(2)}","${grandTotals.totalRefillBills}","${grandTotals.totalRefillTanks}","-","${grandTotals.totalRefillAmount.toFixed(2)}","${grandTotals.totalOtherExpenses.toFixed(2)}","${grandTotals.totalExpensesAmount.toFixed(2)}","${grandTotals.grandNetTotal.toFixed(2)}"\n\n`;

    // Trigger File Download
    const bom = '\uFEFF'; // UTF-8 BOM so Excel opens Thai language natively without garbage symbols
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `รายงานส่งสินค้าและเติมแก๊ส_${appliedStartDate}_ถึง_${appliedEndDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-5">
      {/* Page Title */}
      <div className="flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2">
          <ChartBarIcon className="h-7 w-7 text-sky-600" />
          <h1 className="text-xl font-bold text-gray-800">รายงานการส่งสินค้าและเติมแก๊ส</h1>
        </div>
        <div className="text-xs text-gray-500 font-medium">
          ดึงข้อมูลจากฐานข้อมูลจริง 100%
        </div>
      </div>

      {/* Date Filter & Control Bar */}
      <Card className="bg-white border border-slate-200 shadow-sm p-4">
        <form onSubmit={handleSearch} className="space-y-3">
          <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5 border-b pb-2">
            <span>📅</span>
            <span>กรองข้อมูลตามช่วงวันที่ (Date Filter)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                วันที่เริ่มต้น (Start Date)
              </label>
              <input
                type="date"
                value={inputStartDate}
                onChange={(e) => setInputStartDate(e.target.value)}
                className="w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 font-semibold bg-slate-50"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                วันที่สิ้นสุด (End Date)
              </label>
              <input
                type="date"
                value={inputEndDate}
                onChange={(e) => setInputEndDate(e.target.value)}
                className="w-full p-2 text-xs border rounded-lg focus:ring-2 focus:ring-sky-500 font-semibold bg-slate-50"
                required
              />
            </div>
          </div>

          <div className="flex flex-wrap justify-between items-center gap-2 pt-2 border-t">
            <div className="flex gap-2">
              <button
                type="submit"
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center gap-1.5"
              >
                <span>🔍</span>
                <span>ค้นหา</span>
              </button>
              <button
                type="button"
                onClick={handleReset}
                className="px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-lg transition-colors border border-gray-300"
              >
                🔄 รีเซ็ต
              </button>
            </div>

            <button
              type="button"
              onClick={exportToExcelCSV}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center gap-1.5"
              title="ดาวน์โหลดไฟล์ Excel (.csv) สำหรับเปิดในโปรแกรม Microsoft Excel"
            >
              <span className="text-sm">📊</span>
              <span>Export Excel</span>
            </button>
          </div>
        </form>
      </Card>

      {/* Applied Date Range Info Banner */}
      <div className="bg-sky-50 border border-sky-200 rounded-lg p-3 text-xs text-sky-800 flex justify-between items-center flex-wrap gap-2">
        <div>
          <span className="font-bold">ข้อมูลประจำช่วงวันที่: </span>
          <span className="font-semibold underline">
            {appliedStartDate} ถึง {appliedEndDate}
          </span>
          <span className="ml-2 text-sky-600">({dailyRows.length} วันที่มีบันทึกรายการ)</span>
        </div>
      </div>

      {/* Grand Totals Summary Overview */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-emerald-500 to-green-600 text-white p-3 rounded-xl shadow-md">
          <div className="text-[11px] text-emerald-100 font-medium">ยอดส่งสินค้า (ขาย)</div>
          <div className="text-lg font-bold mt-1">
            {grandTotals.totalSalesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
          </div>
          <div className="text-[10px] text-emerald-100 mt-0.5">
            {grandTotals.totalSalesBills} บิล | {grandTotals.totalSalesTanks} ถัง
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500 to-orange-600 text-white p-3 rounded-xl shadow-md">
          <div className="text-[11px] text-amber-100 font-medium">ยอดเติมแก๊ส (โรงบรรจุ)</div>
          <div className="text-lg font-bold mt-1">
            {grandTotals.totalRefillAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
          </div>
          <div className="text-[10px] text-amber-100 mt-0.5">
            {grandTotals.totalRefillBills} บิล | {grandTotals.totalRefillTanks} ถัง
          </div>
        </div>

        <div className="bg-gradient-to-br from-slate-600 to-slate-700 text-white p-3 rounded-xl shadow-md">
          <div className="text-[11px] text-slate-200 font-medium">รายจ่ายรวมทั้งหมด</div>
          <div className="text-lg font-bold mt-1">
            {grandTotals.totalExpensesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
          </div>
          <div className="text-[10px] text-slate-300 mt-0.5">
            เติมแก๊ส + อื่นๆ ({grandTotals.totalOtherExpenses.toLocaleString()} ฿)
          </div>
        </div>

        <div className={`p-3 rounded-xl shadow-md text-white ${grandTotals.grandNetTotal >= 0 ? 'bg-gradient-to-br from-sky-600 to-blue-700' : 'bg-gradient-to-br from-red-500 to-rose-700'}`}>
          <div className="text-[11px] text-sky-100 font-medium">ยอดคงเหลือสุทธิ (Net)</div>
          <div className="text-lg font-bold mt-1">
            {grandTotals.grandNetTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
          </div>
          <div className="text-[10px] text-sky-100 mt-0.5">
            {grandTotals.grandNetTotal >= 0 ? 'กำไรส่วนต่าง' : 'ขาดทุนส่วนต่าง'}
          </div>
        </div>
      </div>

      {/* Main Table View for Desktop / Large Screens */}
      <Card className="overflow-hidden border border-slate-200 p-0 shadow-sm">
        <div className="p-3 bg-slate-100 border-b border-slate-200 font-bold text-xs text-gray-700 flex justify-between items-center">
          <span>ตารางสรุปการส่งสินค้าและเติมแก๊สรายวัน</span>
          <span className="text-[11px] text-gray-500 font-normal">เรียงจากวันที่ล่าสุด</span>
        </div>

        {dailyRows.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-800 text-white font-semibold">
                  <th className="p-2 text-center w-10 border-r border-slate-700">ลำดับ</th>
                  <th className="p-2 text-center w-24 border-r border-slate-700">วันที่</th>
                  <th className="p-2 border-r border-slate-700 min-w-[140px]">ส่งที่ไหนบ้าง</th>
                  <th className="p-2 text-center w-16 border-r border-slate-700">บิลส่ง</th>
                  <th className="p-2 text-center w-16 border-r border-slate-700">ถังส่ง</th>
                  <th className="p-2 text-right w-24 border-r border-slate-700">ยอดส่งสินค้า</th>
                  <th className="p-2 text-center w-16 border-r border-slate-700">บิลเติม</th>
                  <th className="p-2 text-center w-16 border-r border-slate-700">ถังเติม</th>
                  <th className="p-2 border-r border-slate-700 min-w-[130px]">ขนาดถังที่เติม</th>
                  <th className="p-2 text-right w-24 border-r border-slate-700">ยอดเติมแก๊ส</th>
                  <th className="p-2 text-right w-28">ยอดสุทธิประจำวัน</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {dailyRows.map((row, idx) => (
                  <tr key={row.dateStr} className={`hover:bg-sky-50/50 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}`}>
                    <td className="p-2 text-center text-gray-400 border-r border-slate-100">{idx + 1}</td>
                    <td className="p-2 text-center font-bold text-gray-800 border-r border-slate-100">{row.formattedDate}</td>
                    
                    {/* Delivery Destinations */}
                    <td className="p-2 border-r border-slate-100">
                      {row.deliveryLocations.length > 0 ? (
                        <div className="space-y-0.5">
                          {row.deliveryLocations.map((loc, lIdx) => (
                            <span key={lIdx} className="inline-block bg-sky-50 text-sky-800 border border-sky-100 px-1.5 py-0.5 rounded text-[10px] font-semibold mr-1 mb-0.5">
                              {loc}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-[10px]">-</span>
                      )}
                    </td>

                    {/* Sales Metrics */}
                    <td className="p-2 text-center font-semibold text-gray-700 border-r border-slate-100">{row.salesBillsCount}</td>
                    <td className="p-2 text-center font-bold text-sky-700 border-r border-slate-100">{row.salesTanksCount}</td>
                    <td className="p-2 text-right font-bold text-emerald-600 border-r border-slate-100">
                      {row.salesTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Refill Expenses Metrics */}
                    <td className="p-2 text-center font-semibold text-gray-700 border-r border-slate-100">{row.refillBillsCount}</td>
                    <td className="p-2 text-center font-bold text-amber-700 border-r border-slate-100">{row.refillTanksCount}</td>
                    <td className="p-2 text-[11px] text-amber-900 border-r border-slate-100">
                      {row.refillSizesText}
                    </td>
                    <td className="p-2 text-right font-bold text-amber-700 border-r border-slate-100">
                      {row.refillTotalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                    </td>

                    {/* Daily Net Balance */}
                    <td className={`p-2 text-right font-bold ${row.dailyNetTotal >= 0 ? 'text-sky-700' : 'text-red-600'}`}>
                      {row.dailyNetTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                    </td>
                  </tr>
                ))}
              </tbody>

              {/* Table Footer / Summary Row */}
              <tfoot>
                <tr className="bg-slate-800 text-white font-bold text-xs">
                  <td colSpan={3} className="p-2.5 text-center border-r border-slate-700">
                    รวมทั้งหมด ({dailyRows.length} วัน)
                  </td>
                  <td className="p-2 text-center border-r border-slate-700">{grandTotals.totalSalesBills}</td>
                  <td className="p-2 text-center border-r border-slate-700 text-sky-300">{grandTotals.totalSalesTanks}</td>
                  <td className="p-2 text-right border-r border-slate-700 text-emerald-300">
                    {grandTotals.totalSalesAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className="p-2 text-center border-r border-slate-700">{grandTotals.totalRefillBills}</td>
                  <td className="p-2 text-center border-r border-slate-700 text-amber-300">{grandTotals.totalRefillTanks}</td>
                  <td className="p-2 text-center border-r border-slate-700 text-[10px] text-slate-300">-</td>
                  <td className="p-2 text-right border-r border-slate-700 text-amber-300">
                    {grandTotals.totalRefillAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })}
                  </td>
                  <td className={`p-2 text-right ${grandTotals.grandNetTotal >= 0 ? 'text-emerald-300' : 'text-red-300'}`}>
                    {grandTotals.grandNetTotal.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        ) : (
          <div className="p-8 text-center text-gray-400">
            ไม่พบข้อมูลการส่งสินค้าหรือเติมแก๊สในช่วงวันที่เลือก
          </div>
        )}
      </Card>

      {/* Mobile Card Layout for clear mobile view */}
      <div className="block sm:hidden space-y-3">
        <h3 className="font-bold text-xs text-gray-700">รายการรายวัน (มุมมองมือถือ):</h3>
        {dailyRows.length > 0 ? (
          dailyRows.map((row) => (
            <Card key={row.dateStr} className="p-3 border border-slate-200 shadow-sm space-y-2">
              <div className="flex justify-between items-center border-b pb-2">
                <span className="font-bold text-sm text-sky-800">📅 {row.formattedDate}</span>
                <span className={`text-sm font-bold ${row.dailyNetTotal >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  สุทธิ: {row.dailyNetTotal.toLocaleString('th-TH')} ฿
                </span>
              </div>

              {/* Delivery Locations */}
              <div>
                <span className="text-[10px] font-bold text-gray-500 uppercase block">ส่งที่ไหนบ้าง:</span>
                {row.deliveryLocations.length > 0 ? (
                  <div className="flex flex-wrap gap-1 mt-0.5">
                    {row.deliveryLocations.map((loc, lIdx) => (
                      <span key={lIdx} className="bg-sky-50 text-sky-800 border border-sky-100 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        {loc}
                      </span>
                    ))}
                  </div>
                ) : (
                  <span className="text-xs text-gray-400">ไม่มีรายการส่ง</span>
                )}
              </div>

              {/* Grid Metrics */}
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-2 rounded border text-xs">
                <div>
                  <span className="text-gray-500 block text-[10px]">ส่งสินค้า (บิล/ถัง):</span>
                  <span className="font-bold text-gray-800">{row.salesBillsCount} บิล | {row.salesTanksCount} ถัง</span>
                  <div className="font-bold text-emerald-600">{row.salesTotalAmount.toLocaleString()} ฿</div>
                </div>

                <div>
                  <span className="text-gray-500 block text-[10px]">เติมแก๊ส (บิล/ถัง):</span>
                  <span className="font-bold text-gray-800">{row.refillBillsCount} บิล | {row.refillTanksCount} ถัง</span>
                  <div className="font-bold text-amber-600">{row.refillTotalAmount.toLocaleString()} ฿</div>
                </div>
              </div>

              {row.refillSizesText !== '-' && (
                <div className="text-[10px] text-amber-900 bg-amber-50/70 p-1.5 rounded border border-amber-100">
                  <span className="font-bold">ขนาดถังเติม:</span> {row.refillSizesText}
                </div>
              )}
            </Card>
          ))
        ) : (
          <div className="text-center py-6 text-gray-400 bg-white rounded-lg border">
            ไม่พบข้อมูล
          </div>
        )}
      </div>
    </div>
  );
};

export default Reports;
