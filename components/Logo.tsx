
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
      
      {/* Stylized TK Logo */}
      <g transform="translate(5, 5) scale(0.9)">
        {/* T part */}
        <path 
          d="M25 35H60L57 43H45L38 75H28L35 43H25V35Z" 
          fill="#dc2626" 
        />
        {/* K part */}
        <path 
          d="M42 52L65 35H75L53 55L75 75H65L42 58V52Z" 
          fill="white" 
        />
      </g>
    </svg>
  );
};

export default Logo;
