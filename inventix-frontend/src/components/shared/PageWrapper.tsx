import React, { useEffect } from 'react';
import { motion } from 'framer-motion';

export const PageWrapper: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
  useEffect(() => {
    document.title = `InvenTiX | ${title}`;
  }, [title]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      className="h-full flex flex-col"
    >
      {children}
    </motion.div>
  );
};
