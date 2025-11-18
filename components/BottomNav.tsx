
import React from 'react';
import { Page } from '../App';
import HomeIcon from './icons/HomeIcon';
import ReceiptIcon from './icons/ReceiptIcon';
import UsersIcon from './icons/UsersIcon';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import CogIcon from './icons/CogIcon';

interface BottomNavProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const NavItem: React.FC<{
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, icon, isActive, onClick }) => {
  const activeClass = isActive ? 'text-orange-500' : 'text-gray-500';
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full pt-2 pb-1 transition-colors duration-200 ${activeClass} hover:text-orange-400`}
    >
      {icon}
      <span className="text-xs mt-1">{label}</span>
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-white/80 backdrop-blur-sm border-t border-gray-200 shadow-[0_-2px_10px_rgba(0,0,0,0.05)]">
      <div className="flex justify-around">
        <NavItem
          label="ภาพรวม"
          icon={<HomeIcon />}
          isActive={activePage === 'DASHBOARD'}
          onClick={() => setActivePage('DASHBOARD')}
        />
        <NavItem
          label="รายรับ/จ่าย"
          icon={<ReceiptIcon />}
          isActive={activePage === 'TRANSACTIONS'}
          onClick={() => setActivePage('TRANSACTIONS')}
        />
        <NavItem
          label="ลูกค้า"
          icon={<UsersIcon />}
          isActive={activePage === 'CUSTOMERS'}
          onClick={() => setActivePage('CUSTOMERS')}
        />
        <NavItem
          label="สต็อก"
          icon={<ArchiveBoxIcon />}
          isActive={activePage === 'INVENTORY'}
          onClick={() => setActivePage('INVENTORY')}
        />
        <NavItem
          label="ตั้งค่า"
          icon={<CogIcon />}
          isActive={activePage === 'SETTINGS'}
          onClick={() => setActivePage('SETTINGS')}
        />
      </div>
    </footer>
  );
};

export default BottomNav;