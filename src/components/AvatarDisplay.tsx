import React from 'react';
import { motion } from 'motion/react';
import { User, UserCircle } from 'lucide-react';

interface AvatarDisplayProps {
  type?: 'male' | 'female';
  imageUrl?: string;
  className?: string;
}

const AvatarDisplay: React.FC<AvatarDisplayProps> = ({ type, imageUrl, className = "w-32 h-32" }) => {
  return (
    <motion.div
      className={`${className} bg-neutral-800 rounded-[2rem] flex items-center justify-center border border-neutral-700 shadow-inner overflow-hidden relative`}
      initial={{ scale: 0.9, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {imageUrl ? (
        <img src={imageUrl} alt="Profile" className="w-full h-full object-cover" />
      ) : (
        <motion.div
          animate={{
            y: [0, -10, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        >
          {type === 'male' ? (
            <User className="w-20 h-20 text-brand-red" />
          ) : type === 'female' ? (
            <UserCircle className="w-20 h-20 text-brand-red" />
          ) : (
            <UserCircle className="w-20 h-20 text-neutral-50 font-bold" />
          )}
        </motion.div>
      )}
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
    </motion.div>
  );
};

export default AvatarDisplay;
