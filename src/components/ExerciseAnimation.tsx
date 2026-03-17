import React from 'react';
import { motion } from 'motion/react';

interface Props {
  exerciseName: string;
  className?: string;
  minimal?: boolean;
}

const ExerciseAnimation: React.FC<Props> = ({ exerciseName, className = "w-24 h-24", minimal = false }) => {
  const name = exerciseName.toLowerCase();
  
  // Determine animation type based on keywords
  let type = 'generic';
  if (name.includes('squat') || name.includes('leg press') || name.includes('lunges') || name.includes('calf')) type = 'squat';
  else if (name.includes('push-up') || name.includes('push up') || name.includes('bench press') || name.includes('dips')) type = 'push';
  else if (name.includes('pull-up') || name.includes('pull up') || name.includes('row') || name.includes('pulldown') || name.includes('face pull')) type = 'pull';
  else if (name.includes('curl') || name.includes('extension') || name.includes('fly')) type = 'arms';
  else if (name.includes('plank') || name.includes('crunch') || name.includes('twist') || name.includes('climber')) type = 'core';

  const strokeColor = "#ff3333"; // brighter red
  const strokeWidth = 5; // thicker lines for better visibility

  const renderAnimation = () => {
    // Add a filter for a subtle glow effect
    const defs = (
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>
    );

    switch (type) {
      case 'squat':
        return (
          <svg viewBox="0 0 100 100" className={className}>
            {defs}
            {/* Head */}
            <motion.circle 
              cx="50" cy="20" r="8" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} filter="url(#glow)"
              animate={{ cy: [20, 30, 20] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Torso */}
            <motion.line 
              x1="50" y1="28" x2="50" y2="55" 
              stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" filter="url(#glow)"
              animate={{ y1: [28, 38, 28], y2: [55, 65, 55] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Arms holding bar */}
            <motion.path 
              d="M 30 35 L 50 28 L 70 35" 
              stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"
              animate={{ d: ["M 30 35 L 50 28 L 70 35", "M 30 45 L 50 38 L 70 45", "M 30 35 L 50 28 L 70 35"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Barbell */}
            <motion.line 
              x1="15" y1="35" x2="85" y2="35" 
              stroke="#ffffff" strokeWidth={3} strokeLinecap="round"
              animate={{ y1: [35, 45, 35], y2: [35, 45, 35] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Legs */}
            <motion.path 
              d="M 50 55 L 40 90 M 50 55 L 60 90" 
              stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"
              animate={{ d: ["M 50 55 L 40 90 M 50 55 L 60 90", "M 50 65 L 35 90 M 50 65 L 65 90", "M 50 55 L 40 90 M 50 55 L 60 90"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        );
      case 'push':
        return (
          <svg viewBox="0 0 100 100" className={className}>
            {defs}
            {/* Floor */}
            <line x1="5" y1="85" x2="95" y2="85" stroke="#444" strokeWidth={3} strokeLinecap="round" />
            {/* Head */}
            <motion.circle 
              cx="75" cy="65" r="7" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} filter="url(#glow)"
              animate={{ cy: [65, 75, 65] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Body */}
            <motion.line 
              x1="25" y1="75" x2="70" y2="65" 
              stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" filter="url(#glow)"
              animate={{ y2: [65, 75, 65] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Arms */}
            <motion.path 
              d="M 65 66 L 65 85" 
              stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"
              animate={{ d: ["M 65 66 L 65 85", "M 65 76 L 75 85", "M 65 66 L 65 85"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Feet */}
            <line x1="25" y1="75" x2="20" y2="85" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" filter="url(#glow)" />
          </svg>
        );
      case 'pull':
        return (
          <svg viewBox="0 0 100 100" className={className}>
            {defs}
            {/* Bar */}
            <line x1="15" y1="15" x2="85" y2="15" stroke="#ffffff" strokeWidth={4} strokeLinecap="round" />
            {/* Head */}
            <motion.circle 
              cx="50" cy="45" r="8" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} filter="url(#glow)"
              animate={{ cy: [45, 25, 45] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Body */}
            <motion.line 
              x1="50" y1="53" x2="50" y2="80" 
              stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" filter="url(#glow)"
              animate={{ y1: [53, 33, 53], y2: [80, 60, 80] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Arms */}
            <motion.path 
              d="M 35 15 L 50 53 L 65 15" 
              stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"
              animate={{ d: ["M 35 15 L 50 53 L 65 15", "M 35 15 L 50 33 L 65 15", "M 35 15 L 50 53 L 65 15"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Legs */}
            <motion.path 
              d="M 50 80 L 45 95 M 50 80 L 55 95" 
              stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"
              animate={{ d: ["M 50 80 L 45 95 M 50 80 L 55 95", "M 50 60 L 45 75 M 50 60 L 55 75", "M 50 80 L 45 95 M 50 80 L 55 95"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        );
      case 'arms':
        return (
          <svg viewBox="0 0 100 100" className={className}>
            {defs}
            {/* Head */}
            <circle cx="50" cy="25" r="8" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} filter="url(#glow)" />
            {/* Body */}
            <line x1="50" y1="33" x2="50" y2="70" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" filter="url(#glow)" />
            {/* Legs */}
            <path d="M 50 70 L 40 95 M 50 70 L 60 95" stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" filter="url(#glow)" />
            {/* Static Arm */}
            <path d="M 50 35 L 65 50 L 65 70" stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
            {/* Animated Arm (Curl) */}
            <motion.path 
              d="M 50 35 L 35 50 L 35 70" 
              stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"
              animate={{ d: ["M 50 35 L 35 50 L 35 70", "M 50 35 L 35 50 L 35 30", "M 50 35 L 35 50 L 35 70"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Dumbbell */}
            <motion.circle 
              cx="35" cy="70" r="5" fill="#ffffff"
              animate={{ cy: [70, 30, 70] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        );
      case 'core':
        return (
          <svg viewBox="0 0 100 100" className={className}>
            {defs}
            {/* Floor */}
            <line x1="5" y1="85" x2="95" y2="85" stroke="#444" strokeWidth={3} strokeLinecap="round" />
            {/* Head */}
            <motion.circle 
              cx="25" cy="70" r="7" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} filter="url(#glow)"
              animate={{ cx: [25, 35, 25], cy: [70, 60, 70] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Body */}
            <motion.line 
              x1="31" y1="70" x2="60" y2="75" 
              stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" filter="url(#glow)"
              animate={{ x1: [31, 40, 31], y1: [70, 62, 70] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Arms */}
            <motion.path 
              d="M 35 70 L 25 60 L 15 70" 
              stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"
              animate={{ d: ["M 35 70 L 25 60 L 15 70", "M 40 65 L 30 55 L 20 65", "M 35 70 L 25 60 L 15 70"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Legs */}
            <path d="M 60 75 L 75 65 L 85 75" stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)" />
          </svg>
        );
      default:
        // Generic lifting animation
        return (
          <svg viewBox="0 0 100 100" className={className}>
            {defs}
            {/* Head */}
            <circle cx="50" cy="30" r="8" fill="none" stroke={strokeColor} strokeWidth={strokeWidth} filter="url(#glow)" />
            {/* Body */}
            <line x1="50" y1="38" x2="50" y2="65" stroke={strokeColor} strokeWidth={strokeWidth} strokeLinecap="round" filter="url(#glow)" />
            {/* Legs */}
            <path d="M 50 65 L 40 90 M 50 65 L 60 90" stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" filter="url(#glow)" />
            {/* Arms */}
            <motion.path 
              d="M 50 45 L 30 45 M 50 45 L 70 45" 
              stroke={strokeColor} strokeWidth={strokeWidth} fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#glow)"
              animate={{ d: ["M 50 45 L 30 45 M 50 45 L 70 45", "M 50 45 L 30 25 M 50 45 L 70 25", "M 50 45 L 30 45 M 50 45 L 70 45"] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            {/* Dumbbells */}
            <motion.circle 
              cx="30" cy="45" r="5" fill="#ffffff"
              animate={{ cy: [45, 25, 45] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.circle 
              cx="70" cy="45" r="5" fill="#ffffff"
              animate={{ cy: [45, 25, 45] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            />
          </svg>
        );
    }
  };

  if (minimal) {
    return (
      <div className="opacity-80 hover:opacity-100 transition-opacity">
        {renderAnimation()}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center p-4 bg-neutral-900/50 rounded-2xl border border-neutral-800 hover:border-brand-red/50 transition-colors group">
      <div className="opacity-80 group-hover:opacity-100 transition-opacity">
        {renderAnimation()}
      </div>
      <p className="mt-3 text-[10px] font-mono uppercase tracking-widest text-neutral-400 text-center group-hover:text-white transition-colors">
        {exerciseName}
      </p>
    </div>
  );
};

export default ExerciseAnimation;
