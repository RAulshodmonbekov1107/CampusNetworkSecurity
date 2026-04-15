import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, CardContent, Chip, Table, TableBody,
  TableCell, TableContainer, TableHead, TableRow, LinearProgress,
  Tab, Tabs,
} from '@mui/material';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip as RTooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { Shield, FileWarning, Fingerprint, Swords } from 'lucide-react';
import { motion } from 'framer-motion';
import { siemService } from '../services/api';
import StatCard from '../components/common/StatCard';
import GlassCard from '../components/common/GlassCard';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import StaggerContainer from '../components/common/StaggerContainer';

const MONO = '"JetBrains Mono", monospace';

const SEVERITY_COLORS: Record<string, string> = {
  low: '#22c55e', medium: '#3b82f6', high: '#f59e0b', critical: '#ef4444',
};
const PIE_COLORS = ['#22c55e', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4'];
const TACTIC_COLORS = ['#ef4444', '#f59e0b', '#3b82f6', '#8b5cf6', '#22c55e', '#06b6d4', '#ec4899', '#f97316'];

const tooltipStyle = {
  background: '#0f172a', border: '0.5px solid rgba(148,163,184,0.12)',
  borderRadius: 6, color: '#e2e8f0', fontSize: '0.75rem',
  fontFamily: MONO, boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
};

function levelToSeverity(level: number): string {
  if (level >= 12) return 'critical';
  if (level >= 8) return 'high';
  if (level >= 4) return 'medium';
  return 'low';
}

function levelColor(level: number): string {
  return SEVERITY_COLORS[levelToSeverity(level)] || '#64748b';
}

const SIEM: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState(0);
  const [overview, setOverview] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [mitre, setMitre] = useState<any>(null);
  const [fim, setFim] = useState<any>(null);

  const loadData = useCallback(async () => {
    try {
      const [ov, al, mi, fi] = await Promise.all([
        siemService.getOverview(),
        siemService.getAlerts({ limit: 30 }),
        siemService.getMitre(),
        siemService.getFim(),
      ]);
      setOverview(ov);
      setAlerts(al);
      setMitre(mi);
      setFim(fi);
    } catch (e) {
      console.error('SIEM load error', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 30000);
    return () => clearInterval(t);
  }, [loadData]);

  if (loading) return <LoadingSkeleton variant="stats" />;

  const severityData = overview?.severity
    ? Object.entries(overview.severity).map(([key, value]) => ({
        name: key, value: value as number,
      }))
    : [];

  return (
    <StaggerContainer>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', gap: 2 }}>
        <Typography variant="h5" sx={{ color: '#e2e8f0', fontWeight: 700, letterSpacing: '-0.02em' }}>
          SIEM — Wazuh Security
        </Typography>
        <Chip label="LIVE" size="small" sx={{
          bgcolor: 'rgba(34,197,94,0.15)', color: '#22c55e',
          fontWeight: 700, fontSize: '0.65rem', height: 20,
        }} />
      </Box>

      {/* ── Stat Cards ────────────────────────────────── */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 2, mb: 3 }}>
        <StatCard title="Total Events (24h)" value={overview?.total_alerts ?? 0} icon={Shield} color="#3b82f6" />
        <StatCard title="Critical Alerts" value={overview?.critical_alerts ?? 0} icon={Swords} color="#ef4444" />
        <StatCard title="Auth Failures" value={overview?.auth_failures ?? 0} icon={Fingerprint} color="#f59e0b" />
        <StatCard title="File Integrity" value={overview?.file_integrity ?? 0} icon={FileWarning} color="#8b5cf6" />
      </Box>

      {/* ── Alert Timeline ────────────────────────────── */}
      <GlassCard sx={{ mb: 3 }}>
        <CardContent>
          <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Alert Timeline (24h)
          </Typography>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={overview?.timeline || []}>
              <defs>
                <linearGradient id="siemGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="rgba(148,163,184,0.06)" />
              <XAxis dataKey="time" tick={{ fill: '#475569', fontSize: 10, fontFamily: MONO }}
                tickFormatter={(v) => new Date(v).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} />
              <YAxis tick={{ fill: '#475569', fontSize: 10, fontFamily: MONO }} width={40} />
              <RTooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#siemGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </GlassCard>

      {/* ── Tabs ──────────────────────────────────────── */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{
        mb: 2,
        '& .MuiTab-root': { color: '#64748b', fontSize: '0.8rem', fontWeight: 600, textTransform: 'none' },
        '& .Mui-selected': { color: '#3b82f6' },
        '& .MuiTabs-indicator': { backgroundColor: '#3b82f6' },
      }}>
        <Tab label="Recent Alerts" />
        <Tab label="MITRE ATT&CK" />
        <Tab label="File Integrity" />
        <Tab label="Severity Breakdown" />
      </Tabs>

      {/* ── Tab 0: Recent Alerts Table ────────────────── */}
      {tab === 0 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <GlassCard>
            <TableContainer sx={{ maxHeight: 420 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['Time', 'Level', 'Description', 'MITRE', 'Agent', 'Source IP'].map((h) => (
                      <TableCell key={h} sx={{ bgcolor: '#0f172a', color: '#64748b', fontSize: '0.7rem', fontWeight: 600, borderBottom: '1px solid rgba(148,163,184,0.08)' }}>
                        {h}
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((a: any) => (
                    <TableRow key={a.id} hover sx={{ '&:hover': { bgcolor: 'rgba(59,130,246,0.04)' } }}>
                      <TableCell sx={{ color: '#94a3b8', fontSize: '0.7rem', fontFamily: MONO, whiteSpace: 'nowrap', borderBottom: '1px solid rgba(148,163,184,0.04)' }}>
                        {new Date(a.timestamp).toLocaleTimeString()}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(148,163,184,0.04)' }}>
                        <Chip label={a.rule_level} size="small" sx={{
                          bgcolor: `${levelColor(a.rule_level)}20`,
                          color: levelColor(a.rule_level),
                          fontWeight: 700, fontSize: '0.65rem', height: 20, minWidth: 32,
                        }} />
                      </TableCell>
                      <TableCell sx={{ color: '#e2e8f0', fontSize: '0.75rem', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', borderBottom: '1px solid rgba(148,163,184,0.04)' }}>
                        {a.description}
                      </TableCell>
                      <TableCell sx={{ borderBottom: '1px solid rgba(148,163,184,0.04)' }}>
                        {a.mitre_ids?.map((id: string) => (
                          <Chip key={id} label={id} size="small" sx={{
                            bgcolor: 'rgba(139,92,246,0.12)', color: '#a78bfa',
                            fontSize: '0.6rem', height: 18, mr: 0.5,
                          }} />
                        ))}
                      </TableCell>
                      <TableCell sx={{ color: '#94a3b8', fontSize: '0.7rem', fontFamily: MONO, borderBottom: '1px solid rgba(148,163,184,0.04)' }}>
                        {a.agent_name}
                      </TableCell>
                      <TableCell sx={{ color: '#94a3b8', fontSize: '0.7rem', fontFamily: MONO, borderBottom: '1px solid rgba(148,163,184,0.04)' }}>
                        {a.src_ip || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </GlassCard>
        </motion.div>
      )}

      {/* ── Tab 1: MITRE ATT&CK ──────────────────────── */}
      {tab === 1 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <GlassCard>
              <CardContent>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Tactics
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mitre?.tactics || []} layout="vertical">
                    <CartesianGrid stroke="rgba(148,163,184,0.06)" />
                    <XAxis type="number" tick={{ fill: '#475569', fontSize: 10, fontFamily: MONO }} />
                    <YAxis dataKey="tactic" type="category" width={160}
                      tick={{ fill: '#e2e8f0', fontSize: 10 }} />
                    <RTooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {(mitre?.tactics || []).map((_: any, i: number) => (
                        <Cell key={i} fill={TACTIC_COLORS[i % TACTIC_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </GlassCard>
            <GlassCard>
              <CardContent>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Techniques
                </Typography>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={mitre?.techniques || []} layout="vertical">
                    <CartesianGrid stroke="rgba(148,163,184,0.06)" />
                    <XAxis type="number" tick={{ fill: '#475569', fontSize: 10, fontFamily: MONO }} />
                    <YAxis dataKey="technique" type="category" width={220}
                      tick={{ fill: '#e2e8f0', fontSize: 9 }} />
                    <RTooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="count" fill="#8b5cf6" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </GlassCard>
          </Box>
        </motion.div>
      )}

      {/* ── Tab 2: File Integrity ─────────────────────── */}
      {tab === 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <GlassCard>
              <CardContent>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Events by Type
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={fim?.by_event || []} dataKey="count" nameKey="event"
                      cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                      paddingAngle={3} strokeWidth={0}>
                      {(fim?.by_event || []).map((_: any, i: number) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
                  {(fim?.by_event || []).map((e: any, i: number) => (
                    <Box key={e.event} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                        {e.event} ({e.count})
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </GlassCard>
            <GlassCard>
              <CardContent>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Most Changed Files
                </Typography>
                {(fim?.top_files || []).map((f: any, i: number) => (
                  <Box key={f.path} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography sx={{ color: '#e2e8f0', fontSize: '0.7rem', fontFamily: MONO, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '75%' }}>
                        {f.path}
                      </Typography>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem', fontFamily: MONO }}>
                        {f.count}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate"
                      value={Math.min(100, (f.count / Math.max(1, (fim?.top_files?.[0]?.count || 1))) * 100)}
                      sx={{
                        height: 4, borderRadius: 2, bgcolor: 'rgba(148,163,184,0.06)',
                        '& .MuiLinearProgress-bar': { bgcolor: PIE_COLORS[i % PIE_COLORS.length], borderRadius: 2 },
                      }} />
                  </Box>
                ))}
              </CardContent>
            </GlassCard>
          </Box>
        </motion.div>
      )}

      {/* ── Tab 3: Severity Breakdown ─────────────────── */}
      {tab === 3 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
            <GlassCard>
              <CardContent>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Alert Severity Distribution
                </Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={severityData} dataKey="value" nameKey="name"
                      cx="50%" cy="50%" innerRadius={50} outerRadius={90}
                      paddingAngle={3} strokeWidth={0}>
                      {severityData.map((s) => (
                        <Cell key={s.name} fill={SEVERITY_COLORS[s.name] || '#64748b'} />
                      ))}
                    </Pie>
                    <RTooltip contentStyle={tooltipStyle} />
                  </PieChart>
                </ResponsiveContainer>
                <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mt: 1 }}>
                  {severityData.map((s) => (
                    <Box key={s.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <Box sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: SEVERITY_COLORS[s.name] || '#64748b' }} />
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.65rem' }}>
                        {s.name} ({s.value})
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </GlassCard>
            <GlassCard>
              <CardContent>
                <Typography sx={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 600, mb: 2, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Top Alert Rules
                </Typography>
                {(overview?.top_rules || []).map((r: any, i: number) => (
                  <Box key={r.rule} sx={{ mb: 1.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.25 }}>
                      <Typography sx={{ color: '#e2e8f0', fontSize: '0.7rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '80%' }}>
                        {r.rule}
                      </Typography>
                      <Typography sx={{ color: '#94a3b8', fontSize: '0.7rem', fontFamily: MONO }}>
                        {r.count}
                      </Typography>
                    </Box>
                    <LinearProgress variant="determinate"
                      value={Math.min(100, (r.count / Math.max(1, (overview?.top_rules?.[0]?.count || 1))) * 100)}
                      sx={{
                        height: 4, borderRadius: 2, bgcolor: 'rgba(148,163,184,0.06)',
                        '& .MuiLinearProgress-bar': { bgcolor: TACTIC_COLORS[i % TACTIC_COLORS.length], borderRadius: 2 },
                      }} />
                  </Box>
                ))}
              </CardContent>
            </GlassCard>
          </Box>
        </motion.div>
      )}
    </StaggerContainer>
  );
};

export default SIEM;
