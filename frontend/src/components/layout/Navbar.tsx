import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  IconButton,
  Box,
  InputBase,
  Menu,
  MenuItem,
  Avatar,
  Badge,
  Select,
  FormControl,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Search as SearchIcon,
  Notifications as NotificationsIcon,
  Brightness4 as DarkModeIcon,
  AccountCircle as AccountIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';

interface NavbarProps {
  onMenuClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [language, setLanguage] = useState(i18n.language);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    handleMenuClose();
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <motion.div
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      <AppBar
        position="fixed"
        sx={{
          bgcolor: 'background.paper',
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
          backdropFilter: 'blur(10px)',
          zIndex: (theme) => theme.zIndex.drawer + 1,
        }}
      >
        <Toolbar>
          <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
            <IconButton
              edge="start"
              color="inherit"
              onClick={onMenuClick}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.4 }}
            style={{ flex: 1, maxWidth: 400, marginRight: 16 }}
          >
            <Box
              sx={{
                position: 'relative',
                borderRadius: 2,
                bgcolor: 'rgba(255, 255, 255, 0.05)',
                transition: 'all 0.3s ease',
                '&:hover': {
                  bgcolor: 'rgba(255, 255, 255, 0.08)',
                  boxShadow: '0 4px 12px rgba(0, 188, 212, 0.2)',
                },
                '&:focus-within': {
                  bgcolor: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(0, 188, 212, 0.3)',
                },
                width: '100%',
              }}
            >
              <Box
                sx={{
                  padding: '8px 12px',
                  height: '100%',
                  position: 'absolute',
                  pointerEvents: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <SearchIcon sx={{ color: 'text.secondary' }} />
              </Box>
              <InputBase
                placeholder={t('common.search')}
                sx={{
                  color: 'inherit',
                  width: '100%',
                  pl: '40px',
                  pr: '12px',
                  py: '8px',
                }}
              />
            </Box>
          </motion.div>

          <Box sx={{ flexGrow: 1 }} />

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            style={{ display: 'flex', alignItems: 'center', gap: 8 }}
          >
            <FormControl size="small" sx={{ minWidth: 100 }}>
              <Select
                value={language}
                onChange={(e) => handleLanguageChange(e.target.value)}
                sx={{
                  color: 'text.primary',
                  transition: 'all 0.3s ease',
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.2)',
                  },
                  '&:hover .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                  },
                  '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'rgba(0, 188, 212, 0.5)',
                  },
                }}
              >
                <MenuItem value="en">EN</MenuItem>
                <MenuItem value="ru">RU</MenuItem>
                <MenuItem value="ky">KY</MenuItem>
                <MenuItem value="tj">TJ</MenuItem>
                <MenuItem value="kz">KZ</MenuItem>
              </Select>
            </FormControl>

            <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
              <IconButton color="inherit">
                <Badge
                  badgeContent={4}
                  color="error"
                  sx={{
                    '& .MuiBadge-badge': {
                      animation: 'pulse 2s ease-in-out infinite',
                    },
                  }}
                >
                  <NotificationsIcon />
                </Badge>
              </IconButton>
            </motion.div>

            <motion.div whileHover={{ scale: 1.1, rotate: 180 }} whileTap={{ scale: 0.9 }} transition={{ duration: 0.3 }}>
              <IconButton color="inherit">
                <DarkModeIcon />
              </IconButton>
            </motion.div>

            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
            >
              <IconButton onClick={handleProfileMenuOpen} color="inherit">
                <Avatar
                  sx={{
                    width: 32,
                    height: 32,
                    bgcolor: 'primary.main',
                    border: '2px solid rgba(0, 188, 212, 0.3)',
                    transition: 'all 0.3s ease',
                    '&:hover': {
                      borderColor: 'rgba(0, 188, 212, 0.6)',
                      boxShadow: '0 0 12px rgba(0, 188, 212, 0.4)',
                    },
                  }}
                >
                  {user?.username.charAt(0).toUpperCase()}
                </Avatar>
              </IconButton>
            </motion.div>
          </motion.div>

          <AnimatePresence>
            {Boolean(anchorEl) && (
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: 'right',
                }}
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    minWidth: 180,
                    background: 'rgba(26, 31, 58, 0.95)',
                    backdropFilter: 'blur(20px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                  },
                }}
              >
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  <MenuItem
                    onClick={() => {
                      navigate('/settings');
                      handleMenuClose();
                    }}
                    sx={{
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(0, 188, 212, 0.1)',
                      },
                    }}
                  >
                    <AccountIcon sx={{ mr: 1 }} /> Profile
                  </MenuItem>
                  <MenuItem
                    onClick={handleLogout}
                    sx={{
                      transition: 'all 0.2s ease',
                      '&:hover': {
                        bgcolor: 'rgba(244, 67, 54, 0.1)',
                      },
                    }}
                  >
                    {t('common.logout')}
                  </MenuItem>
                </motion.div>
              </Menu>
            )}
          </AnimatePresence>
        </Toolbar>
      </AppBar>
    </motion.div>
  );
};

export default Navbar;

