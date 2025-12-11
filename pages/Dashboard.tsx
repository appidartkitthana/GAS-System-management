
import React, { useState } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import { formatDateForInput } from '../lib/utils';
import { PaymentMethod, InventoryCategory } from '../types';

const SummaryCard: React.FC<{ title: string; amount: number; colorClass: string }> = ({ title, amount, colorClass }) => (
    <Card className="flex-1 text-center">
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-lg font-bold ${colorClass}`}>{amount.toLocaleString('th-TH')} ฿</p>
    </Card>
);

const FinancialCircleChart: React.FC<{ income: number; expense: number }> = ({ income, expense }) => {
    const total = income + expense;
    // Calculate percentage relative to total flow for visualization magnitude
    const incomePercent = total > 0 ? (income / total) * 100 : 0;
    const expensePercent = total > 0 ? (expense / total) * 100 : 0;

    return (
        <div className="flex flex-col sm:flex-row justify-center items-center py-6 gap-8 sm:gap-16 mt-4 border-t border-gray-100">
            {/* Income */}
            <div className="flex flex-col items-center">
                <div className="relative w-48 h-48">
                    <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                        {/* Background Ring */}
                        <path className="text-gray-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="2.5" />
                        {/* Value Ring */}
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

const CustomerStatsList: React.FC<{ data: { name: string; branch?: string; tanks: number; profit: number; total: number }[] }> = ({ data }) => {
    return (
        <div className="space-y-0">
             {data.length > 0 ? data.map((item, idx) => (
                <div key={idx} className="flex justify-between items-center py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors px-2 rounded-lg">
                    <div className="flex-1 min-w-0 pr-2">
                        <div className="font-semibold text-gray-800 text-sm truncate">{item.name}</div>
                        <div className="text-xs text-gray-400 truncate">{item.branch || 'สำนักงานใหญ่'}</div>
                    </div>
                    <div className="flex items-center gap-2 sm:gap-6 text-sm">
                        <div className="text-center w-8" title="จำนวน">
                            <span className="block font-bold text-gray-700">{item.tanks}</span>
                        </div>
                        <div className="text-right w-16 sm:w-20" title="กำไร (ประมาณการ)">
                            <span className="block font-medium text-gray-500 text-xs sm:text-sm">{item.profit.toLocaleString()}</span>
                        </div>
                        <div className="text-right w-20 sm:w-24" title="ยอดรวม">
                             <span className="block font-bold text-sky-600">{item.total.toLocaleString()}</span>
                        </div>
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
        )
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

const Dashboard: React.FC = () => {
    const { dailySummary, monthlySummary, reportDate, setReportDate, lowStockItems } = useAppContext();
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
    const [gasReturnPrice, setGasReturnPrice] = useState<string>('');

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const [year, month, day] = e.target.value.split('-').map(Number);
        setReportDate(new Date(year, month - 1, day));
    };

    const summary = viewMode === 'daily' ? dailySummary : monthlySummary;
    const titlePrefix = viewMode === 'daily' ? 'รายวัน' : 'รายเดือน';
    
    // Calculate custom return value
    const returnKg = monthlySummary.gasReturnKg;
    const pricePerKg = parseFloat(gasReturnPrice) || 0;
    const customReturnValue = returnKg * pricePerKg;

    const paymentChartData = [
        { name: PaymentMethod.CASH, value: dailySummary.cashIncome, color: 'text-lime-500' },
        { name: PaymentMethod.TRANSFER, value: dailySummary.transferIncome, color: 'text-purple-500' },
        { name: PaymentMethod.CREDIT, value: dailySummary.creditIncome, color: 'text-blue-500' },
    ].filter(item => item.value > 0);

    // Prepare Customer Data for List View
    const dailyCustomerData = dailySummary.salesByCustomer.map(s => ({
        name: s.customerName,
        branch: s.customerBranch,
        tanks: s.totalTanks,
        profit: s.totalProfit,
        total: s.totalAmount
    }));

    const monthlyCustomerData = monthlySummary.customerStats.map(s => ({
        name: s.name,
        branch: s.branch,
        tanks: s.tanks,
        profit: s.profit,
        total: s.total
    }));


    return (
    <div>
      <Header title="ภาพรวม">
        <input 
            type="date" 
            value={formatDateForInput(reportDate)} 
            onChange={handleDateChange}
            className="p-1.5 border border-gray-300 rounded-lg bg-white/80 shadow-inner text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
        />
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

      <div className="flex bg-white/80 p-1 rounded-lg shadow-inner backdrop-blur-sm mb-4">
        <button onClick={() => setViewMode('daily')} className={`w-full py-2 rounded-md transition-colors ${viewMode === 'daily' ? 'bg-orange-400 text-white shadow' : 'text-gray-600'}`}>รายวัน</button>
        <button onClick={() => setViewMode('monthly')} className={`w-full py-2 rounded-md transition-colors ${viewMode === 'monthly' ? 'bg-orange-400 text-white shadow' : 'text-gray-600'}`}>รายเดือน</button>
      </div>

      <div className="space-y-4">
        <Card>
            <h2 className="text-lg font-semibold mb-2 text-gray-700">สรุปการเงิน ({titlePrefix})</h2>
             <div className="flex space-x-2 mb-4">
                <SummaryCard title="รายรับ" amount={summary.income} colorClass="text-green-500" />
                <SummaryCard title="รายจ่าย" amount={summary.expense} colorClass="text-red-500" />
                <SummaryCard title="กำไรขั้นต้น" amount={summary.profit} colorClass="text-sky-500" />
            </div>
            <FinancialCircleChart income={summary.income} expense={summary.expense} />
        </Card>

        {viewMode === 'daily' && (
            <>
                <Card>
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
                    <div className="max-h-80 overflow-y-auto pr-1">
                        <CustomerStatsList data={dailyCustomerData} />
                    </div>
                </Card>

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
            </>
        )}

        {viewMode === 'monthly' && (
            <>
                 <Card>
                    <h2 className="text-lg font-semibold mb-4 text-sky-700 flex justify-between items-center">
                        <span>ยอดขายลูกค้าทั้งหมด (เดือนนี้)</span>
                        <span className="text-xs font-normal text-gray-400 bg-gray-100 px-2 py-1 rounded">เรียงตามยอดขาย</span>
                    </h2>
                     <div className="flex justify-between items-center px-2 pb-2 mb-2 border-b-2 border-gray-100 text-xs text-gray-500 font-semibold uppercase">
                        <div>ลูกค้า</div>
                        <div className="flex gap-2 sm:gap-6">
                            <div className="w-8 text-center">จำนวน</div>
                            <div className="w-16 sm:w-20 text-right">กำไร</div>
                            <div className="w-20 sm:w-24 text-right">ยอดรวม</div>
                        </div>
                    </div>
                    <div className="max-h-96 overflow-y-auto pr-1">
                         <CustomerStatsList data={monthlyCustomerData} />
                    </div>
                 </Card>

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
                         {monthlySummary.salesStats.map(r => (
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
                         {monthlySummary.salesStats.length === 0 && <p className="text-center text-gray-400 py-2">ไม่มีรายการขาย</p>}
                     </div>
                </Card>

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
                         {monthlySummary.refillStats.map(r => (
                             <div key={r.size} className="flex justify-between py-1 border-b border-gray-50 last:border-0">
                                 <span>{r.size}</span>
                                 <div className="flex gap-4">
                                     <span className="text-lime-600 w-12 text-right">{r.cashCount}</span>
                                     <span className="text-blue-600 w-12 text-right">{r.creditCount}</span>
                                     <span className="font-bold w-12 text-right">{r.count}</span>
                                 </div>
                             </div>
                         ))}
                         {monthlySummary.refillStats.length === 0 && <p className="text-center text-gray-400 py-2">ไม่มีรายการเติมแก๊ส</p>}
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
                            {monthlySummary.expenseBreakdown.map((item, idx) => (
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
            </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
