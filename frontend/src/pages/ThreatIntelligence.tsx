import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  TextField, CircularProgress, LinearProgress,
} from '@mui/material';
import { threatsService } from '../services/api';
import { ThreatIntelligence as ThreatType } from '../types';
import { useTranslation } from 'react-i18next';
import GlassCard from '../components/common/GlassCard';
import StaggerContainer from '../components/common/StaggerContainer';

const MONO = '"JetBrains Mono", monospace';
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

const THREAT_COLOR: Record<string, string> = {
  malware: '#ef4444', phishing: '#f59e0b', botnet: '#ef4444',
  c2: '#ef4444', exploit: '#f59e0b', ransomware: '#ef4444',
};

const ThreatIntelligence: React.FC = () => {
  const [threats, setThreats] = useState<ThreatType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();

  useEffect(() => { loadThreats(); }, []);

  useEffect(() => {
    if (searchQuery) {
      const timeout = setTimeout(() => searchThreats(), 500);
      return () => clearTimeout(timeout);
    } else {
      loadThreats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadThreats = async () => {
    setLoading(true);
    try { const data = await threatsService.getThreats(); setThreats(data.results || data); } catch {} finally { setLoading(false); }
  };

  const searchThreats = async () => {
    setLoading(true);
    try { const data = await threatsService.searchThreats(searchQuery); setThreats(data); } catch {} finally { setLoading(false); }
  };

  return (
    <StaggerContainer>
      <Typography variant="h4" sx={{ mb: 2, color: '#e2e8f0' }}>{t('common.threats')}</Typography>

      <GlassCard sx={{ mb: 1.5 }}>
        <CardContent sx={{ p: '12px 16px !important' }}>
          <TextField
            fullWidth size="small"
            label="Search by IP, Domain, Hash, or Email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter IOC value…"
            sx={{ '& .MuiInputBase-root': { fontSize: '0.8125rem', fontFamily: MONO } }}
          />
        </CardContent>
      </GlassCard>

      <GlassCard>
        <CardContent sx={{ p: '16px !important' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: '#3b82f6' }} /></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['IOC Type', 'IOC Value', 'Threat Type', 'Score', 'Source', 'First Seen', 'Last Seen', 'Country'].map((h) => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {threats.map((threat) => {
                    const flag = FLAG_EMOJI[threat.country_code || ''] || '';
                    return (
                      <TableRow key={threat.id} sx={{ '&:hover': { bgcolor: 'rgba(148,163,184,0.03)' } }}>
                        <TableCell>
                          <Box component="code" sx={{ px: 0.75, py: 0.25, borderRadius: '3px', bgcolor: 'rgba(59,130,246,0.08)', color: '#60a5fa', fontSize: '0.625rem', fontFamily: MONO, fontWeight: 600, textTransform: 'uppercase' }}>
                            {threat.ioc_type}
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontFamily: MONO, fontSize: '0.75rem' }}>{threat.ioc_value}</TableCell>
                        <TableCell>
                          <Box component="span" sx={{
                            px: 0.75, py: 0.125, borderRadius: '3px',
                            border: `1px solid ${THREAT_COLOR[threat.threat_type] || '#475569'}40`,
                            color: THREAT_COLOR[threat.threat_type] || '#64748b',
                            fontSize: '0.625rem', fontWeight: 600, fontFamily: MONO, textTransform: 'uppercase',
                          }}>
                            {threat.threat_type}
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box>
                            <Typography sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: getReputationColor(threat.reputation_score), fontWeight: 600, mb: 0.25 }}>
                              {threat.reputation_score}/100
                            </Typography>
                            <LinearProgress variant="determinate" value={threat.reputation_score} sx={{
                              height: 2, borderRadius: 1, bgcolor: 'rgba(148,163,184,0.06)',
                              '& .MuiLinearProgress-bar': { bgcolor: getReputationColor(threat.reputation_score), borderRadius: 1 },
                            }} />
                          </Box>
                        </TableCell>
                        <TableCell sx={{ fontSize: '0.75rem', color: '#64748b' }}>{threat.source}</TableCell>
                        <TableCell sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#475569' }}>{new Date(threat.first_seen).toLocaleDateString()}</TableCell>
                        <TableCell sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#475569' }}>{new Date(threat.last_seen).toLocaleDateString()}</TableCell>
                        <TableCell sx={{ fontFamily: MONO, fontSize: '0.75rem', color: '#64748b' }}>
                          {flag ? `${flag} ` : ''}{threat.country_code || '—'}
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

export default ThreatIntelligence;
