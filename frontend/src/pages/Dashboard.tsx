import React, { useEffect, useState, useMemo } from 'react';
import {
  Box,
  Grid,
  CardContent,
  Typography,
} from '@mui/material';
import {
  TrendingUp as TrafficIcon,
  NetworkCheck as ConnectionIcon,
  Warning as AlertIcon,
  HealthAndSafety as HealthIcon,
} from '@mui/icons-material';
import { Line, Doughnut } from 'react-chartjs-2';
import '../config/chartjs'; // Register Chart.js components
import { motion } from 'framer-motion';
import { dashboardService } from '../services/api';
import { DashboardStats } from '../types';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/common/StatCard';
import GlassCard from '../components/common/GlassCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import NetworkFlowAnimation from '../components/dashboard/NetworkFlowAnimation';

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 5000); // Refresh every 5 seconds for live updates
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      const data = await dashboardService.getStats();
      setStats(data);
    } catch (error) {
      console.error('Failed to load dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Memoize chart data for better performance
  const trafficData = useMemo(() => {
    if (!stats) return null;
    return {
      labels: stats.traffic_timeline.map((_, i) => {
        const date = new Date(stats.traffic_timeline[i].time);
        return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
      }),
      datasets: [
        {
          label: 'Traffic (Bytes)',
          data: stats.traffic_timeline.map((t) => t.bytes),
          borderColor: '#00bcd4',
          backgroundColor: 'rgba(0, 188, 212, 0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: '#00bcd4',
          pointBorderColor: '#ffffff',
          pointBorderWidth: 2,
        },
      ],
    };
  }, [stats]);

  const alertDistributionData = useMemo(() => {
    if (!stats) return null;
    return {
      labels: stats.alerts_by_severity.map((a) => a.severity.toUpperCase()),
      datasets: [
        {
          data: stats.alerts_by_severity.map((a) => a.count),
          backgroundColor: [
            '#f44336', // Critical - Red
            '#ff9800', // High - Orange
            '#ffc107', // Medium - Yellow
            '#4caf50', // Low - Green
          ],
          borderWidth: 0,
        },
      ],
    };
  }, [stats]);

  const metricCards = useMemo(() => {
    if (!stats) return [];
    return [
      {
        title: t('dashboard.totalTraffic'),
        value: formatBytes(stats.metrics.total_traffic_24h),
        icon: TrafficIcon,
        color: '#00bcd4',
      },
      {
        title: t('dashboard.activeConnections'),
        value: stats.metrics.active_connections.toString(),
        icon: ConnectionIcon,
        color: '#8b5cf6',
      },
      {
        title: t('dashboard.alertsCount'),
        value: stats.metrics.alerts_count.toString(),
        icon: AlertIcon,
        color: '#ff9800',
      },
      {
        title: t('dashboard.systemHealth'),
        value: `${stats.metrics.system_health.network_uptime}%`,
        icon: HealthIcon,
        color: '#4caf50',
      },
    ];
  }, [stats, t]);

  if (loading) {
    return <LoadingSkeleton variant="stats" />;
  }

  if (!stats || !trafficData || !alertDistributionData) return null;

  const chartOptions = {
    maintainAspectRatio: false,
    responsive: true,
    animation: {
      duration: 2000,
      easing: 'easeInOutQuart' as const,
    },
    plugins: {
      legend: {
        display: false,
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
    scales: {
      x: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: 'rgba(255, 255, 255, 0.7)',
        },
      },
    },
  };

  const doughnutOptions = {
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

  const listItemVariants = {
    hidden: { opacity: 0, x: -20 },
    visible: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.1,
        duration: 0.4,
      },
    }),
  };

  return (
    <Box>
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
            {t('dashboard.title')}
          </Typography>
        </motion.div>

        {/* Stat Cards using new StatCard component */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          {metricCards.map((card, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <StatCard
                title={card.title}
                value={card.value}
                icon={card.icon}
                color={card.color}
                delay={index * 0.1}
              />
            </Grid>
          ))}
        </Grid>

        {/* Live Network Flow Animation */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12}>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
            >
              <GlassCard glowColor="#00bcd4">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    Live Network Traffic Flow
                  </Typography>
                  <Box sx={{ height: 450 }}>
                    <NetworkFlowAnimation />
                  </Box>
                </CardContent>
              </GlassCard>
            </motion.div>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <motion.div
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
            >
              <GlassCard glowColor="#00bcd4">
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    {t('dashboard.trafficTimeline')}
                  </Typography>
                  <Box sx={{ height: 300 }}>
                    <Line key="traffic-timeline" data={trafficData} options={chartOptions} />
                  </Box>
                </CardContent>
              </GlassCard>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={4}>
            <motion.div
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
            >
              <GlassCard glowColor="#8b5cf6" sx={{ mb: 3 }}>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    {t('dashboard.alertDistribution')}
                  </Typography>
                  <Box sx={{ height: 250 }}>
                    <Doughnut key="alert-distribution" data={alertDistributionData} options={doughnutOptions} />
                  </Box>
                </CardContent>
              </GlassCard>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
            >
              <GlassCard>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    {t('dashboard.topSourceIPs')}
                  </Typography>
                  <Box>
                    {stats.top_source_ips.map((ip, index) => (
                      <motion.div
                        key={index}
                        custom={index}
                        variants={listItemVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ x: 5, transition: { duration: 0.2 } }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 1.5,
                            px: 1,
                            borderRadius: 1,
                            borderBottom: index < stats.top_source_ips.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                            transition: 'background 0.2s',
                            cursor: 'pointer',
                            '&:hover': {
                              background: 'rgba(255, 255, 255, 0.05)',
                            },
                          }}
                        >
                          <Typography variant="body1">{ip.source_ip}</Typography>
                          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                            {formatBytes(ip.total_bytes)} ({ip.count} connections)
                          </Typography>
                        </Box>
                      </motion.div>
                    ))}
                  </Box>
                </CardContent>
              </GlassCard>
            </motion.div>
          </Grid>

          <Grid item xs={12} md={6}>
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.7, duration: 0.6 }}
            >
              <GlassCard>
                <CardContent>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                    {t('dashboard.recentAlerts')}
                  </Typography>
                  <Box>
                    {stats.recent_alerts.map((alert, index) => (
                      <motion.div
                        key={alert.id}
                        custom={index}
                        variants={listItemVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ x: 5, transition: { duration: 0.2 } }}
                      >
                        <Box
                          sx={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            py: 1.5,
                            px: 1,
                            borderRadius: 1,
                            borderBottom: index < stats.recent_alerts.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                            transition: 'background 0.2s',
                            cursor: 'pointer',
                            '&:hover': {
                              background: 'rgba(255, 255, 255, 0.05)',
                            },
                          }}
                        >
                          <Box>
                            <Typography variant="body1">{alert.title}</Typography>
                            <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                              {alert.source_ip} • {new Date(alert.timestamp).toLocaleString()}
                            </Typography>
                          </Box>
                          <motion.div
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                          >
                            <Box
                              sx={{
                                px: 1.5,
                                py: 0.5,
                                borderRadius: 1,
                                bgcolor:
                                  alert.severity === 'critical'
                                    ? '#f4433620'
                                    : alert.severity === 'high'
                                      ? '#ff980020'
                                      : alert.severity === 'medium'
                                        ? '#ffc10720'
                                        : '#4caf5020',
                                color:
                                  alert.severity === 'critical'
                                    ? '#f44336'
                                    : alert.severity === 'high'
                                      ? '#ff9800'
                                      : alert.severity === 'medium'
                                        ? '#ffc107'
                                        : '#4caf50',
                                textTransform: 'uppercase',
                                fontSize: '0.75rem',
                                fontWeight: 600,
                                border: `1px solid ${alert.severity === 'critical'
                                    ? '#f4433640'
                                    : alert.severity === 'high'
                                      ? '#ff980040'
                                      : alert.severity === 'medium'
                                        ? '#ffc10740'
                                        : '#4caf5040'
                                  }`,
                              }}
                            >
                              {alert.severity}
                            </Box>
                          </motion.div>
                        </Box>
                      </motion.div>
                    ))}
                  </Box>
                </CardContent>
              </GlassCard>
            </motion.div>
          </Grid>
        </Grid>
    </Box>
  );
};

export default Dashboard;
