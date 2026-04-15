import React, { useEffect, useState, useCallback } from 'react';
import {
  Box, Typography, CardContent, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, TextField, CircularProgress,
  LinearProgress, Chip,
} from '@mui/material';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldAlert, Search, RefreshCw, Wifi, AlertTriangle } from 'lucide-react';
import { threatsService } from '../services/api';
import { ThreatIntelligence as ThreatType } from '../types';
import { useTranslation } from 'react-i18next';
import GlassCard from '../components/common/GlassCard';
import StaggerContainer from '../components/common/StaggerContainer';

const MONO = '"JetBrains Mono", monospace';

const THREAT_COLOR: Record<string, string> = {
  exploit:  '#f59e0b',
  botnet:   '#ef4444',
  c2:       '#ef4444',
  malware:  '#ef4444',
  phishing: '#f59e0b',
  ransomware: '#ef4444',
  trojan:   '#ef4444',
  spyware:  '#f59e0b',
};

const SCORE_COLOR = (score: number) => {
  if (score >= 80) return '#ef4444';
  if (score >= 60) return '#f59e0b';
  if (score >= 40) return '#eab308';
  return '#22c55e';
};

const SEVERITY_LABEL: Record<string, { label: string; color: string }> = {
  exploit:  { label: 'INTRUSION', color: '#f59e0b' },
  botnet:   { label: 'BOTNET',    color: '#ef4444' },
  c2:       { label: 'C2',        color: '#ef4444' },
  malware:  { label: 'MALWARE',   color: '#ef4444' },
  phishing: { label: 'PHISHING',  color: '#f59e0b' },
  ransomware: { label: 'RANSOM',  color: '#ef4444' },
  trojan:   { label: 'TROJAN',    color: '#ef4444' },
  spyware:  { label: 'SPYWARE',   color: '#f59e0b' },
};

const SOURCE_BADGE: Record<string, { label: string; color: string }> = {
  'Campus IDS': { label: 'Campus IDS', color: '#3b82f6' },
  'VirusTotal': { label: 'VirusTotal', color: '#8b5cf6' },
  'AbuseIPDB':  { label: 'AbuseIPDB', color: '#ec4899' },
  'MISP':       { label: 'MISP',      color: '#14b8a6' },
};

const fmtDate = (d: string) => {
  try { return new Date(d).toLocaleString([], { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }); }
  catch { return '—'; }
};

const EmptyState: React.FC = () => (
  <Box sx={{ py: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1.5 }}>
    <ShieldAlert size={36} color="#334155" strokeWidth={1} />
    <Typography sx={{ color: '#475569', fontSize: '0.875rem' }}>No threat indicators found</Typography>
    <Typography sx={{ color: '#334155', fontSize: '0.75rem', textAlign: 'center', maxWidth: 340 }}>
      Threat records are automatically created when the Campus IDS detects port scans,
      brute-force attempts, or suspicious traffic. Run an attack simulation or wait for
      the monitor to detect real activity.
    </Typography>
  </Box>
);

const ThreatIntelligence: React.FC = () => {
  const [threats, setThreats]         = useState<ThreatType[]>([]);
  const [loading, setLoading]         = useState(true);
  const [refreshing, setRefreshing]   = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const { t } = useTranslation();

  const loadThreats = useCallback(async (silent = false) => {
    if (!silent) setLoading(true); else setRefreshing(true);
    try {
      const data = await threatsService.getThreats();
      setThreats(data.results ?? data);
      setLastRefresh(new Date());
    } catch { /* ignore */ }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  const searchThreats = useCallback(async () => {
    setLoading(true);
    try {
      const data = await threatsService.searchThreats(searchQuery);
      setThreats(data.results ?? data);
    } catch { /* ignore */ }
    finally { setLoading(false); }
  }, [searchQuery]);

  // Initial load
  useEffect(() => { loadThreats(); }, [loadThreats]);

  // Search debounce
  useEffect(() => {
    if (!searchQuery) { loadThreats(true); return; }
    const t = setTimeout(() => searchThreats(), 450);
    return () => clearTimeout(t);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  // Auto-refresh every 20 s to pick up newly detected threats
  useEffect(() => {
    const id = setInterval(() => loadThreats(true), 20_000);
    return () => clearInterval(id);
  }, [loadThreats]);

  const campusCount   = threats.filter(t => t.source === 'Campus IDS').length;
  const criticalCount = threats.filter(t => t.reputation_score >= 75).length;

  return (
    <StaggerContainer>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <ShieldAlert size={20} color="#ef4444" strokeWidth={1.5} />
          <Typography variant="h5" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
            {t('common.threats')}
          </Typography>
          {threats.length > 0 && (
            <Box component="span" sx={{
              ml: 0.5, px: 1, py: 0.25, borderRadius: '4px',
              bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
              color: '#ef4444', fontSize: '0.6875rem', fontFamily: MONO, fontWeight: 700,
            }}>
              {threats.length} IOC{threats.length !== 1 ? 's' : ''}
            </Box>
          )}
        </Box>

        {/* Live badge + refresh */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: 'easeInOut' }}
            >
              <Wifi size={12} color="#22c55e" />
            </motion.div>
            <Typography sx={{ fontSize: '0.625rem', fontFamily: MONO, color: '#22c55e', letterSpacing: '0.05em' }}>
              AUTO-REFRESH
            </Typography>
          </Box>
          <Box
            component="button"
            onClick={() => loadThreats(true)}
            sx={{
              background: 'none', border: '1px solid rgba(148,163,184,0.1)', cursor: 'pointer',
              borderRadius: '4px', p: '4px 8px', display: 'flex', alignItems: 'center', gap: 0.5,
              color: '#64748b', '&:hover': { borderColor: 'rgba(59,130,246,0.3)', color: '#93c5fd' },
              transition: 'all 0.15s',
            }}
          >
            <motion.div animate={refreshing ? { rotate: 360 } : {}} transition={{ duration: 0.6, ease: 'linear' }}>
              <RefreshCw size={12} />
            </motion.div>
            <Typography sx={{ fontSize: '0.625rem', fontFamily: MONO }}>REFRESH</Typography>
          </Box>
        </Box>
      </Box>

      {/* Summary chips */}
      {threats.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, flexWrap: 'wrap' }}>
          <Chip
            icon={<Wifi size={11} color="#3b82f6" />}
            label={`${campusCount} Campus-detected`}
            size="small"
            sx={{ bgcolor: 'rgba(59,130,246,0.08)', border: '1px solid rgba(59,130,246,0.2)', color: '#60a5fa', fontSize: '0.6875rem', fontFamily: MONO, height: 22 }}
          />
          {criticalCount > 0 && (
            <Chip
              icon={<AlertTriangle size={11} color="#ef4444" />}
              label={`${criticalCount} High-risk`}
              size="small"
              sx={{ bgcolor: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#f87171', fontSize: '0.6875rem', fontFamily: MONO, height: 22 }}
            />
          )}
          <Typography sx={{ color: '#334155', fontSize: '0.625rem', fontFamily: MONO, alignSelf: 'center', ml: 'auto' }}>
            Last updated {lastRefresh.toLocaleTimeString()}
          </Typography>
        </Box>
      )}

      {/* Search */}
      <GlassCard sx={{ mb: 1.5 }}>
        <CardContent sx={{ p: '10px 14px !important' }}>
          <TextField
            fullWidth size="small"
            placeholder="Search by IP, domain, hash…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: <Search size={14} color="#475569" style={{ marginRight: 8 }} />,
            }}
            sx={{
              '& .MuiInputBase-root': { fontSize: '0.8125rem', fontFamily: MONO },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: 'rgba(148,163,184,0.08)' },
            }}
          />
        </CardContent>
      </GlassCard>

      {/* Table */}
      <GlassCard>
        <CardContent sx={{ p: '0 !important' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
              <CircularProgress size={22} sx={{ color: '#3b82f6' }} />
            </Box>
          ) : threats.length === 0 ? (
            <EmptyState />
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& .MuiTableCell-root': { borderColor: 'rgba(148,163,184,0.06)', py: 0.75, fontSize: '0.625rem', color: '#475569', fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase' } }}>
                    {['Type', 'IOC Value', 'Threat', 'Risk Score', 'Source', 'First Seen', 'Last Seen'].map(h => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  <AnimatePresence>
                    {threats.map((threat) => {
                      const threatMeta = SEVERITY_LABEL[threat.threat_type] ?? { label: threat.threat_type.toUpperCase(), color: '#64748b' };
                      const srcMeta    = SOURCE_BADGE[threat.source] ?? { label: threat.source, color: '#475569' };
                      const scoreColor = SCORE_COLOR(threat.reputation_score);
                      const isCampus   = threat.source === 'Campus IDS';

                      return (
                        <motion.tr
                          key={threat.id}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0 }}
                          transition={{ duration: 0.25 }}
                          style={{ display: 'table-row' }}
                        >
                          {/* IOC Type */}
                          <TableCell sx={{ borderColor: 'rgba(148,163,184,0.04)' }}>
                            <Box component="code" sx={{
                              px: 0.75, py: 0.25, borderRadius: '3px',
                              bgcolor: 'rgba(59,130,246,0.08)', color: '#60a5fa',
                              fontSize: '0.625rem', fontFamily: MONO, fontWeight: 700,
                              textTransform: 'uppercase',
                            }}>
                              {threat.ioc_type}
                            </Box>
                          </TableCell>

                          {/* IOC Value */}
                          <TableCell sx={{ borderColor: 'rgba(148,163,184,0.04)' }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                              {isCampus && (
                                <motion.div
                                  animate={{ opacity: [1, 0.3, 1] }}
                                  transition={{ duration: 3, repeat: Infinity }}
                                  style={{ width: 5, height: 5, borderRadius: '50%', backgroundColor: '#ef4444', flexShrink: 0 }}
                                />
                              )}
                              <Typography sx={{ fontFamily: MONO, fontSize: '0.75rem', color: '#cbd5e1' }}>
                                {threat.ioc_value}
                              </Typography>
                            </Box>
                          </TableCell>

                          {/* Threat type */}
                          <TableCell sx={{ borderColor: 'rgba(148,163,184,0.04)' }}>
                            <Box component="span" sx={{
                              px: 0.75, py: 0.2, borderRadius: '3px',
                              border: `1px solid ${(THREAT_COLOR[threat.threat_type] || '#475569')}40`,
                              color: THREAT_COLOR[threat.threat_type] || '#64748b',
                              fontSize: '0.625rem', fontWeight: 700, fontFamily: MONO,
                            }}>
                              {threatMeta.label}
                            </Box>
                          </TableCell>

                          {/* Score */}
                          <TableCell sx={{ borderColor: 'rgba(148,163,184,0.04)', minWidth: 90 }}>
                            <Box>
                              <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: scoreColor, fontWeight: 700, mb: 0.25 }}>
                                {threat.reputation_score}/100
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={threat.reputation_score}
                                sx={{
                                  height: 2, borderRadius: 1,
                                  bgcolor: 'rgba(148,163,184,0.06)',
                                  '& .MuiLinearProgress-bar': { bgcolor: scoreColor, borderRadius: 1 },
                                }}
                              />
                            </Box>
                          </TableCell>

                          {/* Source */}
                          <TableCell sx={{ borderColor: 'rgba(148,163,184,0.04)' }}>
                            <Box component="span" sx={{
                              px: 0.75, py: 0.2, borderRadius: '3px',
                              border: `1px solid ${srcMeta.color}30`,
                              color: srcMeta.color, fontSize: '0.625rem',
                              fontFamily: MONO, fontWeight: 600,
                            }}>
                              {srcMeta.label}
                            </Box>
                          </TableCell>

                          {/* First / Last seen */}
                          <TableCell sx={{ fontFamily: MONO, fontSize: '0.625rem', color: '#475569', borderColor: 'rgba(148,163,184,0.04)' }}>
                            {fmtDate(threat.first_seen)}
                          </TableCell>
                          <TableCell sx={{ fontFamily: MONO, fontSize: '0.625rem', color: '#64748b', borderColor: 'rgba(148,163,184,0.04)' }}>
                            {fmtDate(threat.last_seen)}
                          </TableCell>
                        </motion.tr>
                      );
                    })}
                  </AnimatePresence>
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </GlassCard>
    </StaggerContainer>
  );
};

export default ThreatIntelligence;
