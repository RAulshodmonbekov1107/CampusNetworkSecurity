import React, { useEffect, useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  CircularProgress,
} from '@mui/material';
import {
  TrendingUp as TrafficIcon,
  NetworkCheck as ConnectionIcon,
  Warning as AlertIcon,
  HealthAndSafety as HealthIcon,
} from '@mui/icons-material';
import { Line, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { dashboardService } from '../services/api';
import { DashboardStats } from '../types';
import { useTranslation } from 'react-i18next';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 30000); // Refresh every 30 seconds
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

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <CircularProgress />
      </Box>
    );
  }

  if (!stats) return null;

  const trafficData = {
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
      },
    ],
  };

  const alertDistributionData = {
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

  const metricCards = [
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

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        {t('dashboard.title')}
      </Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {metricCards.map((card, index) => {
          const Icon = card.icon;
          return (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Card
                sx={{
                  background: 'rgba(255, 255, 255, 0.05)',
                  backdropFilter: 'blur(10px)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  transition: 'transform 0.2s, box-shadow 0.2s',
                  '&:hover': {
                    transform: 'translateY(-4px)',
                    boxShadow: `0 8px 24px ${card.color}40`,
                  },
                }}
              >
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box>
                      <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                        {card.title}
                      </Typography>
                      <Typography variant="h4" sx={{ fontWeight: 600, color: card.color }}>
                        {card.value}
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        width: 56,
                        height: 56,
                        borderRadius: 2,
                        bgcolor: `${card.color}20`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Icon sx={{ fontSize: 32, color: card.color }} />
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          );
        })}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card
            sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {t('dashboard.trafficTimeline')}
              </Typography>
              <Box sx={{ height: 300 }}>
                <Line data={trafficData} options={{ maintainAspectRatio: false, responsive: true }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={4}>
          <Card
            sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              mb: 3,
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {t('dashboard.alertDistribution')}
              </Typography>
              <Box sx={{ height: 250 }}>
                <Doughnut data={alertDistributionData} options={{ maintainAspectRatio: false }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {t('dashboard.topSourceIPs')}
              </Typography>
              <Box>
                {stats.top_source_ips.map((ip, index) => (
                  <Box
                    key={index}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: index < stats.top_source_ips.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                    }}
                  >
                    <Typography variant="body1">{ip.source_ip}</Typography>
                    <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                      {formatBytes(ip.total_bytes)} ({ip.count} connections)
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card
            sx={{
              background: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
            }}
          >
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                {t('dashboard.recentAlerts')}
              </Typography>
              <Box>
                {stats.recent_alerts.map((alert, index) => (
                  <Box
                    key={alert.id}
                    sx={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      py: 1.5,
                      borderBottom: index < stats.recent_alerts.length - 1 ? '1px solid rgba(255, 255, 255, 0.1)' : 'none',
                    }}
                  >
                    <Box>
                      <Typography variant="body1">{alert.title}</Typography>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>
                        {alert.source_ip} • {new Date(alert.timestamp).toLocaleString()}
                      </Typography>
                    </Box>
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
                      }}
                    >
                      {alert.severity}
                    </Box>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;

