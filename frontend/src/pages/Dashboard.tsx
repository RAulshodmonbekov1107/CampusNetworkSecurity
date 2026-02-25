import React, { useEffect, useState, useMemo } from 'react';
import { Box, Typography, CardContent } from '@mui/material';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { Activity, Wifi, ShieldAlert, HeartPulse } from 'lucide-react';
import { motion } from 'framer-motion';
import { dashboardService, statsService } from '../services/api';
import { DashboardStats, ProtocolStat } from '../types';
import { useTranslation } from 'react-i18next';
import StatCard from '../components/common/StatCard';
import GlassCard from '../components/common/GlassCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import StaggerContainer from '../components/common/StaggerContainer';
import NetworkFlowAnimation from '../components/dashboard/NetworkFlowAnimation';

const MONO = '"JetBrains Mono", monospace';

const PROTOCOL_COLORS = [
  '#3b82f6', '#6366f1', '#8b5cf6', '#2563eb', '#1d4ed8',
  '#4f46e5', '#7c3aed', '#60a5fa', '#818cf8', '#475569',
];

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: '#ef4444',
  HIGH: '#f59e0b',
  MEDIUM: '#3b82f6',
  LOW: '#22c55e',
};

const SEVERITY_BORDER: Record<string, string> = {
  CRITICAL: 'rgba(239, 68, 68, 0.4)',
  HIGH: 'rgba(245, 158, 11, 0.4)',
  MEDIUM: 'rgba(59, 130, 246, 0.3)',
  LOW: 'rgba(34, 197, 94, 0.3)',
};

const tooltipStyle = {
  background: '#0f172a',
  border: '0.5px solid rgba(148,163,184,0.12)',
  borderRadius: 6,
  color: '#e2e8f0',
  fontSize: '0.75rem',
  fontFamily: MONO,
  boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
};

const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [protocols, setProtocols] = useState<ProtocolStat[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [dashData, protocolData] = await Promise.all([
        dashboardService.getStats(),
        statsService.getProtocols().catch(() => []),
      ]);
      setStats(dashData);
      if (protocolData.length) setProtocols(protocolData);
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
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  const trafficData = useMemo(() => {
    if (!stats) return [];
    return stats.traffic_timeline.map((t) => {
      const d = new Date(t.time);
      return {
        time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        bytes: t.bytes,
      };
    });
  }, [stats]);

  const sparkTraffic = useMemo(() => {
    return trafficData.map((d) => d.bytes);
  }, [trafficData]);

  const alertDistData = useMemo(() => {
    if (!stats) return [];
    return stats.alerts_by_severity.map((a) => ({
      name: a.severity.toUpperCase(),
      value: a.count,
    }));
  }, [stats]);

  if (loading) return <LoadingSkeleton variant="stats" />;
  if (!stats) return null;

  return (
    <StaggerContainer>
      <Typography
        variant="h4"
        sx={{ mb: 2.5, fontWeight: 600, color: '#e2e8f0' }}
      >
        {t('dashboard.title')}
      </Typography>

      {/* Stat Cards */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' },
        gap: 1.5,
        mb: 2,
      }}>
        <StatCard
          title={t('dashboard.totalTraffic')}
          value={formatBytes(stats.metrics.total_traffic_24h)}
          icon={Activity}
          color="#3b82f6"
          change={12.4}
          sparkData={sparkTraffic.slice(-12)}
        />
        <StatCard
          title={t('dashboard.activeConnections')}
          value={stats.metrics.active_connections}
          icon={Wifi}
          color="#6366f1"
          change={-3.2}
          sparkData={[8, 12, 9, 15, 11, 14, 10, 13, 16, 12]}
        />
        <StatCard
          title={t('dashboard.alertsCount')}
          value={stats.metrics.alerts_count}
          icon={ShieldAlert}
          color={stats.metrics.alerts_count > 0 ? '#f59e0b' : '#22c55e'}
          change={stats.metrics.alerts_count > 0 ? 5.1 : 0}
          sparkData={[2, 5, 3, 8, 4, 6, 3, 7, 5, 4]}
        />
        <StatCard
          title={t('dashboard.systemHealth')}
          value={`${stats.metrics.system_health.network_uptime}%`}
          icon={HeartPulse}
          color="#22c55e"
          change={0.1}
          sparkData={[99, 99.5, 99.8, 99.9, 99.7, 99.9, 99.8, 99.9]}
        />
      </Box>

      {/* Traffic Timeline */}
      <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: [0.33, 1, 0.68, 1] } } }}>
        <GlassCard animated={false}>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 1.5 }}>
              {t('dashboard.trafficTimeline')}
            </Typography>
            <Box sx={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trafficData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="none" stroke="rgba(148,163,184,0.04)" vertical={false} />
                  <XAxis dataKey="time" stroke="#334155" fontSize={10} fontFamily={MONO} tickLine={false} axisLine={{ stroke: 'rgba(148,163,184,0.06)' }} />
                  <YAxis stroke="#334155" fontSize={10} fontFamily={MONO} tickFormatter={(v: number) => formatBytes(v)} tickLine={false} axisLine={false} />
                  <RTooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatBytes(value), 'Traffic']} />
                  <Area type="linear" dataKey="bytes" stroke="#3b82f6" fill="url(#trafficFill)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </GlassCard>
      </motion.div>

      {/* Row: Protocol, Alert Distribution, Network Flow */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.2fr' },
        gap: 1.5,
        mt: 1.5,
      }}>
        {/* Protocol Distribution */}
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 1 }}>
              Protocol Distribution
            </Typography>
            <Box sx={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={protocols.length ? protocols.map((p) => ({ name: p.protocol, value: p.total_bytes })) : alertDistData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="none"
                  >
                    {(protocols.length ? protocols : alertDistData).map((_, idx) => (
                      <Cell key={idx} fill={PROTOCOL_COLORS[idx % PROTOCOL_COLORS.length]} />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={tooltipStyle} formatter={(value: number) => [protocols.length ? formatBytes(value) : value, '']} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            {/* Legend */}
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {(protocols.length ? protocols.map(p => p.protocol) : alertDistData.map(a => a.name)).slice(0, 6).map((name, idx) => (
                <Box key={name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '1px', bgcolor: PROTOCOL_COLORS[idx % PROTOCOL_COLORS.length] }} />
                  <Typography sx={{ fontSize: '0.625rem', color: '#64748b', fontFamily: MONO }}>{name}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </GlassCard>

        {/* Alert Distribution */}
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 1 }}>
              {t('dashboard.alertDistribution')}
            </Typography>
            <Box sx={{ height: 240 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={alertDistData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                    {alertDistData.map((entry, idx) => (
                      <Cell key={idx} fill={SEVERITY_COLORS[entry.name] || PROTOCOL_COLORS[idx]} />
                    ))}
                  </Pie>
                  <RTooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {alertDistData.map((entry) => (
                <Box key={entry.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '1px', bgcolor: SEVERITY_COLORS[entry.name] || '#475569' }} />
                  <Typography sx={{ fontSize: '0.625rem', color: '#64748b', fontFamily: MONO }}>{entry.name}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </GlassCard>

        {/* Live Network Flow */}
        <GlassCard>
          <CardContent sx={{ p: '12px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 1 }}>
              Live Network Flow
            </Typography>
            <Box sx={{ height: 280 }}>
              <NetworkFlowAnimation />
            </Box>
          </CardContent>
        </GlassCard>
      </Box>

      {/* Bottom row: Source IPs + Recent Alerts */}
      <Box sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', md: '1fr 1.5fr' },
        gap: 1.5,
        mt: 1.5,
      }}>
        {/* Top Source IPs */}
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 1.5 }}>
              {t('dashboard.topSourceIPs')}
            </Typography>
            {stats.top_source_ips.map((ip, index) => (
              <Box
                key={index}
                sx={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  py: 0.75, px: 1,
                  borderBottom: index < stats.top_source_ips.length - 1 ? '0.5px solid rgba(148,163,184,0.06)' : 'none',
                  transition: 'background 0.15s ease',
                  borderRadius: '4px',
                  '&:hover': { background: 'rgba(148,163,184,0.04)' },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#3b82f6', opacity: 0.6 }} />
                  <Typography sx={{ fontFamily: MONO, fontSize: '0.8125rem', color: '#e2e8f0' }}>
                    {ip.source_ip}
                  </Typography>
                </Box>
                <Typography sx={{ fontFamily: MONO, fontSize: '0.75rem', color: '#475569' }}>
                  {formatBytes(ip.total_bytes)}
                  <Box component="span" sx={{ color: '#334155', ml: 0.5 }}>
                    ({ip.count})
                  </Box>
                </Typography>
              </Box>
            ))}
          </CardContent>
        </GlassCard>

        {/* Recent Alerts — Terminal-log style */}
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b' }}>
                {t('dashboard.recentAlerts')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <motion.div
                  animate={{ scale: [1, 1.02, 1] }}
                  transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
                >
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#22c55e' }} />
                </motion.div>
                <Typography sx={{ fontFamily: MONO, fontSize: '0.625rem', color: '#22c55e', fontWeight: 500 }}>LIVE</Typography>
              </Box>
            </Box>
            <Box sx={{
              fontFamily: MONO,
              fontSize: '0.75rem',
              maxHeight: 260,
              overflow: 'auto',
              '&::-webkit-scrollbar': { width: 3 },
              '&::-webkit-scrollbar-thumb': { background: '#1e293b', borderRadius: 2 },
            }}>
              {stats.recent_alerts.map((alert) => {
                const sev = alert.severity.toUpperCase();
                return (
                  <Box
                    key={alert.id}
                    sx={{
                      display: 'flex', alignItems: 'flex-start', gap: 1.5,
                      py: 0.75, px: 1,
                      borderBottom: '0.5px solid rgba(148,163,184,0.04)',
                      transition: 'background 0.15s ease',
                      borderRadius: '3px',
                      '&:hover': { background: 'rgba(148,163,184,0.03)' },
                    }}
                  >
                    <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#334155', whiteSpace: 'nowrap', minWidth: 70, flexShrink: 0 }}>
                      {new Date(alert.timestamp).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                    </Typography>
                    <Box
                      sx={{
                        px: 0.75, py: 0.125,
                        border: `1px solid ${SEVERITY_BORDER[sev] || 'rgba(148,163,184,0.2)'}`,
                        borderRadius: '3px',
                        color: SEVERITY_COLORS[sev] || '#64748b',
                        fontSize: '0.625rem',
                        fontWeight: 600,
                        lineHeight: 1.6,
                        whiteSpace: 'nowrap',
                        flexShrink: 0,
                      }}
                    >
                      {sev}
                    </Box>
                    <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#94a3b8', flex: 1 }}>
                      {alert.title}
                    </Typography>
                    <Typography sx={{ fontFamily: MONO, fontSize: '0.625rem', color: '#475569', whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {alert.source_ip}
                    </Typography>
                  </Box>
                );
              })}
            </Box>
          </CardContent>
        </GlassCard>
      </Box>
    </StaggerContainer>
  );
};

export default Dashboard;
