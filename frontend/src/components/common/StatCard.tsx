import React from 'react';
import { Box, Typography } from '@mui/material';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import SparkLine from './SparkLine';
import AnimatedCounter from './AnimatedCounter';
import { staggerItem } from './StaggerContainer';

export interface StatCardProps {
    title: string;
    value: string | number;
    icon: LucideIcon;
    color?: string;
    change?: number;
    sparkData?: number[];
    format?: (n: number) => string;
    delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
    title,
    value,
    icon: Icon,
    color = '#3b82f6',
    change,
    sparkData = [],
    format,
}) => {
    const numericValue = typeof value === 'string' ? parseFloat(value.replace(/[^0-9.]/g, '')) || 0 : value;
    const displayFormat = format || ((n: number) => typeof value === 'string' ? value : n.toLocaleString());

    return (
        <motion.div variants={staggerItem}>
            <Box
                sx={{
                    background: '#0f172a',
                    border: '0.5px solid rgba(148, 163, 184, 0.08)',
                    borderRadius: '8px',
                    p: '14px 16px',
                    transition: 'border-color 0.25s ease',
                    cursor: 'default',
                    '&:hover': {
                        borderColor: 'rgba(59, 130, 246, 0.2)',
                    },
                }}
            >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Typography
                        sx={{
                            fontSize: '0.6875rem',
                            fontWeight: 500,
                            letterSpacing: '0.04em',
                            textTransform: 'uppercase',
                            color: '#64748b',
                        }}
                    >
                        {title}
                    </Typography>
                    <Icon size={15} color="#475569" strokeWidth={1.5} />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 1 }}>
                    <Box>
                        <Box sx={{
                            fontFamily: '"JetBrains Mono", monospace',
                            fontWeight: 600,
                            fontSize: '1.375rem',
                            lineHeight: 1.2,
                            color: '#e2e8f0',
                            letterSpacing: '-0.02em',
                        }}>
                            {typeof value === 'string' ? value : (
                                <AnimatedCounter value={numericValue} format={displayFormat} />
                            )}
                        </Box>
                        {change !== undefined && (
                            <Typography
                                sx={{
                                    fontSize: '0.6875rem',
                                    fontWeight: 500,
                                    fontFamily: '"JetBrains Mono", monospace',
                                    color: change >= 0 ? '#22c55e' : '#ef4444',
                                    mt: 0.25,
                                }}
                            >
                                {change >= 0 ? '+' : ''}{change.toFixed(1)}%
                                <Box component="span" sx={{ color: '#475569', ml: 0.5, fontFamily: '"Inter", sans-serif' }}>24h</Box>
                            </Typography>
                        )}
                    </Box>
                    {sparkData.length > 2 && (
                        <SparkLine data={sparkData} color={color} width={72} height={24} />
                    )}
                </Box>
            </Box>
        </motion.div>
    );
};

export default StatCard;
