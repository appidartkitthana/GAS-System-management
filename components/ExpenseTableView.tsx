import React, { useState, useMemo } from 'react';
import { Expense, PaymentMethod, ExpenseType } from '../types';
import { getGasWeightKg } from '../lib/utils';
import { getExpenseTypeColor, getPaymentMethodBadge } from './ExpenseDetailModal';
import { 
  Eye, 
  Printer, 
  Pencil, 
  Trash2, 
  Search, 
  Calendar, 
  Flame, 
  ArrowUpDown,
  LayoutList,
  LayoutGrid,
  AlertCircle,
  Tag,
  MonitorSmartphone
} from 'lucide-react';

interface ExpenseTableViewProps {
  expenses: Expense[];
  expenseTypes: string[];
  onViewDetails: (expense: Expense) => void;
  onPrint: (expense: Expense) => void;
  onEdit: (expense: Expense) => void;
  onDelete: (expenseId: string) => void;
}

const ExpenseTableView: React.FC<ExpenseTableViewProps> = ({
  expenses,
  expenseTypes,
  onViewDetails,
  onPrint,
  onEdit,
  onDelete
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewLayout, setViewLayout] = useState<'auto' | 'table' | 'cards'>('auto');

  // Collect all distinct category names from configured types + actual expenses
  const allCategories = useMemo(() => {
    const set = new Set<string>();
    expenseTypes.forEach(t => set.add(t));
    expenses.forEach(e => {
      if (e.type) set.add(e.type);
    });
    return Array.from(set);
  }, [expenseTypes, expenses]);

  // Compute category statistics (count & total amount for each category)
  const categoryStats = useMemo(() => {
    const stats: Record<string, { count: number; totalAmount: number }> = {};
    
    // Initialize
    allCategories.forEach(cat => {
      stats[cat] = { count: 0, totalAmount: 0 };
    });

    expenses.forEach(e => {
      const type = e.type || 'อื่นๆ';
      if (!stats[type]) {
        stats[type] = { count: 0, totalAmount: 0 };
      }
      stats[type].count += 1;
      stats[type].totalAmount += e.amount || 0;
    });

    return stats;
  }, [allCategories, expenses]);

  // Filtered and sorted expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => {
      // Category filter
      if (selectedCategory !== 'ALL' && e.type !== selectedCategory) {
        return false;
      }
      // Payment method filter
      if (selectedPaymentMethod !== 'ALL' && e.payment_method !== selectedPaymentMethod) {
        return false;
      }
      // Search filter
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const descMatch = (e.description || '').toLowerCase().includes(term);
        const payeeMatch = (e.payee || '').toLowerCase().includes(term);
        const typeMatch = (e.type || '').toLowerCase().includes(term);
        const dateMatch = new Date(e.date).toLocaleDateString('th-TH').includes(term);
        
        // Also search in refill item brand / size
        const refillMatch = e.refill_details?.some(r => 
          r.brand.toLowerCase().includes(term) || r.size.toLowerCase().includes(term)
        );

        if (!descMatch && !payeeMatch && !typeMatch && !dateMatch && !refillMatch) {
          return false;
        }
      }
      return true;
    }).sort((a, b) => {
      if (sortField === 'date') {
        const timeA = new Date(a.date).getTime();
        const timeB = new Date(b.date).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
      } else {
        return sortOrder === 'desc' ? b.amount - a.amount : a.amount - b.amount;
      }
    });
  }, [expenses, selectedCategory, selectedPaymentMethod, searchTerm, sortField, sortOrder]);

  // Summary calculations for the filtered result
  const summary = useMemo(() => {
    let totalAmount = 0;
    let cashAmount = 0;
    let transferAmount = 0;
    let creditAmount = 0;
    let totalRefillTanks = 0;
    let totalRefillWeightKg = 0;
    let totalGasReturnKg = 0;
    let totalGasReturnValue = 0;

    filteredExpenses.forEach(e => {
      const amt = e.amount || 0;
      totalAmount += amt;
      if (e.payment_method === PaymentMethod.CASH) cashAmount += amt;
      else if (e.payment_method === PaymentMethod.TRANSFER) transferAmount += amt;
      else if (e.payment_method === PaymentMethod.CREDIT) creditAmount += amt;

      if (e.refill_details && Array.isArray(e.refill_details)) {
        e.refill_details.forEach(item => {
          const qty = item.quantity || 0;
          totalRefillTanks += qty;
          totalRefillWeightKg += qty * getGasWeightKg(item.size);
        });
      } else if (e.refill_quantity) {
        totalRefillTanks += e.refill_quantity;
      }

      if (e.gas_return_kg) totalGasReturnKg += e.gas_return_kg;
      if (e.gas_return_amount) totalGasReturnValue += e.gas_return_amount;
    });

    return {
      count: filteredExpenses.length,
      totalAmount,
      cashAmount,
      transferAmount,
      creditAmount,
      totalRefillTanks,
      totalRefillWeightKg,
      totalGasReturnKg,
      totalGasReturnValue
    };
  }, [filteredExpenses]);

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <div className="space-y-4">
      {/* 1. Category Filter Section (แยกหมวดหมู่รายการ) */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-3.5 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-sky-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              หมวดหมู่รายจ่าย (Categories)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            ทั้งหมด {expenses.length} รายการ (รวม {expenses.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)
          </span>
        </div>

        {/* Category Horizontal Pills Filter */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {/* "All" button */}
          <button
            type="button"
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
              selectedCategory === 'ALL'
                ? 'bg-slate-900 text-white shadow-sm ring-2 ring-slate-900/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <span>ทั้งหมด</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
              selectedCategory === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {expenses.length}
            </span>
          </button>

          {/* Individual Category buttons */}
          {allCategories.map(cat => {
            const stat = categoryStats[cat] || { count: 0, totalAmount: 0 };
            const isSelected = selectedCategory === cat;
            const style = getExpenseTypeColor(cat);

            return (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all whitespace-nowrap shrink-0 ${
                  isSelected
                    ? `${style.bg} ring-2 ring-sky-500/40 shadow-xs font-bold`
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${style.dot}`}></span>
                <span>{cat}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-black/10 font-bold' : 'bg-slate-100 text-slate-600'
                }`}>
                  {stat.count}
                </span>
                {stat.totalAmount > 0 && (
                  <span className="text-[10px] opacity-75 font-mono hidden md:inline">
                    ({stat.totalAmount >= 1000 ? `${(stat.totalAmount / 1000).toFixed(1)}k` : stat.totalAmount.toLocaleString()} ฿)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Controls & Search Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหารายละเอียด, ร้านค้า/ผู้รับเงิน, ยี่ห้อแก๊ส..."
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 bg-slate-50/50 focus:bg-white"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter dropdowns & View layout toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Payment Method Filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">ชำระ:</span>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="text-xs p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:ring-2 focus:ring-sky-500"
            >
              <option value="ALL">วิธีชำระทั้งหมด</option>
              <option value={PaymentMethod.CASH}>เงินสด</option>
              <option value={PaymentMethod.TRANSFER}>เงินโอน</option>
              <option value={PaymentMethod.CREDIT}>เครดิต</option>
            </select>
          </div>

          {/* Sort Buttons */}
          <button
            type="button"
            onClick={() => toggleSort('date')}
            className={`px-2.5 py-1.5 text-xs rounded-lg border flex items-center gap-1 font-semibold transition-colors ${
              sortField === 'date'
                ? 'bg-sky-50 text-sky-700 border-sky-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="เรียงตามวันที่"
          >
            <Calendar className="w-3.5 h-3.5" />
            <span>วันที่</span>
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
          </button>

          <button
            type="button"
            onClick={() => toggleSort('amount')}
            className={`px-2.5 py-1.5 text-xs rounded-lg border flex items-center gap-1 font-semibold transition-colors ${
              sortField === 'amount'
                ? 'bg-rose-50 text-rose-700 border-rose-300'
                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
            }`}
            title="เรียงตามยอดเงิน"
          >
            <span>ยอดเงิน</span>
            <ArrowUpDown className="w-3 h-3 text-slate-400" />
          </button>

          {/* Layout Toggle (Auto vs Table vs Cards) */}
          <div className="flex border border-slate-300 rounded-lg overflow-hidden bg-slate-100 p-0.5 ml-auto sm:ml-0">
            <button
              type="button"
              onClick={() => setViewLayout('auto')}
              className={`px-2 py-1 rounded text-xs flex items-center gap-1 transition-colors ${
                viewLayout === 'auto' ? 'bg-white text-slate-800 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="อัตโนมัติ (มือถือเป็นการ์ด / คอมพิวเตอร์เป็นตาราง)"
            >
              <MonitorSmartphone className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">อัตโนมัติ</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('table')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewLayout === 'table' ? 'bg-white text-slate-800 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="มุมมองตาราง"
            >
              <LayoutList className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => setViewLayout('cards')}
              className={`p-1.5 rounded text-xs transition-colors ${
                viewLayout === 'cards' ? 'bg-white text-slate-800 shadow-xs font-bold' : 'text-slate-500 hover:text-slate-700'
              }`}
              title="มุมมองการ์ด"
            >
              <LayoutGrid className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* 3. Summary KPI Banner for Active Filter */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-gradient-to-br from-rose-50 to-white border border-rose-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-rose-700 uppercase tracking-wider block">
            ยอดรายจ่ายรวม (ตามตัวกรอง)
          </span>
          <div className="text-lg sm:text-xl font-black text-rose-600 mt-0.5">
            -{summary.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">฿</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            จำนวน {summary.count} รายการ
          </span>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider block">
            จ่ายสด (Cash)
          </span>
          <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">
            {summary.cashAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">฿</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            โอน: {summary.transferAmount.toLocaleString('th-TH')} ฿
          </span>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-700 uppercase tracking-wider block">
            ยอดเครดิต (Credit)
          </span>
          <div className="text-lg sm:text-xl font-black text-blue-700 mt-0.5">
            {summary.creditAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">฿</span>
          </div>
          <span className="text-[10px] text-slate-400 block mt-0.5">
            ยอดค้างชำระโรงบรรจุ/เจ้าหนี้
          </span>
        </div>

        <div className="bg-gradient-to-br from-sky-50 to-white border border-sky-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-sky-700 uppercase tracking-wider block">
            ก๊าซเติมโรงบรรจุรวม
          </span>
          <div className="text-lg sm:text-xl font-black text-sky-700 mt-0.5">
            {summary.totalRefillTanks} <span className="text-xs font-normal">ถัง</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {summary.totalRefillWeightKg > 0 ? `น้ำหนัก ${summary.totalRefillWeightKg.toLocaleString()} กก.` : 'ไม่มีถังเติม'}
          </span>
        </div>
      </div>

      {/* 4. Main Expense Presentation (Responsive Auto / Table / Cards) */}
      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-700">ไม่พบรายการรายจ่ายตามเงื่อนไขที่เลือก</p>
          <p className="text-xs text-slate-400">ลองเปลี่ยนหมวดหมู่ หรือคำค้นหา เพื่อดูรายการอื่น</p>
        </div>
      ) : (
        <>
          {/* TABLE VIEW (Active on Desktop if viewLayout === 'auto' OR if viewLayout === 'table') */}
          <div className={`${viewLayout === 'cards' ? 'hidden' : viewLayout === 'table' ? 'block' : 'hidden md:block'}`}>
            <div className="bg-white rounded-xl shadow-xs border border-slate-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-800 text-white font-semibold border-b border-slate-700">
                      <th className="py-3 px-3.5 w-12 text-center">#</th>
                      <th className="py-3 px-3.5 w-28 cursor-pointer hover:bg-slate-700" onClick={() => toggleSort('date')}>
                        <div className="flex items-center gap-1">
                          <span>วันที่</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-3.5 w-36">หมวดหมู่รายจ่าย</th>
                      <th className="py-3 px-3.5">รายละเอียด / ผู้รับเงิน</th>
                      <th className="py-3 px-3.5 w-44">รายการถัง / ก๊าซ</th>
                      <th className="py-3 px-3.5 w-28 text-center">วิธีชำระ</th>
                      <th className="py-3 px-3.5 w-32 text-right cursor-pointer hover:bg-slate-700" onClick={() => toggleSort('amount')}>
                        <div className="flex items-center justify-end gap-1">
                          <span>ยอดเงิน (บาท)</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-3.5 w-32 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((expense, idx) => {
                      const typeStyle = getExpenseTypeColor(expense.type);
                      const paymentStyle = getPaymentMethodBadge(expense.payment_method);
                      const isRefill = expense.type === ExpenseType.REFILL || expense.type === 'ค่าบรรจุก๊าซ';
                      const refillItems = expense.refill_details || [];
                      const totalTanks = refillItems.reduce((s, i) => s + (i.quantity || 0), 0) || expense.refill_quantity || 0;

                      return (
                        <tr 
                          key={expense.id} 
                          className="hover:bg-sky-50/40 transition-colors group cursor-pointer"
                          onClick={() => onViewDetails(expense)}
                        >
                          {/* # Index */}
                          <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Date */}
                          <td className="py-3 px-3.5 font-medium text-slate-700 whitespace-nowrap">
                            <div>{new Date(expense.date).toLocaleDateString('th-TH')}</div>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {new Date(expense.date).toLocaleDateString('th-TH', { weekday: 'short' })}
                            </span>
                          </td>

                          {/* Category Badge */}
                          <td className="py-3 px-3.5">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border ${typeStyle.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${typeStyle.dot}`}></span>
                              {expense.type}
                            </span>
                          </td>

                          {/* Description & Payee */}
                          <td className="py-3 px-3.5">
                            <div className="font-semibold text-slate-800 group-hover:text-sky-700 transition-colors">
                              {expense.description || '-'}
                            </div>
                            {expense.payee && (
                              <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                                <span className="text-slate-400">ผู้รับ:</span>
                                <span className="font-medium text-slate-700">{expense.payee}</span>
                              </div>
                            )}
                          </td>

                          {/* Gas Tanks info (if applicable) */}
                          <td className="py-3 px-3.5 text-slate-600">
                            {isRefill && totalTanks > 0 ? (
                              <div className="space-y-0.5">
                                <div className="flex items-center gap-1 font-bold text-sky-800">
                                  <Flame className="w-3 h-3 text-orange-500" />
                                  <span>{totalTanks} ถัง</span>
                                  {refillItems.length > 0 && (
                                    <span className="text-[11px] text-slate-500 font-normal">
                                      ({refillItems.map(r => `${r.quantity}x ${r.size.replace(' กก.', '')}`).join(', ')})
                                    </span>
                                  )}
                                </div>
                                {expense.gas_return_kg ? (
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 inline-block">
                                    คืนเนื้อ {expense.gas_return_kg} กก.
                                  </span>
                                ) : null}
                              </div>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>

                          {/* Payment Method */}
                          <td className="py-3 px-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${paymentStyle.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${paymentStyle.dot}`}></span>
                              {expense.payment_method}
                            </span>
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-3.5 text-right font-black text-rose-600 whitespace-nowrap text-sm">
                            -{expense.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              {/* View Details Button */}
                              <button
                                type="button"
                                onClick={() => onViewDetails(expense)}
                                className="p-1.5 text-sky-600 hover:bg-sky-100 rounded-lg transition-colors"
                                title="ดูรายละเอียดรายการ"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Print Receipt Button */}
                              <button
                                type="button"
                                onClick={() => onPrint(expense)}
                                className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                                title="พิมพ์ใบรับเงิน"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Edit Button */}
                              <button
                                type="button"
                                onClick={() => onEdit(expense)}
                                className="p-1.5 text-amber-600 hover:bg-amber-100 rounded-lg transition-colors"
                                title="แก้ไขรายการ"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {/* Delete Button */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`ต้องการลบรายการ "${expense.description || expense.type}" ใช่หรือไม่?`)) {
                                    onDelete(expense.id);
                                  }
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-100 rounded-lg transition-colors"
                                title="ลบรายการ"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold border-t-2 border-slate-300 text-slate-800">
                    <tr>
                      <td colSpan={6} className="py-3 px-3.5 text-right">
                        ยอดรวมทั้งหมด ({filteredExpenses.length} รายการ):
                      </td>
                      <td className="py-3 px-3.5 text-right text-rose-600 font-black text-sm">
                        -{summary.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
                      </td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>
          </div>

          {/* CARDS VIEW (Active on Mobile if viewLayout === 'auto' OR if viewLayout === 'cards') */}
          <div className={`${viewLayout === 'table' ? 'hidden' : viewLayout === 'cards' ? 'block' : 'block md:hidden'}`}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {filteredExpenses.map((expense) => {
                const typeStyle = getExpenseTypeColor(expense.type);
                const paymentStyle = getPaymentMethodBadge(expense.payment_method);
                const isRefill = expense.type === ExpenseType.REFILL || expense.type === 'ค่าบรรจุก๊าซ';
                const refillItems = expense.refill_details || [];
                const totalTanks = refillItems.reduce((s, i) => s + (i.quantity || 0), 0) || expense.refill_quantity || 0;

                return (
                  <div 
                    key={expense.id}
                    onClick={() => onViewDetails(expense)}
                    className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 hover:shadow-md hover:border-sky-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold border ${typeStyle.bg}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${typeStyle.dot}`}></span>
                          {expense.type}
                        </span>
                        <span className="text-base font-black text-rose-600">
                          -{expense.amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                        </span>
                      </div>

                      <h4 className="font-bold text-slate-800 text-sm mb-1">
                        {expense.description || expense.type}
                      </h4>

                      {expense.payee && (
                        <p className="text-xs text-slate-500 mb-2">
                          ผู้รับ: <span className="font-semibold text-slate-700">{expense.payee}</span>
                        </p>
                      )}

                      {isRefill && totalTanks > 0 && (
                        <div className="bg-sky-50 rounded-lg p-2 text-xs text-sky-900 border border-sky-200/80 mb-2 space-y-1">
                          <div className="flex items-center gap-1 font-bold">
                            <Flame className="w-3.5 h-3.5 text-orange-500" />
                            <span>{totalTanks} ถัง</span>
                          </div>
                          {refillItems.length > 0 && (
                            <div className="text-[11px] text-sky-700">
                              {refillItems.map((r, i) => (
                                <span key={i} className="mr-2">• {r.quantity}x {r.size} ({r.brand})</span>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-2 text-[11px] text-slate-400">
                        <span>{new Date(expense.date).toLocaleDateString('th-TH')}</span>
                        <span>•</span>
                        <span className={`px-1.5 py-0.2 rounded ${paymentStyle.badge}`}>
                          {expense.payment_method}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onViewDetails(expense)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-md"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onPrint(expense)}
                          className="p-1.5 text-slate-500 hover:bg-slate-100 rounded-md"
                          title="พิมพ์ใบรับเงิน"
                        >
                          <Printer className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => onEdit(expense)}
                          className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-md"
                          title="แก้ไข"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`ต้องการลบรายการ "${expense.description || expense.type}" หรือไม่?`)) {
                              onDelete(expense.id);
                            }
                          }}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-md"
                          title="ลบ"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ExpenseTableView;
