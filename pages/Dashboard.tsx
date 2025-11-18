import React from 'react';
import Header from '../components/Header';
import Card from '../components/Card';
import { useAppContext } from '../context/AppContext';
import { formatDateForInput } from '../lib/utils';

const SummaryCard: React.FC<{ title: string; amount: number; colorClass: string }> = ({ title, amount, colorClass }) => (
    <Card className="flex-1 text-center">
        <p className="text-sm text-gray-500">{title}</p>
        <p className={`text-2xl font-bold ${colorClass}`}>{amount.toLocaleString('th-TH')} ฿</p>
    </Card>
);

const Dashboard: React.FC = () => {
    const { reportSummary, inventory, reportDate, setReportDate } = useAppContext();

    const totalTanks = inventory.reduce((acc, item) => acc + item.total, 0);
    const fullTanks = inventory.reduce((acc, item) => acc + item.full, 0);

    const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        // Handle timezone offset by creating date from string
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
            <div className="flex space-x-2">
                <SummaryCard title="รายรับ" amount={reportSummary.income} colorClass="text-green-500" />
                <SummaryCard title="รายจ่าย" amount={reportSummary.expense} colorClass="text-red-500" />
                <SummaryCard title="กำไร" amount={reportSummary.profit} colorClass="text-sky-500" />
            </div>
        </Card>

        <Card>
            <h2 className="text-lg font-semibold mb-2 text-gray-700">สรุปการชำระเงิน</h2>
            <div className="flex space-x-2">
                <SummaryCard title="เงินสด" amount={reportSummary.cashIncome} colorClass="text-lime-600" />
                <SummaryCard title="เงินโอน" amount={reportSummary.transferIncome} colorClass="text-purple-600" />
                <SummaryCard title="เครดิต" amount={reportSummary.creditIncome} colorClass="text-blue-600" />
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
        
        {/* Quick Actions can be added here */}
      </div>
    </div>
  );
};

export default Dashboard;