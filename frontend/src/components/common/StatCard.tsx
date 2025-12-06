import React from 'react';
import { Box, CardContent, Typography, SvgIconProps } from '@mui/material';
import { motion } from 'framer-motion';
import GlassCard from './GlassCard';

export interface StatCardProps {
    title: string;
    value: string | number;
    icon: React.ComponentType<SvgIconProps>;
    color: string;
    trend?: {
        value: number;
        isPositive: boolean;
    };
    delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon: Icon,
    color,
    trend,
    delay = 0,
}) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay, duration: 0.5, ease: [0.4, 0, 0.2, 1] }}
        >
            <GlassCard
                glowColor={color}
                hoverEffect
                animated={false}
                sx={{
                    cursor: 'pointer',
                    height: '100%',
                }}
            >
                <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                                {title}
                            </Typography>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ delay: delay + 0.2, duration: 0.5 }}
                            >
                                <Typography variant="h4" sx={{ fontWeight: 600, color }}>
                                    {value}
                                </Typography>
                            </motion.div>
                            {trend && (
                                <motion.div
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: delay + 0.3, duration: 0.4 }}
                                >
                                    <Typography
                                        variant="caption"
                                        sx={{
                                            color: trend.isPositive ? '#4caf50' : '#f44336',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 0.5,
                                            mt: 0.5,
                                        }}
                                    >
                                        {trend.isPositive ? '↑' : '↓'} {Math.abs(trend.value)}%
                                    </Typography>
                                </motion.div>
                            )}
                        </Box>
                        <motion.div
                            whileHover={{ rotate: [0, -10, 10, -10, 0], scale: 1.1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Box
                                sx={{
                                    width: 56,
                                    height: 56,
                                    borderRadius: 2,
                                    bgcolor: `${color}20`,
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    position: 'relative',
                                    '&::after': {
                                        content: '""',
                                        position: 'absolute',
                                        inset: 0,
                                        borderRadius: 2,
                                        padding: 2,
                                        background: `linear-gradient(135deg, ${color}40, transparent)`,
                                        WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                                        WebkitMaskComposite: 'xor',
                                        maskComposite: 'exclude',
                                        opacity: 0,
                                        transition: 'opacity 0.3s',
                                    },
                                    '&:hover::after': {
                                        opacity: 1,
                                    },
                                }}
                            >
                                <Icon sx={{ fontSize: 32, color }} />
                            </Box>
                        </motion.div>
                    </Box>
                </CardContent>
            </GlassCard>
        </motion.div>
    );
};

export default StatCard;
