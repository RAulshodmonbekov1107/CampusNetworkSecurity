import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Card,
  CardContent,
  TextField,
  Button,
  Grid,
  Switch,
  FormControlLabel,
  Divider,
  Avatar,
} from '@mui/material';
import { systemService } from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { useTranslation } from 'react-i18next';

const Settings: React.FC = () => {
  const { user } = useAuth();
  const { t, i18n } = useTranslation();
  const [settings, setSettings] = useState<any>({});
  const [language, setLanguage] = useState(i18n.language);
  const [darkMode, setDarkMode] = useState(true);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const data = await systemService.getSettings();
      setSettings(data);
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const handleSave = async () => {
    try {
      await systemService.updateSettings(settings);
      alert('Settings saved successfully');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings');
    }
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <Box>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 600 }}>
        {t('common.settings')}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Profile Settings
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
                <Avatar sx={{ width: 80, height: 80, bgcolor: 'primary.main', mr: 2 }}>
                  {user?.username.charAt(0).toUpperCase()}
                </Avatar>
                <Box>
                  <Typography variant="h6">{user?.username}</Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    {user?.email}
                  </Typography>
                  <Typography variant="body2" sx={{ color: 'text.secondary' }}>
                    Role: {user?.role}
                  </Typography>
                </Box>
              </Box>
              <TextField
                fullWidth
                label="First Name"
                defaultValue={user?.first_name}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Last Name"
                defaultValue={user?.last_name}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Email"
                defaultValue={user?.email}
                sx={{ mb: 2 }}
              />
              <TextField
                fullWidth
                label="Phone"
                defaultValue={user?.phone || ''}
                sx={{ mb: 2 }}
              />
              <Button variant="contained" onClick={handleSave}>
                Save Profile
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={6}>
          <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Preferences
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={darkMode}
                    onChange={(e) => setDarkMode(e.target.checked)}
                  />
                }
                label="Dark Mode"
                sx={{ mb: 2 }}
              />
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ mb: 1 }}>
                  Language
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {['en', 'ru', 'ky', 'tj', 'kz'].map((lang) => (
                    <Button
                      key={lang}
                      variant={language === lang ? 'contained' : 'outlined'}
                      onClick={() => handleLanguageChange(lang)}
                      size="small"
                    >
                      {lang.toUpperCase()}
                    </Button>
                  ))}
                </Box>
              </Box>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                Notifications
              </Typography>
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Email Notifications"
                sx={{ mb: 1 }}
              />
              <FormControlLabel
                control={<Switch defaultChecked />}
                label="Alert Notifications"
                sx={{ mb: 1 }}
              />
              <FormControlLabel
                control={<Switch />}
                label="System Updates"
              />
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card sx={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(10px)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                System Configuration
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="MISP API URL"
                    defaultValue={settings.misp_url || ''}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="VirusTotal API Key"
                    type="password"
                    defaultValue={settings.virustotal_key || ''}
                    sx={{ mb: 2 }}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <TextField
                    fullWidth
                    label="TheHive URL"
                    defaultValue={settings.thehive_url || ''}
                    sx={{ mb: 2 }}
                  />
                  <TextField
                    fullWidth
                    label="PagerDuty API Key"
                    type="password"
                    defaultValue={settings.pagerduty_key || ''}
                    sx={{ mb: 2 }}
                  />
                </Grid>
              </Grid>
              <Button variant="contained" onClick={handleSave}>
                Save Configuration
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Settings;

