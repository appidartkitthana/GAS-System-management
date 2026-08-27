import React, { useState, useMemo } from 'react';
import { Sale, Customer, PaymentMethod, InvoiceType, VatType } from '../types';
import { getGasWeightKg } from '../lib/utils';
import { getPaymentBadgeStyle, getVatBadgeStyle } from './SaleDetailModal';
import { 
  Eye, 
  Printer, 
  Pencil, 
  Trash2, 
  Search, 
  Calendar, 
  Flame, 
  ArrowUpDown, 
  FileText, 
  Truck, 
  ShoppingBag,
  LayoutList, 
  LayoutGrid, 
  Sparkles,
  AlertCircle,
  Tag,
  Receipt,
  User,
  MonitorSmartphone
} from 'lucide-react';

interface SaleTableViewProps {
  sales: Sale[];
  getCustomerById: (id?: string) => Customer | undefined;
  onViewDetails: (sale: Sale) => void;
  onPrintA4: (sale: Sale) => void;
  onPrintSlip: (sale: Sale) => void;
  onPrintDeliveryNote: (sale: Sale, defaultWithPrice: boolean) => void;
  onEdit: (sale: Sale) => void;
  onDelete: (saleId: string) => void;
}

// Delivery Note dropdown component for quick action
const DeliveryNoteDropdown: React.FC<{
  sale: Sale;
  onSelect: (withPrice: boolean) => void;
}> = ({ sale, onSelect }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative inline-block text-left" ref={dropdownRef} onClick={(e) => e.stopPropagation()}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="px-2 py-1 text-xs font-semibold text-orange-800 bg-orange-50 hover:bg-orange-100 border border-orange-300 rounded flex items-center gap-1 transition-colors"
        title="พิมพ์ใบส่งของ"
      >
        <Truck className="h-3.5 w-3.5 text-orange-600" />
        <span className="hidden xl:inline">ใบส่งของ</span>
        <svg className={`h-3 w-3 text-orange-600 transition-transform ${isOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div className="origin-top-right absolute right-0 mt-1 w-52 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-20 py-1 divide-y divide-gray-100">
          <button
            type="button"
            onClick={() => {
              onSelect(false);
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs text-gray-800 hover:bg-orange-50 hover:text-orange-900 flex items-center gap-2 font-semibold"
          >
            <span className="w-2 h-2 rounded-full bg-orange-500"></span>
            <span>ใบส่งของ (ไม่แสดงราคา)</span>
          </button>
          <button
            type="button"
            onClick={() => {
              onSelect(true);
              setIsOpen(false);
            }}
            className="w-full text-left px-3 py-2 text-xs text-gray-600 hover:bg-gray-50 hover:text-gray-900 flex items-center gap-2 font-medium"
          >
            <span className="w-2 h-2 rounded-full bg-gray-400"></span>
            <span>ใบส่งของ (แสดงราคา)</span>
          </button>
        </div>
      )}
    </div>
  );
};

const SaleTableView: React.FC<SaleTableViewProps> = ({
  sales,
  getCustomerById,
  onViewDetails,
  onPrintA4,
  onPrintSlip,
  onPrintDeliveryNote,
  onEdit,
  onDelete
}) => {
  const [selectedFilterTab, setSelectedFilterTab] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('ALL');
  const [sortField, setSortField] = useState<'date' | 'amount'>('date');
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
  const [viewLayout, setViewLayout] = useState<'auto' | 'table' | 'cards'>('auto');

  // Filter categories
  const filterTabs = [
    { id: 'ALL', label: 'ทั้งหมด' },
    { id: 'CASH', label: 'เงินสด' },
    { id: 'TRANSFER', label: 'เงินโอน' },
    { id: 'CREDIT', label: 'เครดิต' },
    { id: 'TAX_INVOICE', label: 'ใบกำกับภาษี' },
    { id: 'HAS_GAS_RETURN', label: 'มีคืนเนื้อแก๊ส' },
  ];

  // Filtered & Sorted Sales
  const filteredSales = useMemo(() => {
    return sales.filter(s => {
      // Tab filter
      if (selectedFilterTab === 'CASH' && s.payment_method !== PaymentMethod.CASH) return false;
      if (selectedFilterTab === 'TRANSFER' && s.payment_method !== PaymentMethod.TRANSFER) return false;
      if (selectedFilterTab === 'CREDIT' && s.payment_method !== PaymentMethod.CREDIT) return false;
      if (selectedFilterTab === 'TAX_INVOICE' && s.invoice_type !== InvoiceType.TAX_INVOICE) return false;
      if (selectedFilterTab === 'HAS_GAS_RETURN' && (!s.gas_return_kg || s.gas_return_kg <= 0)) return false;

      // Payment method select filter (if user selected in dropdown)
      if (selectedPaymentMethod !== 'ALL' && s.payment_method !== selectedPaymentMethod) {
        return false;
      }

      // Search term
      if (searchTerm.trim() !== '') {
        const term = searchTerm.toLowerCase();
        const customer = getCustomerById(s.customer_id);
        const custNameMatch = customer?.name.toLowerCase().includes(term);
        const custBranchMatch = customer?.branch?.toLowerCase().includes(term);
        const invMatch = (s.invoice_number || '').toLowerCase().includes(term);
        const dateMatch = new Date(s.date).toLocaleDateString('th-TH').includes(term);
        
        // Item search
        const itemMatch = s.items?.some(it => 
          it.brand.toLowerCase().includes(term) || 
          it.size.toLowerCase().includes(term) || 
          (it.item_name && it.item_name.toLowerCase().includes(term))
        );
        const tankMatch = (s.tank_brand || '').toLowerCase().includes(term) || (s.tank_size || '').toLowerCase().includes(term);

        if (!custNameMatch && !custBranchMatch && !invMatch && !dateMatch && !itemMatch && !tankMatch) {
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
        return sortOrder === 'desc' ? b.total_amount - a.total_amount : a.total_amount - b.total_amount;
      }
    });
  }, [sales, selectedFilterTab, selectedPaymentMethod, searchTerm, sortField, sortOrder, getCustomerById]);

  // Summary KPI Calculations
  const summary = useMemo(() => {
    let totalAmount = 0;
    let cashAmount = 0;
    let transferAmount = 0;
    let creditAmount = 0;
    let totalTanks = 0;
    let totalGasWeightKg = 0;
    let totalGasReturnKg = 0;
    let taxInvoiceCount = 0;

    filteredSales.forEach(s => {
      const amt = s.total_amount || 0;
      totalAmount += amt;
      if (s.payment_method === PaymentMethod.CASH) cashAmount += amt;
      else if (s.payment_method === PaymentMethod.TRANSFER) transferAmount += amt;
      else if (s.payment_method === PaymentMethod.CREDIT) creditAmount += amt;

      if (s.invoice_type === InvoiceType.TAX_INVOICE) taxInvoiceCount += 1;
      if (s.gas_return_kg) totalGasReturnKg += s.gas_return_kg;

      if (s.items && Array.isArray(s.items) && s.items.length > 0) {
        s.items.forEach(it => {
          if (it.item_type !== 'ACCESSORY') {
            const qty = it.quantity || 0;
            totalTanks += qty;
            totalGasWeightKg += qty * getGasWeightKg(it.size);
          }
        });
      } else {
        const qty = s.quantity || 0;
        totalTanks += qty;
        totalGasWeightKg += qty * getGasWeightKg(s.tank_size);
      }
    });

    return {
      count: filteredSales.length,
      totalAmount,
      cashAmount,
      transferAmount,
      creditAmount,
      totalTanks,
      totalGasWeightKg,
      totalGasReturnKg,
      taxInvoiceCount
    };
  }, [filteredSales]);

  const toggleSort = (field: 'date' | 'amount') => {
    if (sortField === field) {
      setSortOrder(prev => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  // Helper to render Items Sold Summary text/badges
  const renderItemsSummary = (sale: Sale) => {
    const items = sale.items && sale.items.length > 0 ? sale.items : [
      {
        brand: sale.tank_brand,
        size: sale.tank_size,
        quantity: sale.quantity,
        item_type: 'GAS'
      }
    ];

    return (
      <div className="space-y-0.5">
        {items.map((it, i) => (
          <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700">
            <span className="font-semibold text-slate-900">• {it.quantity}x</span>
            {it.item_type === 'ACCESSORY' ? (
              <span className="text-indigo-700">{it.item_name || 'อุปกรณ์เตาแก๊ส'}</span>
            ) : (
              <span>{it.brand} {it.size}</span>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. Filter Tabs Bar */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-3 sm:p-4">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <Tag className="w-4 h-4 text-emerald-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              ตัวกรองรายการขาย (Sales Filters)
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 font-medium">
            ทั้งหมด {sales.length} รายการ (รวม {sales.reduce((sum, s) => sum + (s.total_amount || 0), 0).toLocaleString('th-TH', { minimumFractionDigits: 2 })} บาท)
          </span>
        </div>

        {/* Filter Pills with horizontal scroll on mobile */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
          {filterTabs.map(tab => {
            const isSelected = selectedFilterTab === tab.id;
            let count = 0;
            if (tab.id === 'ALL') count = sales.length;
            else if (tab.id === 'CASH') count = sales.filter(s => s.payment_method === PaymentMethod.CASH).length;
            else if (tab.id === 'TRANSFER') count = sales.filter(s => s.payment_method === PaymentMethod.TRANSFER).length;
            else if (tab.id === 'CREDIT') count = sales.filter(s => s.payment_method === PaymentMethod.CREDIT).length;
            else if (tab.id === 'TAX_INVOICE') count = sales.filter(s => s.invoice_type === InvoiceType.TAX_INVOICE).length;
            else if (tab.id === 'HAS_GAS_RETURN') count = sales.filter(s => s.gas_return_kg && s.gas_return_kg > 0).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setSelectedFilterTab(tab.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-2 transition-all shrink-0 ${
                  isSelected
                    ? 'bg-emerald-800 text-white shadow-xs font-bold ring-2 ring-emerald-800/20'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
                }`}
              >
                <span>{tab.label}</span>
                <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Search Bar & Controls */}
      <div className="bg-white rounded-xl shadow-xs border border-slate-200/80 p-3 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ค้นหาชื่อลูกค้า, สาขา, เลขที่บิล, ยี่ห้อ/ขนาดแก๊ส..."
            className="w-full pl-9 pr-8 py-2 text-xs border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-slate-50/50 focus:bg-white"
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

        {/* Filter controls & Layout toggle */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Payment Method dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500 font-medium hidden sm:inline">ชำระ:</span>
            <select
              value={selectedPaymentMethod}
              onChange={(e) => setSelectedPaymentMethod(e.target.value)}
              className="text-xs p-2 border border-slate-300 rounded-lg bg-white font-medium text-slate-700 focus:ring-2 focus:ring-emerald-500"
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
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
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
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
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

      {/* 3. Summary KPI Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-gradient-to-br from-emerald-50 to-white border border-emerald-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">
            ยอดขายรวม (ตามตัวกรอง)
          </span>
          <div className="text-lg sm:text-xl font-black text-emerald-700 mt-0.5">
            +{summary.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-xs font-normal">฿</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            จำนวน {summary.count} บิล {summary.taxInvoiceCount > 0 && `(ใบกำกับ ${summary.taxInvoiceCount})`}
          </span>
        </div>

        <div className="bg-gradient-to-br from-lime-50 to-white border border-lime-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-lime-800 uppercase tracking-wider block">
            เงินสด (Cash)
          </span>
          <div className="text-lg sm:text-xl font-black text-lime-800 mt-0.5">
            {summary.cashAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">฿</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            โอน: {summary.transferAmount.toLocaleString('th-TH')} ฿
          </span>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-white border border-blue-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-blue-800 uppercase tracking-wider block">
            ยอดเครดิตค้างชำระ
          </span>
          <div className="text-lg sm:text-xl font-black text-blue-800 mt-0.5">
            {summary.creditAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} <span className="text-xs font-normal">฿</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            ลูกหนี้การค้าที่รอชำระ
          </span>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-white border border-orange-200 rounded-xl p-3 shadow-2xs">
          <span className="text-[10px] font-bold text-orange-800 uppercase tracking-wider block">
            ก๊าซที่ขายรวม
          </span>
          <div className="text-lg sm:text-xl font-black text-orange-700 mt-0.5">
            {summary.totalTanks} <span className="text-xs font-normal">ถัง</span>
          </div>
          <span className="text-[10px] text-slate-500 block mt-0.5">
            {summary.totalGasWeightKg > 0 ? `น้ำหนัก ${summary.totalGasWeightKg.toLocaleString()} กก.` : 'ไม่มีถังก๊าซ'}
            {summary.totalGasReturnKg > 0 && ` (คืน ${summary.totalGasReturnKg} กก.)`}
          </span>
        </div>
      </div>

      {/* 4. Main Presentation Layout */}
      {filteredSales.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-slate-300 p-8 text-center text-slate-500 space-y-2">
          <AlertCircle className="w-8 h-8 text-slate-400 mx-auto" />
          <p className="font-semibold text-slate-700">ไม่พบรายการขายตามเงื่อนไขที่เลือก</p>
          <p className="text-xs text-slate-400">ลองเปลี่ยนตัวกรอง หรือค้นหาด้วยคำอื่น</p>
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
                      <th className="py-3 px-3.5 w-32">เลขที่บิล</th>
                      <th className="py-3 px-3.5">ลูกค้า / สาขา</th>
                      <th className="py-3 px-3.5 w-52">รายการสินค้า / ถังก๊าซ</th>
                      <th className="py-3 px-3.5 w-32 text-center">ประเภทบิล & VAT</th>
                      <th className="py-3 px-3.5 w-28 text-center">วิธีชำระ</th>
                      <th className="py-3 px-3.5 w-32 text-right cursor-pointer hover:bg-slate-700" onClick={() => toggleSort('amount')}>
                        <div className="flex items-center justify-end gap-1">
                          <span>ยอดรวม (บาท)</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-400" />
                        </div>
                      </th>
                      <th className="py-3 px-3.5 w-44 text-center">จัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredSales.map((sale, idx) => {
                      const customer = getCustomerById(sale.customer_id);
                      const customerDisplay = customer ? customer.name : 'ลูกค้าทั่วไป';
                      const customerBranch = customer?.branch ? `(${customer.branch})` : '';
                      const paymentStyle = getPaymentBadgeStyle(sale.payment_method);
                      const vatStyle = getVatBadgeStyle(sale.vat_type);
                      const isTax = sale.invoice_type === InvoiceType.TAX_INVOICE;

                      return (
                        <tr 
                          key={sale.id}
                          className="hover:bg-emerald-50/40 transition-colors group cursor-pointer"
                          onClick={() => onViewDetails(sale)}
                        >
                          {/* # Index */}
                          <td className="py-3 px-3.5 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          {/* Date */}
                          <td className="py-3 px-3.5 font-medium text-slate-700 whitespace-nowrap">
                            <div>{new Date(sale.date).toLocaleDateString('th-TH')}</div>
                            <span className="text-[10px] text-slate-400 block font-normal">
                              {new Date(sale.date).toLocaleDateString('th-TH', { weekday: 'short' })}
                            </span>
                          </td>

                          {/* Invoice Number */}
                          <td className="py-3 px-3.5 font-mono text-slate-800 font-semibold">
                            {sale.invoice_number}
                          </td>

                          {/* Customer & Branch */}
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                              {customerDisplay}
                            </div>
                            {customerBranch && (
                              <span className="text-[11px] text-slate-500 block">
                                {customerBranch}
                              </span>
                            )}
                          </td>

                          {/* Items / Gas Tanks */}
                          <td className="py-3 px-3.5">
                            {renderItemsSummary(sale)}
                            {sale.gas_return_kg ? (
                              <span className="mt-1 inline-block text-[10px] text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 font-medium">
                                คืนแก๊ส {sale.gas_return_kg} กก.
                              </span>
                            ) : null}
                          </td>

                          {/* Invoice Type & VAT */}
                          <td className="py-3 px-3.5 text-center space-y-1">
                            <div>
                              <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${vatStyle.badge}`}>
                                {vatStyle.label}
                              </span>
                            </div>
                            {isTax && (
                              <div>
                                <span className="inline-block px-1.5 py-0.2 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                                  ใบกำกับภาษี
                                </span>
                              </div>
                            )}
                          </td>

                          {/* Payment Method */}
                          <td className="py-3 px-3.5 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold border ${paymentStyle.badge}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${paymentStyle.dot}`}></span>
                              {paymentStyle.label}
                            </span>
                          </td>

                          {/* Total Amount */}
                          <td className="py-3 px-3.5 text-right font-black text-emerald-700 whitespace-nowrap text-sm">
                            +{sale.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-3.5 text-center" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-center gap-1">
                              {/* View Details */}
                              <button
                                type="button"
                                onClick={() => onViewDetails(sale)}
                                className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                                title="ดูรายละเอียดรายการ"
                              >
                                <Eye className="w-4 h-4" />
                              </button>

                              {/* Delivery Note */}
                              <DeliveryNoteDropdown
                                sale={sale}
                                onSelect={(withPrice) => onPrintDeliveryNote(sale, withPrice)}
                              />

                              {/* Print A4 */}
                              <button
                                type="button"
                                onClick={() => onPrintA4(sale)}
                                className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                                title="พิมพ์ใบกำกับภาษี/ใบเสร็จ A4"
                              >
                                <FileText className="w-4 h-4" />
                              </button>

                              {/* Print Slip 80mm */}
                              <button
                                type="button"
                                onClick={() => onPrintSlip(sale)}
                                className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-lg transition-colors"
                                title="พิมพ์ใบเสร็จย่อ 80mm"
                              >
                                <Printer className="w-4 h-4" />
                              </button>

                              {/* Edit */}
                              <button
                                type="button"
                                onClick={() => onEdit(sale)}
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                title="แก้ไขรายการ"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>

                              {/* Delete */}
                              <button
                                type="button"
                                onClick={() => {
                                  if (confirm(`ต้องการลบรายการขายเลขที่ "${sale.invoice_number}" ใช่หรือไม่?`)) {
                                    onDelete(sale.id);
                                  }
                                }}
                                className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors"
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
                      <td colSpan={7} className="py-3 px-3.5 text-right">
                        ยอดขายรวมทั้งหมด ({filteredSales.length} บิล):
                      </td>
                      <td className="py-3 px-3.5 text-right text-emerald-700 font-black text-sm">
                        +{summary.totalAmount.toLocaleString('th-TH', { minimumFractionDigits: 2 })} ฿
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
              {filteredSales.map((sale) => {
                const customer = getCustomerById(sale.customer_id);
                const customerDisplay = customer ? customer.name : 'ลูกค้าทั่วไป';
                const customerBranch = customer?.branch ? `(${customer.branch})` : '';
                const paymentStyle = getPaymentBadgeStyle(sale.payment_method);
                const vatStyle = getVatBadgeStyle(sale.vat_type);
                const isTax = sale.invoice_type === InvoiceType.TAX_INVOICE;

                return (
                  <div 
                    key={sale.id}
                    onClick={() => onViewDetails(sale)}
                    className="bg-white rounded-xl shadow-xs border border-slate-200 p-4 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between"
                  >
                    <div>
                      {/* Top Header Row */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <h4 className="font-bold text-slate-900 text-base leading-tight">
                            {customerDisplay}
                          </h4>
                          {customerBranch && (
                            <p className="text-xs text-slate-500 mt-0.5">{customerBranch}</p>
                          )}
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-emerald-700 block">
                            +{sale.total_amount.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ฿
                          </span>
                          <span className="text-[10px] font-mono text-slate-400">
                            {sale.invoice_number}
                          </span>
                        </div>
                      </div>

                      {/* Items sold preview */}
                      <div className="bg-slate-50 rounded-lg p-2.5 my-2 border border-slate-100 space-y-1">
                        {renderItemsSummary(sale)}
                      </div>

                      {/* Badges Row */}
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${paymentStyle.badge}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${paymentStyle.dot}`}></span>
                          {paymentStyle.label}
                        </span>

                        <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold border ${vatStyle.badge}`}>
                          {vatStyle.label}
                        </span>

                        {isTax && (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            ใบกำกับภาษี
                          </span>
                        )}

                        {sale.gas_return_kg ? (
                          <span className="inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            คืนแก๊ส {sale.gas_return_kg} กก.
                          </span>
                        ) : null}
                      </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-3" onClick={(e) => e.stopPropagation()}>
                      <div className="text-[11px] text-slate-400">
                        {new Date(sale.date).toLocaleDateString('th-TH')}
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onViewDetails(sale)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-md"
                          title="ดูรายละเอียด"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        <DeliveryNoteDropdown
                          sale={sale}
                          onSelect={(withPrice) => onPrintDeliveryNote(sale, withPrice)}
                        />

                        <button
                          onClick={() => onPrintA4(sale)}
                          className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-md"
                          title="พิมพ์ A4"
                        >
                          <FileText className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onPrintSlip(sale)}
                          className="p-1.5 text-sky-600 hover:bg-sky-50 rounded-md"
                          title="พิมพ์สลิป 80mm"
                        >
                          <Printer className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => onEdit(sale)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-md"
                          title="แก้ไข"
                        >
                          <Pencil className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => {
                            if (confirm(`ต้องการลบรายการขายเลขที่ "${sale.invoice_number}" หรือไม่?`)) {
                              onDelete(sale.id);
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

export default SaleTableView;
