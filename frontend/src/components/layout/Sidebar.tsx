import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Box,
  Divider,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  NetworkCheck as NetworkIcon,
  Warning as AlertIcon,
  Security as ThreatIcon,
  Settings as SettingsIcon,
  People as UsersIcon,
} from '@mui/icons-material';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const menuItems = [
  { path: '/', label: 'common.dashboard', icon: DashboardIcon },
  { path: '/network', label: 'common.network', icon: NetworkIcon },
  { path: '/alerts', label: 'common.alerts', icon: AlertIcon },
  { path: '/threats', label: 'common.threats', icon: ThreatIcon },
  { path: '/settings', label: 'common.settings', icon: SettingsIcon },
  { path: '/users', label: 'common.users', icon: UsersIcon },
];

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? 260 : 80,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? 260 : 80,
          boxSizing: 'border-box',
          bgcolor: 'background.paper',
          borderRight: '1px solid rgba(255, 255, 255, 0.1)',
          transition: 'width 0.3s ease',
          overflowX: 'hidden',
        },
      }}
    >
      <Toolbar>
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: open ? 'flex-start' : 'center',
            width: '100%',
            gap: 2,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: 2,
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white',
              fontWeight: 'bold',
              fontSize: 18,
            }}
          >
            CS
          </Box>
          {open && (
            <Box sx={{ color: 'primary.main', fontWeight: 600, fontSize: 18 }}>
              Security Monitor
            </Box>
          )}
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
      <List sx={{ px: 1, py: 2 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: 2,
                  bgcolor: isActive ? 'primary.main' : 'transparent',
                  color: isActive ? 'white' : 'text.secondary',
                  '&:hover': {
                    bgcolor: isActive ? 'primary.dark' : 'rgba(255, 255, 255, 0.05)',
                  },
                  minHeight: 48,
                  px: 2,
                }}
              >
                <ListItemIcon
                  sx={{
                    minWidth: 40,
                    color: isActive ? 'white' : 'text.secondary',
                  }}
                >
                  <Icon />
                </ListItemIcon>
                {open && <ListItemText primary={t(item.label)} />}
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
};

export default Sidebar;

