


import React from 'react';
import { Page } from '../types';
import gasLogo3D from '../src/assets/images/gas_3d_icon_1786670595534.jpg';
import receipt3D from '../src/assets/images/receipt_3d_icon_1786670608029.jpg';
import report3D from '../src/assets/images/report_3d_icon_1786670618205.jpg';
import customer3D from '../src/assets/images/customer_3d_icon_1786670628282.jpg';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import CogIcon from './icons/CogIcon';

interface BottomNavProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

const Nav3DItem: React.FC<{
  label: string;
  imgSrc?: string;
  fallbackIcon?: React.ReactNode;
  isActive: boolean;
  onClick: () => void;
}> = ({ label, imgSrc, fallbackIcon, isActive, onClick }) => {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center justify-center w-full py-1.5 transition-all duration-200 group ${
        isActive ? 'scale-105' : 'opacity-70 hover:opacity-100'
      }`}
    >
      <div className={`relative p-1 rounded-xl transition-all duration-300 ${
        isActive ? 'bg-gradient-to-tr from-orange-500 to-amber-400 shadow-md shadow-orange-500/30 ring-2 ring-orange-300' : 'bg-slate-100'
      }`}>
        {imgSrc ? (
          <img
            src={imgSrc}
            alt={label}
            referrerPolicy="no-referrer"
            className="w-6 h-6 object-cover rounded-lg transform group-hover:scale-110 transition-transform"
          />
        ) : (
          <div className={`w-6 h-6 flex items-center justify-center ${isActive ? 'text-white' : 'text-slate-600'}`}>
            {fallbackIcon}
          </div>
        )}
      </div>
      <span className={`text-[10px] mt-1 font-semibold whitespace-nowrap ${
        isActive ? 'text-orange-600 font-bold' : 'text-slate-500'
      }`}>
        {label}
      </span>
    </button>
  );
};

const BottomNav: React.FC<BottomNavProps> = ({ activePage, setActivePage }) => {
  return (
    <footer className="fixed bottom-0 left-0 right-0 max-w-2xl mx-auto bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] z-40 rounded-t-2xl">
      <div className="flex justify-around items-center px-1 py-0.5">
        <Nav3DItem
          label="ภาพรวม"
          imgSrc={gasLogo3D}
          isActive={activePage === 'DASHBOARD'}
          onClick={() => setActivePage('DASHBOARD')}
        />
        <Nav3DItem
          label="รายรับ/จ่าย"
          imgSrc={receipt3D}
          isActive={activePage === 'TRANSACTIONS'}
          onClick={() => setActivePage('TRANSACTIONS')}
        />
        <Nav3DItem
          label="รายงาน"
          imgSrc={report3D}
          isActive={activePage === 'REPORTS'}
          onClick={() => setActivePage('REPORTS')}
        />
        <Nav3DItem
          label="ลูกค้า"
          imgSrc={customer3D}
          isActive={activePage === 'CUSTOMERS'}
          onClick={() => setActivePage('CUSTOMERS')}
        />
        <Nav3DItem
          label="สต็อก"
          fallbackIcon={<ArchiveBoxIcon className="h-5 w-5" />}
          isActive={activePage === 'INVENTORY'}
          onClick={() => setActivePage('INVENTORY')}
        />
        <Nav3DItem
          label="ตั้งค่า"
          fallbackIcon={<CogIcon className="h-5 w-5" />}
          isActive={activePage === 'SETTINGS'}
          onClick={() => setActivePage('SETTINGS')}
        />
      </div>
    </footer>
  );
};

export default BottomNav;