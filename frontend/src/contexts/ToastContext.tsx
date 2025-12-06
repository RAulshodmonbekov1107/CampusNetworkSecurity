import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Snackbar, Alert, AlertColor, Slide, SlideProps } from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';

interface Toast {
    id: string;
    message: string;
    severity: AlertColor;
    duration?: number;
}

interface ToastContextType {
    success: (message: string, duration?: number) => void;
    error: (message: string, duration?: number) => void;
    warning: (message: string, duration?: number) => void;
    info: (message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

function SlideTransition(props: SlideProps) {
    return <Slide {...props} direction="down" />;
}

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, severity: AlertColor, duration = 4000) => {
        const id = Math.random().toString(36).substring(7);
        setToasts((prev) => [...prev, { id, message, severity, duration }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, []);

    const success = useCallback(
        (message: string, duration?: number) => addToast(message, 'success', duration),
        [addToast]
    );

    const error = useCallback(
        (message: string, duration?: number) => addToast(message, 'error', duration),
        [addToast]
    );

    const warning = useCallback(
        (message: string, duration?: number) => addToast(message, 'warning', duration),
        [addToast]
    );

    const info = useCallback(
        (message: string, duration?: number) => addToast(message, 'info', duration),
        [addToast]
    );

    return (
        <ToastContext.Provider value={{ success, error, warning, info }}>
            {children}
            <AnimatePresence>
                {toasts.map((toast, index) => (
                    <Snackbar
                        key={toast.id}
                        open={true}
                        autoHideDuration={toast.duration}
                        onClose={() => removeToast(toast.id)}
                        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
                        TransitionComponent={SlideTransition}
                        sx={{
                            top: `${24 + index * 70}px !important`,
                            transition: 'top 0.3s ease',
                        }}
                    >
                        <motion.div
                            initial={{ opacity: 0, x: 100, scale: 0.8 }}
                            animate={{ opacity: 1, x: 0, scale: 1 }}
                            exit={{ opacity: 0, x: 100, scale: 0.8 }}
                            transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
                        >
                            <Alert
                                onClose={() => removeToast(toast.id)}
                                severity={toast.severity}
                                variant="filled"
                                sx={{
                                    minWidth: 300,
                                    backdropFilter: 'blur(10px)',
                                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                                    '& .MuiAlert-icon': {
                                        fontSize: 24,
                                    },
                                }}
                            >
                                {toast.message}
                            </Alert>
                        </motion.div>
                    </Snackbar>
                ))}
            </AnimatePresence>
        </ToastContext.Provider>
    );
};

export const useToast = (): ToastContextType => {
    const context = useContext(ToastContext);
    if (!context) {
        throw new Error('useToast must be used within ToastProvider');
    }
    return context;
};
