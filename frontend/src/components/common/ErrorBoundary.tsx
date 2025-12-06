import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Box, Button, Typography, Container } from '@mui/material';
import { Error as ErrorIcon, Refresh as RefreshIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';

interface Props {
    children: ReactNode;
    fallback?: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
    errorInfo: ErrorInfo | null;
}

class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false,
        error: null,
        errorInfo: null,
    };

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error, errorInfo: null };
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('ErrorBoundary caught an error:', error, errorInfo);
        this.setState({
            error,
            errorInfo,
        });
    }

    private handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null });
        window.location.reload();
    };

    public render() {
        if (this.state.hasError) {
            if (this.props.fallback) {
                return this.props.fallback;
            }

            return (
                <Box
                    sx={{
                        minHeight: '100vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: '#0a0e27',
                        p: 3,
                    }}
                >
                    <Container maxWidth="sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.5 }}
                        >
                            <Box
                                sx={{
                                    background: 'rgba(255, 255, 255, 0.05)',
                                    backdropFilter: 'blur(10px)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: 3,
                                    p: 4,
                                    textAlign: 'center',
                                }}
                            >
                                <motion.div
                                    animate={{ rotate: [0, -10, 10, -10, 0] }}
                                    transition={{ duration: 0.5, repeat: Infinity, repeatDelay: 2 }}
                                >
                                    <ErrorIcon
                                        sx={{
                                            fontSize: 80,
                                            color: '#f44336',
                                            mb: 2,
                                        }}
                                    />
                                </motion.div>
                                <Typography variant="h4" sx={{ fontWeight: 600, mb: 2, color: 'white' }}>
                                    Oops! Something went wrong
                                </Typography>
                                <Typography variant="body1" sx={{ color: 'text.secondary', mb: 3 }}>
                                    We encountered an unexpected error. Don't worry, you can try refreshing the page.
                                </Typography>
                                {process.env.NODE_ENV === 'development' && this.state.error && (
                                    <Box
                                        sx={{
                                            background: 'rgba(244, 67, 54, 0.1)',
                                            border: '1px solid rgba(244, 67, 54, 0.3)',
                                            borderRadius: 2,
                                            p: 2,
                                            mb: 3,
                                            textAlign: 'left',
                                            maxHeight: 200,
                                            overflow: 'auto',
                                        }}
                                    >
                                        <Typography
                                            variant="caption"
                                            component="pre"
                                            sx={{
                                                color: '#f44336',
                                                fontFamily: 'monospace',
                                                fontSize: '0.75rem',
                                                whiteSpace: 'pre-wrap',
                                                wordBreak: 'break-word',
                                            }}
                                        >
                                            {this.state.error.toString()}
                                            {this.state.errorInfo && this.state.errorInfo.componentStack}
                                        </Typography>
                                    </Box>
                                )}
                                <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                                    <Button
                                        variant="contained"
                                        size="large"
                                        startIcon={<RefreshIcon />}
                                        onClick={this.handleReset}
                                        sx={{
                                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                                            '&:hover': {
                                                background: 'linear-gradient(135deg, #5568d3 0%, #6a3d91 100%)',
                                            },
                                        }}
                                    >
                                        Refresh Page
                                    </Button>
                                </motion.div>
                            </Box>
                        </motion.div>
                    </Container>
                </Box>
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
