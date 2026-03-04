
import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

const Logo: React.FC<LogoProps> = ({ className = "", size = 40 }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 100 100" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Background Shape */}
      <rect width="100" height="100" rx="24" fill="black" />
      <rect x="2" y="2" width="96" height="96" rx="22" stroke="#84cc16" strokeWidth="4" strokeOpacity="0.2" />
      
      {/* "S" part */}
      <path 
        d="M45 35H25V55H45V75H25" 
        stroke="#84cc16" 
        strokeWidth="12" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* "F" part */}
      <path 
        d="M55 75V35H75M55 55H70" 
        stroke="white" 
        strokeWidth="12" 
        strokeLinecap="round" 
        strokeLinejoin="round" 
      />
      
      {/* Accent Dot */}
      <circle cx="80" cy="20" r="6" fill="#84cc16" />
    </svg>
  );
};

export default Logo;
