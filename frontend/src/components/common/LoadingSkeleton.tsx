import React from 'react';
import { Box, Skeleton } from '@mui/material';

interface LoadingSkeletonProps {
    variant?: 'card' | 'list' | 'chart' | 'stats';
    count?: number;
}

const skeletonSx = { bgcolor: 'rgba(148, 163, 184, 0.06)' };

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'card', count = 1 }) => {
    if (variant === 'stats') {
        return (
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5 }}>
                {[...Array(4)].map((_, i) => (
                    <Box key={i} sx={{ background: '#0f172a', border: '0.5px solid rgba(148,163,184,0.08)', borderRadius: '8px', p: 2 }}>
                        <Skeleton variant="text" width="60%" height={14} sx={skeletonSx} />
                        <Skeleton variant="text" width="40%" height={28} sx={{ ...skeletonSx, mt: 1 }} />
                    </Box>
                ))}
            </Box>
        );
    }

    if (variant === 'chart') {
        return (
            <Box sx={{ background: '#0f172a', border: '0.5px solid rgba(148,163,184,0.08)', borderRadius: '8px', p: 2 }}>
                <Skeleton variant="text" width="20%" height={14} sx={skeletonSx} />
                <Skeleton variant="rectangular" height={240} sx={{ ...skeletonSx, mt: 1.5, borderRadius: '6px' }} />
            </Box>
        );
    }

    return (
        <>
            {[...Array(count)].map((_, i) => (
                <Box key={i} sx={{ background: '#0f172a', border: '0.5px solid rgba(148,163,184,0.08)', borderRadius: '8px', p: 2, mb: 1 }}>
                    <Skeleton variant="text" width="30%" height={14} sx={skeletonSx} />
                    <Skeleton variant="rectangular" height={120} sx={{ ...skeletonSx, mt: 1, borderRadius: '6px' }} />
                </Box>
            ))}
        </>
    );
};

export default LoadingSkeleton;
