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
  TextField,
  CircularProgress,
  LinearProgress,
} from '@mui/material';
import { threatsService } from '../services/api';
import { ThreatIntelligence as ThreatType } from '../types';
import { useTranslation } from 'react-i18next';

const ThreatIntelligence: React.FC = () => {
  const [threats, setThreats] = useState<ThreatType[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const { t } = useTranslation();

  useEffect(() => {
    loadThreats();
  }, []);

  useEffect(() => {
    if (searchQuery) {
      const timeout = setTimeout(() => {
        searchThreats();
      }, 500);
      return () => clearTimeout(timeout);
    } else {
      loadThreats();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

  const loadThreats = async () => {
    setLoading(true);
    try {
      const data = await threatsService.getThreats();
      setThreats(data.results || data);
    } catch (error) {
      console.error('Failed to load threats:', error);
    } finally {
      setLoading(false);
    }
  };

  const searchThreats = async () => {
    setLoading(true);
    try {
      const data = await threatsService.searchThreats(searchQuery);
      setThreats(data);
    } catch (error) {
      console.error('Failed to search threats:', error);
    } finally {
      setLoading(false);
    }
  };

  const getThreatTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      malware: 'error',
      phishing: 'warning',
      botnet: 'error',
      c2: 'error',
      exploit: 'warning',
      ransomware: 'error',
    };
    return colors[type] || 'default';
  };

  const getReputationColor = (score: number) => {
    if (score >= 80) return '#f44336';
    if (score >= 60) return '#ff9800';
    if (score >= 40) return '#ffc107';
    return '#4caf50';
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        {t('common.threats')}
      </Typography>

      <Card sx={{ mb: 3, background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
        <CardContent>
          <TextField
            fullWidth
            label="Search by IP, Domain, Hash, or Email"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Enter IOC value to search..."
          />
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
                    <TableCell>IOC Type</TableCell>
                    <TableCell>IOC Value</TableCell>
                    <TableCell>Threat Type</TableCell>
                    <TableCell>Reputation Score</TableCell>
                    <TableCell>Source</TableCell>
                    <TableCell>First Seen</TableCell>
                    <TableCell>Last Seen</TableCell>
                    <TableCell>Country</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {threats.map((threat) => (
                    <TableRow key={threat.id}>
                      <TableCell>
                        <Chip label={threat.ioc_type.toUpperCase()} size="small" />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {threat.ioc_value}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={threat.threat_type}
                          color={getThreatTypeColor(threat.threat_type) as any}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Box>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                            <Typography
                              variant="body2"
                              sx={{ color: getReputationColor(threat.reputation_score), fontWeight: 600 }}
                            >
                              {threat.reputation_score}/100
                            </Typography>
                          </Box>
                          <LinearProgress
                            variant="determinate"
                            value={threat.reputation_score}
                            sx={{
                              height: 6,
                              borderRadius: 3,
                              bgcolor: 'rgba(255, 255, 255, 0.1)',
                              '& .MuiLinearProgress-bar': {
                                bgcolor: getReputationColor(threat.reputation_score),
                              },
                            }}
                          />
                        </Box>
                      </TableCell>
                      <TableCell>{threat.source}</TableCell>
                      <TableCell>{new Date(threat.first_seen).toLocaleDateString()}</TableCell>
                      <TableCell>{new Date(threat.last_seen).toLocaleDateString()}</TableCell>
                      <TableCell>{threat.country_code || 'N/A'}</TableCell>
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

export default ThreatIntelligence;

