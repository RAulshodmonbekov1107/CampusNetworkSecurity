import React, { useEffect, useState } from 'react';
import { Box, Typography, CardContent, TextField, Button, Switch, FormControlLabel, Divider, Avatar } from '@mui/material';
import { systemService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useToast } from '../contexts/ToastContext';
import GlassCard from '../components/common/GlassCard';
import StaggerContainer from '../components/common/StaggerContainer';

const MONO = '"JetBrains Mono", monospace';
const LANG_LABELS: Record<string, string> = { en: 'EN', ru: 'RU', ky: 'KY', tj: 'TJ', kz: 'KZ' };

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const toast = useToast();
  const [settings, setSettings] = useState<any>({});
  const [language, setLanguage] = useState(i18n.language);
  const [darkMode, setDarkMode] = useState(mode === 'dark');

  useEffect(() => { loadSettings(); }, []);

  const loadSettings = async () => { try { const data = await systemService.getSettings(); setSettings(data); } catch {} };

  const handleSave = async () => {
    try { await systemService.updateSettings(settings); toast.success('Settings saved'); } catch { toast.error('Failed to save settings'); }
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang); i18n.changeLanguage(lang); localStorage.setItem('language', lang);
  };

  const inputSx = { '& .MuiInputBase-root': { fontSize: '0.8125rem' }, '& .MuiInputLabel-root': { fontSize: '0.8125rem' } };

  return (
    <StaggerContainer>
      <Typography variant="h4" sx={{ mb: 2, color: '#e2e8f0' }}>{t('common.settings')}</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
        {/* Profile */}
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 2 }}>Profile</Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2.5 }}>
              <Avatar sx={{ width: 48, height: 48, bgcolor: '#1e293b', color: '#94a3b8', fontSize: '1rem', fontWeight: 600, border: '0.5px solid rgba(148,163,184,0.1)', mr: 2 }}>
                {user?.username.charAt(0).toUpperCase()}
              </Avatar>
              <Box>
                <Typography sx={{ fontSize: '0.875rem', fontWeight: 600, color: '#e2e8f0' }}>{user?.username}</Typography>
                <Typography sx={{ fontSize: '0.75rem', color: '#475569' }}>{user?.email}</Typography>
                <Box component="code" sx={{ fontSize: '0.625rem', fontFamily: MONO, color: '#3b82f6', textTransform: 'uppercase' }}>{user?.role}</Box>
              </Box>
            </Box>
            <TextField fullWidth size="small" label="First Name" defaultValue={user?.first_name} sx={{ mb: 1.5, ...inputSx }} />
            <TextField fullWidth size="small" label="Last Name" defaultValue={user?.last_name} sx={{ mb: 1.5, ...inputSx }} />
            <TextField fullWidth size="small" label="Email" defaultValue={user?.email} sx={{ mb: 1.5, ...inputSx }} />
            <TextField fullWidth size="small" label="Phone" defaultValue={user?.phone || ''} sx={{ mb: 2, ...inputSx }} />
            <Button size="small" variant="contained" onClick={handleSave}
              sx={{ fontSize: '0.8125rem', bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
              Save Profile
            </Button>
          </CardContent>
        </GlassCard>

        {/* Preferences */}
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 2 }}>Preferences</Typography>
            <FormControlLabel
              control={<Switch size="small" checked={darkMode} onChange={(e) => { setDarkMode(e.target.checked); toggleTheme(); }} />}
              label={<Typography sx={{ fontSize: '0.8125rem' }}>Dark Mode</Typography>}
              sx={{ mb: 1.5 }}
            />
            <Box sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: '0.75rem', color: '#64748b', mb: 0.75 }}>Language</Typography>
              <Box sx={{ display: 'flex', gap: 0.5 }}>
                {Object.entries(LANG_LABELS).map(([code, label]) => (
                  <Button key={code} size="small"
                    variant={language === code ? 'contained' : 'outlined'}
                    onClick={() => handleLanguageChange(code)}
                    sx={language === code
                      ? { fontSize: '0.6875rem', fontFamily: MONO, fontWeight: 600, bgcolor: '#3b82f6', minWidth: 36, px: 1 }
                      : { fontSize: '0.6875rem', fontFamily: MONO, fontWeight: 500, borderColor: 'rgba(148,163,184,0.12)', color: '#64748b', minWidth: 36, px: 1, '&:hover': { borderColor: 'rgba(59,130,246,0.3)' } }
                    }>
                    {label}
                  </Button>
                ))}
              </Box>
            </Box>
            <Divider sx={{ borderColor: 'rgba(148,163,184,0.06)', my: 2 }} />
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 1.5 }}>Notifications</Typography>
            {['Email Notifications', 'Alert Notifications', 'System Updates'].map((label, i) => (
              <FormControlLabel key={label}
                control={<Switch size="small" defaultChecked={i < 2} />}
                label={<Typography sx={{ fontSize: '0.8125rem' }}>{label}</Typography>}
                sx={{ mb: 0.5, display: 'block' }}
              />
            ))}
          </CardContent>
        </GlassCard>
      </Box>

      {/* System Config */}
      <Box sx={{ mt: 1.5 }}>
        <GlassCard>
          <CardContent sx={{ p: '16px !important' }}>
            <Typography sx={{ fontSize: '0.6875rem', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: '#64748b', mb: 2 }}>System Configuration</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 1.5 }}>
              {[
                { label: 'AbuseIPDB API Key', key: 'abuseipdb_key', type: 'password' },
                { label: 'VirusTotal API Key', key: 'virustotal_key', type: 'password' },
                { label: 'MISP API URL', key: 'misp_url', type: 'text' },
                { label: 'Elasticsearch URL', key: 'elasticsearch_url', type: 'text' },
              ].map(({ label, key, type }) => (
                <TextField key={key} fullWidth size="small" label={label} type={type}
                  value={settings[key] || ''}
                  onChange={(e) => setSettings((prev: any) => ({ ...prev, [key]: e.target.value }))}
                  sx={inputSx}
                />
              ))}
            </Box>
            <Button size="small" variant="contained" onClick={handleSave} sx={{ mt: 2, fontSize: '0.8125rem', bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }}>
              Save Configuration
            </Button>
          </CardContent>
        </GlassCard>
      </Box>
    </StaggerContainer>
  );
};

export default Settings;
