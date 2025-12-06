import React, { useEffect, useState } from 'react';
import { Box, Typography, Slide } from '@mui/material';
import { WifiOff as OfflineIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';

const OfflineDetector: React.FC = () => {
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    return (
        <Slide direction="down" in={!isOnline} mountOnEnter unmountOnExit>
            <Box
                sx={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    zIndex: 9999,
                    background: 'linear-gradient(135deg, #f44336 0%, #d32f2f 100%)',
                    color: 'white',
                    py: 1.5,
                    px: 3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 1,
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
                }}
            >
                <motion.div
                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                >
                    <OfflineIcon />
                </motion.div>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    You are currently offline. Some features may be unavailable.
                </Typography>
            </Box>
        </Slide>
    );
};

export default OfflineDetector;
