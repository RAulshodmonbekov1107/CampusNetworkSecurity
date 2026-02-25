import React from 'react';
import { motion } from 'framer-motion';

interface StaggerContainerProps {
  children: React.ReactNode;
  stagger?: number;
  className?: string;
  style?: React.CSSProperties;
}

const containerVariants = {
  hidden: {},
  visible: (stagger: number) => ({
    transition: {
      staggerChildren: stagger,
    },
  }),
};

export const staggerItem = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: [0.33, 1, 0.68, 1] as [number, number, number, number] },
  },
};

const StaggerContainer: React.FC<StaggerContainerProps> = ({
  children,
  stagger = 0.06,
  className,
  style,
}) => {
  return (
    <motion.div
      variants={containerVariants}
      custom={stagger}
      initial="hidden"
      animate="visible"
      className={className}
      style={style}
    >
      {children}
    </motion.div>
  );
};

export default StaggerContainer;
