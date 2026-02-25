import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Box, Divider } from '@mui/material';
import { LayoutDashboard, Network, ShieldAlert, Bug, Settings, Users } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface SidebarProps {
  open: boolean;
  onToggle: () => void;
}

const menuItems = [
  { path: '/', label: 'common.dashboard', icon: LayoutDashboard },
  { path: '/network', label: 'common.network', icon: Network },
  { path: '/alerts', label: 'common.alerts', icon: ShieldAlert },
  { path: '/threats', label: 'common.threats', icon: Bug },
  { path: '/settings', label: 'common.settings', icon: Settings },
  { path: '/users', label: 'common.users', icon: Users },
];

const Sidebar: React.FC<SidebarProps> = ({ open }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: open ? 220 : 56,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: open ? 220 : 56,
          boxSizing: 'border-box',
          bgcolor: '#0f172a',
          borderRight: '0.5px solid rgba(148, 163, 184, 0.06)',
          transition: 'width 0.2s ease',
          overflowX: 'hidden',
          zIndex: 1200,
        },
      }}
    >
      <Toolbar sx={{ minHeight: '56px !important' }}>
        <Box sx={{
          display: 'flex', alignItems: 'center',
          justifyContent: open ? 'flex-start' : 'center',
          width: '100%', gap: 1.5,
        }}>
          <Box sx={{
            width: 28, height: 28, borderRadius: '6px',
            background: '#3b82f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontWeight: 700, fontSize: '0.6875rem',
            fontFamily: '"JetBrains Mono", monospace',
            flexShrink: 0,
          }}>
            CS
          </Box>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: 'auto' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
              >
                <Box sx={{
                  color: '#e2e8f0', fontWeight: 600, fontSize: '0.8125rem',
                  whiteSpace: 'nowrap', letterSpacing: '-0.01em',
                }}>
                  SecMonitor
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(148, 163, 184, 0.06)' }} />
      <List sx={{ px: 0.75, py: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <ListItem key={item.path} disablePadding sx={{ mb: 0.25 }}>
              <ListItemButton
                onClick={() => navigate(item.path)}
                sx={{
                  borderRadius: '6px',
                  minHeight: 36,
                  px: 1.25,
                  bgcolor: isActive ? 'rgba(59, 130, 246, 0.1)' : 'transparent',
                  color: isActive ? '#3b82f6' : '#64748b',
                  transition: 'all 0.15s ease',
                  '&:hover': {
                    bgcolor: isActive ? 'rgba(59, 130, 246, 0.12)' : 'rgba(148, 163, 184, 0.06)',
                    color: isActive ? '#3b82f6' : '#94a3b8',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: 'inherit' }}>
                  <Icon size={16} strokeWidth={isActive ? 2 : 1.5} />
                </ListItemIcon>
                <AnimatePresence>
                  {open && (
                    <motion.div
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                    >
                      <ListItemText
                        primary={t(item.label)}
                        sx={{
                          '& .MuiListItemText-primary': {
                            fontSize: '0.8125rem',
                            fontWeight: isActive ? 600 : 400,
                            whiteSpace: 'nowrap',
                          },
                        }}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
    </Drawer>
  );
};

export default Sidebar;
