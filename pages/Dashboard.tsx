import React, { useState, useMemo } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import { formatDateForInput, getGasWeightKg } from '../lib/utils';
import { PaymentMethod, InventoryCategory, Customer, InvoiceType } from '../types';
import { calculateReportMetrics } from '../lib/reportCalculations';
import PrinterIcon from '../components/icons/PrinterIcon';
import MonthlyReportA4 from '../components/MonthlyReportA4';
import CustomerStatementA4 from '../components/CustomerStatementA4';

const SummaryCard: React.FC<{ title: string; amount: number; colorClass: string; subtitle?: string }> = ({ title, amount, colorClass, subtitle }) => (
    <Card className="flex-1 text-center">
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-lg font-bold ${colorClass}`}>{amount.toLocaleString('th-TH')} ฿</p>
        {subtitle && <p className="text-[11px] text-gray-400 mt-0.5">{subtitle}</p>}
    </Card>
);

const FinancialCircleChart: React.FC<{ income: number; expense: number }> = ({ income, expense }) => {
    const total = income + expense;
    const incomePercent = total > 0 ? (income / total) * 100 : 0;
    const expensePercent = total > 0 ? (expense / total) * 100 : 0;

    return (
        <div className="flex flex-col sm:flex-row justify-center items-center py-6 gap-8 sm:gap-16 mt-4 border-t border-gray-100">
            {/* Income */}
            <div className="flex flex-col items-center">
                <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
                        <path className="text-blue-500" strokeDasharray={`${incomePercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <span className="text-green-500 font-bold text-2xl">{income.toLocaleString('th-TH')}</span>
                        <span className="text-sm text-gray-500 mt-1">รายรับ</span>
                    </div>
                </div>
            </div>

            {/* Expense */}
            <div className="flex flex-col items-center">
                <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                         <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
                         <path className="text-yellow-400" strokeDasharray={`${expensePercent}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                    </svg>
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                         <span className="text-red-600 font-bold text-2xl">{expense.toLocaleString('th-TH')}</span>
                         <span className="text-sm text-gray-500 mt-1">รายจ่าย</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

const CustomerStatsList: React.FC<{ 
    data: { name: string; branch?: string; tanks: number; profit: number; total: number }[];
    onPrintStatement?: (customerName: string) => void;
}> = ({ data, onPrintStatement }) => {
    return (
        <div className="space-y-0">
             {data.length > 0 ? data.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors px-2 rounded-lg">
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="font-semibold text-gray-800 text-sm truncate">{item.name}</div>
                        <div className="text-xs text-gray-400 truncate">{item.branch || 'สำนักงานใหญ่'}</div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-4 text-sm">
                        <div className="text-center w-8" title="จำนวนถัง">
                            <span className="block font-bold text-gray-700">{item.tanks}</span>
                        </div>
                        <div className="text-right w-16 sm:w-20" title="กำไร (ประมาณการ)">
                            <span className="block font-medium text-gray-500 text-xs sm:text-sm">{item.profit.toLocaleString()}</span>
                        </div>
                        <div className="text-right w-20 sm:w-24" title="ยอดรวม">
                             <span className="block font-bold text-sky-600">{item.total.toLocaleString()}</span>
                        </div>
                        {onPrintStatement && (
                            <button
                                onClick={() => onPrintStatement(item.name)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200 transition-colors"
                                title="พิมพ์ใบสรุปยอดส่งลูกค้ารายนี้"
                            >
                                <PrinterIcon className="h-4 w-4" />
                            </button>
                        )}
                    </div>
                </div>
            )) : <p className="text-center text-gray-400 py-4">ไม่มีข้อมูล</p>}
        </div>
    );
};

const DonutChart: React.FC<{ data: { name: string, value: number, color: string }[] }> = ({ data }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    let accumulatedPercentage = 0;
    if (total === 0) {
        return (
            <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                    <circle cx="18" cy="18" r="15.915" className="stroke-current text-gray-200" fill="transparent" strokeWidth="3"></circle>
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs text-gray-400">ไม่มีข้อมูล</div>
            </div>
        );
    }
    return (
        <div className="relative w-32 h-32">
            <svg className="w-full h-full" viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)' }}>
                {data.map(({ value, color }, index) => {
                    const percentage = (value / total) * 100;
                    return (
                        <circle key={index} cx="18" cy="18" r="15.915" className={`stroke-current ${color}`} fill="transparent" strokeWidth="3"
                            strokeDasharray={`${percentage} ${100 - percentage}`} strokeDashoffset={-accumulatedPercentage + percentage}
                            style={{ transition: 'stroke-dashoffset 0.5s' }}></circle>
                    );
                })}
            </svg>
             <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xs text-gray-500">รวม</span>
                <span className="font-bold text-lg text-gray-700">{total.toLocaleString('th-TH')}</span>
            </div>
        </div>
    );
};

// Helper to format ISO or YYYY-MM-DD to Thai date string (e.g. 1/08/2569)
const formatThaiDateDisplay = (dateStr: string): string => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length !== 3) return dateStr;
    const year = parseInt(parts[0], 10) + 543;
    const month = parseInt(parts[1], 10);
    const day = parseInt(parts[2], 10);
    return `${day}/${month < 10 ? '0' + month : month}/${year}`;
};

const Dashboard: React.FC = () => {
    const { dailySummary, sales, expenses, reportDate, setReportDate, lowStockItems, customers, inventory } = useAppContext();
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
    const [gasReturnPrice, setGasReturnPrice] = useState<string>('');
    const [showMonthlyReportModal, setShowMonthlyReportModal] = useState<boolean>(false);
    const [statementCustomer, setStatementCustomer] = useState<Customer | null>(null);

    // Date range for Monthly View (Defaults to full month of current reportDate)
    const [monthlyStartDate, setMonthlyStartDate] = useState<string>(() => {
        const d = reportDate || new Date();
        return formatDateForInput(new Date(d.getFullYear(), d.getMonth(), 1));
    });
    const [monthlyEndDate, setMonthlyEndDate] = useState<string>(() => {
        const d = reportDate || new Date();
        return formatDateForInput(new Date(d.getFullYear(), d.getMonth() + 1, 0));
    });

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const [year, month, day] = e.target.value.split('-').map(Number);
        const newDate = new Date(year, month - 1, day);
        setReportDate(newDate);
        // Automatically sync monthly start/end to this month
        setMonthlyStartDate(formatDateForInput(new Date(year, month - 1, 1)));
        setMonthlyEndDate(formatDateForInput(new Date(year, month, 0)));
    };

    // Quick presets for monthly date range
    const setPresetRange = (preset: 'THIS_MONTH' | 'LAST_MONTH' | 'LAST_30_DAYS' | 'THIS_YEAR') => {
        const now = new Date();
        if (preset === 'THIS_MONTH') {
            const start = new Date(now.getFullYear(), now.getMonth(), 1);
            const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
            setMonthlyStartDate(formatDateForInput(start));
            setMonthlyEndDate(formatDateForInput(end));
            setReportDate(start);
        } else if (preset === 'LAST_MONTH') {
            const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const end = new Date(now.getFullYear(), now.getMonth(), 0);
            setMonthlyStartDate(formatDateForInput(start));
            setMonthlyEndDate(formatDateForInput(end));
            setReportDate(start);
        } else if (preset === 'LAST_30_DAYS') {
            const end = new Date();
            const start = new Date();
            start.setDate(start.getDate() - 30);
            setMonthlyStartDate(formatDateForInput(start));
            setMonthlyEndDate(formatDateForInput(end));
        } else if (preset === 'THIS_YEAR') {
            const start = new Date(now.getFullYear(), 0, 1);
            const end = new Date(now.getFullYear(), 11, 31);
            setMonthlyStartDate(formatDateForInput(start));
            setMonthlyEndDate(formatDateForInput(end));
        }
    };

    const handleMonthSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (!e.target.value) return;
        const [year, month] = e.target.value.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        setMonthlyStartDate(formatDateForInput(start));
        setMonthlyEndDate(formatDateForInput(end));
        setReportDate(start);
    };

    const handlePrintCustomerStatementByName = (name: string) => {
        const found = customers.find(c => c.name === name);
        if (found) {
            setStatementCustomer(found);
        } else {
            setStatementCustomer({
                id: 'temp',
                name: name,
                branch: '-',
                price: 0,
                tank_brand: undefined as any,
                tank_size: undefined as any,
            });
        }
    };

    // Dynamically calculate comprehensive metrics for the selected Monthly Date Range using shared helper
    const rangeData = useMemo(() => {
        const metrics = calculateReportMetrics(
            sales,
            expenses,
            customers,
            inventory,
            monthlyStartDate,
            monthlyEndDate
        );

        // Map for customerStats compatibility
        const customerStats = metrics.customerSummaries.map(c => ({
            id: c.customerId,
            name: c.customerName,
            branch: c.branch,
            tanks: c.tanksCount + c.accessoriesCount,
            total: c.totalAmount,
            profit: c.grossProfit
        }));

        // Map for salesStats compatibility
        const salesStats = metrics.productSummaries.map(p => ({
            size: p.name,
            count: p.quantity,
            cashTransferCount: p.cashTransferQty,
            creditCount: p.creditQty,
            taxInvoiceCount: p.taxInvoiceQty
        }));

        // Map for refillStats compatibility
        const refillStats = metrics.refillSummaries.map(r => ({
            size: r.key,
            count: r.quantity,
            cashCount: r.cashQty,
            creditCount: r.creditQty
        }));

        // Map for expenseBreakdown compatibility
        const expenseBreakdown = metrics.expenseTypeSummaries.map(e => ({
            type: e.type,
            count: e.count,
            totalAmount: e.totalAmount,
            cashAmount: e.cashAmount,
            creditAmount: e.creditAmount,
            totalGasQty: e.totalGasQty
        }));

        return {
            totalSalesAmount: metrics.totalSalesAmount,
            totalExpensesAmount: metrics.totalExpensesAmount,
            netProfit: metrics.netProfit,
            grossProfit: metrics.grossProfit,
            totalGasTanksSold: metrics.totalGasTanksSold,
            totalGasWeightKg: metrics.totalGasWeightKg,
            totalAccessoriesSold: metrics.totalAccessoriesSold,
            totalGasReturnKg: metrics.totalGasReturnKg,
            totalGasReturnValue: metrics.totalGasReturnValue,
            customerGasReturnKg: metrics.customerGasReturnKg,
            plantGasReturnKg: metrics.plantGasReturnKg,
            totalBorrowedTanks: metrics.totalBorrowedTanks,
            totalSalesBills: metrics.totalSalesBills,
            totalExpenseRecords: metrics.totalExpenseRecords,
            totalTransactions: metrics.totalTransactions,
            cashIncome: metrics.cashIncome,
            transferIncome: metrics.transferIncome,
            creditIncome: metrics.creditIncome,
            taxComparison: metrics.taxComparison,
            customerStats,
            salesStats,
            refillStats,
            expenseBreakdown,
        };
    }, [sales, expenses, customers, inventory, monthlyStartDate, monthlyEndDate]);

    const activeSummary = viewMode === 'daily'
        ? {
            income: dailySummary.income,
            expense: dailySummary.expense,
            profit: dailySummary.profit,
            titlePrefix: 'รายวัน'
        }
        : {
            income: rangeData.totalSalesAmount,
            expense: rangeData.totalExpensesAmount,
            profit: rangeData.grossProfit,
            titlePrefix: 'รายเดือน'
        };

    // Calculate custom return value
    const returnKg = viewMode === 'daily' ? 0 : rangeData.totalGasReturnKg;
    const pricePerKg = parseFloat(gasReturnPrice) || 0;
    const customReturnValue = returnKg * pricePerKg;

    const paymentChartData = viewMode === 'daily'
        ? [
            { name: PaymentMethod.CASH, value: dailySummary.cashIncome, color: 'text-lime-500' },
            { name: PaymentMethod.TRANSFER, value: dailySummary.transferIncome, color: 'text-purple-500' },
            { name: PaymentMethod.CREDIT, value: dailySummary.creditIncome, color: 'text-blue-500' },
        ].filter(item => item.value > 0)
        : [
            { name: PaymentMethod.CASH, value: rangeData.cashIncome, color: 'text-lime-500' },
            { name: PaymentMethod.TRANSFER, value: rangeData.transferIncome, color: 'text-purple-500' },
            { name: PaymentMethod.CREDIT, value: rangeData.creditIncome, color: 'text-blue-500' },
        ].filter(item => item.value > 0);

    const dailyCustomerData = dailySummary.salesByCustomer.map(s => ({
        name: s.customerName,
        branch: s.customerBranch,
        tanks: s.totalTanks,
        profit: s.totalProfit,
        total: s.totalAmount
    }));

    const monthlyCustomerData = rangeData.customerStats.map(s => ({
        name: s.name,
        branch: s.branch,
        tanks: s.tanks,
        profit: s.profit,
        total: s.total
    }));

    return (
    <div>
      <Header title="ภาพรวม">
        {viewMode === 'daily' ? (
            <input 
                type="date" 
                value={formatDateForInput(reportDate)} 
                onChange={handleDateChange}
                className="p-1.5 border border-gray-300 rounded-lg bg-white/80 shadow-inner text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
                title="เลือกวันที่ดูภาพรวมรายวัน"
            />
        ) : (
            <div className="flex items-center gap-1.5 bg-white/90 border border-gray-200 px-2 py-1 rounded-lg shadow-sm text-xs">
                <span className="text-gray-500 font-medium">ช่วง:</span>
                <span className="font-bold text-orange-600">
                    {formatThaiDateDisplay(monthlyStartDate)} - {formatThaiDateDisplay(monthlyEndDate)}
                </span>
            </div>
        )}
      </Header>

      {/* Low Stock Alerts */}
      {lowStockItems.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 animate-pulse">
              <div className="flex items-center gap-2 mb-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <h3 className="font-bold text-red-700">สินค้าใกล้หมด!</h3>
              </div>
              <ul className="list-disc list-inside text-sm text-red-600">
                  {lowStockItems.map(item => (
                      <li key={item.id}>{item.category === InventoryCategory.ACCESSORY ? item.name : `${item.tank_brand} ${item.tank_size}`} (เหลือ {item.full})</li>
                  ))}
              </ul>
          </div>
      )}

      {/* View Mode Toggle */}
      <div className="flex bg-white/80 p-1 rounded-lg shadow-inner backdrop-blur-sm mb-4">
        <button onClick={() => setViewMode('daily')} className={`w-full py-2 rounded-md font-bold transition-all ${viewMode === 'daily' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}`}>
            รายวัน (Daily)
        </button>
        <button onClick={() => setViewMode('monthly')} className={`w-full py-2 rounded-md font-bold transition-all ${viewMode === 'monthly' ? 'bg-orange-500 text-white shadow-md' : 'text-gray-600 hover:text-gray-900'}`}>
            รายเดือน / ช่วงเวลา (Monthly & Range)
        </button>
      </div>

      <div className="space-y-4">
        {/* ========================================================================= */}
        {/* MONTHLY / CUSTOM RANGE GRAND TOTAL SECTION (ผลรวมภาพรวมรายเดือน) */}
        {/* ========================================================================= */}
        {viewMode === 'monthly' && (
            <Card className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white border-0 shadow-xl overflow-hidden relative">
                {/* Background glowing decorations */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-orange-500/10 rounded-full blur-3xl pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-80 h-80 bg-sky-500/10 rounded-full blur-3xl pointer-events-none"></div>

                {/* Section Header & Date Range Controller */}
                <div className="relative z-10 border-b border-slate-700/80 pb-4 mb-5">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <div className="flex items-center gap-2">
                                <span className="p-1.5 bg-orange-500/20 text-orange-400 rounded-lg border border-orange-500/30 text-lg">
                                    📊
                                </span>
                                <div>
                                    <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                                        ผลรวมภาพรวมรายเดือน
                                        <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-orange-500 text-white shadow-sm">
                                            สรุปยอดตามช่วงวันที่
                                        </span>
                                    </h2>
                                    <p className="text-xs text-slate-400 mt-0.5">
                                        คำนวณจากข้อมูลจริงในระบบสำหรับช่วง: <span className="font-bold text-orange-300">{formatThaiDateDisplay(monthlyStartDate)} - {formatThaiDateDisplay(monthlyEndDate)}</span>
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Quick Presets */}
                        <div className="flex flex-wrap items-center gap-1.5">
                            <button
                                onClick={() => setPresetRange('THIS_MONTH')}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-200 hover:bg-orange-500 hover:text-white border border-slate-700 transition-colors"
                            >
                                เดือนนี้
                            </button>
                            <button
                                onClick={() => setPresetRange('LAST_MONTH')}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-200 hover:bg-orange-500 hover:text-white border border-slate-700 transition-colors"
                            >
                                เดือนก่อน
                            </button>
                            <button
                                onClick={() => setPresetRange('LAST_30_DAYS')}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-200 hover:bg-orange-500 hover:text-white border border-slate-700 transition-colors"
                            >
                                30 วันล่าสุด
                            </button>
                            <button
                                onClick={() => setPresetRange('THIS_YEAR')}
                                className="px-2.5 py-1 text-xs font-semibold rounded bg-slate-800 text-slate-200 hover:bg-orange-500 hover:text-white border border-slate-700 transition-colors"
                            >
                                ปีนี้
                            </button>
                        </div>
                    </div>

                    {/* Date Inputs Filter Row */}
                    <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center gap-3 bg-slate-800/60 p-3 rounded-xl border border-slate-700/50">
                        <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                            <span className="text-xs font-bold text-slate-300 whitespace-nowrap">📅 ตั้งแต่วันที่:</span>
                            <input
                                type="date"
                                value={monthlyStartDate}
                                onChange={(e) => setMonthlyStartDate(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg border border-slate-600 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2 flex-grow sm:flex-grow-0">
                            <span className="text-xs font-bold text-slate-300 whitespace-nowrap">ถึงวันที่:</span>
                            <input
                                type="date"
                                value={monthlyEndDate}
                                onChange={(e) => setMonthlyEndDate(e.target.value)}
                                className="px-2.5 py-1.5 bg-slate-900 text-white text-xs rounded-lg border border-slate-600 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                            />
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <span className="text-xs text-slate-400 hidden sm:inline">เลือกเดือนเร็ว:</span>
                            <input
                                type="month"
                                onChange={handleMonthSelect}
                                className="px-2 py-1 bg-slate-900 text-slate-200 text-xs rounded-lg border border-slate-600 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                                title="เลือกเดือนเพื่อตั้งช่วงวันที่ทั้งเดือนอัตโนมัติ"
                            />
                        </div>
                    </div>
                </div>

                {/* 9 Key Grand Summary Metric Cards Grid */}
                <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-3.5">
                    {/* 1. ยอดขาย / รายรับรวม */}
                    <div className="bg-slate-800/90 border border-emerald-500/30 rounded-xl p-3.5 shadow-lg relative overflow-hidden group hover:border-emerald-500 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-emerald-400 uppercase tracking-wider">1. ยอดขาย / รายรับรวม</p>
                                <h3 className="text-2xl font-black text-emerald-300 mt-1">
                                    {rangeData.totalSalesAmount.toLocaleString('th-TH')} <span className="text-sm font-normal text-emerald-400">฿</span>
                                </h3>
                            </div>
                            <span className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg text-lg">💰</span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex justify-between items-center text-[11px] text-slate-400">
                            <span>บิลขาย: <strong className="text-white">{rangeData.totalSalesBills}</strong> บิล</span>
                            <span>เฉลี่ย: <strong className="text-emerald-400">{rangeData.totalSalesBills > 0 ? (rangeData.totalSalesAmount / rangeData.totalSalesBills).toLocaleString('th-TH', { maximumFractionDigits: 0 }) : 0}</strong> ฿/บิล</span>
                        </div>
                    </div>

                    {/* 2. รายจ่ายรวม */}
                    <div className="bg-slate-800/90 border border-rose-500/30 rounded-xl p-3.5 shadow-lg relative overflow-hidden group hover:border-rose-500 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-rose-400 uppercase tracking-wider">2. รายจ่ายรวม</p>
                                <h3 className="text-2xl font-black text-rose-300 mt-1">
                                    {rangeData.totalExpensesAmount.toLocaleString('th-TH')} <span className="text-sm font-normal text-rose-400">฿</span>
                                </h3>
                            </div>
                            <span className="p-2 bg-rose-500/20 text-rose-400 rounded-lg text-lg">💸</span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex justify-between items-center text-[11px] text-slate-400">
                            <span>รายการจ่าย: <strong className="text-white">{rangeData.totalExpenseRecords}</strong> รายการ</span>
                            <span className="text-rose-400">เติมแก๊ส + อื่นๆ</span>
                        </div>
                    </div>

                    {/* 3. กำไรรวม */}
                    <div className="bg-slate-800/90 border border-sky-500/30 rounded-xl p-3.5 shadow-lg relative overflow-hidden group hover:border-sky-500 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-sky-400 uppercase tracking-wider">3. กำไรรวม (สุทธิ)</p>
                                <h3 className={`text-2xl font-black mt-1 ${rangeData.netProfit >= 0 ? 'text-sky-300' : 'text-red-400'}`}>
                                    {rangeData.netProfit.toLocaleString('th-TH')} <span className="text-sm font-normal text-sky-400">฿</span>
                                </h3>
                            </div>
                            <span className="p-2 bg-sky-500/20 text-sky-400 rounded-lg text-lg">📈</span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex justify-between items-center text-[11px] text-slate-400">
                            <span>กำไรขั้นต้น: <strong className="text-emerald-400">{rangeData.grossProfit.toLocaleString('th-TH')} ฿</strong></span>
                        </div>
                    </div>

                    {/* 4. จำนวนแก๊สรวม */}
                    <div className="bg-slate-800/90 border border-amber-500/30 rounded-xl p-3.5 shadow-lg relative overflow-hidden group hover:border-amber-500 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-amber-400 uppercase tracking-wider">4. จำนวนแก๊สรวม</p>
                                <h3 className="text-2xl font-black text-amber-300 mt-1">
                                    {rangeData.totalGasTanksSold.toLocaleString('th-TH')} <span className="text-sm font-normal text-amber-400">ถัง</span>
                                </h3>
                            </div>
                            <span className="p-2 bg-amber-500/20 text-amber-400 rounded-lg text-lg">🛢️</span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex justify-between items-center text-[11px] text-slate-400">
                            <span>อุปกรณ์เสริม: <strong className="text-white">{rangeData.totalAccessoriesSold}</strong> ชิ้น</span>
                            <span className="text-amber-300 font-medium">ยอดจำหน่าย</span>
                        </div>
                    </div>

                    {/* 5. จำนวนถังรวม */}
                    <div className="bg-slate-800/90 border border-orange-500/30 rounded-xl p-3.5 shadow-lg relative overflow-hidden group hover:border-orange-500 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-orange-400 uppercase tracking-wider">5. จำนวนถังรวม (จำหน่าย)</p>
                                <h3 className="text-2xl font-black text-orange-300 mt-1">
                                    {rangeData.totalGasTanksSold.toLocaleString('th-TH')} <span className="text-sm font-normal text-orange-400">ถัง</span>
                                </h3>
                            </div>
                            <span className="p-2 bg-orange-500/20 text-orange-400 rounded-lg text-lg">📦</span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex justify-between items-center text-[11px] text-slate-400">
                            <span>ถังเติมเข้า: <strong className="text-white">{rangeData.refillStats.reduce((sum, r) => sum + r.count, 0)}</strong> ถัง</span>
                            <span className="text-orange-400 font-medium">{rangeData.salesStats.length} ขนาด</span>
                        </div>
                    </div>

                    {/* 6. ถังคืน (เนื้อแก๊สคืน / ถังคืน) */}
                    <div className="bg-slate-800/90 border border-teal-500/30 rounded-xl p-3.5 shadow-lg relative overflow-hidden group hover:border-teal-500 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-teal-400 uppercase tracking-wider">6. ถังคืน (เนื้อแก๊ส)</p>
                                <h3 className="text-2xl font-black text-teal-300 mt-1">
                                    {rangeData.totalGasReturnKg.toFixed(2)} <span className="text-sm font-normal text-teal-400">กก.</span>
                                </h3>
                            </div>
                            <span className="p-2 bg-teal-500/20 text-teal-400 rounded-lg text-lg">🔄</span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex justify-between items-center text-[11px] text-slate-400">
                            <span>มูลค่าคืนเนื้อ: <strong className="text-teal-300">{rangeData.totalGasReturnValue.toLocaleString('th-TH')} ฿</strong></span>
                        </div>
                    </div>

                    {/* 7. ถังยืม (ยืมคงค้าง) */}
                    <div className="bg-slate-800/90 border border-indigo-500/30 rounded-xl p-3.5 shadow-lg relative overflow-hidden group hover:border-indigo-500 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-indigo-400 uppercase tracking-wider">7. ถังยืม (คงค้าง)</p>
                                <h3 className="text-2xl font-black text-indigo-300 mt-1">
                                    {rangeData.totalBorrowedTanks.toLocaleString('th-TH')} <span className="text-sm font-normal text-indigo-400">ถัง</span>
                                </h3>
                            </div>
                            <span className="p-2 bg-indigo-500/20 text-indigo-400 rounded-lg text-lg">🤝</span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex justify-between items-center text-[11px] text-slate-400">
                            <span>สถานะ: <strong className="text-indigo-300">อยู่กับลูกค้า</strong></span>
                        </div>
                    </div>

                    {/* 8. น้ำหนักรวม กก. */}
                    <div className="bg-slate-800/90 border border-purple-500/30 rounded-xl p-3.5 shadow-lg relative overflow-hidden group hover:border-purple-500 transition-all">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-purple-400 uppercase tracking-wider">8. น้ำหนักรวม กก.</p>
                                <h3 className="text-2xl font-black text-purple-300 mt-1">
                                    {rangeData.totalGasWeightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })} <span className="text-sm font-normal text-purple-400">กก.</span>
                                </h3>
                            </div>
                            <span className="p-2 bg-purple-500/20 text-purple-400 rounded-lg text-lg">⚖️</span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex justify-between items-center text-[11px] text-slate-400">
                            <span>ปริมาณก๊าซจำหน่าย: <strong className="text-purple-300">{(rangeData.totalGasWeightKg / 1000).toFixed(2)} ตัน</strong></span>
                        </div>
                    </div>

                    {/* 9. จำนวนรายการทั้งหมด */}
                    <div className="bg-slate-800/90 border border-slate-600 rounded-xl p-3.5 shadow-lg relative overflow-hidden group hover:border-slate-400 transition-all sm:col-span-2 lg:col-span-1">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-xs font-medium text-slate-300 uppercase tracking-wider">9. จำนวนรายการทั้งหมด</p>
                                <h3 className="text-2xl font-black text-white mt-1">
                                    {rangeData.totalTransactions.toLocaleString('th-TH')} <span className="text-sm font-normal text-slate-300">รายการ</span>
                                </h3>
                            </div>
                            <span className="p-2 bg-slate-700 text-slate-200 rounded-lg text-lg">🧾</span>
                        </div>
                        <div className="mt-2.5 pt-2 border-t border-slate-700/60 flex justify-between items-center text-[11px] text-slate-400">
                            <span>ขาย: <strong className="text-emerald-400">{rangeData.totalSalesBills}</strong> | จ่าย: <strong className="text-rose-400">{rangeData.totalExpenseRecords}</strong></span>
                        </div>
                    </div>
                </div>

                {/* ========================================================================= */}
                {/* TAX & ACCOUNTING AUDIT COMPARISON SECTION (เปรียบเทียบยอดสำหรับตรวจสอบภาษีและบัญชี) */}
                {/* ========================================================================= */}
                {rangeData.taxComparison && (
                    <div className="relative z-10 mt-5 pt-4 border-t border-slate-700/80">
                        <div className="bg-slate-950/70 border border-slate-700 rounded-xl p-4 shadow-inner">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 mb-3 border-b border-slate-800">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-base">⚖️</span>
                                        <h3 className="text-sm font-bold text-white tracking-wide">
                                            สรุปเปรียบเทียบยอดสำหรับตรวจสอบภาษี & บัญชี (Tax Invoice vs. Credit Refill)
                                        </h3>
                                    </div>
                                    <p className="text-[11px] text-slate-400 mt-0.5">
                                        เปรียบเทียบยอดขายที่ออกใบกำกับภาษี กับ ยอดซื้อเติมแก๊สแบบเครดิตในช่วงวันที่เดียวกัน
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border shadow-sm ${
                                        rangeData.taxComparison.status === 'SAFE'
                                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-500/50'
                                            : rangeData.taxComparison.status === 'EQUAL'
                                            ? 'bg-amber-950/80 text-amber-300 border-amber-500/50'
                                            : 'bg-rose-950/80 text-rose-300 border-rose-500/50'
                                    }`}>
                                        <span className={`w-2 h-2 rounded-full animate-pulse ${
                                            rangeData.taxComparison.status === 'SAFE' ? 'bg-emerald-400' : rangeData.taxComparison.status === 'EQUAL' ? 'bg-amber-400' : 'bg-rose-500'
                                        }`}></span>
                                        {rangeData.taxComparison.statusLabel}
                                    </span>
                                </div>
                            </div>

                            {/* Comparison Side-by-Side Panels */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {/* Side A: ยอดขายออกใบกำกับภาษี */}
                                <div className="bg-slate-900/90 border border-emerald-500/30 rounded-lg p-3.5 relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-700/50">
                                                ฝั่งที่ 1: ยอดขายออกใบกำกับภาษี
                                            </span>
                                            <h4 className="text-xl font-black text-white mt-1.5">
                                                {rangeData.taxComparison.taxSales.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-emerald-400">บาท</span>
                                            </h4>
                                        </div>
                                        <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded text-sm">📄</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">จำนวนบิล:</span>
                                            <strong className="text-slate-200">{rangeData.taxComparison.taxSales.billsCount}</strong> บิล
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">จำนวนถัง:</span>
                                            <strong className="text-emerald-400">{rangeData.taxComparison.taxSales.tanksCount}</strong> ถัง
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">น้ำหนักก๊าซ:</span>
                                            <strong className="text-slate-200">{rangeData.taxComparison.taxSales.weightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })}</strong> กก.
                                        </div>
                                    </div>
                                </div>

                                {/* Side B: ยอดเติมแก๊สเครดิต */}
                                <div className="bg-slate-900/90 border border-blue-500/30 rounded-lg p-3.5 relative overflow-hidden">
                                    <div className="flex justify-between items-start mb-2">
                                        <div>
                                            <span className="text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/80 px-2 py-0.5 rounded border border-blue-700/50">
                                                ฝั่งที่ 2: ยอดซื้อเติมแก๊สเครดิต
                                            </span>
                                            <h4 className="text-xl font-black text-white mt-1.5">
                                                {rangeData.taxComparison.creditRefill.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs text-blue-400">บาท</span>
                                            </h4>
                                        </div>
                                        <span className="p-1.5 bg-blue-500/10 text-blue-400 rounded text-sm">🏭</span>
                                    </div>
                                    <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px]">
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">จำนวนรายการ:</span>
                                            <strong className="text-slate-200">{rangeData.taxComparison.creditRefill.billsCount}</strong> รายการ
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">จำนวนถัง:</span>
                                            <strong className="text-blue-400">{rangeData.taxComparison.creditRefill.tanksCount}</strong> ถัง
                                        </div>
                                        <div>
                                            <span className="text-slate-400 block text-[10px]">น้ำหนักก๊าซ:</span>
                                            <strong className="text-slate-200">{rangeData.taxComparison.creditRefill.weightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })}</strong> กก.
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Net Difference Row */}
                            <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                                <div className="flex items-center gap-4 text-slate-300">
                                    <span>
                                        ส่วนต่างยอดเงิน (ขาย - ซื้อเครดิต):{' '}
                                        <strong className={rangeData.taxComparison.difference.totalAmount >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                            {rangeData.taxComparison.difference.totalAmount > 0 ? '+' : ''}
                                            {rangeData.taxComparison.difference.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                                        </strong>
                                    </span>
                                    <span>
                                        ส่วนต่างถัง:{' '}
                                        <strong className={rangeData.taxComparison.difference.tanksCount >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                            {rangeData.taxComparison.difference.tanksCount > 0 ? '+' : ''}
                                            {rangeData.taxComparison.difference.tanksCount} ถัง
                                        </strong>
                                    </span>
                                    <span>
                                        ส่วนต่างน้ำหนัก:{' '}
                                        <strong className={rangeData.taxComparison.difference.weightKg >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                            {rangeData.taxComparison.difference.weightKg > 0 ? '+' : ''}
                                            {rangeData.taxComparison.difference.weightKg.toLocaleString('th-TH', { maximumFractionDigits: 1 })} กก.
                                        </strong>
                                    </span>
                                </div>

                                <div className="text-[11px] text-slate-400 flex items-center gap-1">
                                    <span className="text-emerald-400 font-bold">✓</span> ตรวจสอบความสอดคล้องของข้อมูลแล้ว
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </Card>
        )}

        {/* Financial Flow Card */}
        <Card>
            <h2 className="text-lg font-semibold mb-2 text-gray-700">สรุปกระแสการเงิน ({activeSummary.titlePrefix})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
                <SummaryCard title="รายรับ" amount={activeSummary.income} colorClass="text-green-500" subtitle={viewMode === 'monthly' ? `บิลขาย ${rangeData.totalSalesBills} รายการ` : undefined} />
                <SummaryCard title="รายจ่าย" amount={activeSummary.expense} colorClass="text-red-500" subtitle={viewMode === 'monthly' ? `รายการจ่าย ${rangeData.totalExpenseRecords} รายการ` : undefined} />
                <SummaryCard title="กำไรขั้นต้น" amount={activeSummary.profit} colorClass="text-sky-500" subtitle={viewMode === 'monthly' ? `กำไรสุทธิ ${rangeData.netProfit.toLocaleString()} ฿` : undefined} />
            </div>
            <FinancialCircleChart income={activeSummary.income} expense={activeSummary.expense} />
        </Card>

        {/* DAILY VIEW SECTION */}
        {viewMode === 'daily' && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <Card className="h-full lg:col-span-7 xl:col-span-8">
                    <h2 className="text-lg font-semibold mb-4 text-gray-700 flex justify-between items-center">
                        <span>ยอดขายลูกค้าทั้งหมด (วันนี้)</span>
                        <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded">เรียงตามยอดขาย</span>
                    </h2>
                    {/* Header Row for List */}
                    <div className="flex justify-between items-center px-2 pb-2 mb-2 border-b-2 border-gray-100 text-xs text-gray-500 font-semibold uppercase">
                        <div>ลูกค้า</div>
                        <div className="flex gap-2 sm:gap-6">
                            <div className="w-8 text-center">จำนวน</div>
                            <div className="w-16 sm:w-20 text-right">กำไร</div>
                            <div className="w-20 sm:w-24 text-right">ยอดรวม</div>
                        </div>
                    </div>
                    <div className="max-h-[550px] overflow-y-auto pr-1">
                        <CustomerStatsList data={dailyCustomerData} />
                    </div>
                </Card>

                <div className="space-y-4 lg:col-span-5 xl:col-span-4">
                    <Card>
                         <h2 className="text-lg font-semibold mb-2 text-red-700">สรุปเติมแก๊ส (วันนี้)</h2>
                         <div className="text-sm space-y-2">
                             <div className="flex justify-between font-semibold border-b pb-1 text-gray-500">
                                 <span>ขนาด</span>
                                 <div className="flex gap-4">
                                     <span className="text-lime-600 w-12 text-right">เงินสด</span>
                                     <span className="text-blue-600 w-12 text-right">เครดิต</span>
                                     <span className="w-12 text-right">รวม</span>
                                 </div>
                             </div>
                             {dailySummary.refillStats.map(r => (
                                 <div key={r.size} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                                     <span>{r.size}</span>
                                     <div className="flex gap-4">
                                         <span className="text-lime-600 w-12 text-right">{r.cashCount}</span>
                                         <span className="text-blue-600 w-12 text-right">{r.creditCount}</span>
                                         <span className="font-bold w-12 text-right">{r.count}</span>
                                     </div>
                                 </div>
                             ))}
                             {dailySummary.refillStats.length === 0 && <p className="text-center text-gray-400 py-2">ไม่มีรายการเติมแก๊ส</p>}
                         </div>
                    </Card>

                    <Card>
                        <h2 className="text-lg font-semibold mb-2 text-gray-700">ช่องทางชำระเงิน (วันนี้)</h2>
                        <div className="flex items-center space-x-4">
                            <div className="flex-shrink-0"><DonutChart data={paymentChartData} /></div>
                            <div className="flex-grow space-y-2">
                                {paymentChartData.map(item => (
                                    <div key={item.name} className="flex justify-between items-center text-sm">
                                        <div className="flex items-center"><span className={`w-3 h-3 rounded-full mr-2 ${item.color.replace('text-', 'bg-')}`}></span><span>{item.name}</span></div>
                                        <span className="font-semibold">{item.value.toLocaleString('th-TH')} ฿</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        )}

        {/* MONTHLY VIEW DETAILS SECTION */}
        {viewMode === 'monthly' && (
            <div className="space-y-4">
                 {/* Monthly Printable Report Banner */}
                 <div className="bg-gradient-to-r from-sky-600 to-blue-700 text-white p-4 rounded-xl shadow-md flex flex-wrap justify-between items-center gap-3">
                    <div>
                        <h3 className="font-bold text-base flex items-center gap-2">
                            <PrinterIcon className="h-5 w-5" />
                            พิมพ์รายงานสรุปประจำเดือน (A4)
                        </h3>
                        <p className="text-xs text-sky-100 mt-0.5">
                            สรุปยอดขายส่งลูกค้า ยอดเติมแก๊ส และสรุปรายรับ-รายจ่ายทั้งหมดสำหรับเดือนนี้
                        </p>
                    </div>
                    <button
                        onClick={() => setShowMonthlyReportModal(true)}
                        className="px-4 py-2 bg-white text-sky-800 font-bold text-xs rounded-lg hover:bg-sky-50 shadow transition-all whitespace-nowrap"
                    >
                        เปิดพิมพ์รายงาน A4
                    </button>
                 </div>

                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    {/* Customer breakdown */}
                    <Card className="h-full lg:col-span-7 xl:col-span-7">
                        <h2 className="text-lg font-semibold mb-4 text-sky-700 flex justify-between items-center">
                            <span>ยอดขายลูกค้าทั้งหมด (ในช่วงที่เลือก)</span>
                            <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded">เรียงตามยอดขาย</span>
                        </h2>
                         <div className="flex justify-between items-center px-2 pb-2 mb-2 border-b-2 border-gray-100 text-xs text-gray-500 font-semibold uppercase">
                            <div>ลูกค้า</div>
                            <div className="flex gap-2 sm:gap-6">
                                <div className="w-8 text-center">จำนวน</div>
                                <div className="w-16 sm:w-20 text-right">กำไร</div>
                                <div className="w-20 sm:w-24 text-right">ยอดรวม</div>
                                <div className="w-6 text-center">พิมพ์</div>
                            </div>
                        </div>
                        <div className="max-h-[550px] overflow-y-auto pr-1">
                             <CustomerStatsList data={monthlyCustomerData} onPrintStatement={handlePrintCustomerStatementByName} />
                        </div>
                     </Card>

                     <div className="space-y-4 lg:col-span-5 xl:col-span-5">
                         {/* Sales Summary */}
                         <Card>
                              <h2 className="text-lg font-semibold mb-2 text-green-700">สรุปยอดขายแก๊ส (ถัง)</h2>
                              <div className="text-sm space-y-2">
                                  <div className="flex justify-between font-semibold border-b pb-1 text-gray-500">
                                      <span>ขนาด</span>
                                      <div className="flex gap-2">
                                          <span className="text-lime-600 w-12 text-right text-[10px]">สด/โอน</span>
                                          <span className="text-blue-600 w-12 text-right text-[10px]">เครดิต</span>
                                          <span className="text-gray-400 w-12 text-right text-[10px]">กำกับภาษี</span>
                                          <span className="w-10 text-right text-[10px]">รวม</span>
                                      </div>
                                  </div>
                                  {rangeData.salesStats.map(r => (
                                      <div key={r.size} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                                          <span>{r.size}</span>
                                          <div className="flex gap-2">
                                              <span className="text-lime-600 w-12 text-right">{r.cashTransferCount}</span>
                                              <span className="text-blue-600 w-12 text-right">{r.creditCount}</span>
                                              <span className="text-gray-500 w-12 text-right border-l pl-1 bg-gray-50 rounded-r">{r.taxInvoiceCount}</span>
                                              <span className="font-bold w-10 text-right">{r.count}</span>
                                          </div>
                                      </div>
                                  ))}
                                  {rangeData.salesStats.length === 0 && <p className="text-center text-gray-400 py-2">ไม่มีรายการขาย</p>}
                              </div>
                         </Card>

                         {/* Refill Expenses */}
                         <Card>
                              <h2 className="text-lg font-semibold mb-2 text-red-700">สรุปรายจ่าย (เติมแก๊ส)</h2>
                              <div className="text-sm space-y-2">
                                  <div className="flex justify-between font-semibold border-b pb-1 text-gray-500">
                                      <span>ขนาด</span>
                                      <div className="flex gap-4">
                                          <span className="text-lime-600 w-12 text-right">เงินสด</span>
                                          <span className="text-blue-600 w-12 text-right">เครดิต</span>
                                          <span className="w-12 text-right">รวม</span>
                                      </div>
                                  </div>
                                  {rangeData.refillStats.map(r => (
                                      <div key={r.size} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                                          <span>{r.size}</span>
                                          <div className="flex gap-4">
                                              <span className="text-lime-600 w-12 text-right">{r.cashCount}</span>
                                              <span className="text-blue-600 w-12 text-right">{r.creditCount}</span>
                                              <span className="font-bold w-12 text-right">{r.count}</span>
                                          </div>
                                      </div>
                                  ))}
                                  {rangeData.refillStats.length === 0 && <p className="text-center text-gray-400 py-2">ไม่มีรายการเติมแก๊ส</p>}
                              </div>

                              <div className="mt-4 pt-4 border-t">
                                  <div className="mb-2 flex items-center justify-center gap-2">
                                     <label className="text-sm font-semibold text-gray-600 text-red-500">1 กก. ราคา</label>
                                     <input 
                                         type="number" 
                                         value={gasReturnPrice} 
                                         onChange={(e) => setGasReturnPrice(e.target.value)}
                                         className="border border-red-300 rounded p-1 w-24 text-center text-red-600 font-bold focus:ring-red-500 focus:border-red-500"
                                         placeholder="0.00"
                                     />
                                     <span className="text-sm text-gray-500">บาท</span>
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                      <div className="text-center p-2 bg-slate-100 rounded">
                                          <p className="text-xs text-gray-500">น้ำหนักคืนรวม</p>
                                          <p className="font-bold text-blue-600">{returnKg.toFixed(2)} กก.</p>
                                      </div>
                                      <div className="text-center p-2 bg-slate-100 rounded">
                                          <p className="text-xs text-gray-500">มูลค่าคืนเนื้อ (คำนวณ)</p>
                                          <p className="font-bold text-red-600">{customReturnValue.toLocaleString()} ฿</p>
                                      </div>
                                  </div>
                              </div>
                         </Card>

                         {/* Expense Breakdown Table */}
                         <Card>
                             <h2 className="text-lg font-semibold mb-2 text-gray-700">สรุปรายจ่ายทั้งหมด</h2>
                             <table className="w-full text-sm text-left">
                                 <thead className="text-gray-500 bg-gray-50 border-b">
                                     <tr>
                                         <th className="py-2 px-1">ประเภท</th>
                                         <th className="py-2 px-1 text-right">ปริมาณแก๊ส</th>
                                         <th className="py-2 px-1 text-right">เงินสด</th>
                                         <th className="py-2 px-1 text-right">เครดิต</th>
                                         <th className="py-2 px-1 text-right">รวม</th>
                                     </tr>
                                 </thead>
                                 <tbody>
                                     {rangeData.expenseBreakdown.map((item, idx) => (
                                         <tr key={idx} className="border-b last:border-0">
                                             <td className="py-2 px-1">{item.type}</td>
                                             <td className="py-2 px-1 text-right text-gray-500">{item.totalGasQty > 0 ? item.totalGasQty : '-'}</td>
                                             <td className="py-2 px-1 text-right text-lime-600">{item.cashAmount.toLocaleString('th-TH', {maximumFractionDigits:0})}</td>
                                             <td className="py-2 px-1 text-right text-blue-600">{item.creditAmount.toLocaleString('th-TH', {maximumFractionDigits:0})}</td>
                                             <td className="py-2 px-1 text-right font-bold text-red-600">
                                                 {item.totalAmount.toLocaleString('th-TH', {minimumFractionDigits: 0})}
                                             </td>
                                         </tr>
                                     ))}
                                 </tbody>
                             </table>
                         </Card>
                     </div>
                 </div>
            </div>
        )}
      </div>

      {/* Fullscreen Printable Monthly Report Modal */}
      {showMonthlyReportModal && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-center items-start overflow-y-auto p-2 sm:p-6">
          <MonthlyReportA4
            selectedYear={reportDate.getFullYear()}
            selectedMonth={reportDate.getMonth()}
            customStartDate={monthlyStartDate}
            customEndDate={monthlyEndDate}
            onClose={() => setShowMonthlyReportModal(false)}
          />
        </div>
      )}

      {/* Fullscreen Printable Customer Statement Modal */}
      {statementCustomer && (
        <div className="fixed inset-0 z-50 bg-black/70 flex justify-center items-start overflow-y-auto p-2 sm:p-6">
          <CustomerStatementA4
            selectedCustomer={statementCustomer}
            selectedYear={reportDate.getFullYear()}
            selectedMonth={reportDate.getMonth()}
            onClose={() => setStatementCustomer(null)}
          />
        </div>
      )}
    </div>
  );
};

export default Dashboard;
