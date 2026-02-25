import React, { useEffect, useState } from 'react';
import {
  Box, Typography, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress,
} from '@mui/material';
import { alertsService } from '../services/api';
import { SecurityAlert } from '../types';
import { useTranslation } from 'react-i18next';
import GlassCard from '../components/common/GlassCard';
import StaggerContainer from '../components/common/StaggerContainer';

const MONO = '"JetBrains Mono", monospace';

const SEV_COLOR: Record<string, string> = {
  critical: '#ef4444', high: '#f59e0b', medium: '#3b82f6', low: '#22c55e',
};
const SEV_BORDER: Record<string, string> = {
  critical: 'rgba(239,68,68,0.4)', high: 'rgba(245,158,11,0.4)', medium: 'rgba(59,130,246,0.3)', low: 'rgba(34,197,94,0.3)',
};
const STATUS_COLOR: Record<string, string> = {
  new: '#ef4444', acknowledged: '#f59e0b', resolved: '#22c55e',
};

const SecurityAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState({ severity: '', status: '', alert_type: '' });
  const { t } = useTranslation();

  const loadAlerts = async () => {
    setLoading(true);
    try {
      const data = await alertsService.getAlerts(filters);
      setAlerts(data.results || data);
    } catch (error) {
      console.error('Failed to load alerts:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAlerts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const handleAcknowledge = async (id: number) => { try { await alertsService.acknowledgeAlert(id); loadAlerts(); } catch {} };
  const handleResolve = async (id: number, notes?: string) => { try { await alertsService.resolveAlert(id, notes); loadAlerts(); setDialogOpen(false); } catch {} };

  const inputSx = { '& .MuiInputBase-root': { fontSize: '0.8125rem' }, '& .MuiInputLabel-root': { fontSize: '0.8125rem' } };

  return (
    <StaggerContainer>
      <Typography variant="h4" sx={{ mb: 2, color: '#e2e8f0' }}>{t('common.alerts')}</Typography>

      <GlassCard sx={{ mb: 1.5 }}>
        <CardContent sx={{ p: '12px 16px !important' }}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 120, ...inputSx }}>
              <InputLabel>Severity</InputLabel>
              <Select value={filters.severity} label="Severity" onChange={(e) => setFilters({ ...filters, severity: e.target.value })}>
                <MenuItem value="">All</MenuItem>
                {['critical', 'high', 'medium', 'low'].map((s) => <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>)}
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 120, ...inputSx }}>
              <InputLabel>Status</InputLabel>
              <Select value={filters.status} label="Status" onChange={(e) => setFilters({ ...filters, status: e.target.value })}>
                <MenuItem value="">All</MenuItem>
                {['new', 'acknowledged', 'resolved'].map((s) => <MenuItem key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</MenuItem>)}
              </Select>
            </FormControl>
            <Button size="small" variant="outlined" onClick={() => setFilters({ severity: '', status: '', alert_type: '' })}
              sx={{ borderColor: 'rgba(148,163,184,0.12)', color: '#94a3b8', fontSize: '0.75rem', '&:hover': { borderColor: 'rgba(59,130,246,0.3)' } }}>
              Clear
            </Button>
          </Box>
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
                    {['Timestamp', 'Title', 'Severity', 'Type', 'Source IP', 'Status', 'Actions'].map((h) => <TableCell key={h}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id} sx={{ '&:hover': { bgcolor: 'rgba(148,163,184,0.03)' } }}>
                      <TableCell sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#475569', whiteSpace: 'nowrap' }}>
                        {new Date(alert.timestamp).toLocaleString()}
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', color: '#e2e8f0' }}>{alert.title}</TableCell>
                      <TableCell>
                        <Box component="span" sx={{
                          px: 0.75, py: 0.125, borderRadius: '3px',
                          border: `1px solid ${SEV_BORDER[alert.severity] || 'rgba(148,163,184,0.2)'}`,
                          color: SEV_COLOR[alert.severity] || '#64748b',
                          fontSize: '0.625rem', fontWeight: 600, fontFamily: MONO, textTransform: 'uppercase',
                        }}>
                          {alert.severity}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#64748b' }}>{alert.alert_type}</TableCell>
                      <TableCell sx={{ fontFamily: MONO, fontSize: '0.75rem' }}>{alert.source_ip}</TableCell>
                      <TableCell>
                        <Box component="span" sx={{
                          px: 0.75, py: 0.125, borderRadius: '3px',
                          border: `1px solid ${STATUS_COLOR[alert.status] || '#475569'}40`,
                          color: STATUS_COLOR[alert.status] || '#64748b',
                          fontSize: '0.625rem', fontWeight: 600, fontFamily: MONO, textTransform: 'uppercase',
                        }}>
                          {alert.status}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button size="small" onClick={() => { setSelectedAlert(alert); setDialogOpen(true); }}
                            sx={{ fontSize: '0.6875rem', color: '#3b82f6', minWidth: 'auto', px: 1, py: 0.25 }}>View</Button>
                          {alert.status === 'new' && (
                            <Button size="small" onClick={() => handleAcknowledge(alert.id)}
                              sx={{ fontSize: '0.6875rem', color: '#f59e0b', minWidth: 'auto', px: 1, py: 0.25, border: '0.5px solid rgba(245,158,11,0.2)', borderRadius: '4px' }}>Ack</Button>
                          )}
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </GlassCard>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Alert Details</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 1, color: '#e2e8f0' }}>{selectedAlert.title}</Typography>
              <Typography sx={{ fontSize: '0.8125rem', mb: 2, color: '#64748b' }}>{selectedAlert.description}</Typography>
              <Box sx={{ display: 'flex', gap: 1.5, mb: 2 }}>
                {[
                  { label: 'Severity', value: selectedAlert.severity, color: SEV_COLOR[selectedAlert.severity] },
                  { label: 'Status', value: selectedAlert.status, color: STATUS_COLOR[selectedAlert.status] },
                ].map((t) => (
                  <Box key={t.label} component="span" sx={{ px: 1, py: 0.25, borderRadius: '4px', border: `1px solid ${t.color}40`, color: t.color, fontSize: '0.6875rem', fontWeight: 600, fontFamily: MONO, textTransform: 'uppercase' }}>
                    {t.label}: {t.value}
                  </Box>
                ))}
              </Box>
              {[
                ['Source IP', selectedAlert.source_ip],
                ['Dest IP', selectedAlert.destination_ip],
                ['Protocol', selectedAlert.protocol],
                ['Signature', selectedAlert.signature],
              ].map(([label, val]) => (
                <Typography key={label} sx={{ fontSize: '0.8125rem', mb: 0.5 }}>
                  <Box component="span" sx={{ color: '#64748b' }}>{label}:</Box>{' '}
                  <Box component="code" sx={{ fontFamily: MONO, fontSize: '0.75rem', color: '#94a3b8' }}>{val || '—'}</Box>
                </Typography>
              ))}
              {selectedAlert.status !== 'resolved' && (
                <TextField fullWidth multiline rows={3} label="Resolution Notes" size="small" sx={{ mt: 2, ...{ '& .MuiInputBase-root': { fontSize: '0.8125rem' } } }} id="resolution-notes" />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setDialogOpen(false)} sx={{ fontSize: '0.8125rem' }}>Close</Button>
          {selectedAlert && selectedAlert.status !== 'resolved' && (
            <Button size="small" variant="contained" onClick={() => {
              const notes = (document.getElementById('resolution-notes') as HTMLInputElement)?.value;
              handleResolve(selectedAlert.id, notes);
            }} sx={{ fontSize: '0.8125rem', bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
              Resolve
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </StaggerContainer>
  );
};

export default SecurityAlerts;
