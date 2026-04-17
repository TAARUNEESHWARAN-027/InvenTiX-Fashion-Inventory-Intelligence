import React from 'react';
import { motion } from 'framer-motion';

export const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Loading data...' }) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 h-full min-h-[50vh]">
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
        className="w-12 h-12 border-4 border-navy-700 border-t-electric rounded-full mb-4 shadow-[0_0_15px_rgba(0,194,255,0.3)]"
      />
      <p className="text-electric font-mono text-sm tracking-widest uppercase animate-pulse">{message}</p>
    </div>
  );
};
