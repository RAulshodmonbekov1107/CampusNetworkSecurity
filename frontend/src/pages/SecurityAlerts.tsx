import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { alertsService } from '../services/api';
import { SecurityAlert } from '../types';
import { useTranslation } from 'react-i18next';

const SecurityAlerts: React.FC = () => {
  const [alerts, setAlerts] = useState<SecurityAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlert, setSelectedAlert] = useState<SecurityAlert | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState({
    severity: '',
    status: '',
    alert_type: '',
  });
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

  const handleAcknowledge = async (id: number) => {
    try {
      await alertsService.acknowledgeAlert(id);
      loadAlerts();
    } catch (error) {
      console.error('Failed to acknowledge alert:', error);
    }
  };

  const handleResolve = async (id: number, notes?: string) => {
    try {
      await alertsService.resolveAlert(id, notes);
      loadAlerts();
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to resolve alert:', error);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'warning';
      case 'medium':
        return 'info';
      default:
        return 'success';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'new':
        return 'error';
      case 'acknowledged':
        return 'warning';
      case 'resolved':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        {t('common.alerts')}
      </Typography>

      <Card sx={{ mb: 3, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Severity</InputLabel>
              <Select
                value={filters.severity}
                onChange={(e) => setFilters({ ...filters, severity: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="critical">Critical</MenuItem>
                <MenuItem value="high">High</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="low">Low</MenuItem>
              </Select>
            </FormControl>
            <FormControl sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <MenuItem value="">All</MenuItem>
                <MenuItem value="new">New</MenuItem>
                <MenuItem value="acknowledged">Acknowledged</MenuItem>
                <MenuItem value="resolved">Resolved</MenuItem>
              </Select>
            </FormControl>
            <Button
              variant="outlined"
              onClick={() => setFilters({ severity: '', status: '', alert_type: '' })}
            >
              Clear Filters
            </Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
        <CardContent>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
              <CircularProgress />
            </Box>
          ) : (
            <TableContainer>
              <Table>
                <TableHead>
                  <TableRow>
                    <TableCell>Timestamp</TableCell>
                    <TableCell>Title</TableCell>
                    <TableCell>Severity</TableCell>
                    <TableCell>Type</TableCell>
                    <TableCell>Source IP</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Actions</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {alerts.map((alert) => (
                    <TableRow key={alert.id}>
                      <TableCell>{new Date(alert.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{alert.title}</TableCell>
                      <TableCell>
                        <Chip
                          label={alert.severity}
                          color={getSeverityColor(alert.severity) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>{alert.alert_type}</TableCell>
                      <TableCell>{alert.source_ip}</TableCell>
                      <TableCell>
                        <Chip
                          label={alert.status}
                          color={getStatusColor(alert.status) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                          <Button
                            size="small"
                            onClick={() => {
                              setSelectedAlert(alert);
                              setDialogOpen(true);
                            }}
                          >
                            View
                          </Button>
                          {alert.status === 'new' && (
                            <Button
                              size="small"
                              variant="outlined"
                              onClick={() => handleAcknowledge(alert.id)}
                            >
                              Ack
                            </Button>
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
      </Card>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Alert Details</DialogTitle>
        <DialogContent>
          {selectedAlert && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2 }}>
                {selectedAlert.title}
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
                {selectedAlert.description}
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip label={`Severity: ${selectedAlert.severity}`} color={getSeverityColor(selectedAlert.severity) as any} />
                <Chip label={`Status: ${selectedAlert.status}`} color={getStatusColor(selectedAlert.status) as any} />
              </Box>
              <Typography variant="body2">
                <strong>Source IP:</strong> {selectedAlert.source_ip}
              </Typography>
              <Typography variant="body2">
                <strong>Destination IP:</strong> {selectedAlert.destination_ip || 'N/A'}
              </Typography>
              <Typography variant="body2">
                <strong>Protocol:</strong> {selectedAlert.protocol || 'N/A'}
              </Typography>
              {selectedAlert.status !== 'resolved' && (
                <TextField
                  fullWidth
                  multiline
                  rows={3}
                  label="Resolution Notes"
                  sx={{ mt: 2 }}
                  id="resolution-notes"
                />
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Close</Button>
          {selectedAlert && selectedAlert.status !== 'resolved' && (
            <Button
              variant="contained"
              onClick={() => {
                const notes = (document.getElementById('resolution-notes') as HTMLInputElement)?.value;
                handleResolve(selectedAlert.id, notes);
              }}
            >
              Resolve
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SecurityAlerts;

