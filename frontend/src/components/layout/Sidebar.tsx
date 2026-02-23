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
import { motion, AnimatePresence } from 'framer-motion';
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

  const itemVariants = {
    closed: { opacity: 0, x: -20 },
    open: (i: number) => ({
      opacity: 1,
      x: 0,
      transition: {
        delay: i * 0.05,
        duration: 0.3,
      },
    }),
  };

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
          transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
          overflowX: 'hidden',
          backdropFilter: 'blur(10px)',
          position: 'relative',
          zIndex: 1200, // Ensure sidebar is always above content
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
          <motion.div
            whileHover={{ scale: 1.1, rotate: [0, -5, 5, -5, 0] }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3 }}
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
                boxShadow: '0 4px 12px rgba(102, 126, 234, 0.4)',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                '&:hover': {
                  boxShadow: '0 6px 20px rgba(102, 126, 234, 0.6)',
                },
              }}
            >
              CS
            </Box>
          </motion.div>
          <AnimatePresence>
            {open && (
              <motion.div
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Box sx={{ color: 'primary.main', fontWeight: 600, fontSize: 18 }}>
                  Security Monitor
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Toolbar>
      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />
      <List sx={{ px: 1, py: 2 }}>
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.path;
          return (
            <motion.div
              key={item.path}
              custom={index}
              variants={itemVariants}
              initial="closed"
              animate="open"
            >
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <motion.div
                  whileHover={{ x: 5 }}
                  whileTap={{ scale: 0.95 }}
                  style={{ width: '100%', pointerEvents: 'auto' }}
                >
                  <ListItemButton
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      navigate(item.path);
                    }}
                    sx={{
                      borderRadius: 2,
                      bgcolor: isActive ? 'primary.main' : 'transparent',
                      color: isActive ? 'white' : 'text.secondary',
                      position: 'relative',
                      overflow: 'hidden',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                      '&::before': {
                        content: '""',
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        height: '100%',
                        width: isActive ? '4px' : '0px',
                        background: 'linear-gradient(180deg, #00bcd4, #008ba3)',
                        transition: 'width 0.3s ease',
                      },
                      '&:hover': {
                        bgcolor: isActive ? 'primary.dark' : 'rgba(255, 255, 255, 0.08)',
                        transform: 'translateX(4px)',
                        '&::before': {
                          width: '4px',
                        },
                      },
                      minHeight: 48,
                      px: 2,
                    }}
                  >
                    <motion.div
                      animate={isActive ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}
                    >
                      <ListItemIcon
                        sx={{
                          minWidth: 40,
                          color: isActive ? 'white' : 'text.secondary',
                          transition: 'color 0.3s ease',
                        }}
                      >
                        <Icon />
                      </ListItemIcon>
                    </motion.div>
                    <AnimatePresence>
                      {open && (
                        <motion.div
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: 1, width: 'auto' }}
                          exit={{ opacity: 0, width: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ListItemText
                            primary={t(item.label)}
                            sx={{
                              '& .MuiListItemText-primary': {
                                fontWeight: isActive ? 600 : 400,
                                transition: 'font-weight 0.3s ease',
                              },
                            }}
                          />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </ListItemButton>
                </motion.div>
              </ListItem>
            </motion.div>
          );
        })}
      </List>
    </Drawer>
  );
};

export default Sidebar;

