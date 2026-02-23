import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import '../config/chartjs'; // Register Chart.js components
import { motion } from 'framer-motion';
import { networkService } from '../services/api';
import { NetworkTraffic as NetworkTrafficType } from '../types';
import { useTranslation } from 'react-i18next';

const NetworkTraffic: React.FC = () => {
  const [traffic, setTraffic] = useState<NetworkTrafficType[]>([]);
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    protocol: '',
    source_ip: '',
    date_from: '',
    date_to: '',
  });
  const { t } = useTranslation();

  const loadData = async () => {
    setLoading(true);
    try {
      const [trafficData, protocolsData] = await Promise.all([
        networkService.getTraffic(filters),
        networkService.getProtocols(),
      ]);
      setTraffic(trafficData.results || trafficData);
      setProtocols(protocolsData);
    } catch (error) {
      console.error('Failed to load network traffic:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // Auto-refresh every 10 seconds for live updates
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const protocolData = {
    labels: protocols.map((p) => p.protocol),
    datasets: [
      {
        data: protocols.map((p) => p.total_bytes),
        backgroundColor: [
          '#00bcd4',
          '#8b5cf6',
          '#ff9800',
          '#4caf50',
          '#f44336',
          '#2196f3',
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    maintainAspectRatio: false,
    animation: {
      animateRotate: true,
      duration: 2000,
      easing: 'easeInOutQuart' as const,
    },
    plugins: {
      legend: {
        position: 'bottom' as const,
        labels: {
          color: '#ffffff',
          padding: 15,
          font: {
            size: 12,
          },
        },
      },
      tooltip: {
        backgroundColor: 'rgba(26, 31, 58, 0.9)',
        titleColor: '#ffffff',
        bodyColor: '#ffffff',
        borderColor: '#00bcd4',
        borderWidth: 1,
        padding: 12,
        cornerRadius: 8,
      },
    },
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

  const tableRowVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
      },
    }),
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <Box>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
            {t('common.network')}
          </Typography>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card
            sx={{
              mb: 3,
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'rgba(0, 188, 212, 0.3)',
                boxShadow: '0 8px 24px rgba(0, 188, 212, 0.2)',
              },
            }}
          >
            <CardContent>
              <Grid container spacing={2}>
                <Grid item xs={12} md={3}>
                  <FormControl fullWidth>
                    <InputLabel>Protocol</InputLabel>
                    <Select
                      value={filters.protocol}
                      onChange={(e) => setFilters({ ...filters, protocol: e.target.value })}
                      sx={{
                        transition: 'all 0.3s ease',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(0, 188, 212, 0.5)',
                        },
                      }}
                    >
                      <MenuItem value="">All</MenuItem>
                      <MenuItem value="TCP">TCP</MenuItem>
                      <MenuItem value="UDP">UDP</MenuItem>
                      <MenuItem value="HTTP">HTTP</MenuItem>
                      <MenuItem value="HTTPS">HTTPS</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    label="Source IP"
                    value={filters.source_ip}
                    onChange={(e) => setFilters({ ...filters, source_ip: e.target.value })}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s ease',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(0, 188, 212, 0.5)',
                        },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type="date"
                    label="From"
                    InputLabelProps={{ shrink: true }}
                    value={filters.date_from}
                    onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s ease',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(0, 188, 212, 0.5)',
                        },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <TextField
                    fullWidth
                    type="date"
                    label="To"
                    InputLabelProps={{ shrink: true }}
                    value={filters.date_to}
                    onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        transition: 'all 0.3s ease',
                        '&:hover .MuiOutlinedInput-notchedOutline': {
                          borderColor: 'rgba(0, 188, 212, 0.5)',
                        },
                      },
                    }}
                  />
                </Grid>
                <Grid item xs={12} md={2}>
                  <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      onClick={() => setFilters({ protocol: '', source_ip: '', date_from: '', date_to: '' })}
                      sx={{
                        height: '56px',
                        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                        transition: 'all 0.3s ease',
                        '&:hover': {
                          background: 'linear-gradient(135deg, #5568d3 0%, #6a3d91 100%)',
                          boxShadow: '0 8px 24px rgba(102, 126, 234, 0.4)',
                        },
                      }}
                    >
                      Clear
                    </Button>
                  </motion.div>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} md={8}>
              <motion.div variants={itemVariants}>
                <Card
                  sx={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'rgba(0, 188, 212, 0.3)',
                      boxShadow: '0 8px 24px rgba(0, 188, 212, 0.2)',
                    },
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Traffic Over Time
                    </Typography>
                    {loading ? (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <CircularProgress sx={{ color: '#00bcd4' }} />
                        </motion.div>
                      </Box>
                    ) : (
                      <Box sx={{ height: 300 }}>
                        <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                          Chart will be displayed here
                        </Typography>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
            <Grid item xs={12} md={4}>
              <motion.div variants={itemVariants}>
                <Card
                  sx={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'rgba(139, 92, 246, 0.3)',
                      boxShadow: '0 8px 24px rgba(139, 92, 246, 0.2)',
                    },
                  }}
                >
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                      Protocol Distribution
                    </Typography>
                    {protocols.length > 0 ? (
                      <Box sx={{ height: 300 }}>
                        <Doughnut key="protocol-distribution" data={protocolData} options={chartOptions} />
                      </Box>
                    ) : (
                      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        >
                          <CircularProgress sx={{ color: '#8b5cf6' }} />
                        </motion.div>
                      </Box>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </Grid>
          </Grid>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
        >
          <Card
            sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: 'rgba(255, 255, 255, 0.2)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
              },
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Network Traffic Data
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  >
                    <CircularProgress sx={{ color: '#00bcd4' }} />
                  </motion.div>
                </Box>
              ) : (
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 600 }}>Timestamp</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Source IP</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Destination IP</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Protocol</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Bytes Sent</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Bytes Received</TableCell>
                        <TableCell sx={{ fontWeight: 600 }}>Total</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {traffic.slice(0, 20).map((item, index) => (
                        <TableRow
                          key={item.id}
                          component={motion.tr}
                          custom={index}
                          variants={tableRowVariants}
                          initial="hidden"
                          animate="visible"
                          whileHover={{ backgroundColor: 'rgba(255, 255, 255, 0.05)' }}
                          sx={{
                            transition: 'background 0.2s',
                            cursor: 'pointer',
                            '&:hover': {
                              backgroundColor: 'rgba(255, 255, 255, 0.05)',
                            },
                          }}
                        >
                          <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                          <TableCell>{item.source_ip}</TableCell>
                          <TableCell>{item.destination_ip}</TableCell>
                          <TableCell>
                            <Box
                              component="span"
                              sx={{
                                px: 1,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor: 'rgba(0, 188, 212, 0.2)',
                                color: '#00bcd4',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                              }}
                            >
                              {item.protocol}
                            </Box>
                          </TableCell>
                          <TableCell>{formatBytes(item.bytes_sent)}</TableCell>
                          <TableCell>{formatBytes(item.bytes_received)}</TableCell>
                          <TableCell sx={{ fontWeight: 600, color: 'primary.main' }}>
                            {formatBytes(item.total_bytes || 0)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </Box>
    </motion.div>
  );
};

export default NetworkTraffic;

