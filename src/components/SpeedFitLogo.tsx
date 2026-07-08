import React from 'react';

export const SpeedFitLogo = () => {
  return (
    <div className="flex items-center gap-3">
      <div className="relative font-black text-2xl tracking-tighter flex items-center justify-center">
        {/* White TK */}
        <span className="text-white italic">TK</span>
        {/* Red Accent for pop */}
        <div className="absolute inset-x-0 bottom-0 h-1 bg-red-600 rounded-full opacity-80"></div>
      </div>
      
      <div className="flex flex-col uppercase tracking-widest text-[10px] font-mono leading-tight">
        <span className="text-white font-extrabold text-xs">SPEED FIT</span>
        <span className="text-red-500 font-bold">Build to Transform</span>
      </div>
    </div>
  );
};
