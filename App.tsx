

import React, { useState } from 'react';
import BottomNav from './components/BottomNav';
import Dashboard from './pages/Dashboard';
import Transactions from './pages/Transactions';
import Reports from './pages/Reports';
import Customers from './pages/Customers';
import Inventory from './pages/Inventory';
import Settings from './pages/Settings';
import { AppProvider, useAppContext } from './context/AppContext';
import { Page } from './types';

const AppContent: React.FC = () => {
  const { loading, activePage, setActivePage } = useAppContext();

  const renderPage = () => {
    switch (activePage) {
      case 'DASHBOARD':
        return <Dashboard />;
      case 'TRANSACTIONS':
        return <Transactions />;
      case 'REPORTS':
        return <Reports />;
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

  const containerMaxWidth = activePage === 'REPORTS' ? 'max-w-5xl' : 'max-w-lg';

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-100 to-orange-100 text-gray-800">
      <div className={`container mx-auto ${containerMaxWidth} p-3 sm:p-4 pb-24 transition-all duration-300`}>
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