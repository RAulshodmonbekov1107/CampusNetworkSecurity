import React, { useCallback, useEffect, useState } from 'react';
import {
  Box, Typography, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, CircularProgress,
} from '@mui/material';
import { Plus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import { userManagementService } from '../services/api';
import { User } from '../types';
import GlassCard from '../components/common/GlassCard';
import StaggerContainer from '../components/common/StaggerContainer';

const MONO = '"JetBrains Mono", monospace';

const ROLE_COLOR: Record<string, string> = { admin: '#ef4444', analyst: '#f59e0b', viewer: '#64748b' };

const UserManagement: React.FC = () => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const toast = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try { const data = await userManagementService.listUsers(); setUsers(data); } catch { toast.error('Failed to load users'); } finally { setLoading(false); }
  }, [toast]);

  useEffect(() => { if (user?.role === 'admin') loadUsers(); }, [user?.role, loadUsers]);

  const handleDeleteUser = async (userId: number) => {
    try { await userManagementService.deleteUser(userId); toast.success('User deleted'); loadUsers(); } catch { toast.error('Failed to delete user'); }
  };

  if (user?.role !== 'admin') {
    return (
      <Box sx={{ py: 6, textAlign: 'center' }}>
        <Typography sx={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0', mb: 1 }}>Access Denied</Typography>
        <Typography sx={{ fontSize: '0.8125rem', color: '#475569' }}>You do not have permission to access this page.</Typography>
      </Box>
    );
  }

  const inputSx = { '& .MuiInputBase-root': { fontSize: '0.8125rem' }, '& .MuiInputLabel-root': { fontSize: '0.8125rem' } };

  return (
    <StaggerContainer>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h4" sx={{ color: '#e2e8f0' }}>{t('common.users')}</Typography>
        <Button size="small" variant="contained" startIcon={<Plus size={14} />} onClick={() => setDialogOpen(true)}
          sx={{ fontSize: '0.8125rem', bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
          Add User
        </Button>
      </Box>

      <GlassCard>
        <CardContent sx={{ p: '16px !important' }}>
          {loading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress size={24} sx={{ color: '#3b82f6' }} /></Box>
          ) : (
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {['Username', 'Email', 'Role', 'Status', 'Created', 'Actions'].map((h) => <TableCell key={h}>{h}</TableCell>)}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id} sx={{ '&:hover': { bgcolor: 'rgba(148,163,184,0.03)' } }}>
                      <TableCell sx={{ fontWeight: 500, fontSize: '0.8125rem' }}>{u.username}</TableCell>
                      <TableCell sx={{ fontSize: '0.8125rem', color: '#64748b' }}>{u.email}</TableCell>
                      <TableCell>
                        <Box component="span" sx={{
                          px: 0.75, py: 0.125, borderRadius: '3px',
                          border: `1px solid ${ROLE_COLOR[u.role] || '#475569'}40`,
                          color: ROLE_COLOR[u.role] || '#64748b',
                          fontSize: '0.625rem', fontWeight: 600, fontFamily: MONO, textTransform: 'uppercase',
                        }}>
                          {u.role}
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Box component="span" sx={{
                          px: 0.75, py: 0.125, borderRadius: '3px',
                          border: u.is_active ? '1px solid rgba(34,197,94,0.3)' : '1px solid rgba(148,163,184,0.15)',
                          color: u.is_active ? '#22c55e' : '#475569',
                          fontSize: '0.625rem', fontWeight: 600, fontFamily: MONO, textTransform: 'uppercase',
                        }}>
                          {u.is_active ? 'ACTIVE' : 'INACTIVE'}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontFamily: MONO, fontSize: '0.6875rem', color: '#475569' }}>{new Date(u.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5 }}>
                          <Button size="small" sx={{ fontSize: '0.6875rem', color: '#3b82f6', minWidth: 'auto', px: 1, py: 0.25 }}>Edit</Button>
                          {u.id !== user?.id && (
                            <Button size="small" onClick={() => handleDeleteUser(u.id)}
                              sx={{ fontSize: '0.6875rem', color: '#ef4444', minWidth: 'auto', px: 1, py: 0.25 }}>Delete</Button>
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

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontSize: '0.875rem', fontWeight: 600 }}>Add New User</DialogTitle>
        <DialogContent>
          <TextField fullWidth size="small" label="Username" sx={{ mb: 1.5, mt: 1, ...inputSx }} />
          <TextField fullWidth size="small" label="Email" type="email" sx={{ mb: 1.5, ...inputSx }} />
          <TextField fullWidth size="small" label="Password" type="password" sx={{ mb: 1.5, ...inputSx }} />
          <FormControl fullWidth size="small" sx={inputSx}>
            <InputLabel>Role</InputLabel>
            <Select defaultValue="viewer" label="Role">
              <MenuItem value="admin">Admin</MenuItem>
              <MenuItem value="analyst">Analyst</MenuItem>
              <MenuItem value="viewer">Viewer</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button size="small" onClick={() => setDialogOpen(false)} sx={{ fontSize: '0.8125rem' }}>Cancel</Button>
          <Button size="small" variant="contained" onClick={() => setDialogOpen(false)}
            sx={{ fontSize: '0.8125rem', bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
            Add User
          </Button>
        </DialogActions>
      </Dialog>
    </StaggerContainer>
  );
};

export default UserManagement;
