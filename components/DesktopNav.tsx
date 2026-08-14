import React from 'react';
import { Page } from '../types';
import gasLogo3D from '../src/assets/images/gas_3d_icon_1786670595534.jpg';
import receipt3D from '../src/assets/images/receipt_3d_icon_1786670608029.jpg';
import report3D from '../src/assets/images/report_3d_icon_1786670618205.jpg';
import customer3D from '../src/assets/images/customer_3d_icon_1786670628282.jpg';
import ArchiveBoxIcon from './icons/ArchiveBoxIcon';
import CogIcon from './icons/CogIcon';

interface DesktopNavProps {
  activePage: Page;
  setActivePage: (page: Page) => void;
}

interface NavTabProps {
  label: string;
  page: Page;
  imgSrc?: string;
  fallbackIcon?: React.ReactNode;
  activePage: Page;
  onClick: () => void;
}

const NavTab: React.FC<NavTabProps> = ({ label, page, imgSrc, fallbackIcon, activePage, onClick }) => {
  const isActive = activePage === page;
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-semibold transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/25 scale-[1.02]'
          : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
      }`}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={label}
          referrerPolicy="no-referrer"
          className={`w-5 h-5 object-cover rounded-md ${isActive ? 'ring-1 ring-white/50' : ''}`}
        />
      ) : (
        <div className={`w-5 h-5 flex items-center justify-center ${isActive ? 'text-white' : 'text-slate-500'}`}>
          {fallbackIcon}
        </div>
      )}
      <span>{label}</span>
    </button>
  );
};

const DesktopNav: React.FC<DesktopNavProps> = ({ activePage, setActivePage }) => {
  const todayStr = new Date().toLocaleDateString('th-TH', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  return (
    <header className="hidden lg:block sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-orange-100 shadow-sm">
      <div className="max-w-7xl mx-auto px-6 py-2.5 flex items-center justify-between gap-4">
        {/* Logo & Store Title */}
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActivePage('DASHBOARD')}>
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-40 group-hover:opacity-80 transition duration-300"></div>
            <img
              src={gasLogo3D}
              alt="LPG Gas Store"
              referrerPolicy="no-referrer"
              className="relative w-10 h-10 object-cover rounded-xl shadow-md border border-white"
            />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-slate-800 tracking-tight leading-tight">
              LPG Gas Manager
            </h1>
            <p className="text-[10px] text-orange-600 font-bold uppercase tracking-wider">
              ระบบจัดการร้านก๊าซหุงต้ม
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1.5 bg-slate-100/70 p-1.5 rounded-2xl border border-slate-200/60 shadow-inner">
          <NavTab
            label="ภาพรวม"
            page="DASHBOARD"
            imgSrc={gasLogo3D}
            activePage={activePage}
            onClick={() => setActivePage('DASHBOARD')}
          />
          <NavTab
            label="รายรับ/จ่าย"
            page="TRANSACTIONS"
            imgSrc={receipt3D}
            activePage={activePage}
            onClick={() => setActivePage('TRANSACTIONS')}
          />
          <NavTab
            label="รายงาน"
            page="REPORTS"
            imgSrc={report3D}
            activePage={activePage}
            onClick={() => setActivePage('REPORTS')}
          />
          <NavTab
            label="ลูกค้า"
            page="CUSTOMERS"
            imgSrc={customer3D}
            activePage={activePage}
            onClick={() => setActivePage('CUSTOMERS')}
          />
          <NavTab
            label="สต็อก"
            page="INVENTORY"
            fallbackIcon={<ArchiveBoxIcon className="h-4 w-4" />}
            activePage={activePage}
            onClick={() => setActivePage('INVENTORY')}
          />
          <NavTab
            label="ตั้งค่า"
            page="SETTINGS"
            fallbackIcon={<CogIcon className="h-4 w-4" />}
            activePage={activePage}
            onClick={() => setActivePage('SETTINGS')}
          />
        </nav>

        {/* Date Display Badge */}
        <div className="flex items-center gap-2 text-xs text-slate-600 font-medium bg-orange-50/80 px-3 py-1.5 rounded-xl border border-orange-200/60">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>{todayStr}</span>
        </div>
      </div>
    </header>
  );
};

export default DesktopNav;
