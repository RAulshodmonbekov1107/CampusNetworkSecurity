import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from '@mui/material';
import { Doughnut } from 'react-chartjs-2';
import { networkService } from '../services/api';
import { NetworkTraffic as NetworkTrafficType } from '../types';
import { useTranslation } from 'react-i18next';

const NetworkTraffic: React.FC = () => {
  const [traffic, setTraffic] = useState<NetworkTrafficType[]>([]);
  const [protocols, setProtocols] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    protocol: '',
    source_ip: '',
    date_from: '',
    date_to: '',
  });
  const { t } = useTranslation();

  const loadData = async () => {
    setLoading(true);
    try {
      const [trafficData, protocolsData] = await Promise.all([
        networkService.getTraffic(filters),
        networkService.getProtocols(),
      ]);
      setTraffic(trafficData.results || trafficData);
      setProtocols(protocolsData);
    } catch (error) {
      console.error('Failed to load network traffic:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const protocolData = {
    labels: protocols.map((p) => p.protocol),
    datasets: [
      {
        data: protocols.map((p) => p.total_bytes),
        backgroundColor: [
          '#00bcd4',
          '#8b5cf6',
          '#ff9800',
          '#4caf50',
          '#f44336',
          '#2196f3',
        ],
      },
    ],
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        {t('common.network')}
      </Typography>

      <Card sx={{ mb: 3, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12} md={3}>
              <FormControl fullWidth>
                <InputLabel>Protocol</InputLabel>
                <Select
                  value={filters.protocol}
                  onChange={(e) => setFilters({ ...filters, protocol: e.target.value })}
                >
                  <MenuItem value="">All</MenuItem>
                  <MenuItem value="TCP">TCP</MenuItem>
                  <MenuItem value="UDP">UDP</MenuItem>
                  <MenuItem value="HTTP">HTTP</MenuItem>
                  <MenuItem value="HTTPS">HTTPS</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                fullWidth
                label="Source IP"
                value={filters.source_ip}
                onChange={(e) => setFilters({ ...filters, source_ip: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="From"
                InputLabelProps={{ shrink: true }}
                value={filters.date_from}
                onChange={(e) => setFilters({ ...filters, date_from: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField
                fullWidth
                type="date"
                label="To"
                InputLabelProps={{ shrink: true }}
                value={filters.date_to}
                onChange={(e) => setFilters({ ...filters, date_to: e.target.value })}
              />
            </Grid>
            <Grid item xs={12} md={2}>
              <Button
                fullWidth
                variant="contained"
                onClick={() => setFilters({ protocol: '', source_ip: '', date_from: '', date_to: '' })}
                sx={{ height: '56px' }}
              >
                Clear
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={8}>
          <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Traffic Over Time
              </Typography>
              {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              ) : (
                <Box sx={{ height: 300 }}>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Chart will be displayed here
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} md={4}>
          <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Protocol Distribution
              </Typography>
              {protocols.length > 0 ? (
                <Box sx={{ height: 300 }}>
                  <Doughnut data={protocolData} options={{ maintainAspectRatio: false }} />
                </Box>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                  <CircularProgress />
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
            Network Traffic Data
          </Typography>
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
                    <TableCell>Source IP</TableCell>
                    <TableCell>Destination IP</TableCell>
                    <TableCell>Protocol</TableCell>
                    <TableCell>Bytes Sent</TableCell>
                    <TableCell>Bytes Received</TableCell>
                    <TableCell>Total</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {traffic.slice(0, 20).map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>{new Date(item.timestamp).toLocaleString()}</TableCell>
                      <TableCell>{item.source_ip}</TableCell>
                      <TableCell>{item.destination_ip}</TableCell>
                      <TableCell>{item.protocol}</TableCell>
                      <TableCell>{formatBytes(item.bytes_sent)}</TableCell>
                      <TableCell>{formatBytes(item.bytes_received)}</TableCell>
                      <TableCell>{formatBytes(item.total_bytes || 0)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </CardContent>
      </Card>
    </Box>
  );
};

export default NetworkTraffic;

