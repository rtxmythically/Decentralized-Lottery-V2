import React from 'react';
import { motion } from 'framer-motion';

interface TreasureChestProps {
  isOpening: boolean;
  onAnimationComplete: () => void;
}

const TreasureChest: React.FC<TreasureChestProps> = ({ isOpening, onAnimationComplete }) => {
  return (
    <motion.div
      className="flex justify-center items-center animate-pulse"
      initial={{ scale: 1 }}
      animate={isOpening ? { scale: [1, 1.3, 1], rotate: [0, 10, -10, 0] } : {}}
      transition={{ duration: 2.5, ease: 'easeInOut' }}
      onAnimationComplete={onAnimationComplete}
    >
      <div className="text-9xl drop-shadow-lg">🗝️📦</div>
    </motion.div>
  );
};

export default TreasureChest;