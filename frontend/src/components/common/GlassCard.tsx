import React from 'react';
import { Card, CardProps, SxProps, Theme } from '@mui/material';
import { motion } from 'framer-motion';
import { staggerItem } from './StaggerContainer';

export interface GlassCardProps extends Omit<CardProps, 'sx'> {
  glowColor?: string;
  hoverEffect?: boolean;
  animated?: boolean;
  sx?: SxProps<Theme>;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  hoverEffect = true,
  animated = true,
  sx = {},
  ...cardProps
}) => {
  const cardStyles: SxProps<Theme> = {
    background: '#0f172a',
    border: '0.5px solid rgba(148, 163, 184, 0.08)',
    borderRadius: '8px',
    transition: 'border-color 0.25s ease',
    position: 'relative',
    overflow: 'hidden',
    boxShadow: 'none',
    ...(hoverEffect && {
      '&:hover': {
        borderColor: 'rgba(59, 130, 246, 0.2)',
      },
    }),
    ...sx,
  };

  if (animated) {
    return (
      <motion.div variants={staggerItem}>
        <Card sx={cardStyles} {...cardProps}>
          {children}
        </Card>
      </motion.div>
    );
  }

  return (
    <Card sx={cardStyles} {...cardProps}>
      {children}
    </Card>
  );
};

export default GlassCard;
