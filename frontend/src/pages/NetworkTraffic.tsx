import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, Button, FormControl, InputLabel, Select, MenuItem, CircularProgress, LinearProgress, Tooltip,
} from '@mui/material';
import {
  ResponsiveContainer, PieChart, Pie, Cell, Tooltip as RTooltip, AreaChart, Area, XAxis, YAxis, CartesianGrid,
} from 'recharts';
import { networkService, statsService } from '../services/api';
import { NetworkTraffic as NetworkTrafficType, ProtocolStat, TrafficTimePoint } from '../types';
import { useTranslation } from 'react-i18next';
import GlassCard from '../components/common/GlassCard';
import StaggerContainer from '../components/common/StaggerContainer';

const MONO = '"JetBrains Mono", monospace';
const PROTOCOL_COLORS = ['#3b82f6', '#6366f1', '#8b5cf6', '#2563eb', '#1d4ed8', '#4f46e5', '#7c3aed', '#60a5fa', '#818cf8', '#475569'];

const FLAG_EMOJI: Record<string, string> = {
  US: '\u{1F1FA}\u{1F1F8}', CN: '\u{1F1E8}\u{1F1F3}', RU: '\u{1F1F7}\u{1F1FA}',
  DE: '\u{1F1E9}\u{1F1EA}', BR: '\u{1F1E7}\u{1F1F7}', IN: '\u{1F1EE}\u{1F1F3}',
  KR: '\u{1F1F0}\u{1F1F7}', JP: '\u{1F1EF}\u{1F1F5}', GB: '\u{1F1EC}\u{1F1E7}',
  FR: '\u{1F1EB}\u{1F1F7}', KG: '\u{1F1F0}\u{1F1EC}', KZ: '\u{1F1F0}\u{1F1FF}', TJ: '\u{1F1F9}\u{1F1EF}',
};

const getReputationColor = (score: number) => {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#eab308';
  return '#22c55e';
};

const tooltipStyle = {
  background: '#0f172a', border: '0.5px solid rgba(148,163,184,0.12)', borderRadius: 6,
  color: '#e2e8f0', fontSize: '0.75rem', fontFamily: MONO, boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
};

const NetworkTraffic: React.FC = () => {
  const [traffic, setTraffic] = useState<NetworkTrafficType[]>([]);
  const [protocols, setProtocols] = useState<ProtocolStat[]>([]);
  const [trafficTimeline, setTrafficTimeline] = useState<TrafficTimePoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ protocol: '', source_ip: '', date_from: '', date_to: '' });
  const { t } = useTranslation();

  const loadData = async () => {
    setLoading(true);
    try {
      const [trafficData, protocolData, timelineData] = await Promise.all([
        networkService.getTraffic(filters),
        statsService.getProtocols().catch(() => []),
        statsService.getTraffic().catch(() => []),
      ]);
      setTraffic(trafficData.results || trafficData);
      if (protocolData.length) setProtocols(protocolData);
      if (timelineData.length) setTrafficTimeline(timelineData);
    } catch (error) {
      console.error('Failed to load network traffic:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 10000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return (bytes / Math.pow(k, i)).toFixed(1) + ' ' + sizes[i];
  };

  const timelineChartData = trafficTimeline.map((t) => {
    const d = new Date(t.time);
    return { time: d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }), bytes: t.bytes };
  });

  const inputSx = {
    '& .MuiInputBase-root': { fontSize: '0.8125rem' },
    '& .MuiInputLabel-root': { fontSize: '0.8125rem' },
  };

  return (
    <StaggerContainer>
      <Typography variant="h4" sx={{ mb: 2, color: '#e2e8f0' }}>{t('common.network')}</Typography>

      {/* Filters */}
      <GlassCard sx={{ mb: 1.5 }}>
        <CardContent sx={{ p: '12px 16px !important' }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120, ...inputSx }}>
              <InputLabel>Protocol</InputLabel>
              <Select value={filters.protocol} label="Protocol" onChange={(e) => setFilters({ ...filters, protocol: e.target.value })}>
                <MenuItem value="">All</MenuItem>
                {['TCP', 'UDP', 'HTTP', 'HTTPS', 'DNS', 'SSH', 'ICMP'].map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
              </Select>
            </FormControl>
            <TextField size="small" label="Source IP" value={filters.source_ip} onChange={(e) => setFilters({ ...filters, source_ip: e.target.value })} sx={{ width: 160, ...inputSx }} />
            <TextField size="small" type="date" label="From" InputLabelProps={{ shrink: true }} value={filters.date_from} onChange={(e) => setFilters({ ...filters, date_from: e.target.value })} sx={{ width: 140, ...inputSx }} />
            <TextField size="small" type="date" label="To" InputLabelProps={{ shrink: true }} value={filters.date_to} onChange={(e) => setFilters({ ...filters, date_to: e.target.value })} sx={{ width: 140, ...inputSx }} />
            <Button size="small" variant="outlined" onClick={() => setFilters({ protocol: '', source_ip: '', date_from: '', date_to: '' })}
              sx={{ borderColor: 'rgba(148,163,184,0.12)', color: '#94a3b8', fontSize: '0.75rem', '&:hover': { borderColor: 'rgba(59,130,246,0.3)' } }}>
              Clear
            </Button>
          </Box>
        </CardContent>
      </GlassCard>

      {/* Charts */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 1.5, mb: 1.5 }}>
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 1 }}>Traffic Over Time</Typography>
            <Box sx={{ height: 260 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timelineChartData} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="netFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.15} />
                      <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="rgba(148,163,184,0.04)" vertical={false} />
                  <XAxis dataKey="time" stroke="#334155" fontSize={10} fontFamily={MONO} tickLine={false} axisLine={{ stroke: 'rgba(148,163,184,0.06)' }} />
                  <YAxis stroke="#334155" fontSize={10} fontFamily={MONO} tickFormatter={(v: number) => formatBytes(v)} tickLine={false} axisLine={false} />
                  <RTooltip contentStyle={tooltipStyle} formatter={(value: number) => [formatBytes(value), 'Traffic']} />
                  <Area type="linear" dataKey="bytes" stroke="#3b82f6" fill="url(#netFill)" strokeWidth={1.5} dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            </Box>
          </CardContent>
        </GlassCard>
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 1 }}>Protocol Distribution</Typography>
            <Box sx={{ height: 260 }}>
              {protocols.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={protocols.map((p) => ({ name: p.protocol, value: p.total_bytes }))} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={2} dataKey="value" stroke="none">
                      {protocols.map((_, idx) => <Cell key={idx} fill={PROTOCOL_COLORS[idx % PROTOCOL_COLORS.length]} />)}
                    </Pie>
                    <RTooltip contentStyle={tooltipStyle} formatter={(v: number) => [formatBytes(v), '']} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><CircularProgress size={24} sx={{ color: '#3b82f6' }} /></Box>
              )}
            </Box>
          </CardContent>
        </GlassCard>
      </Box>

      {/* Traffic Table */}
      <GlassCard>
        <CardContent sx={{ p: '16px !important' }}>
          <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 1.5 }}>Network Traffic Data</Typography>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: '#3b82f6' }} /></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Timestamp', 'Source IP', 'Destination IP', 'Protocol', 'Total', 'Reputation', 'Country'].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {traffic.slice(0, 20).map((item: any) => {
                    const rep = item.reputation;
                    const repScore = rep?.score ?? 0;
                    const countryCode = rep?.country_code || item.country_code || '';
                    const flag = FLAG_EMOJI[countryCode] || '';
                    return (
                      <TableRow key={item.id} sx={{ '&:hover': { bgcolor: 'rgba(148,163,184,0.03)' } }}>
                        <TableCell sx={{ fontFamily: MONO, fontSize: '0.75rem', color: '#475569' }}>{new Date(item.timestamp).toLocaleString()}</TableCell>
                        <TableCell sx={{ fontFamily: MONO, fontSize: '0.75rem' }}>{item.source_ip}</TableCell>
                        <TableCell sx={{ fontFamily: MONO, fontSize: '0.75rem' }}>{item.destination_ip}</TableCell>
                        <TableCell>
                          <Box component="code" sx={{ px: 0.75, py: 0.25, borderRadius: '3px', bgcolor: 'rgba(59,130,246,0.08)', color: '#60a5fa', fontSize: '0.6875rem', fontFamily: MONO, fontWeight: 500 }}>
                            {item.protocol}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontFamily: MONO, fontSize: '0.75rem', color: '#94a3b8' }}>{formatBytes(item.total_bytes || 0)}</TableCell>
                        <TableCell>
                          {rep ? (
                            <Tooltip title={`ISP: ${rep.isp} | Reports: ${rep.total_reports}`}>
                              <Box>
                                <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: getReputationColor(repScore), fontWeight: 600, mb: 0.25 }}>
                                  {repScore}/100
                                </Typography>
                                <LinearProgress variant="determinate" value={repScore} sx={{
                                  height: 2, borderRadius: 1, bgcolor: 'rgba(148,163,184,0.06)',
                                  '& .MuiLinearProgress-bar': { bgcolor: getReputationColor(repScore), borderRadius: 1 },
                                }} />
                              </Box>
                            </Tooltip>
                          ) : (
                            <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#334155' }}>—</Typography>
                          )}
                        </TableCell>
                        <TableCell sx={{ fontFamily: MONO, fontSize: '0.75rem', color: '#64748b' }}>
                          {flag ? `${flag} ` : ''}{countryCode || '—'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </GlassCard>
    </StaggerContainer>
  );
};

export default NetworkTraffic;
