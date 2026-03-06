import React, { useEffect } from 'react';
import Logo from './Logo';

interface SplashScreenProps {
  onFinish: () => void;
}

const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onFinish();
    }, 2500); // Show for 2.5 seconds

    return () => clearTimeout(timer);
  }, [onFinish]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black animate-fade-out">
      <div className="animate-bounce-in">
        <Logo size={120} />
      </div>
      <h1 className="mt-8 text-4xl font-black tracking-tighter text-white uppercase italic brand-font animate-pulse">
        Speed <span className="text-red-600">Fit</span>
      </h1>
      <p className="mt-2 text-xs font-bold tracking-widest text-neutral-500 uppercase">
        Built to Transform
      </p>
    </div>
  );
};

export default SplashScreen;
