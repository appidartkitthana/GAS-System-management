import React from 'react';
import { Page } from '../types';
import { useApp } from '../context/AppContext';
import { normalizeGoogleDriveUrl } from '../lib/utils';
import somkiatOfficialLogo from '../src/assets/images/somkiat_official_logo_1786700374453.jpg';
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
      className={`group relative flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ${
        isActive
          ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500 text-white shadow-lg shadow-orange-500/30 scale-[1.03]'
          : 'text-slate-700 hover:text-orange-600 hover:bg-white/80'
      }`}
    >
      {imgSrc ? (
        <img
          src={imgSrc}
          alt={label}
          referrerPolicy="no-referrer"
          className={`w-6 h-6 object-cover rounded-lg shadow-sm transition-transform group-hover:scale-110 ${
            isActive ? 'ring-2 ring-white/70 shadow-orange-700/50' : 'border border-slate-200'
          }`}
        />
      ) : (
        <div
          className={`w-6 h-6 flex items-center justify-center rounded-lg transition-transform group-hover:scale-110 ${
            isActive ? 'text-white' : 'text-slate-600 group-hover:text-orange-500'
          }`}
        >
          {fallbackIcon}
        </div>
      )}
      <span className="tracking-tight text-[15px]">{label}</span>
      {isActive && (
        <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-4 h-1 bg-orange-600 rounded-full shadow-sm"></span>
      )}
    </button>
  );
};

const DesktopNav: React.FC<DesktopNavProps> = ({ activePage, setActivePage }) => {
  const { companyInfo, sales } = useApp();
  const todayStr = new Date().toLocaleDateString('th-TH', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });

  // Calculate today's sales count
  const todayISO = new Date().toISOString().split('T')[0];
  const todaySalesCount = sales.filter(s => s.date && s.date.startsWith(todayISO)).length;

  const rawLogo = companyInfo.logo || 'https://drive.google.com/file/d/19dJkwyQzqOrfZOSZNzqHqv6iDzs7qRq8/view?usp=sharing';
  const logoUrl = normalizeGoogleDriveUrl(rawLogo);
  const storeName = companyInfo.name || 'บริษัท สมเกียรติ เซอร์วิส แก๊ส จำกัด';

  return (
    <header className="hidden lg:block sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-orange-200/70 shadow-sm">
      <div className="w-full max-w-[1760px] mx-auto px-6 xl:px-8 py-3 flex items-center justify-between gap-6">
        {/* Logo & Store Title */}
        <div className="flex items-center gap-3.5 cursor-pointer group" onClick={() => setActivePage('DASHBOARD')}>
          <div className="p-1 bg-orange-50 rounded-xl border border-orange-200/80 shadow-sm group-hover:border-orange-300 transition-all">
            <img
              src={logoUrl}
              alt={storeName}
              referrerPolicy="no-referrer"
              onError={(e) => {
                const target = e.currentTarget;
                const step = target.dataset.step || '0';
                if (step === '0') {
                  target.dataset.step = '1';
                  target.src = 'https://lh3.googleusercontent.com/d/19dJkwyQzqOrfZOSZNzqHqv6iDzs7qRq8';
                } else if (step === '1') {
                  target.dataset.step = '2';
                  target.src = 'https://drive.google.com/uc?export=view&id=19dJkwyQzqOrfZOSZNzqHqv6iDzs7qRq8';
                } else {
                  target.src = somkiatOfficialLogo;
                }
              }}
              className="h-11 w-auto max-w-[150px] object-contain flex-shrink-0"
            />
          </div>
          <div>
            <h1 className="text-lg font-black text-slate-900 tracking-tight leading-tight group-hover:text-orange-600 transition-colors">
              {storeName}
            </h1>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-orange-600 font-bold tracking-wide">
                ระบบจัดการร้านก๊าซหุงต้ม
              </span>
              <span className="text-slate-300">•</span>
              <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-50 px-2 py-0.2 rounded-full border border-emerald-200">
                ออนไลน์
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Tabs - Large & Clear */}
        <nav className="flex items-center gap-2 bg-slate-100/90 p-1.5 rounded-2xl border border-slate-200/80 shadow-inner">
          <NavTab
            label="ภาพรวมร้าน"
            page="DASHBOARD"
            imgSrc={somkiatOfficialLogo}
            activePage={activePage}
            onClick={() => setActivePage('DASHBOARD')}
          />
          <NavTab
            label="รายการขาย/จ่าย"
            page="TRANSACTIONS"
            imgSrc={receipt3D}
            activePage={activePage}
            onClick={() => setActivePage('TRANSACTIONS')}
          />
          <NavTab
            label="รายงานสรุป"
            page="REPORTS"
            imgSrc={report3D}
            activePage={activePage}
            onClick={() => setActivePage('REPORTS')}
          />
          <NavTab
            label="ฐานข้อมูลลูกค้า"
            page="CUSTOMERS"
            imgSrc={customer3D}
            activePage={activePage}
            onClick={() => setActivePage('CUSTOMERS')}
          />
          <NavTab
            label="สต็อกสินค้า"
            page="INVENTORY"
            fallbackIcon={<ArchiveBoxIcon className="h-5 w-5" />}
            activePage={activePage}
            onClick={() => setActivePage('INVENTORY')}
          />
          <NavTab
            label="ตั้งค่าร้าน"
            page="SETTINGS"
            fallbackIcon={<CogIcon className="h-5 w-5" />}
            activePage={activePage}
            onClick={() => setActivePage('SETTINGS')}
          />
        </nav>

        {/* Right Info: Date & Quick Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5 text-xs text-slate-700 font-semibold bg-gradient-to-r from-orange-50 to-amber-50 px-4 py-2 rounded-xl border border-orange-200/80 shadow-sm">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-100 animate-pulse"></span>
            <span>{todayStr}</span>
            {todaySalesCount > 0 && (
              <span className="bg-orange-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                วันนี้ {todaySalesCount} บิล
              </span>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default DesktopNav;
