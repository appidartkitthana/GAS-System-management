
import React, { useState } from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import { formatDateForInput } from '../lib/utils';
import { PaymentMethod } from '../types';

const SummaryCard: React.FC<{ title: string; amount: number; colorClass: string }> = ({ title, amount, colorClass }) => (
    <Card className="flex-1 text-center">
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-lg font-bold ${colorClass}`}>{amount.toLocaleString('th-TH')} ฿</p>
    </Card>
);

const FinancialBarChart: React.FC<{ income: number; expense: number }> = ({ income, expense }) => {
    const total = income + expense;
    if (total === 0) {
        return <div className="text-center text-gray-400 py-8">ไม่มีข้อมูลสำหรับช่วงเวลานี้</div>;
    }
    const logIncome = income > 0 ? Math.log10(income + 1) : 0;
    const logExpense = expense > 0 ? Math.log10(expense + 1) : 0;
    const maxLog = Math.max(logIncome, logExpense);
    let incomeHeight = maxLog > 0 ? (logIncome / maxLog) * 100 : 0;
    if (income > 0 && incomeHeight < 2) incomeHeight = 2;
    let expenseHeight = maxLog > 0 ? (logExpense / maxLog) * 100 : 0;
    if (expense > 0 && expenseHeight < 2) expenseHeight = 2;

    return (
        <div className="h-48 flex items-end justify-around pt-4 border-t border-gray-200/80 mt-4">
            <div className="flex flex-col items-center w-1/3">
                <p className="text-sm font-semibold text-green-600">{income.toLocaleString('th-TH')}</p>
                <div className="w-12 bg-gradient-to-t from-green-400 to-green-500 rounded-t-lg transition-all duration-500 ease-out" style={{ height: `${incomeHeight}%` }}></div>
                <p className="text-xs text-gray-500 mt-1">รายรับ</p>
            </div>
            <div className="flex flex-col items-center w-1/3">
                <p className="text-sm font-semibold text-red-600">{expense.toLocaleString('th-TH')}</p>
                <div className="w-12 bg-gradient-to-t from-red-400 to-red-500 rounded-t-lg transition-all duration-500 ease-out" style={{ height: `${expenseHeight}%` }}></div>
                <p className="text-xs text-gray-500 mt-1">รายจ่าย</p>
            </div>
        </div>
    );
};

const DonutChart: React.FC<{ data: { name: string, value: number, color: string }[] }> = ({ data }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    const circumference = 15.915 * 2 * Math.PI;
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
    let accumulatedPercentage = 0;
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
    const { dailySummary, monthlySummary, inventory, reportDate, setReportDate } = useAppContext();
    const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const [year, month, day] = e.target.value.split('-').map(Number);
        setReportDate(new Date(year, month - 1, day));
    };

    const summary = viewMode === 'daily' ? dailySummary : monthlySummary;
    const titlePrefix = viewMode === 'daily' ? 'รายวัน' : 'รายเดือน';
    
    const paymentChartData = [
        { name: PaymentMethod.CASH, value: dailySummary.cashIncome, color: 'text-lime-500' },
        { name: PaymentMethod.TRANSFER, value: dailySummary.transferIncome, color: 'text-purple-500' },
        { name: PaymentMethod.CREDIT, value: dailySummary.creditIncome, color: 'text-blue-500' },
    ].filter(item => item.value > 0);

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
                <SummaryCard title="กำไร" amount={summary.profit} colorClass="text-sky-500" />
            </div>
            <FinancialBarChart income={summary.income} expense={summary.expense} />
        </Card>

        {viewMode === 'daily' && (
            <>
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
                <Card>
                    <h2 className="text-lg font-semibold mb-2 text-gray-700">ยอดขายตามลูกค้า (วันนี้)</h2>
                    <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                        {dailySummary.salesByCustomer.length > 0 ? dailySummary.salesByCustomer.map((sale) => (
                            <div key={sale.customerId} className="flex justify-between items-center text-sm py-1 border-b border-gray-100">
                                <p className="text-gray-600 truncate">{sale.customerName}</p>
                                <p className="font-semibold text-gray-800">{sale.totalAmount.toLocaleString('th-TH')} ฿</p>
                            </div>
                        )) : <p className="text-center text-gray-400 py-4">ไม่มีรายการขาย</p>}
                    </div>
                </Card>
            </>
        )}

        {viewMode === 'monthly' && (
            <>
                <Card>
                    <h2 className="text-lg font-semibold mb-2 text-gray-700">สรุปรายจ่ายแยกตามประเภท</h2>
                    <table className="w-full text-sm text-left">
                        <thead className="text-gray-500 bg-gray-50 border-b">
                            <tr>
                                <th className="py-2 px-2">ประเภท</th>
                                <th className="py-2 px-2 text-right">ครั้ง</th>
                                <th className="py-2 px-2 text-right">ถัง (เติม)</th>
                                <th className="py-2 px-2 text-right">ยอดเงิน</th>
                            </tr>
                        </thead>
                        <tbody>
                            {monthlySummary.expenseBreakdown.map((item, idx) => (
                                <tr key={idx} className="border-b last:border-0">
                                    <td className="py-2 px-2">{item.type}</td>
                                    <td className="py-2 px-2 text-right">{item.count}</td>
                                    <td className="py-2 px-2 text-right text-gray-500">
                                        {item.totalGasQty > 0 ? item.totalGasQty : '-'}
                                    </td>
                                    <td className="py-2 px-2 text-right font-bold text-red-600">
                                        {item.totalAmount.toLocaleString('th-TH', {minimumFractionDigits: 2})}
                                    </td>
                                </tr>
                            ))}
                             <tr className="bg-slate-100 font-bold">
                                <td className="py-2 px-2">รวมทั้งสิ้น</td>
                                <td className="py-2 px-2 text-right">
                                     {monthlySummary.expenseBreakdown.reduce((acc, i) => acc + i.count, 0)}
                                </td>
                                <td className="py-2 px-2 text-right">
                                     {monthlySummary.expenseBreakdown.reduce((acc, i) => acc + i.totalGasQty, 0)}
                                </td>
                                <td className="py-2 px-2 text-right text-red-600">
                                    {monthlySummary.expense.toLocaleString('th-TH', {minimumFractionDigits: 2})}
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </Card>

                <Card>
                    <h2 className="text-lg font-semibold mb-2 text-gray-700">สรุปลูกค้า (เดือนนี้)</h2>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="text-gray-500 bg-gray-50 border-b">
                                <tr>
                                    <th className="py-2 px-2">ชื่อ</th>
                                    <th className="py-2 px-2 text-right">ถัง</th>
                                    <th className="py-2 px-2 text-right">ยอดซื้อ</th>
                                    <th className="py-2 px-2 text-right text-sky-600">กำไร</th>
                                </tr>
                            </thead>
                            <tbody>
                                {monthlySummary.customerStats.length > 0 ? monthlySummary.customerStats.map(c => (
                                    <tr key={c.id} className="border-b last:border-0">
                                        <td className="py-2 px-2">{c.name}</td>
                                        <td className="py-2 px-2 text-right">{c.tanks}</td>
                                        <td className="py-2 px-2 text-right">{c.total.toLocaleString('th-TH')}</td>
                                        <td className="py-2 px-2 text-right font-bold text-sky-600">{c.profit.toLocaleString('th-TH')}</td>
                                    </tr>
                                )) : <tr><td colSpan={4} className="text-center py-4 text-gray-400">ไม่มีข้อมูล</td></tr>}
                            </tbody>
                        </table>
                    </div>
                </Card>
                <Card>
                     <h2 className="text-lg font-semibold mb-2 text-gray-700">สรุปเติมแก๊ส & คืนเนื้อ</h2>
                     <div className="grid grid-cols-2 gap-4 mb-4">
                         <div className="text-center p-2 bg-slate-100 rounded">
                             <p className="text-xs text-gray-500">น้ำหนักคืนรวม</p>
                             <p className="font-bold text-blue-600">{monthlySummary.gasReturnKg.toFixed(2)} กก.</p>
                         </div>
                     </div>
                     <div className="border-t pt-2">
                         <p className="text-sm font-semibold mb-2">จำนวนถังที่เติม</p>
                         <div className="space-y-1">
                             {monthlySummary.refillStats.map(r => (
                                 <div key={r.size} className="flex justify-between text-sm">
                                     <span>{r.size}</span>
                                     <span className="font-bold">{r.count} ถัง</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                </Card>
            </>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
