import React from 'react';
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
        return <div className="text-center text-gray-400 py-8">ไม่มีข้อมูลสำหรับวันนี้</div>;
    }

    // Using a logarithmic scale to better visualize large differences.
    // Add 1 to handle values of 1 (log(1)=0) and prevent errors with 0.
    const logIncome = income > 0 ? Math.log10(income + 1) : 0;
    const logExpense = expense > 0 ? Math.log10(expense + 1) : 0;
    const maxLog = Math.max(logIncome, logExpense);

    // Calculate height, ensuring a minimum visible height for non-zero values
    let incomeHeight = maxLog > 0 ? (logIncome / maxLog) * 100 : 0;
    if (income > 0 && incomeHeight < 2) incomeHeight = 2; // min height 2%
    
    let expenseHeight = maxLog > 0 ? (logExpense / maxLog) * 100 : 0;
    if (expense > 0 && expenseHeight < 2) expenseHeight = 2; // min height 2%

    return (
        <div className="h-48 flex items-end justify-around pt-4 border-t border-gray-200/80 mt-4">
            <div className="flex flex-col items-center w-1/3">
                <p className="text-sm font-semibold text-green-600">{income.toLocaleString('th-TH')}</p>
                <div 
                    className="w-12 bg-gradient-to-t from-green-400 to-green-500 rounded-t-lg transition-all duration-500 ease-out"
                    style={{ height: `${incomeHeight}%` }}
                    aria-label={`รายรับ ${income} บาท`}
                ></div>
                <p className="text-xs text-gray-500 mt-1">รายรับ</p>
            </div>
            <div className="flex flex-col items-center w-1/3">
                <p className="text-sm font-semibold text-red-600">{expense.toLocaleString('th-TH')}</p>
                <div 
                    className="w-12 bg-gradient-to-t from-red-400 to-red-500 rounded-t-lg transition-all duration-500 ease-out"
                    style={{ height: `${expenseHeight}%` }}
                    aria-label={`รายจ่าย ${expense} บาท`}
                ></div>
                <p className="text-xs text-gray-500 mt-1">รายจ่าย</p>
            </div>
        </div>
    );
};

const DonutChart: React.FC<{ data: { name: string, value: number, color: string }[] }> = ({ data }) => {
    const total = data.reduce((acc, item) => acc + item.value, 0);
    const circumference = 15.915 * 2 * Math.PI; // Radius that makes circumference 100

    if (total === 0) {
        return (
            <div className="relative w-32 h-32">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                    <circle
                        cx="18" cy="18" r="15.915"
                        className="stroke-current text-gray-200"
                        fill="transparent"
                        strokeWidth="3"
                    ></circle>
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
                    const strokeDashoffset = circumference - (accumulatedPercentage / 100) * circumference;
                    accumulatedPercentage += percentage;
                    
                    return (
                        <circle
                            key={index}
                            cx="18" cy="18" r="15.915"
                            className={`stroke-current ${color}`}
                            fill="transparent"
                            strokeWidth="3"
                            strokeDasharray={`${percentage} ${100 - percentage}`}
                            strokeDashoffset={-accumulatedPercentage + percentage}
                            style={{ transition: 'stroke-dashoffset 0.5s' }}
                        ></circle>
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
    const { reportSummary, inventory, reportDate, setReportDate } = useAppContext();

    const totalTanks = inventory.reduce((acc, item) => acc + item.total, 0);
    const fullTanks = inventory.reduce((acc, item) => acc + item.full, 0);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const [year, month, day] = e.target.value.split('-').map(Number);
        const newDate = new Date(year, month - 1, day);
        setReportDate(newDate);
    };

    const getHeaderText = () => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const reportDay = new Date(reportDate);
        reportDay.setHours(0, 0, 0, 0);

        if (reportDay.getTime() === today.getTime()) {
            return "ภาพรวมวันนี้";
        }
        return `ภาพรวมวันที่ ${reportDate.toLocaleDateString('th-TH', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    };
    
    const paymentChartData = [
        { name: PaymentMethod.CASH, value: reportSummary.cashIncome, color: 'text-lime-500' },
        { name: PaymentMethod.TRANSFER, value: reportSummary.transferIncome, color: 'text-purple-500' },
        { name: PaymentMethod.CREDIT, value: reportSummary.creditIncome, color: 'text-blue-500' },
    ].filter(item => item.value > 0);


  return (
    <div>
      <Header title={getHeaderText()}>
        <input 
            type="date" 
            value={formatDateForInput(reportDate)} 
            onChange={handleDateChange}
            className="p-1.5 border border-gray-300 rounded-lg bg-white/80 shadow-inner text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
        />
      </Header>

      <div className="space-y-4">
        <Card>
            <h2 className="text-lg font-semibold mb-2 text-gray-700">สรุปการเงิน</h2>
             <div className="flex space-x-2 mb-4">
                <SummaryCard title="รายรับ" amount={reportSummary.income} colorClass="text-green-500" />
                <SummaryCard title="รายจ่าย" amount={reportSummary.expense} colorClass="text-red-500" />
                <SummaryCard title="กำไร" amount={reportSummary.profit} colorClass="text-sky-500" />
            </div>
            <FinancialBarChart income={reportSummary.income} expense={reportSummary.expense} />
        </Card>

        <Card>
            <h2 className="text-lg font-semibold mb-2 text-gray-700">สรุปการชำระเงิน</h2>
            <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                    <DonutChart data={paymentChartData} />
                </div>
                <div className="flex-grow space-y-2">
                    {paymentChartData.map(item => (
                        <div key={item.name} className="flex justify-between items-center text-sm">
                            <div className="flex items-center">
                                <span className={`w-3 h-3 rounded-full mr-2 ${item.color.replace('text-', 'bg-')}`}></span>
                                <span>{item.name}</span>
                            </div>
                            <span className="font-semibold">{item.value.toLocaleString('th-TH')} ฿</span>
                        </div>
                    ))}
                    {paymentChartData.length === 0 && <p className="text-gray-400">ไม่มีรายรับสำหรับวันนี้</p>}
                </div>
            </div>
        </Card>

        <Card>
            <h2 className="text-lg font-semibold mb-2 text-gray-700">สรุปสต็อกด่วน</h2>
            <div className="flex space-x-2">
                <div className="flex-1 text-center p-2 bg-slate-100 rounded-lg">
                    <p className="text-sm text-gray-500">ถังทั้งหมด</p>
                    <p className="text-2xl font-bold text-gray-800">{totalTanks}</p>
                </div>
                <div className="flex-1 text-center p-2 bg-slate-100 rounded-lg">
                    <p className="text-sm text-gray-500">ถังเต็ม</p>
                    <p className="text-2xl font-bold text-green-600">{fullTanks}</p>
                </div>
                 <div className="flex-1 text-center p-2 bg-slate-100 rounded-lg">
                    <p className="text-sm text-gray-500">ถังเปล่า</p>
                    <p className="text-2xl font-bold text-orange-500">{totalTanks - fullTanks}</p>
                </div>
            </div>
        </Card>
        
        <Card>
            <h2 className="text-lg font-semibold mb-2 text-gray-700">ยอดขายตามลูกค้า</h2>
            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">
                {reportSummary.salesByCustomer.length > 0 ? (
                    reportSummary.salesByCustomer.map((sale) => (
                        <div key={sale.customerId} className="flex justify-between items-center text-sm py-1 border-b border-gray-100 last:border-b-0">
                            <p className="text-gray-600 truncate pr-2">{sale.customerName}</p>
                            <p className="font-semibold text-gray-800 whitespace-nowrap">{sale.totalAmount.toLocaleString('th-TH')} ฿</p>
                        </div>
                    ))
                ) : (
                    <p className="text-center text-gray-400 py-4">ไม่มีรายการขายสำหรับวันนี้</p>
                )}
            </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;