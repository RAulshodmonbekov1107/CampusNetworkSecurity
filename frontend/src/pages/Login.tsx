import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Box,
  Container,
  Paper,
  TextField,
  Button,
  Typography,
  Checkbox,
  FormControlLabel,
  Alert,
  CircularProgress,
} from '@mui/material';
import { Security as SecurityIcon } from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const Login: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await login(username, password, rememberMe);
      navigate('/');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        duration: 0.5,
        ease: [0.4, 0, 0.2, 1] as [number, number, number, number],
      },
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Animated background elements */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          rotate: [0, 90, 0],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 20% 50%, rgba(0, 240, 255, 0.1) 0%, transparent 50%)',
        }}
      />
      <motion.div
        animate={{
          scale: [1.2, 1, 1.2],
          rotate: [90, 0, 90],
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'linear',
        }}
        style={{
          position: 'absolute',
          width: '100%',
          height: '100%',
          background: 'radial-gradient(circle at 80% 50%, rgba(139, 92, 246, 0.1) 0%, transparent 50%)',
        }}
      />

      <Container maxWidth="sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 50 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: 'easeOut' }}
        >
          <Paper
            elevation={24}
            sx={{
              p: 4,
              borderRadius: 4,
              background: 'rgba(26, 31, 58, 0.95)',
              backdropFilter: 'blur(20px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              overflow: 'hidden',
              '&::before': {
                content: '""',
                position: 'absolute',
                top: 0,
                left: '-100%',
                width: '100%',
                height: '100%',
                background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.05), transparent)',
                transition: 'left 0.5s',
              },
              '&:hover::before': {
                left: '100%',
              },
            }}
          >
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
            >
              <motion.div variants={itemVariants}>
                <Box sx={{ textAlign: 'center', mb: 4 }}>
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: [0, -10, 10, -10, 0] }}
                    whileTap={{ scale: 0.95 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Box
                      sx={{
                        width: 80,
                        height: 80,
                        borderRadius: 3,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        margin: '0 auto 16px',
                        boxShadow: '0 8px 32px rgba(102, 126, 234, 0.4)',
                        position: 'relative',
                        '&::after': {
                          content: '""',
                          position: 'absolute',
                          inset: -4,
                          borderRadius: 3,
                          padding: 2,
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          WebkitMask: 'linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)',
                          WebkitMaskComposite: 'xor',
                          maskComposite: 'exclude',
                          opacity: 0,
                          transition: 'opacity 0.3s',
                        },
                        '&:hover::after': {
                          opacity: 0.5,
                        },
                      }}
                    >
                      <SecurityIcon sx={{ fontSize: 40, color: 'white' }} />
                    </Box>
                  </motion.div>
                  <Typography variant="h4" sx={{ fontWeight: 600, mb: 1, color: 'white' }}>
                    {t('auth.loginTitle')}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {t('auth.loginSubtitle')}
                  </Typography>
                </Box>
              </motion.div>

              <motion.div variants={itemVariants}>
                {error && (
                  <motion.div
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                  >
                    <Alert
                      severity="error"
                      sx={{
                        mb: 2,
                        background: 'rgba(244, 67, 54, 0.1)',
                        border: '1px solid rgba(244, 67, 54, 0.3)',
                      }}
                    >
                      {error}
                    </Alert>
                  </motion.div>
                )}
              </motion.div>

              <form onSubmit={handleSubmit}>
                <motion.div variants={itemVariants}>
                  <TextField
                    fullWidth
                    label={t('auth.username')}
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 188, 212, 0.5)',
                          },
                        },
                        '&.Mui-focused': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#00bcd4',
                            borderWidth: 2,
                          },
                        },
                      },
                    }}
                    autoComplete="username"
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <TextField
                    fullWidth
                    label={t('auth.password')}
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    sx={{
                      mb: 2,
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: 'rgba(0, 188, 212, 0.5)',
                          },
                        },
                        '&.Mui-focused': {
                          '& .MuiOutlinedInput-notchedOutline': {
                            borderColor: '#00bcd4',
                            borderWidth: 2,
                          },
                        },
                      },
                    }}
                    autoComplete="current-password"
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={rememberMe}
                        onChange={(e) => setRememberMe(e.target.checked)}
                        sx={{
                          color: '#00bcd4',
                          '&.Mui-checked': {
                            color: '#00bcd4',
                          },
                        }}
                      />
                    }
                    label={t('auth.rememberMe')}
                    sx={{ mb: 2 }}
                  />
                </motion.div>

                <motion.div variants={itemVariants}>
                  <motion.div
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Button
                      type="submit"
                      fullWidth
                      variant="contained"
                      size="large"
                      disabled={loading}
                      sx={{
                        mb: 2,
                        py: 1.5,
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        position: 'relative',
                        overflow: 'hidden',
                        '&::before': {
                          content: '""',
                          position: 'absolute',
                          top: 0,
                          left: '-100%',
                          width: '100%',
                          height: '100%',
                          background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent)',
                          transition: 'left 0.5s',
                        },
                        '&:hover::before': {
                          left: '100%',
                        },
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5568d3 0%, #6a3d91 100%)',
                          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                        },
                        '&:disabled': {
                          background: 'rgba(255, 255, 255, 0.1)',
                        },
                      }}
                    >
                      {loading ? (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <CircularProgress size={20} sx={{ color: 'white' }} />
                          <span>Logging in...</span>
                        </Box>
                      ) : (
                        t('common.login')
                      )}
                    </Button>
                  </motion.div>
                </motion.div>

                <motion.div variants={itemVariants}>
                  <Box sx={{ textAlign: 'center' }}>
                    <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                      <Link
                        to="/register"
                        style={{
                          color: '#00bcd4',
                          textDecoration: 'none',
                          fontSize: '14px',
                          transition: 'all 0.3s ease',
                          display: 'inline-block',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.textDecoration = 'underline';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.textDecoration = 'none';
                        }}
                      >
                        Don't have an account? Register
                      </Link>
                    </motion.div>
                  </Box>
                </motion.div>
              </form>
            </motion.div>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default Login;

