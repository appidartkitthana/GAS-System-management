
import React from 'react';

interface HeaderProps {
  title: string;
  children?: React.ReactNode;
}

const Header: React.FC<HeaderProps> = ({ title, children }) => {
  return (
    <div className="flex justify-between items-center mb-6">
      <h1 className="text-3xl font-bold text-gray-800">{title}</h1>
      {children}
    </div>
  );
};

export default Header;
