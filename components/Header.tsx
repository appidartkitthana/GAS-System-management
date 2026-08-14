
import React from 'react';
import { useApp } from '../context/AppContext';
import { normalizeGoogleDriveUrl } from '../lib/utils';
import somkiatOfficialLogo from '../src/assets/images/somkiat_official_logo_1786700374453.jpg';

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, children }) => {
  const { companyInfo } = useApp();
  const rawLogo = companyInfo.logo || 'https://drive.google.com/file/d/19dJkwyQzqOrfZOSZNzqHqv6iDzs7qRq8/view?usp=sharing';
  const logoUrl = normalizeGoogleDriveUrl(rawLogo);

  return (
    <div className="flex justify-between items-center mb-5 bg-white/70 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-orange-100/80">
      <div className="flex items-center gap-3">
        <img
          src={logoUrl}
          alt={companyInfo.name || 'บริษัท สมเกียรติ เซอร์วิส แก๊ส จำกัด'}
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
          className="h-10 w-auto max-w-[140px] object-contain flex-shrink-0"
        />
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">{title}</h1>
          <p className="text-[10px] text-orange-600 font-semibold tracking-wide uppercase">
            {companyInfo.name || 'บริษัท สมเกียรติ เซอร์วิส แก๊ส จำกัด'}
          </p>
        </div>
      </div>
      {children}
    </div>
  );
};

export default Header;

