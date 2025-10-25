import React from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface PrizeCardProps {
  tier: number;
  amount: string;
  left: number;
  total: number;
  probability: number;
}

const PrizeCard: React.FC<PrizeCardProps> = ({ tier, amount, left, total, probability }) => {
  const { t } = useTranslation();

  return (
    <motion.div
      whileHover={{ scale: 1.05, y: -5 }}
      className="prize-card"
    >
      <h3 className="text-xl font-bold text-white mb-2">
        {tier === 6 ? t('thanks') : t('tier', { tier })}
      </h3>
      <p className="text-blue-200">{t('amount', { amount })}</p>
      <p className="text-blue-200">{t('left', { left, total })}</p>
      <p className="text-blue-200">{t('probability', { prob: probability })}</p>
    </motion.div>
  );
};

export default PrizeCard;