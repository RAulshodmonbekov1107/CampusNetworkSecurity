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
                        main: '#00bcd4',
                        light: '#4dd0e1',
                        dark: '#0097a7',
                    },
                    secondary: {
                        main: '#8b5cf6',
                        light: '#a78bfa',
                        dark: '#6d28d9',
                    },
                    background: {
                        default: mode === 'dark' ? '#0a0e27' : '#f5f7fa',
                        paper: mode === 'dark' ? '#1a1f3a' : '#ffffff',
                    },
                    text: {
                        primary: mode === 'dark' ? '#ffffff' : '#1a1f3a',
                        secondary: mode === 'dark' ? '#b0bec5' : '#64748b',
                    },
                    error: {
                        main: '#f44336',
                    },
                    warning: {
                        main: '#ff9800',
                    },
                    info: {
                        main: '#2196f3',
                    },
                    success: {
                        main: '#4caf50',
                    },
                },
                typography: {
                    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
                    h1: { fontWeight: 600 },
                    h2: { fontWeight: 600 },
                    h3: { fontWeight: 600 },
                    h4: { fontWeight: 600 },
                    h5: { fontWeight: 600 },
                    h6: { fontWeight: 600 },
                },
                components: {
                    MuiButton: {
                        styleOverrides: {
                            root: {
                                textTransform: 'none',
                                borderRadius: 8,
                                padding: '10px 24px',
                            },
                        },
                    },
                    MuiCard: {
                        styleOverrides: {
                            root: {
                                background:
                                    mode === 'dark' ? 'rgba(255, 255, 255, 0.05)' : 'rgba(255, 255, 255, 0.9)',
                                backdropFilter: 'blur(10px)',
                                borderRadius: 12,
                                border:
                                    mode === 'dark'
                                        ? '1px solid rgba(255, 255, 255, 0.1)'
                                        : '1px solid rgba(0, 0, 0, 0.08)',
                            },
                        },
                    },
                    MuiPaper: {
                        styleOverrides: {
                            root: {
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
