import React from 'react';
import { Box, Skeleton, Grid } from '@mui/material';

interface LoadingSkeletonProps {
    variant?: 'card' | 'list' | 'chart' | 'stats';
    count?: number;
}

const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ variant = 'card', count = 1 }) => {
    const renderStatsSkeleton = () => (
        <Grid container spacing={3}>
            {[...Array(4)].map((_, index) => (
                <Grid item xs={12} sm={6} md={3} key={index}>
                    <Box
                        sx={{
                            background: 'rgba(255, 255, 255, 0.05)',
                            backdropFilter: 'blur(10px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: 3,
                            p: 2,
                        }}
                    >
                        <Skeleton
                            variant="text"
                            width="60%"
                            height={20}
                            sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }}
                        />
                        <Skeleton
                            variant="text"
                            width="40%"
                            height={40}
                            sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', mt: 1 }}
                        />
                        <Skeleton
                            variant="circular"
                            width={56}
                            height={56}
                            sx={{
                                bgcolor: 'rgba(255, 255, 255, 0.1)',
                                position: 'absolute',
                                right: 16,
                                top: 16,
                            }}
                        />
                    </Box>
                </Grid>
            ))}
        </Grid>
    );

    const renderCardSkeleton = () => (
        <>
            {[...Array(count)].map((_, index) => (
                <Box
                    key={index}
                    sx={{
                        background: 'rgba(255, 255, 255, 0.05)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: 3,
                        p: 3,
                        mb: 2,
                    }}
                >
                    <Skeleton
                        variant="text"
                        width="30%"
                        height={32}
                        sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', mb: 2 }}
                    />
                    <Skeleton
                        variant="rectangular"
                        height={200}
                        sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 2 }}
                    />
                </Box>
            ))}
        </>
    );

    const renderListSkeleton = () => (
        <Box
            sx={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 3,
                p: 2,
            }}
        >
            {[...Array(count)].map((_, index) => (
                <Box
                    key={index}
                    sx={{
                        display: 'flex',
                        alignItems: 'center',
                        py: 1.5,
                        borderBottom: index < count - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                    }}
                >
                    <Skeleton
                        variant="circular"
                        width={40}
                        height={40}
                        sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', mr: 2 }}
                    />
                    <Box sx={{ flex: 1 }}>
                        <Skeleton
                            variant="text"
                            width="60%"
                            height={20}
                            sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)' }}
                        />
                        <Skeleton
                            variant="text"
                            width="40%"
                            height={16}
                            sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', mt: 0.5 }}
                        />
                    </Box>
                    <Skeleton
                        variant="rectangular"
                        width={60}
                        height={24}
                        sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 1 }}
                    />
                </Box>
            ))}
        </Box>
    );

    const renderChartSkeleton = () => (
        <Box
            sx={{
                background: 'rgba(255, 255, 255, 0.05)',
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 3,
                p: 3,
            }}
        >
            <Skeleton
                variant="text"
                width="25%"
                height={28}
                sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', mb: 2 }}
            />
            <Skeleton
                variant="rectangular"
                height={300}
                sx={{ bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 2 }}
            />
        </Box>
    );

    switch (variant) {
        case 'stats':
            return renderStatsSkeleton();
        case 'list':
            return renderListSkeleton();
        case 'chart':
            return renderChartSkeleton();
        case 'card':
        default:
            return renderCardSkeleton();
    }
};

export default LoadingSkeleton;
