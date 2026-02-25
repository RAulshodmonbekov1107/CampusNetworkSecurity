import React, { createContext, useContext, useState, useEffect, ReactNode, useMemo } from 'react';
import { ThemeProvider as MuiThemeProvider, createTheme } from '@mui/material/styles';
import { CssBaseline } from '@mui/material';

type ThemeMode = 'dark' | 'light';

interface ThemeContextType {
    mode: ThemeMode;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>(() => {
        const savedMode = localStorage.getItem('theme-mode');
        return (savedMode as ThemeMode) || 'dark';
    });

    useEffect(() => {
        localStorage.setItem('theme-mode', mode);
    }, [mode]);

    const toggleTheme = () => {
        setMode((prevMode) => (prevMode === 'dark' ? 'light' : 'dark'));
    };

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    primary: {
                        main: '#3b82f6',
                        light: '#60a5fa',
                        dark: '#2563eb',
                    },
                    secondary: {
                        main: '#6366f1',
                        light: '#818cf8',
                        dark: '#4f46e5',
                    },
                    background: {
                        default: mode === 'dark' ? '#020617' : '#f8fafc',
                        paper: mode === 'dark' ? '#0f172a' : '#ffffff',
                    },
                    text: {
                        primary: mode === 'dark' ? '#e2e8f0' : '#0f172a',
                        secondary: mode === 'dark' ? '#64748b' : '#475569',
                    },
                    error: { main: '#ef4444' },
                    warning: { main: '#f59e0b' },
                    info: { main: '#3b82f6' },
                    success: { main: '#22c55e' },
                    divider: mode === 'dark' ? 'rgba(148, 163, 184, 0.08)' : 'rgba(0,0,0,0.08)',
                },
                typography: {
                    fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
                    h1: { fontWeight: 600, letterSpacing: '-0.025em' },
                    h2: { fontWeight: 600, letterSpacing: '-0.025em' },
                    h3: { fontWeight: 600, letterSpacing: '-0.02em' },
                    h4: { fontWeight: 600, letterSpacing: '-0.02em', fontSize: '1.5rem' },
                    h5: { fontWeight: 600, letterSpacing: '-0.01em' },
                    h6: { fontWeight: 600, fontSize: '0.875rem', letterSpacing: '-0.01em' },
                    body1: { fontSize: '0.875rem', lineHeight: 1.6 },
                    body2: { fontSize: '0.8125rem', lineHeight: 1.5 },
                    caption: { fontSize: '0.6875rem', letterSpacing: '0.04em', textTransform: 'uppercase' as const, fontWeight: 500 },
                },
                shape: { borderRadius: 8 },
                components: {
                    MuiCssBaseline: {
                        styleOverrides: {
                            body: {
                                scrollbarWidth: 'thin',
                                scrollbarColor: mode === 'dark' ? '#1e293b #020617' : '#cbd5e1 #f8fafc',
                            },
                        },
                    },
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                textTransform: 'none',
                                borderRadius: 6,
                                fontWeight: 500,
                                fontSize: '0.8125rem',
                                padding: '6px 16px',
                            },
                        },
                    },
                    MuiCard: {
                        styleOverrides: {
                            root: {
                                background: mode === 'dark' ? '#0f172a' : '#ffffff',
                                backgroundImage: 'none',
                                borderRadius: 8,
                                border: mode === 'dark'
                                    ? '0.5px solid rgba(148, 163, 184, 0.08)'
                                    : '0.5px solid rgba(0,0,0,0.06)',
                                boxShadow: 'none',
                            },
                        },
                    },
                    MuiPaper: {
                        styleOverrides: {
                            root: { backgroundImage: 'none' },
                        },
                    },
                    MuiTableCell: {
                        styleOverrides: {
                            root: {
                                borderBottom: mode === 'dark'
                                    ? '0.5px solid rgba(148, 163, 184, 0.06)'
                                    : '0.5px solid rgba(0,0,0,0.06)',
                                padding: '10px 16px',
                                fontSize: '0.8125rem',
                            },
                            head: {
                                fontWeight: 600,
                                fontSize: '0.6875rem',
                                letterSpacing: '0.05em',
                                textTransform: 'uppercase' as const,
                                color: mode === 'dark' ? '#64748b' : '#475569',
                            },
                        },
                    },
                    MuiChip: {
                        styleOverrides: {
                            root: {
                                borderRadius: 4,
                                fontWeight: 500,
                                fontSize: '0.6875rem',
                                height: 22,
                            },
                        },
                    },
                    MuiDialog: {
                        styleOverrides: {
                            paper: {
                                background: mode === 'dark' ? '#0f172a' : '#ffffff',
                                border: mode === 'dark' ? '0.5px solid rgba(148, 163, 184, 0.1)' : '0.5px solid rgba(0,0,0,0.1)',
                                backgroundImage: 'none',
                            },
                        },
                    },
                },
            }),
        [mode]
    );

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};
