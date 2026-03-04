import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';

const images = [
  "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=2070&auto=format&fit=crop", // Gym dark
  "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?q=80&w=2070&auto=format&fit=crop", // Weights
  "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?q=80&w=2070&auto=format&fit=crop", // Gym focus
  "https://images.unsplash.com/photo-1599058945522-28d584b6f0ff?q=80&w=2069&auto=format&fit=crop", // Workout
  "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?q=80&w=2070&auto=format&fit=crop"  // Trainer
];

const BackgroundSlideshow: React.FC = () => {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIndex((prev) => (prev + 1) % images.length);
    }, 8000); // Change every 8 seconds
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-neutral-950/90 z-10" /> {/* Heavy overlay for readability */}
      <AnimatePresence mode='wait'>
        <motion.img
          key={index}
          src={images[index]}
          initial={{ opacity: 0, scale: 1.1 }}
          animate={{ opacity: 0.4, scale: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2 }}
          className="absolute inset-0 w-full h-full object-cover"
          alt="Background"
        />
      </AnimatePresence>
    </div>
  );
};

export default BackgroundSlideshow;
