import React, { useState } from 'react';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import { AppProvider, useAppContext } from './context/AppContext';

export type Page = 'DASHBOARD' | 'TRANSACTIONS' | 'CUSTOMERS' | 'INVENTORY' | 'SETTINGS';


const AppContent: React.FC = () => {
  const [activePage, setActivePage] = useState<Page>('DASHBOARD');
  const { loading } = useAppContext();

  const renderPage = () => {
    switch (activePage) {
      case 'DASHBOARD':
        return <Dashboard />;
      case 'TRANSACTIONS':
        return <Transactions />;
      case 'CUSTOMERS':
        return <Customers />;
      case 'INVENTORY':
        return <Inventory />;
      case 'SETTINGS':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-100 to-orange-100">
        <div className="text-xl font-semibold text-gray-600 animate-pulse">กำลังโหลดข้อมูล...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-orange-100 text-gray-800">
      <div className="container mx-auto max-w-lg p-4 pb-24">
        {renderPage()}
      </div>
      <BottomNav activePage={activePage} setActivePage={setActivePage} />
    </div>
  );
}


const App: React.FC = () => {
  return (
    <AppProvider>
      <AppContent />
    </AppProvider>
  );
};

export default App;