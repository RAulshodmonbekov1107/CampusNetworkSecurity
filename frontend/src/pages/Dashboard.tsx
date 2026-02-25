import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { Box, Typography, CardContent } from '@mui/material';
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
  CartesianGrid, Tooltip as RTooltip, PieChart, Pie, Cell,
} from 'recharts';
import { Activity, Wifi, ShieldAlert, HeartPulse, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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
  critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#22c55e',
  CRITICAL: '#ef4444', HIGH: '#f59e0b', MEDIUM: '#3b82f6', LOW: '#22c55e',
};
const SEVERITY_BORDER: Record<string, string> = {
  critical: 'rgba(239,68,68,0.4)', high: 'rgba(245,158,11,0.4)',
  medium: 'rgba(59,130,246,0.3)', low: 'rgba(34,197,94,0.3)',
  CRITICAL: 'rgba(239,68,68,0.4)', HIGH: 'rgba(245,158,11,0.4)',
  MEDIUM: 'rgba(59,130,246,0.3)', LOW: 'rgba(34,197,94,0.3)',
};

const tooltipStyle = {
  background: '#0f172a', border: '0.5px solid rgba(148,163,184,0.12)',
  borderRadius: 6, color: '#e2e8f0', fontSize: '0.75rem',
  fontFamily: MONO, boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
};

const DIR_LABEL = { out: '▲', in: '▼', int: '⟷' };

function formatBytes(bytes: number) {
  if (!bytes) return '0 B';
  const k = 1024, sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface LiveDevice { ip: string; flows: number; bytes: number; proto: string; lastSeen: number; }
interface LiveFlow { src: string; dst: string; proto: string; bytes: number; sport: number; dport: number; dir: string; ts: number; }
interface LiveAlert { ts: string; severity: string; title: string; source_ip: string; destination_ip: string; category: string; }

// ── WS hook ───────────────────────────────────────────────────────────────────
function useLiveFeed(
  onStats: (d: any) => void,
  onAlert: (a: LiveAlert) => void,
) {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const proto = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = process.env.REACT_APP_WS_HOST || window.location.hostname + ':8000';
    let reconnectTimer: ReturnType<typeof setTimeout>;

    function connect() {
      const ws = new WebSocket(`${proto}://${host}/ws/live/`);
      wsRef.current = ws;

      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === 'stats_update') onStats(msg);
          else if (msg.type === 'alert') onAlert(msg);
        } catch { }
      };

      ws.onclose = () => { reconnectTimer = setTimeout(connect, 4000); };
      ws.onerror = () => ws.close();
    }

    connect();
    return () => {
      clearTimeout(reconnectTimer);
      wsRef.current?.close();
    };
  }, [onStats, onAlert]);
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
const Dashboard: React.FC = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [protocols, setProtocols] = useState<ProtocolStat[]>([]);
  const [loading, setLoading] = useState(true);
  const { t } = useTranslation();

  // Live state
  const [wsConnected, setWsConnected] = useState(false);
  const [devices, setDevices] = useState<Map<string, LiveDevice>>(new Map());
  const [liveFlows, setLiveFlows] = useState<LiveFlow[]>([]);
  const [liveAlerts, setLiveAlerts] = useState<LiveAlert[]>([]);
  const [liveBytes, setLiveBytes] = useState(0);
  const [liveFlowCount, setLiveFlowCount] = useState(0);
  const [livePulse, setLivePulse] = useState(false);

  // Periodic API fetch (fallback baseline, runs every 10s)
  const loadData = useCallback(async () => {
    try {
      const [dashData, protocolData] = await Promise.all([
        dashboardService.getStats(),
        statsService.getProtocols().catch(() => []),
      ]);
      setStats(dashData);
      if (protocolData.length) setProtocols(protocolData);
    } catch { }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 10000);
    return () => clearInterval(t);
  }, [loadData]);

  // Live WebSocket handlers
  const handleStats = useCallback((msg: any) => {
    setWsConnected(true);
    setLiveBytes(b => b + (msg.flush_bytes || 0));
    setLiveFlowCount(c => c + (msg.flush_flows || 0));

    // Update device map
    setDevices(prev => {
      const next = new Map(prev);
      (msg.devices || []).forEach((d: any) => {
        const ex = next.get(d.ip);
        next.set(d.ip, {
          ip: d.ip,
          flows: (ex?.flows || 0) + d.flows,
          bytes: (ex?.bytes || 0) + d.bytes,
          proto: d.proto,
          lastSeen: Date.now(),
        });
      });
      // Remove devices not seen for >60s
      next.forEach((v, k) => { if (Date.now() - v.lastSeen > 60000) next.delete(k); });
      return next;
    });

    // Prepend new flows (keep last 80)
    const newFlows: LiveFlow[] = (msg.flows || []).map((f: any) => ({ ...f, ts: Date.now() }));
    if (newFlows.length) {
      setLiveFlows(prev => [...newFlows, ...prev].slice(0, 80));
      setLivePulse(true);
      setTimeout(() => setLivePulse(false), 400);
    }
  }, []);

  const handleAlert = useCallback((a: LiveAlert) => {
    setLiveAlerts(prev => [a, ...prev].slice(0, 30));
  }, []);

  useLiveFeed(handleStats, handleAlert);

  // Merge live alerts with ORM alerts
  const allAlerts = useMemo(() => {
    const orm = stats?.recent_alerts.map(a => ({
      ts: a.timestamp, severity: a.severity,
      title: a.title, source_ip: a.source_ip,
      destination_ip: '', category: '',
    })) || [];
    const combined = [...liveAlerts, ...orm];
    // deduplicate by ts+title
    const seen = new Set<string>();
    return combined.filter(a => {
      const k = a.ts + a.title;
      if (seen.has(k)) return false;
      seen.add(k); return true;
    }).slice(0, 20);
  }, [liveAlerts, stats]);

  const trafficData = useMemo(() => {
    if (!stats) return [];
    return stats.traffic_timeline.map(t => {
      const d = new Date(t.time);
      return { time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), bytes: t.bytes };
    });
  }, [stats]);

  const sparkTraffic = useMemo(() => trafficData.map(d => d.bytes), [trafficData]);

  const sortedDevices = useMemo(() =>
    Array.from(devices.values()).sort((a, b) => b.bytes - a.bytes),
    [devices]);

  const activeDeviceCount = sortedDevices.length;

  if (loading) return <LoadingSkeleton variant="stats" />;
  if (!stats) return null;

  return (
    <StaggerContainer>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Typography variant="h4" sx={{ fontWeight: 600, color: '#e2e8f0' }}>
          {t('dashboard.title')}
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <motion.div animate={{ scale: wsConnected ? [1, 1.4, 1] : 1 }} transition={{ duration: 0.3 }}>
            <Box sx={{ width: 6, height: 6, borderRadius: '50%', bgcolor: wsConnected ? '#22c55e' : '#475569' }} />
          </motion.div>
          <Typography sx={{ fontFamily: MONO, fontSize: '0.625rem', color: wsConnected ? '#22c55e' : '#475569' }}>
            {wsConnected ? 'LIVE CAPTURE ACTIVE' : 'CONNECTING...'}
          </Typography>
          {wsConnected && (
            <Typography sx={{ fontFamily: MONO, fontSize: '0.625rem', color: '#334155', ml: 1 }}>
              +{liveFlowCount} flows · +{formatBytes(liveBytes)}
            </Typography>
          )}
        </Box>
      </Box>

      {/* Stat Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 1.5, mb: 2 }}>
        <StatCard
          title={t('dashboard.totalTraffic')}
          value={formatBytes((stats.metrics.total_traffic_24h || 0) + liveBytes)}
          icon={Activity} color="#3b82f6"
          change={12.4} sparkData={sparkTraffic.slice(-12)}
        />
        <StatCard
          title="Active Devices"
          value={activeDeviceCount || stats.metrics.active_connections}
          icon={Wifi} color="#6366f1"
          change={0}
          sparkData={[activeDeviceCount]}
        />
        <StatCard
          title={t('dashboard.alertsCount')}
          value={allAlerts.length || stats.metrics.alerts_count}
          icon={ShieldAlert}
          color={allAlerts.length > 0 ? '#f59e0b' : '#22c55e'}
          change={0}
          sparkData={[2, 5, 3, 8, 4, 6, 3, 7, 5, 4]}
        />
        <StatCard
          title={t('dashboard.systemHealth')}
          value={`${stats.metrics.system_health.network_uptime}%`}
          icon={HeartPulse} color="#22c55e"
          change={0.1}
          sparkData={[99, 99.5, 99.8, 99.9, 99.7, 99.9, 99.8, 99.9]}
        />
      </Box>

      {/* Traffic Timeline */}
      <motion.div variants={{ hidden: { opacity: 0, y: 10 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}>
        <GlassCard animated={false}>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 1.5 }}>
              {t('dashboard.trafficTimeline')}
            </Typography>
            <Box sx={{ height: 200 }}>
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
                  <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatBytes(v), 'Traffic']} />
                  <Area type="linear" dataKey="bytes" stroke="#3b82f6" fill="url(#trafficFill)" strokeWidth={1.5} dot={false} activeDot={{ r: 3, fill: '#3b82f6', stroke: '#0f172a', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </GlassCard>
      </motion.div>

      {/* Middle row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr 1.2fr' }, gap: 1.5, mt: 1.5 }}>
        {/* Protocol Distribution */}
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 1 }}>
              Protocol Distribution
            </Typography>
            <Box sx={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={protocols.map(p => ({ name: p.protocol, value: p.total_bytes }))}
                    cx="50%" cy="50%" innerRadius={45} outerRadius={72} paddingAngle={2} dataKey="value" stroke="none">
                    {protocols.map((_, idx) => <Cell key={idx} fill={PROTOCOL_COLORS[idx % PROTOCOL_COLORS.length]} />)}
                  </Pie>
                  <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatBytes(v), '']} />
                </PieChart>
              </ResponsiveContainer>
            </Box>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
              {protocols.slice(0, 6).map((p, idx) => (
                <Box key={p.protocol} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Box sx={{ width: 6, height: 6, borderRadius: '1px', bgcolor: PROTOCOL_COLORS[idx % PROTOCOL_COLORS.length] }} />
                  <Typography sx={{ fontSize: '0.625rem', color: '#64748b', fontFamily: MONO }}>{p.protocol}</Typography>
                </Box>
              ))}
            </Box>
          </CardContent>
        </GlassCard>

        {/* Active Devices — LIVE */}
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b' }}>
                Active Devices
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <motion.div animate={{ scale: [1, 1.3, 1] }} transition={{ duration: 2, repeat: Infinity }}>
                  <Radio size={10} color={wsConnected ? '#22c55e' : '#475569'} />
                </motion.div>
                <Typography sx={{ fontFamily: MONO, fontSize: '0.6rem', color: wsConnected ? '#22c55e' : '#475569' }}>
                  {activeDeviceCount} ONLINE
                </Typography>
              </Box>
            </Box>
            <Box sx={{ maxHeight: 220, overflow: 'auto', '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { background: '#1e293b' } }}>
              <AnimatePresence initial={false}>
                {sortedDevices.length > 0 ? sortedDevices.map((dev) => (
                  <motion.div key={dev.ip}
                    initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 8 }}
                    transition={{ duration: 0.25 }}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.6, px: 0.75, borderBottom: '0.5px solid rgba(148,163,184,0.05)', borderRadius: '3px', '&:hover': { background: 'rgba(148,163,184,0.03)' } }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                          <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#22c55e', boxShadow: '0 0 4px #22c55e55' }} />
                        </motion.div>
                        <Typography sx={{ fontFamily: MONO, fontSize: '0.75rem', color: '#e2e8f0' }}>{dev.ip}</Typography>
                      </Box>
                      <Box sx={{ textAlign: 'right' }}>
                        <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#3b82f6' }}>{formatBytes(dev.bytes)}</Typography>
                        <Typography sx={{ fontFamily: MONO, fontSize: '0.5625rem', color: '#334155' }}>{dev.flows} flows</Typography>
                      </Box>
                    </Box>
                  </motion.div>
                )) : (
                  // Fallback to API top IPs
                  stats.top_source_ips.filter(ip => ip.source_ip.startsWith('192.168.')).map((ip, idx) => (
                    <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', py: 0.6, px: 0.75, borderBottom: '0.5px solid rgba(148,163,184,0.05)' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#475569' }} />
                        <Typography sx={{ fontFamily: MONO, fontSize: '0.75rem', color: '#94a3b8' }}>{ip.source_ip}</Typography>
                      </Box>
                      <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#475569' }}>{formatBytes(ip.total_bytes)}</Typography>
                    </Box>
                  ))
                )}
              </AnimatePresence>
            </Box>
          </CardContent>
        </GlassCard>

        {/* Live Network Flow animation */}
        <GlassCard>
          <CardContent sx={{ p: '12px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 1 }}>
              Live Network Flow
            </Typography>
            <Box sx={{ height: 240 }}>
              <NetworkFlowAnimation />
            </Box>
          </CardContent>
        </GlassCard>
      </Box>

      {/* Bottom row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1.5fr' }, gap: 1.5, mt: 1.5 }}>
        {/* Live Flow Feed */}
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b' }}>
                Live Flow Feed
              </Typography>
              <motion.div animate={{ opacity: livePulse ? 1 : 0.4 }} transition={{ duration: 0.2 }}>
                <Typography sx={{ fontFamily: MONO, fontSize: '0.6rem', color: '#3b82f6' }}>● STREAMING</Typography>
              </motion.div>
            </Box>
            <Box sx={{ fontFamily: MONO, fontSize: '0.6875rem', maxHeight: 280, overflow: 'auto', '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { background: '#1e293b' } }}>
              <AnimatePresence initial={false}>
                {liveFlows.map((flow, i) => (
                  <motion.div key={`${flow.src}-${flow.dst}-${flow.ts}-${i}`}
                    initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.5, px: 0.5, borderBottom: '0.5px solid rgba(148,163,184,0.04)', '&:hover': { background: 'rgba(148,163,184,0.03)' } }}>
                      <Typography sx={{ fontFamily: MONO, fontSize: '0.5625rem', color: '#334155', minWidth: 16, textAlign: 'center' }}>
                        {DIR_LABEL[flow.dir as keyof typeof DIR_LABEL] || '→'}
                      </Typography>
                      <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#e2e8f0', minWidth: 104 }}>{flow.src}</Typography>
                      <Typography sx={{ fontFamily: MONO, fontSize: '0.5625rem', color: '#334155' }}>→</Typography>
                      <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#94a3b8', minWidth: 104 }}>{flow.dst}</Typography>
                      <Box sx={{ px: 0.75, py: 0.1, border: `0.5px solid rgba(59,130,246,0.3)`, borderRadius: '3px', color: '#3b82f6', fontSize: '0.5625rem', fontWeight: 600, minWidth: 36, textAlign: 'center' }}>
                        {flow.proto}
                      </Box>
                      <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#475569', ml: 'auto' }}>
                        {formatBytes(flow.bytes)}
                      </Typography>
                    </Box>
                  </motion.div>
                ))}
              </AnimatePresence>
              {liveFlows.length === 0 && (
                <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#334155', textAlign: 'center', py: 4 }}>
                  Waiting for traffic...
                </Typography>
              )}
            </Box>
          </CardContent>
        </GlassCard>

        {/* Alerts — live */}
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
              <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b' }}>
                {t('dashboard.recentAlerts')}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <motion.div animate={{ scale: [1, 1.02, 1] }} transition={{ duration: 3, repeat: Infinity }}>
                  <Box sx={{ width: 5, height: 5, borderRadius: '50%', bgcolor: '#22c55e' }} />
                </motion.div>
                <Typography sx={{ fontFamily: MONO, fontSize: '0.625rem', color: '#22c55e', fontWeight: 500 }}>LIVE</Typography>
              </Box>
            </Box>
            <Box sx={{ fontFamily: MONO, fontSize: '0.75rem', maxHeight: 280, overflow: 'auto', '&::-webkit-scrollbar': { width: 3 }, '&::-webkit-scrollbar-thumb': { background: '#1e293b' } }}>
              <AnimatePresence initial={false}>
                {allAlerts.length > 0 ? allAlerts.map((alert, i) => {
                  const sev = alert.severity.toLowerCase();
                  return (
                    <motion.div key={`${alert.ts}-${i}`}
                      initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5, py: 0.75, px: 1, borderBottom: '0.5px solid rgba(148,163,184,0.04)', borderRadius: '3px', '&:hover': { background: 'rgba(148,163,184,0.03)' } }}>
                        <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#334155', whiteSpace: 'nowrap', minWidth: 70, flexShrink: 0 }}>
                          {new Date(alert.ts).toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </Typography>
                        <Box sx={{ px: 0.75, py: 0.125, border: `1px solid ${SEVERITY_BORDER[sev] || 'rgba(148,163,184,0.2)'}`, borderRadius: '3px', color: SEVERITY_COLORS[sev] || '#64748b', fontSize: '0.625rem', fontWeight: 600, lineHeight: 1.6, whiteSpace: 'nowrap', flexShrink: 0 }}>
                          {alert.severity.toUpperCase()}
                        </Box>
                        <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#94a3b8', flex: 1 }}>{alert.title}</Typography>
                        <Typography sx={{ fontFamily: MONO, fontSize: '0.625rem', color: '#475569', whiteSpace: 'nowrap', flexShrink: 0 }}>{alert.source_ip}</Typography>
                      </Box>
                    </motion.div>
                  );
                }) : (
                  <Box sx={{ py: 4, textAlign: 'center' }}>
                    <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#334155' }}>No alerts detected</Typography>
                    <Typography sx={{ fontFamily: MONO, fontSize: '0.625rem', color: '#1e293b', mt: 0.5 }}>Network looks clean</Typography>
                  </Box>
                )}
              </AnimatePresence>
            </Box>
          </CardContent>
        </GlassCard>
      </Box>
    </StaggerContainer>
  );
};

export default Dashboard;
