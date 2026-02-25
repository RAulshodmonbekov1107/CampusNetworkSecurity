import React, { useState } from 'react';
import { AppBar, Toolbar, IconButton, Box, InputBase, Menu, MenuItem, Avatar, Badge, ListItemText } from '@mui/material';
import { Menu as MenuIcon, Search, Bell, Moon, User as UserIcon } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onMenuClick: () => void;
}

const LANGUAGES = [
  { code: 'en', label: 'EN' },
  { code: 'ru', label: 'RU' },
  { code: 'ky', label: 'KY' },
  { code: 'tj', label: 'TJ' },
  { code: 'kz', label: 'KZ' },
];

const menuPaperSx = {
  mt: 1, minWidth: 140,
  background: '#0f172a',
  border: '0.5px solid rgba(148,163,184,0.1)',
  boxShadow: '0 4px 24px rgba(0,0,0,0.5)',
  backgroundImage: 'none',
};

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { toggleTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [langAnchor, setLangAnchor] = useState<null | HTMLElement>(null);
  const [language, setLanguage] = useState(i18n.language);

  const handleLogout = () => { logout(); navigate('/login'); setAnchorEl(null); };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
    setLangAnchor(null);
  };

  const currentLang = LANGUAGES.find((l) => l.code === language) || LANGUAGES[0];

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        bgcolor: 'rgba(15, 23, 42, 0.85)',
        borderBottom: '0.5px solid rgba(148,163,184,0.06)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        boxShadow: 'none',
        zIndex: (theme) => theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ minHeight: '48px !important', gap: 1 }}>
        <IconButton edge="start" size="small" sx={{ color: '#64748b' }} onClick={onMenuClick}>
          <MenuIcon size={16} />
        </IconButton>

        {/* Search */}
        <Box sx={{
          position: 'relative', borderRadius: '6px',
          bgcolor: 'rgba(148,163,184,0.04)',
          border: '0.5px solid rgba(148,163,184,0.06)',
          transition: 'border-color 0.2s',
          '&:focus-within': { borderColor: 'rgba(59,130,246,0.2)' },
          flex: 1, maxWidth: 320,
        }}>
          <Box sx={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', display: 'flex', pointerEvents: 'none' }}>
            <Search size={13} color="#475569" />
          </Box>
          <InputBase
            placeholder={t('common.search')}
            sx={{
              color: '#94a3b8', width: '100%', pl: '32px', pr: '12px', py: '5px',
              fontSize: '0.8125rem',
              '& ::placeholder': { color: '#334155', opacity: 1 },
            }}
          />
        </Box>

        <Box sx={{ flexGrow: 1 }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          {/* Language */}
          <IconButton size="small" onClick={(e) => setLangAnchor(e.currentTarget)}
            sx={{ color: '#64748b', fontSize: '0.6875rem', fontFamily: '"JetBrains Mono", monospace', fontWeight: 600, borderRadius: '4px', px: 0.75 }}>
            {currentLang.label}
          </IconButton>
          <Menu anchorEl={langAnchor} open={Boolean(langAnchor)} onClose={() => setLangAnchor(null)}
            PaperProps={{ sx: menuPaperSx }}>
            {LANGUAGES.map((lang) => (
              <MenuItem key={lang.code} selected={language === lang.code} onClick={() => handleLanguageChange(lang.code)}
                sx={{ fontSize: '0.8125rem', py: 0.75, '&.Mui-selected': { bgcolor: 'rgba(59,130,246,0.1)' }, '&:hover': { bgcolor: 'rgba(148,163,184,0.06)' } }}>
                <ListItemText sx={{ '& .MuiListItemText-primary': { fontFamily: '"JetBrains Mono", monospace', fontSize: '0.75rem' } }}>{lang.label}</ListItemText>
              </MenuItem>
            ))}
          </Menu>

          {/* Notifications */}
          <IconButton size="small" sx={{ color: '#64748b' }}>
            <Badge badgeContent={4} color="error" sx={{ '& .MuiBadge-badge': { fontSize: '0.5625rem', height: 14, minWidth: 14, padding: '0 3px' } }}>
              <Bell size={15} />
            </Badge>
          </IconButton>

          {/* Theme */}
          <IconButton size="small" sx={{ color: '#64748b' }} onClick={toggleTheme}>
            <Moon size={15} />
          </IconButton>

          {/* Profile */}
          <IconButton size="small" onClick={(e) => setAnchorEl(e.currentTarget)} sx={{ ml: 0.5 }}>
            <Avatar sx={{ width: 26, height: 26, bgcolor: '#1e293b', color: '#94a3b8', fontSize: '0.6875rem', fontWeight: 600, border: '0.5px solid rgba(148,163,184,0.1)' }}>
              {user?.username.charAt(0).toUpperCase()}
            </Avatar>
          </IconButton>

          <AnimatePresence>
            {Boolean(anchorEl) && (
              <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={() => setAnchorEl(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{ sx: menuPaperSx }}>
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}>
                  <MenuItem onClick={() => { navigate('/settings'); setAnchorEl(null); }}
                    sx={{ fontSize: '0.8125rem', py: 0.75, gap: 1, '&:hover': { bgcolor: 'rgba(148,163,184,0.06)' } }}>
                    <UserIcon size={14} /> Profile
                  </MenuItem>
                  <MenuItem onClick={handleLogout}
                    sx={{ fontSize: '0.8125rem', py: 0.75, gap: 1, color: '#ef4444', '&:hover': { bgcolor: 'rgba(239,68,68,0.06)' } }}>
                    {t('common.logout')}
                  </MenuItem>
                </motion.div>
              </Menu>
            )}
          </AnimatePresence>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navbar;
