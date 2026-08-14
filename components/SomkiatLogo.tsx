import React from 'react';

interface SomkiatLogoProps {
  className?: string;
  size?: number | string;
}

export const SomkiatLogo: React.FC<SomkiatLogoProps> = ({ className = 'h-10 w-auto', size }) => {
  const style = size ? { width: size, height: size } : undefined;

  return (
    <svg
      viewBox="0 0 300 300"
      className={className}
      style={style}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Cyan Ring */}
      <circle cx="150" cy="150" r="138" fill="white" stroke="#2DD4BF" strokeWidth="7" />
      
      {/* "SOMKIAT" Text */}
      <text
        x="150"
        y="138"
        fill="#0D47A1"
        fontSize="46"
        fontWeight="900"
        fontStyle="italic"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        textAnchor="middle"
        letterSpacing="1.5"
      >
        SOMKIAT
      </text>

      {/* "SERVICE GAS" Blue Rectangle */}
      <rect x="24" y="150" width="252" height="42" fill="#0D47A1" rx="2" />

      {/* "SERVICE GAS" Text */}
      <text
        x="150"
        y="179"
        fill="white"
        fontSize="23"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
        textAnchor="middle"
        letterSpacing="3.5"
      >
        SERVICE GAS
      </text>
    </svg>
  );
};

export default SomkiatLogo;
