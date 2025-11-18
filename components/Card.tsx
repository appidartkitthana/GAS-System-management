import React from 'react';

interface CardProps {
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ children, className = '' }) => {
  return (
    <div className={`relative bg-white/90 p-4 rounded-xl shadow-md backdrop-blur-sm ${className}`}>
      {children}
    </div>
  );
};

export default Card;