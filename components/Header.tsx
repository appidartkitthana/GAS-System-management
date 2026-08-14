
import React from 'react';
import gasLogo3D from '../src/assets/images/gas_3d_icon_1786670595534.jpg';

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, children }) => {
  return (
    <div className="flex justify-between items-center mb-5 bg-white/70 backdrop-blur-md p-3 rounded-2xl shadow-sm border border-orange-100/80">
      <div className="flex items-center gap-3">
        <div className="relative group">
          <div className="absolute -inset-1 bg-gradient-to-r from-orange-500 to-amber-500 rounded-2xl blur opacity-30 group-hover:opacity-70 transition duration-300"></div>
          <img
            src={gasLogo3D}
            alt="Gas 3D Icon"
            referrerPolicy="no-referrer"
            className="relative w-11 h-11 object-cover rounded-xl shadow-md border border-white"
          />
        </div>
        <div>
          <h1 className="text-xl font-extrabold text-slate-800 tracking-tight">{title}</h1>
          <p className="text-[10px] text-orange-600 font-semibold tracking-wide uppercase">ระบบจัดการร้านก๊าซหุงต้ม 3D</p>
        </div>
      </div>
      {children}
    </div>
  );
};

export default Header;
