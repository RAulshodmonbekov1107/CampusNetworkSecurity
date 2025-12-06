import React from 'react';
import { Card, CardProps, SxProps, Theme } from '@mui/material';
import { motion } from 'framer-motion';

export interface GlassCardProps extends Omit<CardProps, 'sx'> {
  glowColor?: string;
  hoverEffect?: boolean;
  animated?: boolean;
  intensity?: 'light' | 'medium' | 'strong';
  sx?: SxProps<Theme>;
}

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  glowColor = '#00bcd4',
  hoverEffect = true,
  animated = true,
  intensity = 'medium',
  sx = {},
  ...cardProps
}) => {
  const intensityMap = {
    light: {
      background: 'rgba(255, 255, 255, 0.03)',
      blur: '8px',
      border: 'rgba(255, 255, 255, 0.08)',
    },
    medium: {
      background: 'rgba(255, 255, 255, 0.05)',
      blur: '10px',
      border: 'rgba(255, 255, 255, 0.1)',
    },
    strong: {
      background: 'rgba(255, 255, 255, 0.1)',
      blur: '20px',
      border: 'rgba(255, 255, 255, 0.2)',
    },
  };

  const config = intensityMap[intensity];

  const cardStyles: SxProps<Theme> = {
    background: config.background,
    backdropFilter: `blur(${config.blur})`,
    WebkitBackdropFilter: `blur(${config.blur})`,
    border: `1px solid ${config.border}`,
    borderRadius: 3,
    transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
    position: 'relative',
    overflow: 'hidden',
    ...(hoverEffect && {
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0,
        left: '-100%',
        width: '100%',
        height: '100%',
        background: `linear-gradient(90deg, transparent, ${glowColor}20, transparent)`,
        transition: 'left 0.5s',
      },
      '&:hover::before': {
        left: '100%',
      },
      '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: `0 12px 32px ${glowColor}30`,
        borderColor: `${glowColor}40`,
      },
    }),
    ...sx,
  };

  if (animated) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        whileHover={hoverEffect ? { y: -4 } : undefined}
      >
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
